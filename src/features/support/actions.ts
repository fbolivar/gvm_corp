"use server"

import { createClient } from "@/lib/supabase/server"
import { supportService } from "./services/supportService"
import { revalidatePath } from "next/cache"
import { Ticket } from "./types"

export async function createTicketAction(data: Partial<Ticket>) {
    const supabase = await createClient();
    try {
        const ticket = await supportService.createTicket(supabase, data);
        revalidatePath('/support');
        return { data: ticket };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function addInteractionAction(ticketId: string, content: string, isInternal: boolean = false) {
    const supabase = await createClient();
    try {
        const interaction = await supportService.addInteraction(supabase, {
            ticket_id: ticketId,
            content,
            is_internal: isInternal
        });
        revalidatePath(`/support/tickets/${ticketId}`);
        return { data: interaction };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function updateTicketStatusAction(id: string, status: string, prevState: any) {
    const supabase = await createClient();
    try {
        const ticket = await supportService.updateTicketStatus(supabase, id, status, prevState);
        revalidatePath(`/support/tickets/${id}`);
        revalidatePath('/support');
        return { data: ticket };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function getCustomer360Action(partyId: string) {
    const supabase = await createClient();
    try {
        return await supportService.getCustomer360(supabase, partyId);
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function generateRMAAction(ticketId: string) {
    const supabase = await createClient();
    try {
        const movement = await supportService.generateRMA(supabase, ticketId);
        revalidatePath(`/support/tickets/${ticketId}`);
        return { data: movement };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function generateCreditNoteAction(ticketId: string) {
    const supabase = await createClient();
    try {
        const document = await supportService.generateCreditNoteDraft(supabase, ticketId);
        revalidatePath(`/support/tickets/${ticketId}`);
        return { data: document };
    } catch (error: any) {
        return { error: error.message };
    }
}
