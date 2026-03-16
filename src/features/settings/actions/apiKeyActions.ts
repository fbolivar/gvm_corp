"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import crypto from "crypto"

export async function createApiKeyAction(data: { name: string }) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    try {
        const { data: tenantId } = await supabase.rpc('get_my_tenant_id')

        // Generate random API key: gvm_ prefix + 64 hex chars = 68 chars total
        const rawKey = `gvm_${crypto.randomBytes(32).toString('hex')}`
        const prefix = rawKey.substring(0, 8)
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')

        const { error } = await supabase
            .from('api_keys')
            .insert({
                tenant_id: tenantId,
                name: data.name,
                prefix,
                key_hash: keyHash,
                scopes: ['read'],
                is_active: true,
            })

        if (error) throw error

        revalidatePath('/settings/api-keys')
        return { success: true, key: rawKey }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error al crear API key'
        return { error: msg }
    }
}

export async function deleteApiKeyAction(id: string) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { error: "No autenticado" }

    try {
        const { error } = await supabase
            .from('api_keys')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/settings/api-keys')
        return { success: true }
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error al eliminar'
        return { error: msg }
    }
}
