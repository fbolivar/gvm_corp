'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { canEvaluate } from './services/performanceService';
import { requireEvaluatorContext } from './services/evaluatorContext';
import {
    annualCampaignSchema,
    addEvaluatorSchema,
    annualSubmitSchema,
} from './types';

type ActionResult = { success?: true; error?: string; value?: number | string };

function revalidateAll(evaluationId?: string) {
    revalidatePath('/payroll/performance');
    if (evaluationId) revalidatePath(`/payroll/performance/${evaluationId}`);
}

export async function openAnnualCampaignAction(input: unknown): Promise<ActionResult> {
    const ctx = await requireEvaluatorContext();
    if ('error' in ctx) return { error: ctx.error };

    const parsed = annualCampaignSchema.safeParse(input);
    if (!parsed.success) return { error: 'Revisa el nombre y las fechas de la campaña' };

    const { data, error } = await ctx.supabase.rpc('open_annual_campaign', {
        p_name: parsed.data.name,
        p_opens: parsed.data.opensOn,
        p_closes: parsed.data.closesOn,
    });
    if (error) return { error: error.message };

    revalidateAll();
    return { success: true, value: data as number };
}

export async function closeAnnualCampaignAction(campaignId: unknown): Promise<ActionResult> {
    const ctx = await requireEvaluatorContext();
    if ('error' in ctx) return { error: ctx.error };

    const parsed = z.string().uuid().safeParse(campaignId);
    if (!parsed.success) return { error: 'Campaña inválida' };

    const { error } = await ctx.supabase.rpc('close_annual_campaign', { p_campaign: parsed.data });
    if (error) return { error: error.message };

    revalidateAll();
    return { success: true };
}

/**
 * Asigna un evaluador con peso a una evaluación anual abierta. El evaluador debe
 * estar autorizado para evaluar (se valida con admin client porque mira el rol de otra persona).
 */
export async function addAnnualEvaluatorAction(input: unknown): Promise<ActionResult> {
    const ctx = await requireEvaluatorContext();
    if ('error' in ctx) return { error: ctx.error };

    const parsed = addEvaluatorSchema.safeParse(input);
    if (!parsed.success) return { error: 'Revisa evaluador y peso (mayor que 0, máximo 10)' };
    const { evaluationId, evaluatorId, weight } = parsed.data;

    const { data: evaluation } = await ctx.supabase
        .from('performance_evaluations')
        .select('id, eval_type, status, campaign_id')
        .eq('id', evaluationId)
        .maybeSingle();
    if (!evaluation || evaluation.eval_type !== 'ANNUAL') return { error: 'Evaluación anual no encontrada' };
    if (evaluation.status === 'CLOSED') return { error: 'Esta evaluación ya está cerrada' };

    const admin = createAdminClient();
    if (!(await canEvaluate(admin, ctx.tenantId, evaluatorId))) {
        return { error: 'La persona seleccionada no está autorizada para evaluar' };
    }

    const { error } = await ctx.supabase
        .from('performance_evaluators')
        .insert({ tenant_id: ctx.tenantId, evaluation_id: evaluationId, evaluator_id: evaluatorId, weight });
    if (error) {
        return { error: error.code === '23505'
            ? 'Esa persona ya es evaluadora de esta evaluación'
            : 'No se pudo asignar el evaluador' };
    }

    revalidateAll(evaluationId);
    return { success: true };
}

export async function submitAnnualEvaluationAction(input: unknown): Promise<ActionResult> {
    const ctx = await requireEvaluatorContext();
    if ('error' in ctx) return { error: ctx.error };

    const parsed = annualSubmitSchema.safeParse(input);
    if (!parsed.success) return { error: 'Revisa las calificaciones: todas deben ser de 1 a 5' };
    const { evaluationId, scores } = parsed.data;

    const { data, error } = await ctx.supabase.rpc('submit_annual_evaluation', {
        p_evaluation: evaluationId,
        p_scores: scores.map(s => ({
            criterionId: s.criterionId,
            score: s.score,
            comment: s.comment?.trim() || null,
        })),
    });
    if (error) return { error: error.message };

    revalidateAll(evaluationId);
    return { success: true, value: data as string };
}

