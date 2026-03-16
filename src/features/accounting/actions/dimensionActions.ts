"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createDimensionAction(data: { code: string; name: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    try {
        const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
        const { error } = await supabase
            .from('dimensions')
            .insert({ ...data, tenant_id: tenantId, is_active: true })
        if (error) throw error
        revalidatePath('/settings/dimensions')
        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error al crear dimensión'
        return { error: msg }
    }
}

export async function deleteDimensionAction(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    try {
        const { error } = await supabase.from('dimensions').delete().eq('id', id)
        if (error) throw error
        revalidatePath('/settings/dimensions')
        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error al eliminar'
        return { error: msg }
    }
}

export async function createDimensionValueAction(data: {
    dimension_id: string
    code: string
    name: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    try {
        const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
        const { error } = await supabase
            .from('dimension_values')
            .insert({ ...data, tenant_id: tenantId, is_active: true })
        if (error) throw error
        revalidatePath('/settings/dimensions')
        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error al crear valor'
        return { error: msg }
    }
}

export async function deleteDimensionValueAction(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    try {
        const { error } = await supabase.from('dimension_values').delete().eq('id', id)
        if (error) throw error
        revalidatePath('/settings/dimensions')
        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error al eliminar valor'
        return { error: msg }
    }
}
