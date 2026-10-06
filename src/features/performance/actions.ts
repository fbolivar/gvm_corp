'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { settingsService } from '@/features/settings/services/settingsService';
import { canViewModule } from '@/shared/lib/moduleGuard';
import { canEvaluate, getRoleIdForUser } from './services/performanceService';
import { addDaysISO } from './utils/dates';
import { probationCreateSchema, probationSubmitSchema, PROBATION_DAYS } from './types';

type ActionResult = { success?: true; error?: string };

async function requireEvaluatorContext() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' as const };

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) return { error: 'Tenant no encontrado' as const };

    const allowed = await canViewModule('payroll:performance') && await canEvaluate(supabase, tenant.id, user.id);
    if (!allowed) return { error: 'No tienes permiso para gestionar evaluaciones de desempeño' as const };

    return { supabase, user, tenantId: tenant.id as string };
}

/**
 * Crea la evaluación de período de prueba de un empleado activo y asigna su
 * evaluador responsable. El cargo se congela en `role_id_snapshot` para que la
 * evaluación siga midiendo el cargo de contratación aunque el empleado cambie de rol.
 */
export async function createProbationEvaluationAction(input: unknown): Promise<ActionResult> {
    const ctx = await requireEvaluatorContext();
    if ('error' in ctx) return { error: ctx.error };

    const parsed = probationCreateSchema.safeParse(input);
    if (!parsed.success) return { error: 'Datos inválidos' };
    const { employeeId, evaluatorId } = parsed.data;

    const { supabase, user, tenantId } = ctx;
    const admin = createAdminClient();

    const { data: employee } = await supabase
        .from('employees')
        .select('id, status, start_date, user_id')
        .eq('id', employeeId)
        .maybeSingle();
    if (!employee) return { error: 'Empleado no encontrado' };
    if (employee.status !== 'ACTIVE') return { error: 'Solo se evalúan empleados activos' };
    if (!employee.user_id) return { error: 'El empleado no tiene usuario vinculado, no se puede determinar su cargo' };

    const roleId = await getRoleIdForUser(admin, tenantId, employee.user_id as string);
    if (!roleId) return { error: 'El empleado no tiene un cargo (rol) asignado en el sistema' };

    const evaluatorOk = await canEvaluate(admin, tenantId, evaluatorId);
    if (!evaluatorOk) return { error: 'La persona seleccionada no está autorizada para evaluar' };

    const { data: created, error: insertError } = await supabase
        .from('performance_evaluations')
        .insert({
            tenant_id: tenantId,
            employee_id: employeeId,
            eval_type: 'PROBATION',
            role_id_snapshot: roleId,
            status: 'PENDING',
            due_date: addDaysISO(employee.start_date as string, PROBATION_DAYS),
            created_by: user.id,
        })
        .select('id')
        .single();
    if (insertError || !created) {
        return { error: insertError?.code === '23505'
            ? 'Este empleado ya tiene una evaluación de período de prueba abierta'
            : 'No se pudo crear la evaluación' };
    }

    const { error: evaluatorError } = await supabase
        .from('performance_evaluators')
        .insert({
            tenant_id: tenantId,
            evaluation_id: created.id,
            evaluator_id: evaluatorId,
            weight: 1,
        });
    if (evaluatorError) {
        await supabase.from('performance_evaluations').delete().eq('id', created.id);
        return { error: 'No se pudo asignar el evaluador' };
    }

    revalidatePath('/payroll/performance');
    return { success: true };
}

/**
 * Registra la calificación del evaluador asignado y cierra la evaluación en una
 * sola transacción (función `close_probation_evaluation`). Los criterios exigidos
 * se calculan en la base a partir del cargo congelado; el cliente no puede omitir
 * ni inventar criterios.
 */
export async function submitProbationEvaluationAction(input: unknown): Promise<ActionResult> {
    const ctx = await requireEvaluatorContext();
    if ('error' in ctx) return { error: ctx.error };

    const parsed = probationSubmitSchema.safeParse(input);
    if (!parsed.success) return { error: 'Revisa las calificaciones: todas deben ser de 1 a 5' };
    const { evaluationId, scores, outcomeComments } = parsed.data;

    const { supabase } = ctx;

    const { error } = await supabase.rpc('close_probation_evaluation', {
        p_evaluation: evaluationId,
        p_scores: scores.map(s => ({
            criterionId: s.criterionId,
            score: s.score,
            comment: s.comment?.trim() || null,
        })),
        p_comments: outcomeComments?.trim() || null,
    });
    if (error) return { error: error.message };

    revalidatePath('/payroll/performance');
    revalidatePath(`/payroll/performance/${evaluationId}`);
    return { success: true };
}
