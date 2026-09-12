import 'server-only'
import { createClient } from '@/lib/supabase/server'

const HIGH_LEVEL_ROLES = ['SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'owner', 'admin']

/**
 * ¿El usuario autenticado puede VER un módulo?
 *
 * Contexto (auditoría 2026-07-16): hasta ahora los permisos de módulo solo
 * ocultaban enlaces del sidebar; las páginas no los verificaban, así que
 * cualquiera podía entrar escribiendo la URL. Este guard hace que el permiso
 * signifique algo del lado del servidor.
 *
 * Devuelve false si no hay sesión o si el usuario no pertenece a una empresa.
 */
export async function canViewModule(moduleKey: string): Promise<boolean> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data: ut } = await supabase
        .from('user_tenants')
        .select('role, role_id, status')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!ut || (ut.status && ut.status !== 'active')) return false
    if (HIGH_LEVEL_ROLES.includes((ut.role as string) || '')) return true
    if (!ut.role_id) return false

    const { data: perm } = await supabase
        .from('role_permissions')
        .select('can_view')
        .eq('role_id', ut.role_id)
        .eq('module_key', moduleKey)
        .maybeSingle()

    return perm?.can_view === true
}
