'use server'

import { createClient } from "@/lib/supabase/server";
import { inventoryService } from "./services/inventoryService";
import { InventoryMovement, movementSchema } from "./types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createMovementAction(data: InventoryMovement) {
    const supabase = await createClient();

    // Validate
    const parsed = movementSchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos: " + JSON.stringify(parsed.error.format()) };
    }

    try {
        await inventoryService.createMovement(supabase, parsed.data);
    } catch (error: any) {
        return { error: error.message };
    }

    revalidatePath('/inventory');
    redirect('/inventory');
}
