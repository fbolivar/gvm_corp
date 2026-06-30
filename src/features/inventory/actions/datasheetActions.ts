'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const BUCKET = 'product-datasheets'

export interface Datasheet {
    id: string
    product_id: string
    name: string
    file_path: string
    mime: string | null
    size: number | null
    created_at: string
}

async function getAuthTenant() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' as const }
    const { data: ut } = await supabase
        .from('user_tenants').select('tenant_id').eq('user_id', user.id).maybeSingle()
    if (!ut?.tenant_id) return { error: 'Usuario sin empresa' as const }
    return { supabase, user, tenantId: ut.tenant_id as string }
}

export async function listDatasheetsAction(productId: string): Promise<Datasheet[]> {
    const ctx = await getAuthTenant()
    if ('error' in ctx) return []
    const { data } = await ctx.supabase
        .from('product_datasheets')
        .select('id, product_id, name, file_path, mime, size, created_at')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
    return (data as Datasheet[]) || []
}

export async function uploadDatasheetAction(formData: FormData): Promise<{ success?: true; error?: string }> {
    const ctx = await getAuthTenant()
    if ('error' in ctx) return { error: ctx.error }
    const { supabase, user, tenantId } = ctx

    const productId = formData.get('product_id') as string
    const file = formData.get('file') as File | null
    if (!productId) return { error: 'Producto requerido' }
    if (!file || file.size === 0) return { error: 'Archivo requerido' }
    if (file.size > 25 * 1024 * 1024) return { error: 'El archivo no debe superar 25 MB' }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120)
    const path = `${tenantId}/${productId}/${Date.now()}-${safeName}`

    try {
        const admin = createAdminClient()
        const buffer = new Uint8Array(await file.arrayBuffer())
        const { error: upErr } = await admin.storage
            .from(BUCKET)
            .upload(path, buffer, { contentType: file.type || 'application/octet-stream', upsert: false })
        if (upErr) return { error: `Error subiendo archivo: ${upErr.message}` }

        const { error: insErr } = await supabase.from('product_datasheets').insert({
            tenant_id: tenantId,
            product_id: productId,
            name: file.name,
            file_path: path,
            mime: file.type || null,
            size: file.size,
            created_by: user.id,
        })
        if (insErr) {
            // limpiar archivo huérfano
            await admin.storage.from(BUCKET).remove([path]).catch(() => {})
            return { error: insErr.message }
        }

        revalidatePath('/inventory/datasheets')
        return { success: true }
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'Error desconocido' }
    }
}

export async function getDatasheetUrlAction(id: string): Promise<{ url?: string; error?: string }> {
    const ctx = await getAuthTenant()
    if ('error' in ctx) return { error: ctx.error }
    // RLS garantiza que solo accede a fichas de su empresa
    const { data: row } = await ctx.supabase
        .from('product_datasheets').select('file_path').eq('id', id).maybeSingle()
    if (!row) return { error: 'Ficha no encontrada' }
    const admin = createAdminClient()
    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(row.file_path, 3600)
    if (error || !data?.signedUrl) return { error: error?.message || 'No se pudo generar el enlace' }
    return { url: data.signedUrl }
}

export async function deleteDatasheetAction(id: string): Promise<{ success?: true; error?: string }> {
    const ctx = await getAuthTenant()
    if ('error' in ctx) return { error: ctx.error }
    const { data: row } = await ctx.supabase
        .from('product_datasheets').select('file_path').eq('id', id).maybeSingle()
    if (!row) return { error: 'Ficha no encontrada' }
    try {
        const admin = createAdminClient()
        await admin.storage.from(BUCKET).remove([row.file_path]).catch(() => {})
        const { error } = await ctx.supabase.from('product_datasheets').delete().eq('id', id)
        if (error) return { error: error.message }
        revalidatePath('/inventory/datasheets')
        return { success: true }
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'Error desconocido' }
    }
}
