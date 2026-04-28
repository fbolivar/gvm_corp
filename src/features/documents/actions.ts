'use server'

import { createClient } from "@/lib/supabase/server";
import { documentService } from "./services/documentService";
import { Document, documentSchema } from "./types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createDocumentAction(data: Document) {
    const supabase = await createClient();

    // Validate
    const parsed = documentSchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos: " + JSON.stringify(parsed.error.format()) };
    }

    try {
        // Backend recalculation of totals is handled in service/API usually, 
        // but here we trust the form data OR we should recalculate. 
        // Best practice: Recalculate.
        // But for now, let's pass data. 
        // Ideally documentService.createDocument should accept the payload and handle it.

        await documentService.createDocument(supabase, parsed.data as any);
    } catch (error: any) {
        return { error: error.message };
    }

    revalidatePath('/documents');
    redirect('/documents');
}

/**
 * Elimina un documento (factura, cotización, pedido, etc.) junto con sus líneas.
 * Solo permite borrar si el status es DRAFT — documentos firmados/enviados/aceptados
 * no se eliminan, se anulan con nota crédito o similar.
 *
 * Pre-chequea dependencias:
 *  - Documentos hijos (parent_id FK) — no borra si existen
 *  - Electronic documents (DIAN) — no borra si ya hay firma
 */
export async function deleteDocumentAction(id: string): Promise<{ error?: string }> {
    const supabase = await createClient();

    try {
        // 1. Verificar existencia + status
        const { data: doc, error: selErr } = await supabase
            .from('documents')
            .select('id, status, doc_type, number')
            .eq('id', id)
            .single();

        if (selErr || !doc) {
            return { error: 'Documento no encontrado' };
        }

        if (doc.status !== 'DRAFT') {
            return {
                error: `No se puede borrar un documento en estado ${doc.status}. Solo se pueden borrar borradores (DRAFT).`,
            };
        }

        // 2. Pre-check: documentos vinculados (parent_id)
        const { data: children } = await supabase
            .from('documents')
            .select('number, doc_type')
            .eq('parent_id', id)
            .limit(5);

        if (children && children.length > 0) {
            const list = children.map(c => `${c.doc_type} #${c.number || 's/n'}`).join(', ');
            return {
                error: `No se puede borrar: hay ${children.length} documento(s) vinculado(s) (${list}). Elimina o desvincula primero esos documentos.`,
            };
        }

        // 3. Pre-check: firma DIAN emitida
        const { data: edocs } = await supabase
            .from('electronic_documents')
            .select('id, cufe')
            .eq('document_id', id)
            .limit(1);

        if (edocs && edocs.length > 0 && edocs[0].cufe) {
            return {
                error: 'No se puede borrar: el documento tiene firma electrónica DIAN. Debe anularse con nota crédito.',
            };
        }

        // 4. Borrar electronic_documents (borradores sin CUFE)
        await supabase.from('electronic_documents').delete().eq('document_id', id);

        // 5. Borrar líneas (FK cascade debería hacerlo, pero explícito por seguridad)
        await supabase.from('document_lines').delete().eq('document_id', id);

        // 6. Borrar el documento
        const { error: delErr } = await supabase.from('documents').delete().eq('id', id);
        if (delErr) {
            return { error: `Error eliminando documento: ${delErr.message}` };
        }
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : 'Error desconocido' };
    }

    revalidatePath('/sales/invoices');
    revalidatePath('/sales/quotations');
    revalidatePath('/sales/orders');
    revalidatePath('/purchasing/orders');
    revalidatePath('/purchasing/bills');
    revalidatePath('/documents');
    return {};
}

/**
 * Confirma un pedido de venta: DRAFT → SENT.
 * Solo aplica para SALES_ORDER en estado DRAFT.
 * Una vez confirmado aparece en la cola de logística como pendiente de despacho.
 */
export async function confirmSalesOrderAction(id: string): Promise<{ error?: string }> {
    const supabase = await createClient();

    try {
        const { data: doc, error: selErr } = await supabase
            .from('documents')
            .select('id, status, doc_type')
            .eq('id', id)
            .single();

        if (selErr || !doc) return { error: 'Pedido no encontrado' };
        if (doc.doc_type !== 'SALES_ORDER') return { error: 'Solo se pueden confirmar pedidos de venta' };
        if (doc.status !== 'DRAFT') return { error: `El pedido ya está en estado ${doc.status}` };

        const { error: updErr } = await supabase
            .from('documents')
            .update({ status: 'SENT' })
            .eq('id', id);

        if (updErr) return { error: updErr.message };
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : 'Error desconocido' };
    }

    revalidatePath('/sales/orders');
    revalidatePath('/logistics');
    return {};
}

/**
 * Versión "fuerza" del delete: desvincula los documentos hijos (SET parent_id = NULL)
 * antes de borrar. Útil cuando el usuario confirma que quiere eliminar el padre
 * manteniendo los hijos (ej: borrar una cotización DRAFT y dejar la factura hija
 * como documento independiente).
 *
 * Mantiene los demás pre-checks (status DRAFT, firma DIAN).
 */
export async function forceDeleteDocumentAction(id: string): Promise<{ error?: string; unlinked?: number }> {
    const supabase = await createClient();

    try {
        const { data: doc, error: selErr } = await supabase
            .from('documents')
            .select('id, status, doc_type, number')
            .eq('id', id)
            .single();

        if (selErr || !doc) {
            return { error: 'Documento no encontrado' };
        }

        if (doc.status !== 'DRAFT') {
            return {
                error: `No se puede borrar un documento en estado ${doc.status}. Solo se pueden borrar borradores (DRAFT).`,
            };
        }

        // Firma DIAN sigue bloqueando aunque sea "force"
        const { data: edocs } = await supabase
            .from('electronic_documents')
            .select('id, cufe')
            .eq('document_id', id)
            .limit(1);

        if (edocs && edocs.length > 0 && edocs[0].cufe) {
            return {
                error: 'No se puede borrar: el documento tiene firma electrónica DIAN. Debe anularse con nota crédito.',
            };
        }

        // Desvincular hijos (dejarlos como documentos independientes)
        const { data: unlinkedRows, error: unlinkErr } = await supabase
            .from('documents')
            .update({ parent_id: null })
            .eq('parent_id', id)
            .select('id');

        if (unlinkErr) {
            return { error: `Error desvinculando hijos: ${unlinkErr.message}` };
        }
        const unlinked = unlinkedRows?.length ?? 0;

        // Limpiar electronic_documents borrador
        await supabase.from('electronic_documents').delete().eq('document_id', id);

        // Líneas + documento
        await supabase.from('document_lines').delete().eq('document_id', id);
        const { error: delErr } = await supabase.from('documents').delete().eq('id', id);
        if (delErr) {
            return { error: `Error eliminando documento: ${delErr.message}` };
        }

        revalidatePath('/sales/invoices');
        revalidatePath('/sales/quotations');
        revalidatePath('/sales/orders');
        revalidatePath('/purchasing/orders');
        revalidatePath('/purchasing/bills');
        revalidatePath('/documents');

        return { unlinked };
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : 'Error desconocido' };
    }
}
