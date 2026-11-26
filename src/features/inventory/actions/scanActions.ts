'use server';

import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { z } from 'zod';

/**
 * Registro de entrada/salida de inventario por escáner (carga masiva del go-live).
 *
 * Centraliza la lógica para que el movimiento sea la ÚNICA fuente de la cantidad:
 * `product_stock` es una VISTA sobre `inventory_movements`, y el trigger
 * `adjust_lot_on_movement` ajusta las unidades del lote cuando el movimiento trae
 * `lot_id`. Por eso el lote se crea en qty 0 y el movimiento la mueve — nunca se
 * fija la cantidad en el lote a mano (si no, se duplicaría o quedaría descuadrado
 * frente a product_stock).
 */

const schema = z.object({
    productId: z.string().uuid(),
    warehouseId: z.string().uuid(),
    type: z.enum(['IN', 'OUT']),
    qty: z.coerce.number().positive().max(1e9),
    // Lote: o se elige uno existente (lotId), o se crea uno nuevo (newLotNumber +
    // expirationDate), o ninguno (producto que no maneja lote).
    lotId: z.string().uuid().nullable().optional(),
    newLotNumber: z.string().trim().min(1).max(100).nullable().optional(),
    expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export type ScanMovementInput = z.input<typeof schema>;

export async function registerScanMovement(
    input: ScanMovementInput,
): Promise<{ success?: true; lotId?: string | null; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const parsed = schema.safeParse(input);
    if (!parsed.success) return { error: 'Datos inválidos: ' + (parsed.error.issues[0]?.message ?? '') };
    const { productId, warehouseId, type, qty, lotId, newLotNumber, expirationDate } = parsed.data;

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant?.id) return { error: 'No se encontró el tenant del usuario' };

    // La FK no respeta RLS: confirmamos con el cliente de sesión (RLS por tenant)
    // que el producto y la bodega son de esta empresa.
    const [{ data: prod }, { data: wh }] = await Promise.all([
        supabase.from('products').select('id').eq('id', productId).maybeSingle(),
        supabase.from('warehouses').select('id').eq('id', warehouseId).maybeSingle(),
    ]);
    if (!prod) return { error: 'El producto no existe o no pertenece a tu empresa.' };
    if (!wh) return { error: 'La bodega no existe o no pertenece a tu empresa.' };

    let finalLotId: string | null = lotId ?? null;

    // Crear lote nuevo (o reutilizar uno igual ya existente en esa bodega)
    if (!finalLotId && newLotNumber) {
        if (!expirationDate) return { error: 'La fecha de vencimiento es obligatoria para un lote nuevo.' };

        const { data: existing } = await supabase
            .from('product_lots')
            .select('id')
            .eq('product_id', productId)
            .eq('warehouse_id', warehouseId)
            .eq('lot_number', newLotNumber)
            .maybeSingle();

        if (existing) {
            finalLotId = existing.id as string;
        } else {
            // qty 0 a propósito: la cantidad la pone el movimiento vía trigger.
            const { data: created, error: lotErr } = await supabase
                .from('product_lots')
                .insert({
                    tenant_id: tenant.id,
                    product_id: productId,
                    warehouse_id: warehouseId,
                    lot_number: newLotNumber,
                    expiration_date: expirationDate,
                    status: 'ACTIVE',
                })
                .select('id')
                .single();
            if (lotErr || !created) {
                return { error: 'No se pudo crear el lote: ' + (lotErr?.message ?? 'error desconocido') };
            }
            finalLotId = created.id as string;
        }
    }

    // Si vino un lote existente, confirmar que es del mismo producto y bodega.
    if (finalLotId && !newLotNumber) {
        const { data: lot } = await supabase
            .from('product_lots')
            .select('id, product_id, warehouse_id')
            .eq('id', finalLotId)
            .maybeSingle();
        if (!lot || lot.product_id !== productId || lot.warehouse_id !== warehouseId) {
            return { error: 'El lote seleccionado no corresponde al producto o la bodega.' };
        }
    }

    const { error: movErr } = await supabase.from('inventory_movements').insert({
        product_id: productId,
        warehouse_id: warehouseId,
        type,
        qty,
        lot_id: finalLotId,
        ref_doc_type: 'SCANNER',
        occurred_at: new Date().toISOString(),
    });
    if (movErr) {
        return { error: 'No se registró el movimiento: ' + (movErr.message ?? 'error desconocido') };
    }

    return { success: true, lotId: finalLotId };
}
