'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { AppNotification, NotificationPriority } from './types'

export type NotificationFilter = 'all' | 'unread' | 'critical'

export interface ActionResult {
    success: boolean
    error?: string
}

export interface GetNotificationsResult {
    data: AppNotification[]
    error?: string
}

// ─── markAsReadAction ────────────────────────────────────────────────────────

export async function markAsReadAction(id: string): Promise<ActionResult> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'No autenticado' }
        }

        // Notificaciones pueden tener user_id = user.id O user_id IS NULL (tenant-wide)
        // RLS ya garantiza que solo se ven las propias o las del tenant
        const { error } = await supabase
            .from('app_notifications')
            .update({ is_read: true })
            .eq('id', id)

        if (error) {
            return { success: false, error: error.message }
        }

        revalidatePath('/notifications')
        return { success: true }
    } catch (err) {
        return { success: false, error: String(err) }
    }
}

// ─── markAllAsReadAction ─────────────────────────────────────────────────────

export async function markAllAsReadAction(): Promise<ActionResult> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'No autenticado' }
        }

        const { data: userTenant } = await supabase
            .from('user_tenants')
            .select('tenant_id')
            .eq('user_id', user.id)
            .maybeSingle()

        const query = supabase
            .from('app_notifications')
            .update({ is_read: true })
            .eq('is_read', false)

        if (userTenant?.tenant_id) {
            await query.or(
                `user_id.eq.${user.id},and(user_id.is.null,tenant_id.eq.${userTenant.tenant_id})`
            )
        } else {
            await query.eq('user_id', user.id)
        }

        revalidatePath('/notifications')
        return { success: true }
    } catch (err) {
        return { success: false, error: String(err) }
    }
}

// ─── deleteNotificationAction ────────────────────────────────────────────────

export async function deleteNotificationAction(id: string): Promise<ActionResult> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'No autenticado' }
        }

        const { error } = await supabase
            .from('app_notifications')
            .delete()
            .eq('id', id)

        if (error) {
            return { success: false, error: error.message }
        }

        revalidatePath('/notifications')
        return { success: true }
    } catch (err) {
        return { success: false, error: String(err) }
    }
}

// ─── getNotificationsAction ──────────────────────────────────────────────────

// Mapeo categoría → módulos requeridos (el usuario debe tener AL MENOS UNO)
const CATEGORY_TO_MODULES: Record<string, string[]> = {
    BILLING: ['accounting', 'sales', 'treasury', 'dian'],
    INVENTORY: ['inventory', 'logistics'],
    OPERATIONS: ['logistics', 'production', 'payroll'],
}

const HIGH_LEVEL_ROLES = ['SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'owner', 'admin']

export async function getNotificationsAction(
    filter: NotificationFilter = 'all'
): Promise<GetNotificationsResult> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { data: [], error: 'No autenticado' }
        }

        const { data: userTenant } = await supabase
            .from('user_tenants')
            .select('tenant_id, role, role_id')
            .eq('user_id', user.id)
            .maybeSingle()

        // Resolver categorías PROHIBIDAS según permisos del rol.
        // Admins ven todo. Resto: excluimos categorías cuyos módulos NO tenga autorizados.
        // Usamos .not(..., 'in', ...) para no pisar el .or() de user/tenant filter.
        const isAdmin = userTenant?.role ? HIGH_LEVEL_ROLES.includes(userTenant.role) : false
        let forbiddenCategories: string[] = []

        if (!isAdmin && userTenant?.role_id) {
            const { data: perms } = await supabase
                .from('role_permissions')
                .select('module_key')
                .eq('role_id', userTenant.role_id)
                .eq('can_view', true)
            const allowedModules = new Set((perms ?? []).map(p => p.module_key))
            forbiddenCategories = Object.entries(CATEGORY_TO_MODULES)
                .filter(([, mods]) => !mods.some(m => allowedModules.has(m)))
                .map(([cat]) => cat)
        }

        let query = supabase
            .from('app_notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)

        if (userTenant?.tenant_id) {
            query = query.or(
                `user_id.eq.${user.id},and(user_id.is.null,tenant_id.eq.${userTenant.tenant_id})`
            )
        } else {
            query = query.eq('user_id', user.id)
        }

        if (filter === 'unread') {
            query = query.eq('is_read', false)
        } else if (filter === 'critical') {
            query = query.in('priority', ['CRITICAL', 'HIGH'] as NotificationPriority[])
        }

        // Excluir categorías prohibidas (los null/sin categoría pasan siempre)
        if (forbiddenCategories.length > 0) {
            const forbiddenCsv = forbiddenCategories.map(c => `"${c}"`).join(',')
            query = query.not('category', 'in', `(${forbiddenCsv})`)
        }

        const { data, error } = await query

        if (error) {
            return { data: [], error: error.message }
        }

        return { data: (data as AppNotification[]) ?? [] }
    } catch (err) {
        return { data: [], error: String(err) }
    }
}

// ─── getUnreadCountAction ─────────────────────────────────────────────────────

export async function getUnreadCountAction(): Promise<number> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return 0

        const { data: userTenant } = await supabase
            .from('user_tenants')
            .select('tenant_id, role, role_id')
            .eq('user_id', user.id)
            .maybeSingle()

        // Mismo filtrado que getNotificationsAction — usando .not(...,'in',...) para
        // no pisar el .or() user/tenant previo.
        const isAdmin = userTenant?.role ? HIGH_LEVEL_ROLES.includes(userTenant.role) : false
        let forbiddenCategories: string[] = []

        if (!isAdmin && userTenant?.role_id) {
            const { data: perms } = await supabase
                .from('role_permissions')
                .select('module_key')
                .eq('role_id', userTenant.role_id)
                .eq('can_view', true)
            const allowedModules = new Set((perms ?? []).map(p => p.module_key))
            forbiddenCategories = Object.entries(CATEGORY_TO_MODULES)
                .filter(([, mods]) => !mods.some(m => allowedModules.has(m)))
                .map(([cat]) => cat)
        }

        let query = supabase
            .from('app_notifications')
            .select('id', { count: 'exact', head: true })
            .eq('is_read', false)

        if (userTenant?.tenant_id) {
            query = query.or(
                `user_id.eq.${user.id},and(user_id.is.null,tenant_id.eq.${userTenant.tenant_id})`
            )
        } else {
            query = query.eq('user_id', user.id)
        }

        if (forbiddenCategories.length > 0) {
            const forbiddenCsv = forbiddenCategories.map(c => `"${c}"`).join(',')
            query = query.not('category', 'in', `(${forbiddenCsv})`)
        }

        const { count } = await query
        return count ?? 0
    } catch {
        return 0
    }
}

// ─── triggerSystemAlertsAction ───────────────────────────────────────────────

export async function triggerSystemAlertsAction(): Promise<ActionResult> {
    try {
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return { success: false, error: 'No autenticado' }
        }

        const { smartAlertService } = await import('./services/smartAlertService')
        await smartAlertService.evaluateAndTriggerAlerts(supabase)

        revalidatePath('/notifications')
        return { success: true }
    } catch (err) {
        return { success: false, error: String(err) }
    }
}
