'use server'

import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { canViewModule } from '@/shared/lib/moduleGuard'

/** Vigencia por defecto del enlace del portal del cliente. */
const PORTAL_LINK_DAYS = 30

/**
 * Genera (o rota) el enlace público del portal del cliente: un token aleatorio con
 * vigencia. Reemplaza el acceso por UUID del tercero (auditoría 2026-11-24). Gated
 * por rol de ventas; confirma que el tercero es del tenant con el cliente de sesión
 * (RLS) antes de setear el token con admin client.
 */
export async function generateClientPortalLinkAction(
    partyId: string
): Promise<{ token?: string; expiresAt?: string; error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }
    if (!(await canViewModule('sales'))) return { error: 'Sin permiso' }

    const { data: party } = await supabase
        .from('parties').select('id').eq('id', partyId).maybeSingle()
    if (!party) return { error: 'Tercero no encontrado' }

    // 24 bytes aleatorios → ~32 caracteres url-safe (192 bits): no adivinable.
    const token = crypto.randomBytes(24).toString('base64url')
    // SEGURIDAD: en la BD se guarda solo el HASH del token, no el token. `parties` se
    // lee en muchos sitios con select('*') y por PostgREST; si guardáramos el token en
    // claro, se filtraría a cualquier usuario con acceso a terceros. El hash es inútil
    // para un atacante (no se puede revertir), así que la fuga queda neutralizada.
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + PORTAL_LINK_DAYS * 86400000).toISOString()

    const admin = createAdminClient()
    const { error } = await admin
        .from('parties')
        .update({ portal_token: tokenHash, portal_token_expires_at: expiresAt })
        .eq('id', partyId)
    if (error) return { error: error.message }

    // Se devuelve el token EN CLARO (va en la URL); la BD solo tiene su hash.
    return { token, expiresAt }
}

/** Revoca el enlace del portal (invalida el token). */
export async function revokeClientPortalLinkAction(
    partyId: string
): Promise<{ error?: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }
    if (!(await canViewModule('sales'))) return { error: 'Sin permiso' }

    const { data: party } = await supabase
        .from('parties').select('id').eq('id', partyId).maybeSingle()
    if (!party) return { error: 'Tercero no encontrado' }

    const admin = createAdminClient()
    const { error } = await admin
        .from('parties')
        .update({ portal_token: null, portal_token_expires_at: null })
        .eq('id', partyId)
    if (error) return { error: error.message }

    return {}
}
