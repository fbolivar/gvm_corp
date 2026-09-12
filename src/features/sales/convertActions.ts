"use server"

import { createClient } from "@/lib/supabase/server"
import { salesService } from "./services/salesService"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { DocumentType } from "@/features/documents/types"

/** Ventana en la que una segunda conversión se considera el mismo clic repetido. */
const CONVERT_DEDUP_SECONDS = 60;

export async function convertDocumentAction(sourceId: string, targetType: DocumentType) {
    const supabase = await createClient();

    // Doble clic en "convertir": el segundo envío llega cuando el primero ya creó
    // el documento hijo. Sin esto se generaban remisiones gemelas (REM-00088..90).
    // La ventana es corta a propósito: convertir el mismo pedido más tarde (p. ej.
    // una segunda remisión por despacho parcial) sigue permitido.
    const since = new Date(Date.now() - CONVERT_DEDUP_SECONDS * 1000).toISOString();
    const { data: recentChild } = await supabase
        .from('documents')
        .select('id')
        .eq('parent_id', sourceId)
        .eq('doc_type', targetType)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (recentChild) {
        redirect(`/documents/${recentChild.id}`);
    }

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

/**
 * Duplica un pedido en un nuevo borrador editable y abre ese borrador en edición.
 */
export async function duplicateSalesOrderAction(sourceId: string) {
    const supabase = await createClient();

    let newId: string;
    try {
        newId = await salesService.duplicateSalesOrder(supabase, sourceId);
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : 'Error al duplicar el pedido' };
    }

    revalidatePath('/sales/orders');
    revalidatePath('/documents');
    redirect(`/documents/${newId}/edit`);
}
