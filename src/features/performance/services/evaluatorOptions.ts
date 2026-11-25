import { createAdminClient } from '@/lib/supabase/admin';
import { HIGH_LEVEL_ROLES } from '@/shared/lib/moduleGuard';

export interface EvaluatorOption { id: string; name: string }

/** Personas del tenant autorizadas para evaluar (rol de alto nivel o can_edit en payroll:performance). */
export async function getEvaluatorOptions(tenantId: string, excludeUserId?: string): Promise<EvaluatorOption[]> {
    const admin = createAdminClient();
    const [{ data: members }, { data: perms }] = await Promise.all([
        admin.from('user_tenants').select('user_id, role, role_id, status').eq('tenant_id', tenantId).eq('status', 'active'),
        admin.from('role_permissions').select('role_id').eq('module_key', 'payroll:performance').eq('can_edit', true),
    ]);
    const allowedRoles = new Set((perms ?? []).map(p => p.role_id as string));
    const eligible = (members ?? []).filter(m =>
        m.user_id !== excludeUserId
        && (HIGH_LEVEL_ROLES.includes((m.role as string) || '') || allowedRoles.has(m.role_id as string))
    );
    if (!eligible.length) return [];

    const { data: profiles } = await admin
        .from('profiles')
        .select('id, full_name')
        .in('id', eligible.map(m => m.user_id as string));
    const names = new Map((profiles ?? []).map(p => [p.id as string, (p.full_name as string) || 'Sin nombre']));
    return eligible.map(m => ({ id: m.user_id as string, name: names.get(m.user_id as string) ?? 'Sin nombre' }));
}

/**
 * TODO el personal activo del tenant (evaluación 360°): cualquier persona puede ser
 * designada evaluadora de una campaña anual, sin importar su rol. El permiso real para
 * CALIFICAR lo da estar asignado como evaluador de esa evaluación (lo valida el RPC
 * `submit_annual_evaluation`), no el rol. Se usa solo en la evaluación anual; el período
 * de prueba sigue usando `getEvaluatorOptions` (evaluador responsable autorizado).
 */
export async function getAllStaffOptions(tenantId: string, excludeUserId?: string): Promise<EvaluatorOption[]> {
    const admin = createAdminClient();
    const { data: members } = await admin
        .from('user_tenants')
        .select('user_id, status')
        .eq('tenant_id', tenantId)
        .eq('status', 'active');
    const ids = (members ?? [])
        .map(m => m.user_id as string)
        .filter(id => id && id !== excludeUserId);
    if (!ids.length) return [];

    const { data: profiles } = await admin
        .from('profiles')
        .select('id, full_name')
        .in('id', ids);
    const names = new Map((profiles ?? []).map(p => [p.id as string, (p.full_name as string) || 'Sin nombre']));
    return ids
        .map(id => ({ id, name: names.get(id) ?? 'Sin nombre' }))
        .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
