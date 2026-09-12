"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
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

export async function assignTicketAction(id: string, userId: string | null, prevUserId: string | null) {
    const supabase = await createClient();
    try {
        const ticket = await supportService.assignTicket(supabase, id, userId, prevUserId);
        revalidatePath(`/support/tickets/${id}`);
        revalidatePath('/support');
        return { data: ticket };
    } catch (error: any) {
        return { error: error.message };
    }
}

/** Lista los usuarios del tenant que pueden ser responsables de un ticket. */
export async function getAssignableUsersAction(): Promise<{ id: string; name: string }[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // user_tenants está scopeado por RLS al tenant del usuario; profiles requiere
    // admin client para poder ver a todo el equipo (la política solo deja ver el propio).
    const { data: tenantUsers } = await supabase.from('user_tenants').select('user_id');
    const ids = (tenantUsers ?? []).map((t) => t.user_id as string);
    if (ids.length === 0) return [];

    const admin = createAdminClient();
    const { data: profiles } = await admin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);

    return (profiles ?? [])
        .map((p) => ({ id: p.id as string, name: (p.full_name as string) || (p.email as string) || 'Usuario' }))
        .sort((a, b) => a.name.localeCompare(b.name));
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
