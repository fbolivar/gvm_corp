'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { canViewModule } from '@/shared/lib/moduleGuard';

/**
 * Interacciones rápidas (llamada / WhatsApp / correo / nota) con un cliente.
 * Se registran a nombre del usuario autenticado; el cliente nunca envía user_id.
 */

export type InteractionChannel = 'CALL' | 'WHATSAPP' | 'EMAIL' | 'NOTE';

export interface Interaction {
    id: string;
    party_id: string;
    user_id: string;
    user_name: string;
    channel: InteractionChannel;
    template: string | null;
    note: string | null;
    created_at: string;
}

type Result<T = object> = ({ success: true } & T) | { error: string };

const logSchema = z.object({
    party_id: z.string().uuid(),
    channel: z.enum(['CALL', 'WHATSAPP', 'EMAIL', 'NOTE']),
    template: z.string().max(40).nullable().optional(),
    note: z.string().trim().max(600).nullable().optional(),
    visit_id: z.string().uuid().nullable().optional(),
});

async function ctx() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
    if (!(await canViewModule('crm'))) throw new Error('No tienes permiso para el módulo CRM');
    const { data: tenantId } = await supabase.rpc('get_my_tenant_id');
    if (!tenantId) throw new Error('No se encontró la empresa del usuario');
    return { supabase, userId: user.id, tenantId: tenantId as string };
}

/** Registra el contacto en el momento de tocar el botón. Devuelve el id para poder añadir la nota después. */
export async function logInteractionAction(input: z.input<typeof logSchema>): Promise<Result<{ id: string }>> {
    const parsed = logSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
    try {
        const c = await ctx();
        // El party_id viene del cliente: se confirma contra la RLS de parties
        // (y de crm_visits) para que la referencia sea del propio tenant.
        const { data: party } = await c.supabase.from('parties').select('id').eq('id', parsed.data.party_id).maybeSingle();
        if (!party) return { error: 'Cliente no encontrado' };
        if (parsed.data.visit_id) {
            const { data: visit } = await c.supabase.from('crm_visits').select('id').eq('id', parsed.data.visit_id).maybeSingle();
            if (!visit) return { error: 'Visita no encontrada' };
        }
        const { data, error } = await c.supabase
            .from('crm_interactions')
            .insert({
                tenant_id: c.tenantId,
                user_id: c.userId,
                party_id: parsed.data.party_id,
                channel: parsed.data.channel,
                template: parsed.data.template ?? null,
                note: parsed.data.note || null,
                visit_id: parsed.data.visit_id ?? null,
            })
            .select('id')
            .single();
        if (error) return { error: error.message };
        revalidatePath('/crm');
        revalidatePath('/crm/accounts');
        if (parsed.data.visit_id) revalidatePath(`/crm/visits/${parsed.data.visit_id}`);
        return { success: true, id: data.id as string };
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'No se pudo registrar el contacto' };
    }
}

/** Añade o corrige la nota "qué pasó" de un contacto propio. */
export async function noteInteractionAction(id: string, note: string): Promise<Result> {
    if (!z.string().uuid().safeParse(id).success) return { error: 'Registro inválido' };
    const clean = String(note ?? '').trim().slice(0, 600);
    try {
        const c = await ctx();
        // RLS: solo el autor puede actualizar; si no es suyo, 0 filas.
        const { data, error } = await c.supabase.from('crm_interactions').update({ note: clean || null }).eq('id', id).select('id');
        if (error) return { error: error.message };
        if (!data?.length) return { error: 'Solo puedes editar tus propios contactos' };
        revalidatePath('/crm');
        revalidatePath('/crm/visits', 'layout');
        return { success: true };
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'No se pudo guardar la nota' };
    }
}

export async function getPartyInteractionsAction(partyId: string, limit = 10): Promise<Interaction[]> {
    if (!z.string().uuid().safeParse(partyId).success) return [];
    try {
        const c = await ctx();
        const { data } = await c.supabase
            .from('crm_interactions')
            .select('id, party_id, user_id, channel, template, note, created_at, author:profiles!crm_interactions_user_id_fkey(full_name, email)')
            .eq('party_id', partyId)
            .order('created_at', { ascending: false })
            .limit(Math.min(limit, 50));
        return (data ?? []).map(r => {
            const a = (Array.isArray(r.author) ? r.author[0] : r.author) as { full_name?: string | null; email?: string | null } | null;
            return {
                id: r.id as string, party_id: r.party_id as string, user_id: r.user_id as string,
                user_name: a?.full_name || a?.email || 'Usuario',
                channel: r.channel as InteractionChannel, template: (r.template as string | null) ?? null,
                note: (r.note as string | null) ?? null, created_at: r.created_at as string,
            };
        });
    } catch {
        return [];
    }
}
