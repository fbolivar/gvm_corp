"use server"

import { createClient } from "@/lib/supabase/server"
import { documentService } from "@/features/documents/services/documentService"
import { Document, documentSchema } from "@/features/documents/types"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createSalesDocumentAction(data: Document, redirectPath: string) {
    const supabase = await createClient();

    const parsed = documentSchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos" };
    }

    try {
        await documentService.createDocument(supabase, parsed.data as any);
    } catch (error: any) {
        return { error: error.message };
    }

    revalidatePath(redirectPath);
    redirect(redirectPath);
}
