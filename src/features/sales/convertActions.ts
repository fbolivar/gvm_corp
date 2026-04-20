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

    const listPath =
        targetType === 'QUOTATION'     ? '/sales/quotations' :
        targetType === 'SALES_ORDER'   ? '/sales/orders' :
        targetType === 'DELIVERY_NOTE' ? '/sales/deliveries' :
        targetType === 'INVOICE'       ? '/sales/invoices' :
        '/documents';

    revalidatePath(listPath);
    revalidatePath('/sales/quotations');
    revalidatePath('/sales/orders');
    revalidatePath('/documents');
    // Vista genérica de detalle — no existe /sales/invoices/[id] en las rutas
    redirect(`/documents/${newDocId}`);
}
