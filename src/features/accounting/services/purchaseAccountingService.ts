import type { SupabaseClient } from '@supabase/supabase-js';
import {
    buildPurchaseEntry,
    type PurchaseRule, type TaxRates, type PurchaseDocKind,
} from './purchaseAccountingEngine';
import { resolveLineIvaRate, resolvePaymentForm } from './salesAccountingEngine';
import { accountingService } from './accountingService';
import type { JournalEntry } from '../types';

export interface PurchaseEntryDraft {
    entry_date: string;
    description: string;
    document_id: string;
    taxpayer_code: string;
    payment_form: string;
    totals: ReturnType<typeof buildPurchaseEntry>['totals'];
    lines: Array<{
        account_code: string; concept: string; iva_rate: number | null;
        debit: number; credit: number;
    }>;
}

/**
 * Calcula el asiento que generaría una compra remisionada (VENDOR_BILL → CREM) o
 * una devolución a proveedor (→ DMP) con las reglas de `purchase_accounting_rules`.
 * NO escribe nada: es el equivalente de previewSalesEntry para compras.
 */
export const purchaseAccountingService = {
    async previewPurchaseEntry(
        client: SupabaseClient,
        document: Record<string, unknown>,
    ): Promise<{ draft: PurchaseEntryDraft | null; warnings: string[] }> {
        const docKind: PurchaseDocKind | null =
            document.doc_type === 'VENDOR_BILL' ? 'CREM' :
            document.doc_type === 'PURCHASE_RETURN' ? 'DMP' : null;
        if (!docKind) return { draft: null, warnings: [] };

        const docLines = Array.isArray(document.lines) ? document.lines : [];
        if (docLines.length === 0) {
            return { draft: null, warnings: [`El documento ${(document.number as string) ?? ''} no tiene líneas: no se contabiliza.`] };
        }

        const { data: party } = await client
            .from('parties')
            .select('taxpayer_type, payment_term_days, city')
            .eq('id', document.party_id as string)
            .maybeSingle();

        const { data: types } = await client.from('taxpayer_types').select('code, legacy_code');
        const legacy = (party?.taxpayer_type as string | null) ?? null;
        const match = (types ?? []).find((t: { code: string; legacy_code: string | null }) =>
            t.code === legacy || t.legacy_code === legacy);
        const taxpayerCode = match?.code ?? 'PJ';
        const warnings: string[] = [];
        if (!match) {
            warnings.push(`El proveedor no tiene un tipo de contribuyente reconocido (${legacy ?? 'vacío'}); se usó Persona Jurídica. Corrige el proveedor.`);
        }

        const paymentForm = resolvePaymentForm(document.payment_form as string, party?.payment_term_days as number);

        const { data: ruleRows } = await client
            .from('purchase_accounting_rules')
            .select('iva_rate, account_code, nature, concept')
            .eq('doc_kind', docKind)
            .eq('payment_form', paymentForm)
            .eq('taxpayer_code', taxpayerCode)
            .eq('is_active', true);

        const year = Number(String(document.issue_date ?? '').slice(0, 4)) || new Date().getFullYear();
        const { data: taxRows } = await client
            .from('tax_configurations')
            .select('tax_type, rate, min_base, city')
            .eq('year', year)
            .eq('is_active', true);

        const taxes: TaxRates = {};
        for (const t of (taxRows ?? []) as Array<{ tax_type: string; rate: number; min_base: number; city: string | null }>) {
            if (t.tax_type === 'RETEICA' && t.city && t.city !== party?.city) continue;
            const key = t.tax_type as keyof TaxRates;
            if (taxes[key] && t.city == null) continue;
            taxes[key] = { rate: Number(t.rate) || 0, min_base: Number(t.min_base) || 0 };
        }

        const result = buildPurchaseEntry(
            {
                doc_kind: docKind,
                payment_form: paymentForm,
                taxpayer_code: taxpayerCode,
                lines: docLines.map((l: Record<string, unknown>) => ({
                    qty: Number(l.qty) || 0,
                    unit_price: Number(l.unit_price) || 0,
                    iva_rate: resolveLineIvaRate(l.tax_config, (l.product as { tax_category?: string } | undefined)?.tax_category),
                })),
            },
            (ruleRows ?? []) as PurchaseRule[],
            taxes,
        );
        warnings.push(...result.warnings);

        if (result.lines.length === 0 || result.totals.debit !== result.totals.credit) {
            return { draft: null, warnings };
        }

        const label = docKind === 'CREM' ? 'Compra' : 'Devolución a proveedor';
        return {
            draft: {
                entry_date: String(document.issue_date),
                description: `${label} ${(document.number as string) ?? ''} — ${paymentForm.toLowerCase()}`.trim(),
                document_id: String(document.id),
                taxpayer_code: taxpayerCode,
                payment_form: paymentForm,
                totals: result.totals,
                lines: result.lines.map(l => ({
                    account_code: l.account_code, concept: l.concept, iva_rate: l.iva_rate ?? null,
                    debit: l.debit, credit: l.credit,
                })),
            },
            warnings,
        };
    },

    /**
     * Contabiliza una compra remisionada (VENDOR_BILL → CREM): calcula el asiento
     * con previewPurchaseEntry, traduce los códigos de cuenta a ids y lo guarda.
     * La simulación usa el MISMO cálculo (previewPurchaseEntry), por eso el
     * borrador está separado del guardado. Devuelve el asiento creado o null,
     * junto con los avisos, para que el llamador alerte en vez de fallar en silencio.
     */
    async createPurchaseEntry(
        client: SupabaseClient,
        document: Record<string, unknown>,
    ): Promise<{ entry: unknown | null; warnings: string[] }> {
        const { draft, warnings } = await this.previewPurchaseEntry(client, document);
        if (!draft) return { entry: null, warnings };

        // Códigos de cuenta → ids del PUC (el borrador trae códigos para la simulación).
        const codes = [...new Set(draft.lines.map(l => l.account_code))];
        const { data: accounts } = await client
            .from('chart_accounts')
            .select('id, code')
            .in('code', codes);
        const idByCode = new Map((accounts ?? []).map((a: { id: string; code: string }) => [a.code, a.id]));
        const missing = codes.filter(c => !idByCode.has(c));
        if (missing.length > 0) {
            warnings.push(`Faltan cuentas en el PUC: ${missing.join(', ')}. No se contabilizó la compra.`);
            return { entry: null, warnings };
        }

        const partyId = (document.party_id as string) ?? null;
        const entry = await accountingService.createEntry(client, {
            entry_date: draft.entry_date,
            description: draft.description,
            document_id: draft.document_id,
            tenant_id: document.tenant_id,
            lines: draft.lines.map(l => ({
                account_id: idByCode.get(l.account_code)!,
                party_id: partyId,
                debit: l.debit,
                credit: l.credit,
                description: `${l.concept}${l.iva_rate != null ? ` ${l.iva_rate}%` : ''} — ${draft.description}`,
            })),
        } as JournalEntry);
        return { entry, warnings };
    },
};
