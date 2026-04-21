'use server'

import { createClient } from '@/lib/supabase/server'
import { translateAuthError } from '@/shared/lib/auth-errors'

export interface ChangePasswordResult {
    success: boolean
    error?: string
}

/**
 * Cambia la contraseña del usuario autenticado y limpia el flag
 * must_change_password en user_metadata. Usado en el flujo de primer login.
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

        // Regla mínima: al menos una letra y un número para evitar "12345678"
        if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return { success: false, error: 'La contraseña debe contener letras y números' }
        }

        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'Sesión no válida. Vuelve a iniciar sesión.' }
        }

        // updateUser permite al propio usuario cambiar password + metadata en una sola llamada
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
            data: {
                ...user.user_metadata,
                must_change_password: false,
            },
        })

        if (updateError) {
            return { success: false, error: translateAuthError(updateError.message) }
        }

        return { success: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Error interno'
        return { success: false, error: message }
    }
}
