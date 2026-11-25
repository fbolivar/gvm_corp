"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { canViewModule } from "@/shared/lib/moduleGuard"
import type { SupabaseClient } from "@supabase/supabase-js"
import { crmService } from "./services/crmService"
import { leadSchema, Lead } from "./types"
import { partyService } from "../parties/services/partyService"
import { Party } from "../parties/types"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

/** Guard común de las Server Actions del CRM: sesión + permiso de módulo. */
async function crmGuard(supabase: SupabaseClient): Promise<{ userId: string } | { error: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };
    if (!(await canViewModule('crm'))) return { error: "Sin permiso para el CRM" };
    return { userId: user.id };
}

/**
 * Verifica que party_id/lead_id (si vienen) pertenezcan al tenant del usuario.
 * La FK de Postgres NO respeta RLS: un uuid de otro tenant pasaría el INSERT y
 * serviría de oráculo de existencia. Se confirma con el cliente de SESIÓN, cuya
 * RLS ya filtra por tenant.
 */
async function assertOppRefs(supabase: SupabaseClient, refs: { party_id?: string | null; lead_id?: string | null }): Promise<string | null> {
    if (refs.party_id) {
        const { data } = await supabase.from('parties').select('id').eq('id', refs.party_id).maybeSingle();
        if (!data) return "El cliente seleccionado no existe o no pertenece a tu empresa.";
    }
    if (refs.lead_id) {
        const { data } = await supabase.from('leads').select('id').eq('id', refs.lead_id).maybeSingle();
        if (!data) return "El prospecto seleccionado no existe o no pertenece a tu empresa.";
    }
    return null;
}

const oppValueSchema = z.coerce.number().finite().min(0).max(1e13);

export async function createLeadAction(data: Lead) {
    const supabase = await createClient();
    const guard = await crmGuard(supabase);
    if ('error' in guard) return guard;

    const parsed = leadSchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos: " + JSON.stringify(parsed.error.format()) };
    }

    // La RLS de `leads` exige tenant_id = get_my_tenant_id() en el INSERT.
    // Sin esto, crear un prospecto siempre falla.
    const { data: tenantId } = await supabase.rpc('get_my_tenant_id');
    if (!tenantId) {
        return { error: "No se encontró el tenant del usuario" };
    }

    try {
        await crmService.createLead(supabase, { ...parsed.data, tenant_id: tenantId as string });
    } catch (error: any) {
        return { error: error.message };
    }

    revalidatePath('/crm/leads');
    redirect('/crm/leads');
}

export async function updateLeadAction(id: string, data: Lead) {
    const supabase = await createClient();
    const guard = await crmGuard(supabase);
    if ('error' in guard) return guard;

    const parsed = leadSchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos" };
    }

    try {
        await crmService.updateLead(supabase, id, parsed.data);
    } catch (error: any) {
        return { error: error.message };
    }

    revalidatePath('/crm/leads');
    redirect('/crm/leads');
}

export async function updateOpportunityStageAction(id: string, stage: string): Promise<{ success?: boolean; probability?: number; error?: string }> {
    const supabase = await createClient();
    const guard = await crmGuard(supabase);
    if ('error' in guard) return guard;

    try {
        const result = await crmService.updateStage(supabase, id, stage as any);
        revalidatePath('/crm/pipeline');
        revalidatePath('/crm/forecast');
        revalidatePath(`/crm/opportunities/${id}`);
        return { success: true, probability: result.probability };
    } catch (error: unknown) {
        const err = error as Record<string, unknown>;
        const msg = (typeof err?.message === 'string' ? err.message : null)
            ?? (error instanceof Error ? error.message : null)
            ?? 'Error al cambiar etapa';
        return { error: msg };
    }
}

export async function addActivityAction(opportunityId: string, data: { type: string; title: string; description?: string }) {
    const supabase = await createClient();

    try {
        await crmService.addActivity(supabase, {
            opportunity_id: opportunityId,
            ...data,
        });
        revalidatePath(`/crm/opportunities/${opportunityId}`);
        return { success: true };
    } catch (error: unknown) {
        const err = error as Record<string, unknown>;
        const msg = (typeof err?.message === 'string' ? err.message : null)
            ?? (error instanceof Error ? error.message : null)
            ?? 'Error al registrar actividad';
        return { error: msg };
    }
}

export async function convertLeadToOpportunityAction(leadId: string, partyData: Partial<Party>, opportunityName: string, value: number) {
    const supabase = await createClient();

    // parties y crm_opportunities exigen tenant_id = get_my_tenant_id() en el INSERT (RLS).
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };
    const { data: tenantId } = await supabase.rpc('get_my_tenant_id');
    if (!tenantId) return { error: "No se encontró el tenant del usuario" };

    try {
        // 1. Create Party (Client)
        const party = await partyService.createParty(supabase, {
            ...partyData,
            tenant_id: tenantId as string,
            is_customer: true,
            is_vendor: false
        } as Party);

        // 2. Create Opportunity
        const opportunity = await crmService.createOpportunity(supabase, {
            name: opportunityName,
            value: value,
            stage: 'PROSPECTING',
            lead_id: leadId,
            party_id: party.id,
            probability: 10, // Initial probability
            tenant_id: tenantId as string,
            assigned_to: user.id,
        });

        // 3. Update Lead Status
        await crmService.updateLead(supabase, leadId, { status: 'CONVERTED' });

        revalidatePath('/crm/leads');
        revalidatePath('/crm/pipeline');
        return { success: true, opportunityId: opportunity.id };
    } catch (error: any) {
        console.error("Error converting lead:", error);
        return { error: error.message };
    }
}

export async function deleteLeadAction(id: string) {
    const supabase = await createClient();

    try {
        await crmService.deleteLead(supabase, id);
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : "Error al eliminar" };
    }

    revalidatePath('/crm/leads');
    revalidatePath('/crm');
    return { success: true };
}

export async function updateOpportunityAction(id: string, data: Record<string, unknown>) {
    const supabase = await createClient();
    const guard = await crmGuard(supabase);
    if ('error' in guard) return guard;

    // Payload PARCIAL: solo se tocan las claves que vienen en `data`. Antes el
    // payload fijaba expected_close_date/lead_id/party_id/description con
    // `x || null`, así que un editor que mandaba solo { value } BORRABA esos
    // campos (null no lo quita el filtro de undefined). Ahora un campo ausente
    // no se toca.
    const payload: Record<string, unknown> = {};
    if ('name' in data) payload.name = data.name;
    if ('value' in data) {
        const v = oppValueSchema.safeParse(data.value);
        if (!v.success) return { error: "El valor del negocio no es válido." };
        payload.value = v.data;
    }
    if ('probability' in data) {
        const p = z.coerce.number().int().min(0).max(100).safeParse(data.probability);
        if (!p.success) return { error: "La probabilidad debe estar entre 0 y 100." };
        payload.probability = p.data;
    }
    if ('expected_close_date' in data) payload.expected_close_date = data.expected_close_date || null;
    if ('lead_id' in data) payload.lead_id = data.lead_id || null;
    if ('party_id' in data) payload.party_id = data.party_id || null;
    if ('notes' in data || 'description' in data) payload.description = (data.notes as string) || (data.description as string) || null;
    if ('stage' in data && data.stage) payload.stage = data.stage;

    const refErr = await assertOppRefs(supabase, { party_id: payload.party_id as string | null, lead_id: payload.lead_id as string | null });
    if (refErr) return { error: refErr };

    try {
        const opportunity = await crmService.updateOpportunity(supabase, id, payload as Parameters<typeof crmService.updateOpportunity>[2]);
        revalidatePath('/crm/pipeline');
        revalidatePath('/crm');
        revalidatePath('/crm/forecast');
        return { success: true, opportunityId: opportunity.id };
    } catch (error: unknown) {
        const err = error as Record<string, unknown>;
        const msg = (typeof err?.message === 'string' ? err.message : null)
            ?? (error instanceof Error ? error.message : null)
            ?? JSON.stringify(error);
        console.error('[crm] updateOpportunityAction:', msg, error);
        return { error: msg };
    }
}

/** Edición rápida SOLO del valor (editor inline de la ficha). No toca otros campos. */
export async function updateOpportunityValueAction(id: string, value: number): Promise<{ success?: boolean; error?: string }> {
    const supabase = await createClient();
    const guard = await crmGuard(supabase);
    if ('error' in guard) return guard;

    const v = oppValueSchema.safeParse(value);
    if (!v.success) return { error: "El valor del negocio no es válido." };

    try {
        // La RLS de crm_opportunities (ALL por tenant) impide tocar la de otro tenant.
        await crmService.updateOpportunity(supabase, id, { value: v.data } as Parameters<typeof crmService.updateOpportunity>[2]);
        revalidatePath('/crm/pipeline');
        revalidatePath('/crm');
        revalidatePath('/crm/forecast');
        revalidatePath(`/crm/opportunities/${id}`);
        return { success: true };
    } catch (error: unknown) {
        const err = error as Record<string, unknown>;
        const msg = (typeof err?.message === 'string' ? err.message : null)
            ?? (error instanceof Error ? error.message : null)
            ?? 'Error al actualizar el valor';
        return { error: msg };
    }
}

export async function deleteOpportunityAction(id: string): Promise<{ success?: boolean; error?: string }> {
    const supabase = await createClient();
    const guard = await crmGuard(supabase);
    if ('error' in guard) return guard;

    try {
        const { error } = await supabase
            .from('crm_opportunities')
            .delete()
            .eq('id', id);

        if (error) throw error;

        revalidatePath('/crm/pipeline');
        revalidatePath('/crm');
        revalidatePath('/crm/forecast');
        return { success: true };
    } catch (error: unknown) {
        const err = error as Record<string, unknown>;
        const msg = (typeof err?.message === 'string' ? err.message : null)
            ?? (error instanceof Error ? error.message : null)
            ?? JSON.stringify(error);
        console.error('[crm] deleteOpportunityAction:', msg, error);
        return { error: msg };
    }
}

export async function createOpportunityAction(data: Record<string, unknown>) {
    const supabase = await createClient();
    const guard = await crmGuard(supabase);
    if ('error' in guard) return guard;
    const user = { id: guard.userId };

    const { data: tenantRow } = await supabase.rpc('get_my_tenant_id');
    if (!tenantRow) return { error: "No se encontró el tenant" };

    const refErr = await assertOppRefs(supabase, { party_id: (data.party_id as string) || null, lead_id: (data.lead_id as string) || null });
    if (refErr) return { error: refErr };

    const payload = {
        name: data.name,
        value: data.value,
        probability: data.probability,
        expected_close_date: data.expected_close_date || null,
        lead_id: data.lead_id || null,
        party_id: data.party_id || null,
        description: (data.notes as string) || (data.description as string) || null,
        tenant_id: tenantRow as string,
        assigned_to: (data.assigned_to as string) || user.id,
        stage: (data.stage as string) || 'PROSPECTING',
    };

    try {
        const opportunity = await crmService.createOpportunity(supabase, payload as Parameters<typeof crmService.createOpportunity>[1]);
        revalidatePath('/crm/pipeline');
        revalidatePath('/crm');
        revalidatePath('/crm/forecast');
        return { success: true, opportunityId: opportunity.id };
    } catch (error: unknown) {
        // PostgrestError has .message but is NOT instanceof Error
        const err = error as Record<string, unknown>;
        const msg = (typeof err?.message === 'string' ? err.message : null)
            ?? (error instanceof Error ? error.message : null)
            ?? JSON.stringify(error);
        console.error('[crm] createOpportunityAction:', msg, error);
        return { error: msg };
    }
}
