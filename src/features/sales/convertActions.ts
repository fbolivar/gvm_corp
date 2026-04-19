"use server"

import { createClient } from "@/lib/supabase/server"
import { salesService } from "./services/salesService"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { DocumentType } from "@/features/documents/types"

export async function convertDocumentAction(sourceId: string, targetType: DocumentType) {
    const supabase = await createClient();

    let newDocId: string;
    try {
        newDocId = await salesService.convertDocument(supabase, sourceId, targetType);
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error desconocido';
        return { error: msg };
    }

    let path = '/documents';
    if (targetType === 'QUOTATION')   path = '/sales/quotations';
    if (targetType === 'SALES_ORDER') path = '/sales/orders';
    if (targetType === 'INVOICE')     path = '/sales/invoices';

    revalidatePath(path);
    revalidatePath('/sales/quotations');
    redirect(`${path}/${newDocId}/edit`); // Fuera del try/catch — redirect() lanza NEXT_REDIRECT que debe propagarse
}
