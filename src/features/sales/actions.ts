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

/**
 * Actualiza un documento existente. Solo permite editar borradores (DRAFT) —
 * documentos confirmados/emitidos no se editan.
 */
export async function updateSalesDocumentAction(id: string, data: Document, redirectPath: string) {
    const supabase = await createClient();

    const parsed = documentSchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos" };
    }

    try {
        const { data: existing, error: selErr } = await supabase
            .from('documents')
            .select('status')
            .eq('id', id)
            .single();

        if (selErr || !existing) return { error: 'Documento no encontrado' };
        if (existing.status !== 'DRAFT') {
            return { error: `Solo se pueden editar borradores. Estado actual: ${existing.status}` };
        }

        await documentService.updateDocument(supabase, id, parsed.data as any);
        revalidatePath(redirectPath);
        revalidatePath(`/documents/${id}`);
        return { success: true };
    } catch (error: any) {
        return { error: error.message };
    }
}
