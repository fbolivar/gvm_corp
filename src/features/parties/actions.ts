'use server'

import { createClient } from "@/lib/supabase/server";
import { partyService } from "./services/partyService";
import { Party, partySchema } from "./types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createPartyAction(data: Party) {
    const supabase = await createClient();

    // Validate again on server
    const parsed = partySchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos" };
    }

    try {
        await partyService.createParty(supabase, parsed.data);
    } catch (error: any) {
        return { error: error.message };
    }

    revalidatePath('/parties');
    redirect('/parties');
}

export async function updatePartyAction(id: string, data: Party) {
    const supabase = await createClient();

    const parsed = partySchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos" };
    }

    try {
        await partyService.updateParty(supabase, id, parsed.data);
    } catch (error: any) {
        return { error: error.message };
    }

    revalidatePath('/parties');
    revalidatePath(`/parties/${id}`);
    redirect('/parties');
}
