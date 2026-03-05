"use server"

import { createClient } from "@/lib/supabase/server"
import { crmService } from "./services/crmService"
import { leadSchema, Lead } from "./types"
import { partyService } from "../parties/services/partyService"
import { Party } from "../parties/types"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createLeadAction(data: Lead) {
    const supabase = await createClient();

    const parsed = leadSchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos: " + JSON.stringify(parsed.error.format()) };
    }

    try {
        await crmService.createLead(supabase, parsed.data);
    } catch (error: any) {
        return { error: error.message };
    }

    revalidatePath('/crm/leads');
    redirect('/crm/leads');
}

export async function updateLeadAction(id: string, data: Lead) {
    const supabase = await createClient();

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

export async function updateOpportunityStageAction(id: string, stage: string) {
    const supabase = await createClient();

    try {
        await crmService.updateStage(supabase, id, stage as any);
        revalidatePath('/crm/pipeline');
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function convertLeadToOpportunityAction(leadId: string, partyData: Partial<Party>, opportunityName: string, value: number) {
    const supabase = await createClient();

    try {
        // 1. Create Party (Client)
        // Ensure minimal data is present or handle errors
        const party = await partyService.createParty(supabase, {
            ...partyData,
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

export async function createOpportunityAction(data: any) {
    const supabase = await createClient();

    try {
        const opportunity = await crmService.createOpportunity(supabase, data);
        revalidatePath('/crm/pipeline');
        revalidatePath('/crm');
        return { success: true, opportunityId: opportunity.id };
    } catch (error: any) {
        return { error: error.message };
    }
}
