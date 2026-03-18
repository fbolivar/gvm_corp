'use server'

import { createClient } from "@/lib/supabase/server";
import { partyService } from "./services/partyService";
import { Party, partySchema } from "./types";
import { revalidatePath } from "next/cache";

export async function createPartyAction(data: Party) {
    const supabase = await createClient();

    // Validate again on server
    const parsed = partySchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos" };
    }

    try {
        const result = await partyService.createParty(supabase, parsed.data);
        revalidatePath('/parties');
        return { success: true, data: result };
    } catch (error: any) {
        return { error: error.message };
    }
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
    return { success: true };
}
