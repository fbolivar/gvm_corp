'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { canViewModule } from '@/shared/lib/moduleGuard';
import { visitService } from '../services/visitService';
import { bogotaDateString } from '@/features/payroll/utils/bogotaTime';
import {
    visitOutcomeSchema, visitPlanSchema,
    type PartyCommercialSnapshot, type VisitOutcomeInput, type VisitPlanInput,
} from '../types/visits';

/**
 * Server Actions del planeador de visitas.
 *
 * Regla de acceso: un comercial gestiona SOLO sus visitas; los roles de
 * gerencia (ver visitService.canSeeAllVisits) gestionan las de todo el equipo.
 * El comercial de una visita nueva se fuerza al usuario actual salvo que quien
 * crea sea gerente.
 */

type Result<T = object> = ({ success: true } & T) | { error: string; field?: string };

async function ctx() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
    // Las Server Actions se pueden invocar sin pasar por la página: el permiso
    // de módulo se verifica aquí, no solo en el layout.
    if (!(await canViewModule('crm'))) throw new Error('No tienes permiso para el módulo CRM');
    const { data: tenantId } = await supabase.rpc('get_my_tenant_id');
    if (!tenantId) throw new Error('No se encontró la empresa del usuario');
    const manager = await visitService.canSeeAllVisits(supabase, user.id);
    return { supabase, userId: user.id, tenantId: tenantId as string, manager };
}

function firstIssue(e: { issues: { path: PropertyKey[]; message: string }[] }) {
    const i = e.issues[0];
    return { error: i?.message ?? 'Datos inválidos', field: i?.path?.[0] != null ? String(i.path[0]) : undefined };
}

function revalidate(id?: string) {
    revalidatePath('/crm/visits');
    revalidatePath('/crm/visits/board');
    if (id) revalidatePath(`/crm/visits/${id}`);
}

export async function createVisitAction(input: VisitPlanInput): Promise<Result<{ id: string }>> {
    const parsed = visitPlanSchema.safeParse(input);
    if (!parsed.success) return firstIssue(parsed.error);
    try {
        const c = await ctx();
        const data = c.manager ? parsed.data : { ...parsed.data, salesperson_id: c.userId };
        const id = await visitService.create(c.supabase, c.tenantId, c.userId, data);
        revalidate(id);
        return { success: true, id };
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'No se pudo crear la visita' };
    }
}

async function assertCanEdit(c: Awaited<ReturnType<typeof ctx>>, id: string) {
    const visit = await visitService.getById(c.supabase, id);
    if (!visit) throw new Error('La visita no existe');
    if (!c.manager && visit.salesperson_id !== c.userId) throw new Error('Solo puedes modificar tus propias visitas');
    return visit;
}

export async function updateVisitPlanAction(id: string, input: VisitPlanInput): Promise<Result> {
    const parsed = visitPlanSchema.safeParse(input);
    if (!parsed.success) return firstIssue(parsed.error);
    try {
        const c = await ctx();
        const current = await assertCanEdit(c, id);
        const data = c.manager ? parsed.data : { ...parsed.data, salesperson_id: current.salesperson_id };
        await visitService.updatePlan(c.supabase, id, data);
        revalidate(id);
        return { success: true };
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'No se pudo guardar' };
    }
}

export async function recordVisitOutcomeAction(id: string, input: VisitOutcomeInput): Promise<Result> {
    const parsed = visitOutcomeSchema.safeParse(input);
    if (!parsed.success) return firstIssue(parsed.error);
    try {
        const c = await ctx();
        await assertCanEdit(c, id);
        await visitService.recordOutcome(c.supabase, id, parsed.data);
        revalidate(id);
        return { success: true };
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'No se pudo registrar el resultado' };
    }
}

export async function deleteVisitAction(id: string): Promise<Result> {
    try {
        const c = await ctx();
        const visit = await assertCanEdit(c, id);
        if (visit.status === 'REALIZADA') return { error: 'Una visita realizada no se elimina; queda como historial del cliente.' };
        await visitService.remove(c.supabase, id);
        revalidate();
        return { success: true };
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'No se pudo eliminar' };
    }
}

/** Ficha comercial en vivo para el formulario (al elegir cliente). */
export async function getPartySnapshotAction(partyId: string): Promise<PartyCommercialSnapshot | { error: string }> {
    if (!/^[0-9a-f-]{36}$/i.test(partyId)) return { error: 'Cliente inválido' };
    try {
        const { supabase } = await ctx();
        return await visitService.getPartySnapshot(supabase, partyId, bogotaDateString());
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'No se pudo calcular la ficha' };
    }
}
