"use server"

import { createClient } from "@/lib/supabase/server"
import { documentService } from "@/features/documents/services/documentService"
import { Document, documentSchema } from "@/features/documents/types"
import { revalidatePath } from "next/cache"

export async function createSalesDocumentAction(data: Document, redirectPath: string) {
    const supabase = await createClient();

    const parsed = documentSchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos" };
    }

    try {
        const result = await documentService.createDocument(supabase, parsed.data as any);
        revalidatePath(redirectPath);
        return { success: true, data: result };
    } catch (error: any) {
        return { error: error.message };
    }
}
