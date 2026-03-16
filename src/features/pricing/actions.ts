"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createPriceListAction(data: {
    name: string;
    currency?: string;
    valid_from?: string;
    valid_to?: string;
    is_default?: boolean;
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    try {
        const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
        const { data: list, error } = await supabase
            .from('price_lists')
            .insert({
                tenant_id: tenantId,
                name: data.name,
                currency: data.currency || 'COP',
                valid_from: data.valid_from || null,
                valid_to: data.valid_to || null,
                is_default: data.is_default || false,
            })
            .select()
            .single()
        if (error) throw error
        revalidatePath('/settings/pricing')
        return { success: true, id: list.id }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error al crear lista'
        return { error: msg }
    }
}

export async function deletePriceListAction(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    try {
        const { error } = await supabase.from('price_lists').delete().eq('id', id)
        if (error) throw error
        revalidatePath('/settings/pricing')
        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error al eliminar'
        return { error: msg }
    }
}

export async function upsertPriceListItemAction(data: {
    price_list_id: string;
    product_id: string;
    unit_price: number;
    min_qty?: number;
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    try {
        const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
        const { error } = await supabase
            .from('price_list_items')
            .upsert({
                tenant_id: tenantId,
                price_list_id: data.price_list_id,
                product_id: data.product_id,
                unit_price: data.unit_price,
                min_qty: data.min_qty || 1,
            }, { onConflict: 'price_list_id,product_id,min_qty' })
        if (error) throw error
        revalidatePath('/settings/pricing')
        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error al guardar precio'
        return { error: msg }
    }
}

export async function deletePriceListItemAction(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    try {
        const { error } = await supabase.from('price_list_items').delete().eq('id', id)
        if (error) throw error
        revalidatePath('/settings/pricing')
        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error al eliminar'
        return { error: msg }
    }
}
