'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { canViewModule } from '@/shared/lib/moduleGuard';
import { visitService } from '../services/visitService';
import { accountService } from '../services/accountService';

/**
 * Cartera y metas: solo gerencia (misma regla que "ver todo el equipo" en
 * el planeador de visitas). Un comercial ve su cartera pero no la reparte.
 */

type Result<T = object> = ({ success: true } & T) | { error: string };

async function managerCtx() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
    if (!(await canViewModule('crm'))) throw new Error('No tienes permiso para el módulo CRM');
    if (!(await visitService.canSeeAllVisits(supabase, user.id))) throw new Error('Solo gerencia puede hacer esto');
    const { data: tenantId } = await supabase.rpc('get_my_tenant_id');
    if (!tenantId) throw new Error('No se encontró la empresa del usuario');
    return { supabase, userId: user.id, tenantId: tenantId as string };
}

const assignSchema = z.object({
    party_ids: z.array(z.string().uuid()).min(1, 'Selecciona al menos un cliente').max(2000),
    salesperson_id: z.string().uuid().nullable(),
});

export async function assignAccountsAction(input: z.input<typeof assignSchema>): Promise<Result<{ count: number }>> {
    const parsed = assignSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
    try {
        const c = await managerCtx();
        if (parsed.data.salesperson_id) {
            const team = await visitService.getSalespeople(c.supabase, c.userId);
            if (!team.some(s => s.id === parsed.data.salesperson_id)) return { error: 'El comercial no pertenece al equipo' };
        }
        const count = await accountService.assignAccounts(c.supabase, parsed.data.party_ids, parsed.data.salesperson_id);
        revalidatePath('/crm');
        revalidatePath('/crm/accounts');
        return { success: true, count };
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'No se pudo asignar la cartera' };
    }
}

const targetsSchema = z.object({
    period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mes inválido'),
    targets: z.array(z.object({
        salesperson_id: z.string().uuid(),
        target_amount: z.coerce.number().min(0).max(1e12),
        target_visits: z.coerce.number().int().min(0).max(1000),
    })).min(1).max(200),
});

export async function saveTargetsAction(input: z.input<typeof targetsSchema>): Promise<Result> {
    const parsed = targetsSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
    try {
        const c = await managerCtx();
        const team = new Set((await visitService.getSalespeople(c.supabase, c.userId)).map(s => s.id));
        for (const t of parsed.data.targets) {
            if (!team.has(t.salesperson_id)) return { error: 'Hay un comercial que no pertenece al equipo' };
            await accountService.upsertTarget(c.supabase, c.tenantId, c.userId, { ...t, period: parsed.data.period });
        }
        revalidatePath('/crm');
        revalidatePath('/crm/targets');
        return { success: true };
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'No se pudieron guardar las metas' };
    }
}
