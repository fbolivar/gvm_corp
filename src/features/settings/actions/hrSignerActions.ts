'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Firma del responsable de RRHH para los certificados laborales.
 *
 * La subida ocurre EN EL SERVIDOR a propósito: el bucket `tenant-assets` solo
 * tiene políticas de escritura para las carpetas `avatars` y `logos`, así que
 * subir `hr-signatures/...` desde el navegador fallaba con
 * "new row violates row-level security policy". Igual que las fotos de carnet,
 * se sube con el service role tras verificar permisos aquí.
 */

const BUCKET = 'tenant-assets'
const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp']

type Result = { ok: true; url?: string | null } | { ok: false; error: string }

/**
 * Autoriza a quien configura los datos de la empresa: rol administrativo,
 * `can_admin` en el módulo settings, o excepción explícita en team_admins.
 * Misma regla que la gestión de equipo, para no abrir una puerta más laxa.
 */
async function getAuthorizedTenantId(
    supabase: SupabaseClient,
    userId: string
): Promise<string | null> {
    const { data: ut } = await supabase
        .from('user_tenants')
        .select('role, role_id, tenant_id, status')
        .eq('user_id', userId)
        .maybeSingle()

    if (!ut || ut.status !== 'active') return null
    if (['SUPER ADMINISTRADOR', 'ADMINISTRADOR'].includes(ut.role as string)) return ut.tenant_id

    if (ut.role_id) {
        const { data: perm } = await supabase
            .from('role_permissions')
            .select('can_view, can_admin')
            .eq('role_id', ut.role_id)
            .eq('module_key', 'settings')
            .maybeSingle()
        if (perm?.can_admin === true && perm?.can_view === true) return ut.tenant_id
    }

    const { data: teamAdmin } = await supabase
        .from('team_admins')
        .select('user_id')
        .eq('user_id', userId)
        .eq('tenant_id', ut.tenant_id)
        .maybeSingle()

    return teamAdmin ? ut.tenant_id : null
}

/** Sube la firma (dataURL) y la deja guardada en el tenant. */
export async function uploadHrSignatureAction(dataUrl: string): Promise<Result> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { ok: false, error: 'Sesión expirada. Vuelve a iniciar sesión.' }

        const tenantId = await getAuthorizedTenantId(supabase, user.id)
        if (!tenantId) return { ok: false, error: 'No tienes permisos para configurar la firma de la empresa.' }

        const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl)
        if (!match) return { ok: false, error: 'Formato de imagen no válido.' }

        const contentType = match[1]
        if (!ALLOWED.includes(contentType)) return { ok: false, error: 'Solo se admiten PNG, JPG o WEBP.' }

        const buffer = Buffer.from(match[2], 'base64')
        if (buffer.byteLength > MAX_BYTES) return { ok: false, error: 'La firma no puede superar 2 MB.' }

        const ext = contentType.split('/')[1].replace('jpeg', 'jpg')
        const path = `hr-signatures/${tenantId}.${ext}`

        const admin = createAdminClient(user.id)
        const { error: upErr } = await admin.storage
            .from(BUCKET)
            .upload(path, buffer, { contentType, upsert: true })
        if (upErr) {
            console.error('[hr-signature] upload falló:', upErr)
            return { ok: false, error: `No se pudo subir la firma: ${upErr.message}` }
        }

        const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path)
        // Cache-buster: al reemplazar la firma la ruta es la misma.
        const url = `${pub.publicUrl}?v=${Date.now()}`

        const { error: updErr } = await admin
            .from('tenants')
            .update({ hr_signature_url: url })
            .eq('id', tenantId)
        if (updErr) {
            console.error('[hr-signature] update tenants falló:', updErr)
            return { ok: false, error: `No se pudo guardar la firma: ${updErr.message}` }
        }

        revalidatePath('/settings/company')
        return { ok: true, url }
    } catch (e) {
        console.error('[hr-signature] excepción:', e)
        return { ok: false, error: e instanceof Error ? e.message : 'Error inesperado al subir la firma.' }
    }
}

/** Quita la firma del tenant (y borra el archivo si existe). */
export async function removeHrSignatureAction(): Promise<Result> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { ok: false, error: 'Sesión expirada. Vuelve a iniciar sesión.' }

        const tenantId = await getAuthorizedTenantId(supabase, user.id)
        if (!tenantId) return { ok: false, error: 'No tienes permisos para configurar la firma de la empresa.' }

        const admin = createAdminClient(user.id)
        const { error: updErr } = await admin
            .from('tenants')
            .update({ hr_signature_url: null })
            .eq('id', tenantId)
        if (updErr) return { ok: false, error: `No se pudo quitar la firma: ${updErr.message}` }

        await admin.storage.from(BUCKET).remove([
            `hr-signatures/${tenantId}.png`,
            `hr-signatures/${tenantId}.jpg`,
            `hr-signatures/${tenantId}.webp`,
        ])

        revalidatePath('/settings/company')
        return { ok: true, url: null }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Error inesperado al quitar la firma.' }
    }
}

/** Guarda nombre y cargo del firmante. */
export async function saveHrSignerAction(name: string, title: string): Promise<Result> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { ok: false, error: 'Sesión expirada. Vuelve a iniciar sesión.' }

        const tenantId = await getAuthorizedTenantId(supabase, user.id)
        if (!tenantId) return { ok: false, error: 'No tienes permisos para configurar la firma de la empresa.' }

        const admin = createAdminClient(user.id)
        const { error } = await admin
            .from('tenants')
            .update({
                hr_manager_name: name.trim() || null,
                hr_manager_title: title.trim() || 'Jefe de Recursos Humanos',
            })
            .eq('id', tenantId)
        if (error) return { ok: false, error: `No se pudo guardar: ${error.message}` }

        revalidatePath('/settings/company')
        return { ok: true }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Error inesperado al guardar.' }
    }
}
