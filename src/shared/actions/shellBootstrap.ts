'use server'

import { createClient } from '@/lib/supabase/server'
import { getUnreadCountAction } from '@/features/notifications/actions'

const HIGH_LEVEL_ROLES = ['SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'owner', 'admin']

export interface SidebarUser {
    email: string | null
    user_metadata: { full_name?: string; avatar_url?: string }
}

export interface SidebarBootstrap {
    user: SidebarUser | null
    role: string
    permissions: Record<string, boolean>
    isPlatformAdmin: boolean
    unreadCount: number
}

/**
 * Trae en UNA sola llamada (server-side, junto a la BD) todo lo que el sidebar
 * necesitaba pedir en 5 consultas separadas desde el navegador: usuario, rol,
 * permisos, admin de plataforma y notificaciones sin leer.
 */
export async function getSidebarBootstrapAction(): Promise<SidebarBootstrap> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { user: null, role: 'Miembro', permissions: {}, isPlatformAdmin: false, unreadCount: 0 }
    }

    const [utRes, adminRes, unread] = await Promise.all([
        supabase.from('user_tenants').select('role, role_id, tenant_id').eq('user_id', user.id).maybeSingle(),
        supabase.rpc('is_platform_admin'),
        getUnreadCountAction().catch(() => 0),
    ])

    const ut = utRes.data as { role?: string; role_id?: string } | null
    const role = ut?.role || 'Miembro'
    const isPlatformAdmin = Boolean(adminRes.data)

    let permissions: Record<string, boolean> = {}
    if (ut) {
        if (HIGH_LEVEL_ROLES.includes(role)) {
            permissions = { all: true }
        } else if (ut.role_id) {
            const { data: perms } = await supabase
                .from('role_permissions')
                .select('module_key, can_view')
                .eq('role_id', ut.role_id)
            if (perms && perms.length > 0) {
                perms.forEach((p: { module_key: string; can_view: boolean }) => {
                    if (p.can_view) permissions[p.module_key] = true
                })
            } else {
                permissions = { dashboard: true }
            }
        } else {
            permissions = { dashboard: true }
        }
    }

    return {
        user: {
            email: user.email ?? null,
            user_metadata: {
                full_name: user.user_metadata?.full_name,
                avatar_url: user.user_metadata?.avatar_url,
            },
        },
        role,
        permissions,
        isPlatformAdmin,
        unreadCount: typeof unread === 'number' ? unread : 0,
    }
}
