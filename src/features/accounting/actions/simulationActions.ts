'use server'

import { createClient } from '@/lib/supabase/server'
import { accountingService } from '../services/accountingService'
import { purchaseAccountingService } from '../services/purchaseAccountingService'

/**
 * Simulación de la contabilización de ventas.
 *
 * Calcula el asiento que generaría cada factura o nota crédito CON LAS MISMAS
 * REGLAS que usaría la contabilización real, pero NO escribe nada. Sirve para
 * que el contador valide la parametrización antes de encender el automático.
 */

export interface SimulatedLine {
    account_code: string;
    concept: string;
    iva_rate: number | null;
    debit: number;
    credit: number;
}

export interface SimulatedDocument {
    id: string;
    number: string | null;
    doc_type: string;
    /** Facturas de WorldOffice asociadas a un pedido facturado. */
    invoice_numbers: string[];
    issue_date: string | null;
    party_name: string;
    party_doc: string;
    taxpayer_code: string | null;
    payment_form: string | null;
    /** Total del documento tal como está guardado, para contrastar. */
    doc_total: number;
    base: number;
    iva: number;
    retefuente: number;
    reteica: number;
    reteiva: number;
    autorrenta: number;
    cartera: number;
    balanced: boolean;
    warnings: string[];
    lines: SimulatedLine[];
}

export interface SimulationResult {
    documents: SimulatedDocument[];
    totals: {
        analizados: number;
        contabilizables: number;
        con_advertencias: number;
        base: number;
        iva: number;
        retefuente: number;
        reteica: number;
        reteiva: number;
        autorrenta: number;
        cartera: number;
    };
    error?: string;
}

const EMPTY: SimulationResult = {
    documents: [],
    totals: { analizados: 0, contabilizables: 0, con_advertencias: 0, base: 0, iva: 0, retefuente: 0, reteica: 0, reteiva: 0, autorrenta: 0, cartera: 0 },
}

// ─── Simulación de COMPRAS ──────────────────────────────────────────────────

export interface SimulatedPurchaseDoc {
    id: string;
    number: string | null;
    doc_type: string;
    issue_date: string | null;
    party_name: string;
    party_doc: string;
    taxpayer_code: string | null;
    payment_form: string | null;
    doc_total: number;
    base: number;
    iva: number;
    retefuente: number;
    reteica: number;
    reteiva: number;
    proveedores: number;
    balanced: boolean;
    warnings: string[];
    lines: SimulatedLine[];
}

export interface PurchaseSimulationResult {
    documents: SimulatedPurchaseDoc[];
    totals: { analizados: number; contabilizables: number; con_advertencias: number; base: number; iva: number; retefuente: number; reteica: number; reteiva: number; proveedores: number };
    error?: string;
}

const EMPTY_PURCHASE: PurchaseSimulationResult = {
    documents: [],
    totals: { analizados: 0, contabilizables: 0, con_advertencias: 0, base: 0, iva: 0, retefuente: 0, reteica: 0, reteiva: 0, proveedores: 0 },
}

export async function simulatePurchaseAccountingAction(from: string, to: string, limit = 300): Promise<PurchaseSimulationResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ...EMPTY_PURCHASE, error: 'Sesión expirada. Vuelve a iniciar sesión.' }

    const { data: docs, error } = await supabase
        .from('documents')
        .select('id, number, doc_type, status, issue_date, total, party_id, payment_form, party:parties(legal_name, doc_number), lines:document_lines(qty, unit_price, tax_config, description, product:products(tax_category, sku))')
        .in('doc_type', ['VENDOR_BILL', 'PURCHASE_RETURN'])
        .gte('issue_date', from)
        .lte('issue_date', to)
        .order('issue_date', { ascending: true })
        .limit(limit)

    if (error) return { ...EMPTY_PURCHASE, error: `No se pudieron leer los documentos: ${error.message}` }

    const documents: SimulatedPurchaseDoc[] = []
    const totals = { ...EMPTY_PURCHASE.totals }

    for (const raw of docs ?? []) {
        const doc = raw as Record<string, unknown>
        const partyRel = doc.party as { legal_name?: string; doc_number?: string } | Array<{ legal_name?: string; doc_number?: string }> | null
        const party = Array.isArray(partyRel) ? partyRel[0] : partyRel

        const { draft, warnings } = await purchaseAccountingService.previewPurchaseEntry(supabase, doc)
        totals.analizados++
        if (warnings.length > 0) totals.con_advertencias++

        const t = draft?.totals
        if (draft && t) {
            totals.contabilizables++
            totals.base += t.base; totals.iva += t.iva; totals.retefuente += t.retefuente
            totals.reteica += t.reteica; totals.reteiva += t.reteiva; totals.proveedores += t.proveedores
        }

        documents.push({
            id: String(doc.id),
            number: (doc.number as string) ?? null,
            doc_type: String(doc.doc_type),
            issue_date: (doc.issue_date as string) ?? null,
            party_name: party?.legal_name ?? 'Proveedor',
            party_doc: party?.doc_number ?? '',
            taxpayer_code: draft?.taxpayer_code ?? null,
            payment_form: draft?.payment_form ?? null,
            doc_total: Number(doc.total) || 0,
            base: t?.base ?? 0, iva: t?.iva ?? 0, retefuente: t?.retefuente ?? 0,
            reteica: t?.reteica ?? 0, reteiva: t?.reteiva ?? 0, proveedores: t?.proveedores ?? 0,
            balanced: draft ? Math.abs(draft.totals.debit - draft.totals.credit) < 0.01 : false,
            warnings,
            lines: (draft?.lines ?? []).map(l => ({ account_code: l.account_code, concept: l.concept, iva_rate: l.iva_rate, debit: l.debit, credit: l.credit })),
        })
    }

    return { documents, totals }
}

export async function simulateSalesAccountingAction(
    from: string,
    to: string,
    limit = 300
): Promise<SimulationResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ...EMPTY, error: 'Sesión expirada. Vuelve a iniciar sesión.' }

    // Mientras la facturación real siga en WorldOffice, las facturas de la app son
    // pocas y en borrador. Los PEDIDOS FACTURADOS (status ACCEPTED, con número de
    // factura WO) son la operación real: se simulan como si fueran FV para que el
    // contador revise asientos sobre clientes, IVA y retenciones de verdad.
    const { data: docs, error } = await supabase
        .from('documents')
        .select('id, number, doc_type, status, invoice_numbers, issue_date, total, party_id, payment_form, party:parties(legal_name, doc_number), lines:document_lines(qty, unit_price, tax_config, description, product:products(tax_category, sku))')
        .or('doc_type.eq.INVOICE,doc_type.eq.CREDIT_NOTE,and(doc_type.eq.SALES_ORDER,status.eq.ACCEPTED)')
        .gte('issue_date', from)
        .lte('issue_date', to)
        .order('issue_date', { ascending: true })
        .limit(limit)

    if (error) return { ...EMPTY, error: `No se pudieron leer los documentos: ${error.message}` }

    const documents: SimulatedDocument[] = []
    const totals = { ...EMPTY.totals }

    for (const raw of docs ?? []) {
        const doc = raw as Record<string, unknown>
        const partyRel = doc.party as { legal_name?: string; doc_number?: string } | Array<{ legal_name?: string; doc_number?: string }> | null
        const party = Array.isArray(partyRel) ? partyRel[0] : partyRel

        // Un pedido facturado se contabiliza con las reglas de factura de venta.
        const simulated = doc.doc_type === 'SALES_ORDER' ? { ...doc, doc_type: 'INVOICE' } : doc
        const { draft, warnings } = await accountingService.previewSalesEntry(supabase, simulated)
        totals.analizados++
        if (warnings.length > 0) totals.con_advertencias++

        const base = draft?.totals.base ?? 0
        const iva = draft?.totals.iva ?? 0
        const retefuente = draft?.totals.retefuente ?? 0
        const reteica = draft?.totals.reteica ?? 0
        const reteiva = draft?.totals.reteiva ?? 0
        const autorrenta = draft?.totals.autorrenta ?? 0
        const cartera = draft?.totals.cartera ?? 0

        if (draft) {
            totals.contabilizables++
            totals.base += base
            totals.iva += iva
            totals.retefuente += retefuente
            totals.reteica += reteica
            totals.reteiva += reteiva
            totals.autorrenta += autorrenta
            totals.cartera += cartera
        }

        documents.push({
            id: String(doc.id),
            number: (doc.number as string) ?? null,
            doc_type: String(doc.doc_type),
            invoice_numbers: Array.isArray(doc.invoice_numbers) ? (doc.invoice_numbers as string[]) : [],
            issue_date: (doc.issue_date as string) ?? null,
            party_name: party?.legal_name ?? 'Consumidor Final',
            party_doc: party?.doc_number ?? '',
            taxpayer_code: draft?.taxpayer_code ?? null,
            payment_form: draft?.payment_form ?? null,
            doc_total: Number(doc.total) || 0,
            base, iva, retefuente, reteica, reteiva, autorrenta, cartera,
            balanced: draft ? Math.abs(draft.totals.debit - draft.totals.credit) < 0.01 : false,
            warnings,
            lines: (draft?.lines ?? []).map(l => ({
                account_code: l.account_code,
                concept: l.concept,
                iva_rate: l.iva_rate,
                debit: l.debit,
                credit: l.credit,
            })),
        })
    }

    return { documents, totals }
}
