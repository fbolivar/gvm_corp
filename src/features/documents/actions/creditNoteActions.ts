'use server'

import { createClient } from '@/lib/supabase/server';
import { documentService } from '../services/documentService';
import { revalidatePath } from 'next/cache';

export interface NoteLineInput {
    product_id: string;
    description: string;
    qty: number;
    unit_price: number;
    tax_rate: number;
}

function buildLines(lines: NoteLineInput[]) {
    return lines.map(l => ({
        product_id: l.product_id || null,
        description: l.description,
        qty: l.qty,
        unit_price: l.unit_price,
        line_total: l.qty * l.unit_price,
        tax_config: l.tax_rate > 0 ? { rate: l.tax_rate * 100 } : null,
    }));
}

export async function createCreditNoteAction(
    invoiceId: string,
    reason: string,
    lines: NoteLineInput[]
): Promise<{ success?: boolean; id?: string; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    try {
        // 1. Fetch original invoice
        const invoice = await documentService.getDocumentById(supabase, invoiceId);
        if (!invoice) return { error: 'Factura no encontrada' };
        if (invoice.doc_type !== 'INVOICE') return { error: 'Solo se pueden crear NC desde facturas' };

        // 2. Calculate totals
        const subtotal = lines.reduce((s, l) => s + l.qty * l.unit_price, 0);
        const taxes = lines.reduce((s, l) => s + l.qty * l.unit_price * l.tax_rate, 0);
        const total = subtotal + taxes;

        // 3. Create the credit note document
        const creditNote = await documentService.createDocument(supabase, {
            doc_type: 'CREDIT_NOTE',
            status: 'DRAFT',
            party_id: invoice.party_id,
            parent_id: invoice.id,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: new Date().toISOString().split('T')[0],
            currency: (invoice as any).currency || 'COP',
            subtotal,
            taxes,
            total,
            balance: total,
            notes_internal: `Nota Crédito generada desde Factura #${invoice.number}`,
            notes_public: `Nota Crédito por: ${reason}. Ref. Factura: ${invoice.number}`,
            lines: buildLines(lines),
        } as any);

        // 4. Update invoice balance (reduce by credit note amount)
        const currentBalance = Number((invoice as any).balance) || Number(invoice.total) || 0;
        const newBalance = Math.max(0, currentBalance - total);
        await supabase
            .from('documents')
            .update({ balance: newBalance })
            .eq('id', invoiceId);

        revalidatePath('/sales/invoices');
        revalidatePath('/sales/credit-notes');
        return { success: true, id: creditNote.id };
    } catch (error: unknown) {
        return { error: (error as Error).message };
    }
}

export async function createDebitNoteAction(
    invoiceId: string,
    reason: string,
    lines: NoteLineInput[]
): Promise<{ success?: boolean; id?: string; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autorizado' };

    try {
        const invoice = await documentService.getDocumentById(supabase, invoiceId);
        if (!invoice) return { error: 'Factura no encontrada' };

        const subtotal = lines.reduce((s, l) => s + l.qty * l.unit_price, 0);
        const taxes = lines.reduce((s, l) => s + l.qty * l.unit_price * l.tax_rate, 0);
        const total = subtotal + taxes;

        const debitNote = await documentService.createDocument(supabase, {
            doc_type: 'DEBIT_NOTE',
            status: 'DRAFT',
            party_id: invoice.party_id,
            parent_id: invoice.id,
            issue_date: new Date().toISOString().split('T')[0],
            due_date: new Date().toISOString().split('T')[0],
            currency: (invoice as any).currency || 'COP',
            subtotal,
            taxes,
            total,
            balance: total,
            notes_internal: `Nota Débito generada desde Factura #${invoice.number}`,
            notes_public: `Nota Débito por: ${reason}. Ref. Factura: ${invoice.number}`,
            lines: buildLines(lines),
        } as any);

        // Increase invoice balance for debit note
        const currentBalance = Number((invoice as any).balance) || Number(invoice.total) || 0;
        await supabase
            .from('documents')
            .update({ balance: currentBalance + total })
            .eq('id', invoiceId);

        revalidatePath('/sales/invoices');
        revalidatePath('/sales/debit-notes');
        return { success: true, id: debitNote.id };
    } catch (error: unknown) {
        return { error: (error as Error).message };
    }
}
