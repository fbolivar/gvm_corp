"use server"

import { createClient } from "@/lib/supabase/server"
import { salesService } from "./services/salesService"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { DocumentType } from "@/features/documents/types"

export async function convertDocumentAction(sourceId: string, targetType: DocumentType) {
    const supabase = await createClient();

    try {
        const newDocId = await salesService.convertDocument(supabase, sourceId, targetType);

        let path = '/documents';
        if (targetType === 'QUOTATION')   path = '/sales/quotations';
        if (targetType === 'SALES_ORDER') path = '/sales/orders';
        if (targetType === 'INVOICE')     path = '/sales/invoices';

        revalidatePath(path);
        revalidatePath('/sales/quotations');
        redirect(`${path}/${newDocId}/edit`); // Redirect to the new document for editing
    } catch (error: any) {
        return { error: error.message };
    }
}
