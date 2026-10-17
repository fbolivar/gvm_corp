"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { inventoryService } from "@/features/inventory/services/inventoryService"
import { accountingService } from "@/features/accounting/services/accountingService"
import { resolveLineIvaRate } from "@/features/accounting/services/salesAccountingEngine"

const returnLineSchema = z.object({
    product_id: z.string().uuid().nullable(),
    description: z.string().min(1, "La descripción es obligatoria"),
    qty: z.number().positive("La cantidad debe ser mayor a 0"),
    unit_cost: z.number().min(0),
    tax_config: z.unknown().optional(),
})

const createReturnSchema = z.object({
    parent_id: z.string().uuid(),
    reason: z.string().min(1, "La razón es obligatoria"),
    lines: z.array(returnLineSchema).min(1, "Debe devolver al menos un renglón"),
})

export type CreatePurchaseReturnInput = z.infer<typeof createReturnSchema>

/**
 * Registra una devolución a proveedor (DMP) a partir de una compra remisionada
 * (VENDOR_BILL): crea el documento con sus renglones, DESCARGA el inventario
 * (movimiento OUT) y genera el asiento contable con las reglas DMP ya validadas
 * (contabiliza solo si el tenant tiene encendido auto_post_purchases).
 */
export async function createPurchaseReturnAction(input: CreatePurchaseReturnInput) {
    const parsed = createReturnSchema.safeParse(input)
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
    }
    const { parent_id, reason, lines } = parsed.data

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    const { data: tenantId } = await supabase.rpc("get_my_tenant_id")
    if (!tenantId) return { error: "No se encontró el tenant" }

    try {
        // 1. Validar la factura de proveedor padre (y traer su bodega).
        const { data: bill, error: billErr } = await supabase
            .from("documents")
            .select("id, number, total, balance, doc_type, party_id, warehouse_id")
            .eq("id", parent_id)
            .single()
        if (billErr || !bill) return { error: "Factura de proveedor no encontrada" }
        if (bill.doc_type !== "VENDOR_BILL") return { error: "El documento padre debe ser una compra (factura de proveedor)" }

        // 2. Totales de la devolución (base + IVA por renglón).
        let base = 0, iva = 0
        for (const l of lines) {
            const lineBase = l.qty * l.unit_cost
            const rate = resolveLineIvaRate(l.tax_config, null)
            base += lineBase
            iva += lineBase * (rate / 100)
        }
        base = Math.round(base)
        iva = Math.round(iva)
        const total = base + iva

        // 3. Crear el documento de devolución (número DMP-xxxxx por trigger).
        const { data: ret, error: createErr } = await supabase
            .from("documents")
            .insert({
                tenant_id: tenantId,
                doc_type: "PURCHASE_RETURN",
                parent_id,
                party_id: bill.party_id,
                warehouse_id: bill.warehouse_id,
                status: "ACCEPTED",
                subtotal: base,
                taxes: iva,
                total,
                balance: 0,
                currency: "COP",
                issue_date: new Date().toISOString().split("T")[0],
                notes_internal: reason,
                notes_public: `Devolución sobre compra ${bill.number}`,
            })
            .select()
            .single()
        if (createErr) throw createErr

        // 4. Renglones del documento.
        const { error: linesErr } = await supabase.from("document_lines").insert(
            lines.map(l => ({
                document_id: ret.id,
                product_id: l.product_id,
                description: l.description,
                qty: l.qty,
                unit_price: l.unit_cost,
                tax_config: l.tax_config ?? null,
            })),
        )
        if (linesErr) throw linesErr

        // 5. Descargar inventario (OUT) por cada renglón con producto y bodega.
        const invWarnings: string[] = []
        if (bill.warehouse_id) {
            for (const l of lines) {
                if (!l.product_id) continue
                try {
                    await inventoryService.createMovement(supabase, {
                        product_id: l.product_id,
                        warehouse_id: bill.warehouse_id,
                        type: "OUT",
                        qty: l.qty,
                        cost: l.unit_cost,
                        occurred_at: new Date().toISOString(),
                        ref_doc_type: "PURCHASE_RETURN",
                        ref_doc_id: ret.id,
                    })
                } catch (e: unknown) {
                    invWarnings.push(l.description)
                    console.error("[purchaseReturn] movimiento OUT falló:", e)
                }
            }
        } else {
            invWarnings.push("la compra no tiene bodega asignada: no se descargó inventario")
        }

        // 6. Contabilizar (DMP). Gated por auto_post_purchases dentro del servicio.
        let accWarning: string | undefined
        try {
            await accountingService.createEntryFromDocument(supabase, {
                ...ret,
                lines: lines.map(l => ({
                    qty: l.qty,
                    unit_price: l.unit_cost,
                    tax_config: l.tax_config ?? null,
                })),
            })
        } catch (e: unknown) {
            accWarning = e instanceof Error ? e.message : "no se pudo contabilizar"
            console.error("[purchaseReturn] contabilización falló:", e)
        }

        // 7. Reducir el saldo de la compra padre (solo el saldo; el estado de la
        //    factura no se toca — document_status no tiene PAID/PARTIAL).
        const currentBalance = (bill.balance ?? bill.total) as number
        const newBalance = Math.max(0, currentBalance - total)
        const { error: updErr } = await supabase
            .from("documents")
            .update({ balance: newBalance })
            .eq("id", parent_id)
        if (updErr) console.error("[purchaseReturn] saldo padre:", updErr.message)

        revalidatePath("/purchasing/returns")
        revalidatePath("/purchasing/bills")
        revalidatePath("/inventory")

        const warnings: string[] = []
        if (invWarnings.length) warnings.push(`Inventario: ${invWarnings.join(", ")}`)
        if (accWarning) warnings.push(`Contabilización: ${accWarning}`)
        return { success: true, documentId: ret.id, number: ret.number as string, warning: warnings.join(" · ") || undefined }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Error al crear la devolución"
        console.error("[purchaseReturn] createPurchaseReturn:", msg)
        return { error: msg }
    }
}
