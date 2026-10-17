'use server'

import { createClient } from "@/lib/supabase/server";
import { documentService } from "./services/documentService";
import { Document, documentSchema, missingCatalogProductLines } from "./types";
import { checkMarginViolations } from "./marginGuard";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createDocumentAction(data: Document) {
    const supabase = await createClient();

    // Validate
    const parsed = documentSchema.safeParse(data);
    if (!parsed.success) {
        return { error: "Datos inválidos: " + JSON.stringify(parsed.error.format()) };
    }

    // Solo al CREAR: Factura y Nota Crédito exigen producto real del catálogo
    // en cada línea (Andrés, 2026-09-29).
    const missing = missingCatalogProductLines(parsed.data);
    if (missing.length > 0) {
        return { error: `Este tipo de documento exige producto del catálogo en cada línea (falta en el ítem ${missing.map(i => i + 1).join(', ')}).` };
    }

    const marginError = await checkMarginViolations(supabase, parsed.data as any);
    if (marginError) return { error: marginError };

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
 * Marca (o desmarca) un pedido de venta como FACTURADO manualmente, sin crear una
 * factura en el sistema. Útil cuando la facturación se hace por fuera (ej. WorldOffice)
 * y solo se necesita dejar constancia en el pedido para verificación.
 * Marcar: → ACCEPTED (se muestra como "Facturado"). Desmarcar: → SENT (Confirmado).
 */
export async function markSalesOrderInvoicedAction(
    id: string,
    invoiced: boolean,
    invoiceNumbers?: string[]
): Promise<{ error?: string; warning?: string }> {
    const supabase = await createClient();
    let warning: string | undefined;

    try {
        const { data: doc, error: selErr } = await supabase
            .from('documents')
            .select('id, status, doc_type')
            .eq('id', id)
            .single();

        if (selErr || !doc) return { error: 'Pedido no encontrado' };
        if (doc.doc_type !== 'SALES_ORDER') return { error: 'Solo aplica a pedidos de venta' };

        const newStatus = invoiced ? 'ACCEPTED' : 'SENT';
        // Al marcar se guardan las facturas indicadas; al desmarcar se limpian
        // para no dejar números colgando de un pedido que ya no está facturado.
        const numbers = invoiced ? normalizeInvoiceNumbers(invoiceNumbers) : null;

        const { error: updErr } = await supabase
            .from('documents')
            .update({ status: newStatus, invoice_numbers: numbers })
            .eq('id', id);

        if (updErr) return { error: updErr.message };

        // Contabilización automática: al facturar se genera el asiento de venta;
        // al desmarcar se revierte. Gated por tenants.auto_post_sales. No bloquea
        // la acción si algo falla, pero avisa (no se traga el problema en silencio).
        try {
            const { accountingService } = await import('@/features/accounting/services/accountingService');
            if (invoiced) {
                const { warnings } = await accountingService.postSalesOrderEntry(supabase, id);
                if (warnings.length > 0) {
                    warning = `Pedido facturado, pero la contabilización tuvo avisos: ${warnings.join(' | ')}`;
                }
            } else {
                await accountingService.unpostSalesOrderEntry(supabase, id);
            }
        } catch (accError: unknown) {
            warning = `Pedido actualizado, pero no se pudo contabilizar automáticamente: ${accError instanceof Error ? accError.message : 'error desconocido'}`;
        }
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : 'Error desconocido' };
    }

    revalidatePath('/sales/orders');
    revalidatePath(`/documents/${id}`);
    revalidatePath('/accounting/entries');
    return { warning };
}

/** Normaliza la lista de facturas: recorta, quita vacíos y duplicados. */
function normalizeInvoiceNumbers(list?: string[]): string[] | null {
    const clean = (list ?? [])
        .map(n => (n ?? '').trim())
        .filter(Boolean)
        .map(n => n.toUpperCase());
    const unique = [...new Set(clean)];
    return unique.length > 0 ? unique : null;
}

/**
 * Actualiza SOLO los números de factura de un pedido ya facturado, sin tocar el
 * estado (para corregir o agregar una FEV después de haberlo marcado).
 */
export async function updateInvoiceNumbersAction(
    id: string,
    invoiceNumbers: string[]
): Promise<{ error?: string; warning?: string }> {
    const supabase = await createClient();

    try {
        const { data: doc, error: selErr } = await supabase
            .from('documents')
            .select('id, doc_type, status')
            .eq('id', id)
            .single();

        if (selErr || !doc) return { error: 'Pedido no encontrado' };
        if (doc.doc_type !== 'SALES_ORDER') return { error: 'Solo aplica a pedidos de venta' };
        if (doc.status !== 'ACCEPTED') {
            return { error: 'El pedido debe estar marcado como facturado para registrar sus facturas.' };
        }

        const { error: updErr } = await supabase
            .from('documents')
            .update({ invoice_numbers: normalizeInvoiceNumbers(invoiceNumbers) })
            .eq('id', id);

        if (updErr) return { error: updErr.message };
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : 'Error desconocido' };
    }

    revalidatePath('/sales/orders');
    revalidatePath(`/documents/${id}`);
    return {};
}

/**
 * Guarda las observaciones finales de un pedido de venta ya cerrado.
 * Solo aplica a SALES_ORDER en estado ACCEPTED (Facturado) — es el cierre del ciclo.
 * Enviar texto vacío borra la observación.
 */
export async function saveFinalNotesAction(id: string, notes: string): Promise<{ error?: string }> {
    const supabase = await createClient();

    const clean = (notes ?? '').trim();
    if (clean.length > 2000) {
        return { error: 'Las observaciones finales no pueden superar 2.000 caracteres.' };
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: 'Sesión expirada. Vuelve a iniciar sesión.' };

        const { data: doc, error: selErr } = await supabase
            .from('documents')
            .select('id, status, doc_type')
            .eq('id', id)
            .single();

        if (selErr || !doc) return { error: 'Pedido no encontrado' };
        if (doc.doc_type !== 'SALES_ORDER') return { error: 'Solo aplica a pedidos de venta' };
        if (doc.status !== 'ACCEPTED') {
            return { error: 'Las observaciones finales solo se registran cuando el pedido ya está facturado.' };
        }

        const { error: updErr } = await supabase
            .from('documents')
            .update({
                final_notes: clean || null,
                final_notes_at: clean ? new Date().toISOString() : null,
                final_notes_by: clean ? user.id : null,
            })
            .eq('id', id);

        if (updErr) return { error: updErr.message };
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : 'Error desconocido' };
    }

    revalidatePath(`/documents/${id}`);
    revalidatePath('/sales/orders');
    return {};
}

/**
 * Anula un pedido de venta (soft cancel): DRAFT|SENT → VOIDED.
 * Reemplaza al borrado físico para NO dejar huecos en el consecutivo: el pedido
 * queda en la lista marcado como ANULADO conservando su número. No aplica si ya
 * está facturado (ACCEPTED), firmado en DIAN, o tiene documentos vinculados.
 */
export async function voidSalesOrderAction(id: string): Promise<{ error?: string }> {
    const supabase = await createClient();

    try {
        const { data: doc, error: selErr } = await supabase
            .from('documents')
            .select('id, status, doc_type, number')
            .eq('id', id)
            .single();

        if (selErr || !doc) return { error: 'Pedido no encontrado' };
        if (doc.doc_type !== 'SALES_ORDER') return { error: 'Solo se pueden anular pedidos de venta' };
        if (doc.status === 'VOIDED') return { error: 'El pedido ya está anulado' };
        if (doc.status !== 'DRAFT' && doc.status !== 'SENT') {
            return { error: `No se puede anular un pedido en estado ${doc.status}. Si está facturado, primero desmárcalo como facturado.` };
        }

        // No anular si tiene documentos vinculados (remisión/factura generada desde el pedido)
        const { data: children } = await supabase
            .from('documents')
            .select('number, doc_type')
            .eq('parent_id', id)
            .limit(5);
        if (children && children.length > 0) {
            const list = children.map(c => `${c.doc_type} #${c.number || 's/n'}`).join(', ');
            return { error: `No se puede anular: hay ${children.length} documento(s) vinculado(s) (${list}). Gestiona primero esos documentos.` };
        }

        const { error: updErr } = await supabase
            .from('documents')
            .update({ status: 'VOIDED' })
            .eq('id', id);
        if (updErr) return { error: updErr.message };
    } catch (error: unknown) {
        return { error: error instanceof Error ? error.message : 'Error desconocido' };
    }

    revalidatePath('/sales/orders');
    revalidatePath('/logistics');
    revalidatePath('/documents');
    revalidatePath(`/documents/${id}`);
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
