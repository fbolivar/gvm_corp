'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { purchaseOrderService } from '../services/purchaseOrderService'
import { inventoryService } from '@/features/inventory/services/inventoryService'
import { revalidatePath } from 'next/cache'

// ─── Validation schema ────────────────────────────────────────────────────────

const receiveLineSchema = z.object({
    line_id: z.string().uuid(),
    product_id: z.string().uuid(),
    qty_received: z.number().min(0),
    unit_cost: z.number().min(0),
})

const receiveOrderSchema = z.object({
    orderId: z.string().uuid(),
    lines: z.array(receiveLineSchema).min(1, 'Debe proporcionar al menos una línea'),
})

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReceiveLine {
    line_id: string
    product_id: string
    qty_received: number
    unit_cost: number
}

export interface ReceiveOrderResult {
    success?: boolean
    error?: string
}

// ─── Server Action ────────────────────────────────────────────────────────────

export async function receiveOrderAction(
    orderId: string,
    lines: ReceiveLine[]
): Promise<ReceiveOrderResult> {
    // 1. Validate input
    const parsed = receiveOrderSchema.safeParse({ orderId, lines })
    if (!parsed.success) {
        return { error: 'Datos inválidos: ' + JSON.stringify(parsed.error.flatten()) }
    }

    const supabase = await createClient()

    // 2. Verify authenticated user
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'No autorizado. Inicie sesión para continuar.' }
    }

    try {
        // 3. Fetch PO to get warehouse_id and validate status
        const po = await purchaseOrderService.getOrderById(supabase, orderId)
        if (!po) {
            return { error: 'Orden de compra no encontrada.' }
        }

        if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(po.status)) {
            return {
                error: `No se puede recibir una orden en estado "${po.status}". Solo órdenes APROBADAS o PARCIALMENTE RECIBIDAS.`,
            }
        }

        if (!po.warehouse_id) {
            return {
                error:
                    'La orden de compra no tiene una bodega asignada. Edite la orden y asigne una bodega antes de recibir.',
            }
        }

        // 4. Filter only lines with qty > 0
        const activeLines = parsed.data.lines.filter((l) => l.qty_received > 0)
        if (activeLines.length === 0) {
            return { error: 'Debe recibir al menos un artículo con cantidad mayor a cero.' }
        }

        // 5. Update PO line qty_received values
        await purchaseOrderService.receiveOrder(
            supabase,
            orderId,
            activeLines.map((l) => ({ line_id: l.line_id, qty_received: l.qty_received }))
        )

        // 6. Create inventory IN movements for each active line
        const movementErrors: string[] = []
        for (const line of activeLines) {
            try {
                await inventoryService.createMovement(supabase, {
                    product_id: line.product_id,
                    warehouse_id: po.warehouse_id,
                    type: 'IN',
                    qty: line.qty_received,
                    cost: line.unit_cost,
                    occurred_at: new Date().toISOString(),
                    ref_doc_type: 'PURCHASE_ORDER',
                    ref_doc_id: orderId,
                })
            } catch (movErr: unknown) {
                const msg = movErr instanceof Error ? movErr.message : 'Error desconocido'
                movementErrors.push(`Producto ${line.product_id.substring(0, 8)}: ${msg}`)
                console.error(
                    `[receiveOrderAction] Movement creation failed for product ${line.product_id}:`,
                    movErr
                )
            }
        }

        // 6b. Create fixed assets for products marked as fixed asset
        for (const line of activeLines) {
            try {
                // Check if product is marked as fixed asset
                const { data: product } = await supabase
                    .from('products')
                    .select('id, name, sku, is_fixed_asset, asset_category')
                    .eq('id', line.product_id)
                    .single()

                if (product?.is_fixed_asset && product.asset_category) {
                    const { fixedAssetService, DEFAULT_USEFUL_LIFE } = await import('@/features/accounting/services/fixedAssetService')

                    await fixedAssetService.create(supabase, {
                        name: product.name,
                        code: product.sku || `AF-${Date.now()}`,
                        category: product.asset_category as Parameters<typeof fixedAssetService.create>[1]['category'],
                        acquisition_date: new Date().toISOString().split('T')[0],
                        acquisition_cost: line.unit_cost * line.qty_received,
                        salvage_value: 0,
                        useful_life_years: DEFAULT_USEFUL_LIFE[product.asset_category as keyof typeof DEFAULT_USEFUL_LIFE] ?? 5,
                        status: 'ACTIVE',
                        location: null,
                        serial_number: null,
                        notes: `Auto-creado desde OC ${po.po_number || orderId}`,
                        chart_account_id: null,
                    })
                }
            } catch (assetErr: unknown) {
                console.error(`[receiveOrderAction] Fixed asset creation failed for product ${line.product_id}:`, assetErr)
                // Non-blocking: don't fail the reception if asset creation fails
            }
        }

        // 7. Revalidate paths
        revalidatePath('/purchasing/orders')
        revalidatePath(`/purchasing/orders/${orderId}`)
        revalidatePath('/inventory')
        revalidatePath('/inventory/movements')
        revalidatePath('/accounting/fixed-assets')

        // 8. Return result — partial success if some movements failed
        if (movementErrors.length > 0) {
            return {
                success: true,
                error: `Recepción registrada con advertencias. Algunos movimientos fallaron: ${movementErrors.join('; ')}`,
            }
        }

        return { success: true }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor'
        console.error('[receiveOrderAction] Fatal error:', error)
        return { error: message }
    }
}
