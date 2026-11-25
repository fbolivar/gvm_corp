import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from '@/shared/lib/fetchAllRows';

/**
 * % de cotizaciones que pasan a ser ventas.
 *
 * Una cotización (doc_type='QUOTATION') se cuenta como CONVERTIDA si existe un
 * documento de venta hijo (SALES_ORDER o INVOICE) que la referencia por
 * `parent_id` — el mismo enlace que crea `convertDocument`. Se mide sobre las
 * cotizaciones EMITIDAS en el período (de las de este mes, cuántas se volvieron
 * venta), que es la lectura natural del embudo.
 */

export interface QuotationConversionMonth {
    ym: string;            // 'YYYY-MM'
    total: number;
    converted: number;
    pct: number | null;    // null si no hubo cotizaciones
}

export interface QuotationConversion {
    current: QuotationConversionMonth;    // el mes del período
    months: QuotationConversionMonth[];   // los 3 últimos meses, cronológico
}

function monthLastDay(period: string): string {
    const [y, m] = period.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return `${period}-${String(last).padStart(2, '0')}`;
}

function addMonths(period: string, delta: number): string {
    const [y, m] = period.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

const SALE_CHILD_TYPES = ['SALES_ORDER', 'INVOICE'];

/**
 * @param partyIds si se pasa, limita a cotizaciones de esos terceros (cartera de
 *                 un comercial). Sin él, toda la empresa. [] = nada que medir.
 */
export async function getQuotationConversion(
    client: SupabaseClient,
    period: string,
    partyIds?: string[],
): Promise<QuotationConversion> {
    const windowMonths = [addMonths(period, -2), addMonths(period, -1), period];
    const fromDate = `${windowMonths[0]}-01`;
    const toDate = monthLastDay(period);

    const emptyMonths = (): QuotationConversionMonth[] =>
        windowMonths.map(ym => ({ ym, total: 0, converted: 0, pct: null }));

    if (partyIds && partyIds.length === 0) {
        const months = emptyMonths();
        return { current: months[2], months };
    }

    const quotations = await fetchAllRows<{ id: string; issue_date: string }>(
        ({ from, to }) => {
            let q = client
                .from('documents')
                .select('id, issue_date')
                .eq('doc_type', 'QUOTATION')
                .gte('issue_date', fromDate)
                .lte('issue_date', toDate);
            if (partyIds) q = q.in('party_id', partyIds);
            return q.order('id').range(from, to);
        },
        { label: 'crm.quotationConversion.quotations' },
    );

    const ids = quotations.map(q => q.id);
    let convertedSet = new Set<string>();
    if (ids.length) {
        const children = await fetchAllRows<{ id: string; parent_id: string | null }>(
            ({ from, to }) => client
                .from('documents')
                .select('id, parent_id')
                .in('doc_type', SALE_CHILD_TYPES)
                .in('parent_id', ids)
                .order('id')
                .range(from, to),
            { label: 'crm.quotationConversion.children' },
        );
        convertedSet = new Set(children.map(c => c.parent_id).filter((p): p is string => !!p));
    }

    const agg = new Map(windowMonths.map(ym => [ym, { total: 0, converted: 0 }]));
    for (const q of quotations) {
        const a = agg.get(q.issue_date.slice(0, 7));
        if (!a) continue;
        a.total += 1;
        if (convertedSet.has(q.id)) a.converted += 1;
    }

    const months: QuotationConversionMonth[] = windowMonths.map(ym => {
        const a = agg.get(ym)!;
        return { ym, total: a.total, converted: a.converted, pct: a.total ? Math.round((a.converted / a.total) * 1000) / 10 : null };
    });

    return { current: months[2], months };
}
