import type { SupabaseClient } from '@supabase/supabase-js';
import { bogotaDateString } from '@/features/payroll/utils/bogotaTime';
import { HIGH_LEVEL_ROLES } from '@/shared/lib/moduleGuard';
import { PROBATION_DAYS, PROBATION_ALERT_FROM_DAYS } from '../types';
import { addDaysISO, diffDays } from '../utils/dates';

/** Puede evaluar: administradores de alto nivel, o un rol con can_edit en payroll:performance. */
export async function canEvaluate(client: SupabaseClient, tenantId: string, userId: string): Promise<boolean> {
    const { data: ut } = await client
        .from('user_tenants')
        .select('role, role_id, status')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .maybeSingle();
    if (!ut || (ut.status && ut.status !== 'active')) return false;
    if (HIGH_LEVEL_ROLES.includes((ut.role as string) || '')) return true;
    if (!ut.role_id) return false;

    const { data: perm } = await client
        .from('role_permissions')
        .select('can_edit')
        .eq('role_id', ut.role_id)
        .eq('module_key', 'payroll:performance')
        .maybeSingle();
    return perm?.can_edit === true;
}

/** Cargo (rol) de un usuario dentro del tenant. */
export async function getRoleIdForUser(client: SupabaseClient, tenantId: string, userId: string): Promise<string | null> {
    const { data } = await client
        .from('user_tenants')
        .select('role_id')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .maybeSingle();
    return (data?.role_id as string | null) ?? null;
}

type EmbeddedParty = { legal_name: string } | { legal_name: string }[] | null;

export function partyName(party: EmbeddedParty): string {
    const p = Array.isArray(party) ? party[0] : party;
    return p?.legal_name ?? 'Sin nombre';
}

export interface ProbationAlertCandidate {
    employeeId: string;
    name: string;
    dueDate: string;
    daysLeft: number;
}

/**
 * Empleados activos cuyo período de prueba está en la ventana de aviso
 * (entre 45 y 60 días desde el ingreso) y que aún no tienen una evaluación cerrada.
 */
export async function getProbationAlertCandidates(client: SupabaseClient): Promise<ProbationAlertCandidate[]> {
    const today = bogotaDateString();
    const hiredFrom = addDaysISO(today, -PROBATION_DAYS);
    const hiredTo = addDaysISO(today, -PROBATION_ALERT_FROM_DAYS);

    const { data: employees, error } = await client
        .from('employees')
        .select('id, start_date, party:parties(legal_name)')
        .eq('status', 'ACTIVE')
        .gte('start_date', hiredFrom)
        .lte('start_date', hiredTo);
    if (error || !employees?.length) return [];

    const ids = employees.map(e => e.id as string);
    const { data: closed } = await client
        .from('performance_evaluations')
        .select('employee_id')
        .eq('eval_type', 'PROBATION')
        .eq('status', 'CLOSED')
        .in('employee_id', ids);
    const closedIds = new Set((closed ?? []).map(c => c.employee_id as string));

    return employees
        .filter(e => !closedIds.has(e.id as string))
        .map(e => {
            const dueDate = addDaysISO(e.start_date as string, PROBATION_DAYS);
            return {
                employeeId: e.id as string,
                name: partyName(e.party as EmbeddedParty),
                dueDate,
                daysLeft: diffDays(today, dueDate),
            };
        });
}
