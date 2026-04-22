'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { translateAuthError } from '@/shared/lib/auth-errors'

export interface ChangePasswordResult {
    success: boolean
    error?: string
}

/**
 * Cambia la contraseña del usuario autenticado y limpia el flag
 * must_change_password en user_metadata. Usado en el flujo de primer login.
 *
 * Usa admin client para evitar problemas de cookies SSR durante updateUser.
 */
export async function changePasswordAction(
    newPassword: string,
    confirmPassword: string
): Promise<ChangePasswordResult> {
    try {
        if (!newPassword || newPassword.length < 8) {
            return { success: false, error: 'La contraseña debe tener al menos 8 caracteres' }
        }
        if (newPassword !== confirmPassword) {
            return { success: false, error: 'Las contraseñas no coinciden' }
        }
        if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return { success: false, error: 'La contraseña debe contener letras y números' }
        }

        // 1. Identificar usuario autenticado vía cookies (server client)
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.error('[changePasswordAction] no auth user:', authError?.message)
            return { success: false, error: 'Sesión no válida. Vuelve a iniciar sesión.' }
        }

        // 2. Actualizar password + metadata con admin client (bypass de cookies SSR)
        const admin = createAdminClient()
        const existingMeta = (user.user_metadata ?? {}) as Record<string, unknown>

        const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
            password: newPassword,
            user_metadata: { ...existingMeta, must_change_password: false },
        })

        if (updateError) {
            console.error('[changePasswordAction] updateUserById failed:', updateError.message)
            return { success: false, error: translateAuthError(updateError.message) }
        }

        // 3. Cerrar sesión para forzar re-login con la nueva contraseña.
        //    Más robusto que refrescar sesión: el JWT queda limpio y el middleware
        //    no arrastra metadata cacheada.
        await supabase.auth.signOut()

        return { success: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Error interno'
        console.error('[changePasswordAction] unhandled:', message)
        return { success: false, error: message }
    }
}
