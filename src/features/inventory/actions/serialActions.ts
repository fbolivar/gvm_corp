"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createSerialAction(data: {
    product_id: string
    warehouse_id?: string
    serial_number: string
    lot_id?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    try {
        const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
        const { error } = await supabase
            .from('product_serials')
            .insert({
                ...data,
                tenant_id: tenantId,
                status: 'AVAILABLE',
            })
        if (error) throw error
        revalidatePath('/inventory/serials')
        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error al crear serial'
        return { error: msg }
    }
}

export async function updateSerialStatusAction(id: string, status: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    try {
        const { error } = await supabase
            .from('product_serials')
            .update({ status })
            .eq('id', id)
        if (error) throw error
        revalidatePath('/inventory/serials')
        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error al actualizar'
        return { error: msg }
    }
}
