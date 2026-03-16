"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createExchangeRateAction(data: {
    from_currency: string
    to_currency: string
    rate: number
    effective_date: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    try {
        const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
        const { error } = await supabase
            .from('exchange_rates')
            .upsert(
                { ...data, tenant_id: tenantId },
                { onConflict: 'tenant_id,from_currency,to_currency,effective_date' }
            )
        if (error) throw error
        revalidatePath('/settings/currencies')
        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error al guardar tasa'
        return { error: msg }
    }
}

export async function deleteExchangeRateAction(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    try {
        const { error } = await supabase.from('exchange_rates').delete().eq('id', id)
        if (error) throw error
        revalidatePath('/settings/currencies')
        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error al eliminar'
        return { error: msg }
    }
}
