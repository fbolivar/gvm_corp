import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from '@/shared/lib/fetchAllRows';

export interface ConsolidatedRow {
    sku: string;
    productLabel: string;
    productId: string | null;
    totalQty: number;        // suma del pronóstico (excluye puntuales)
    salespeople: number;     // cuántos comerciales lo pronostican
    inCatalog: boolean;
}

export interface Consolidated {
    general: ConsolidatedRow[];   // consolidado general (excluye separados)
    separate: ConsolidatedRow[];  // Víctor y Miguel (y cualquier is_separate)
}

interface LineRow {
    salesperson_label: string;
    sku: string;
    product_label: string;
    product_id: string | null;
    forecast_qty: number | null;
    is_one_off: boolean;
}

/**
 * Consolida el pronóstico del período por producto: suma las cantidades de todos
 * los comerciales (excluye lo marcado puntual). Separa a los comerciales marcados
 * "aparte" (Víctor y Miguel) del consolidado general.
 */
export async function getConsolidatedForecast(client: SupabaseClient, periodId: string): Promise<Consolidated> {
    const [lines, aliasRes] = await Promise.all([
        fetchAllRows<LineRow>(
            ({ from, to }) => client
                .from('forecast_lines')
                .select('salesperson_label, sku, product_label, product_id, forecast_qty, is_one_off')
                .eq('period_id', periodId)
                .order('id')
                .range(from, to),
            { label: 'forecast-lines' },
        ),
        client.from('forecast_salesperson_aliases').select('report_label, is_separate'),
    ]);

    const separateLabels = new Set((aliasRes.data ?? []).filter(a => a.is_separate).map(a => a.report_label));

    const build = (rows: LineRow[]): ConsolidatedRow[] => {
        const map = new Map<string, ConsolidatedRow>();
        for (const r of rows) {
            if (r.is_one_off) continue;
            const qty = Number(r.forecast_qty ?? 0);
            let row = map.get(r.sku);
            if (!row) {
                row = { sku: r.sku, productLabel: r.product_label, productId: r.product_id, totalQty: 0, salespeople: 0, inCatalog: !!r.product_id };
                map.set(r.sku, row);
            }
            row.totalQty += qty;
            if (qty > 0) row.salespeople += 1;
        }
        return [...map.values()].sort((a, b) => b.totalQty - a.totalQty);
    };

    return {
        general: build(lines.filter(l => !separateLabels.has(l.salesperson_label))),
        separate: build(lines.filter(l => separateLabels.has(l.salesperson_label))),
    };
}
