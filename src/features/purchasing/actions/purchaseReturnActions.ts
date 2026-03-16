"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

interface CreatePurchaseReturnInput {
    parent_id: string
    party_id: string
    total: number
    reason: string
}

export async function createPurchaseReturnAction(input: CreatePurchaseReturnInput) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
    if (!tenantId) return { error: "No se encontró el tenant" }

    try {
        // 1. Validate parent bill exists and has enough balance
        const { data: parentBill, error: billErr } = await supabase
            .from('documents')
            .select('id, number, total, balance, doc_type, party_id')
            .eq('id', input.parent_id)
            .single()

        if (billErr || !parentBill) return { error: "Factura no encontrada" }
        if (parentBill.doc_type !== 'VENDOR_BILL') return { error: "El documento padre debe ser una factura de proveedor" }

        const currentBalance = (parentBill.balance ?? parentBill.total) as number
        if (input.total > currentBalance) return { error: "El monto excede el saldo disponible" }

        // 2. Create Credit Note document
        const { data: creditNote, error: createErr } = await supabase
            .from('documents')
            .insert({
                tenant_id: tenantId,
                doc_type: 'CREDIT_NOTE',
                parent_id: input.parent_id,
                party_id: input.party_id,
                status: 'POSTED',
                subtotal: input.total,
                tax: 0,
                total: input.total,
                balance: 0,
                currency: 'COP',
                issue_date: new Date().toISOString().split('T')[0],
                notes_internal: input.reason,
                notes_public: `Devolución sobre factura ${parentBill.number}`,
                created_by: user.id,
            })
            .select()
            .single()

        if (createErr) throw createErr

        // 3. Reduce parent bill balance
        const newBalance = currentBalance - input.total
        const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL'

        const { error: updateErr } = await supabase
            .from('documents')
            .update({ balance: Math.max(0, newBalance), status: newStatus })
            .eq('id', input.parent_id)

        if (updateErr) {
            console.error('[purchasing] Failed to update parent balance:', updateErr.message)
        }

        revalidatePath('/purchasing/returns')
        revalidatePath('/purchasing/bills')
        return { success: true, documentId: creditNote.id }
    } catch (error: unknown) {
        const msg =
            error instanceof Error
                ? error.message
                : (typeof (error as Record<string, unknown>)?.message === 'string'
                    ? String((error as Record<string, unknown>).message)
                    : 'Error al crear devolución')
        console.error('[purchasing] createPurchaseReturn:', msg)
        return { error: msg }
    }
}
