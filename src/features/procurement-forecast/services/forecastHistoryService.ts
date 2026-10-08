import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from '@/shared/lib/fetchAllRows';
import { classifyAbc, type AbcOptions } from './forecastAbc';

export interface PortfolioProduct {
    sku: string;
    productLabel: string;
    productId: string | null;
    monthly: Record<string, number>;  // "2026-09" → qty
    totalQty: number;
    totalValue: number;
    avgQty: number;                    // promedio sobre la ventana (sugerido base)
    abc: 'A' | 'B' | 'C';
    cumulativePct: number;
}

export interface SalespersonPortfolio {
    salespersonLabel: string;
    salespersonId: string | null;
    isSeparate: boolean;
    months: string[];                  // ventana usada, ascendente
    products: PortfolioProduct[];
    counts: { A: number; B: number; C: number };
    totalValue: number;
}

interface HistRow {
    salesperson_label: string;
    sku: string;
    product_label: string;
    product_id: string | null;
    year: number;
    month: number;
    qty: number;
    value_cop: number;
}

const WINDOW = 6;

function ym(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Arma el portafolio por comercial a partir del histórico importado:
 * agrupa por producto en los últimos 6 meses con datos, calcula promedio y ABC.
 * El ABC usa el valor disponible (Neto de venta) — configurable vía abcOptions.
 */
export async function getPortfolios(
    client: SupabaseClient,
    abcOptions: AbcOptions = {},
): Promise<SalespersonPortfolio[]> {
    const rows = await fetchAllRows<HistRow>(
        ({ from, to }) => client
            .from('sales_history_import')
            .select('salesperson_label, sku, product_label, product_id, year, month, qty, value_cop')
            .order('id')
            .range(from, to),
        { label: 'sales-history' },
    );
    if (rows.length === 0) return [];

    // Ventana global: los 6 meses más recientes presentes en el histórico
    const allMonths = [...new Set(rows.map(r => ym(r.year, r.month)))].sort();
    const windowMonths = allMonths.slice(-WINDOW);
    const windowSet = new Set(windowMonths);

    // Costo por producto, para clasificar el ABC por costo (más estable que el precio
    // de venta, que varía por cliente). Fallback al valor de venta si falta el costo.
    const products = await fetchAllRows<{ id: string; cost: number | null }>(
        ({ from, to }) => client.from('products').select('id, cost').order('id').range(from, to),
        { label: 'products-cost' },
    );
    const costById = new Map<string, number>();
    for (const p of products) if (p.cost && Number(p.cost) > 0) costById.set(p.id, Number(p.cost));

    const aliasRes = await client.from('forecast_salesperson_aliases').select('report_label, salesperson_id, is_separate');
    const aliasInfo = new Map<string, { id: string | null; sep: boolean }>();
    for (const a of aliasRes.data ?? []) aliasInfo.set(a.report_label, { id: a.salesperson_id, sep: a.is_separate });

    // Agrupar por comercial → producto
    const bySalesperson = new Map<string, Map<string, PortfolioProduct>>();
    for (const r of rows) {
        if (!windowSet.has(ym(r.year, r.month))) continue;
        let prods = bySalesperson.get(r.salesperson_label);
        if (!prods) { prods = new Map(); bySalesperson.set(r.salesperson_label, prods); }
        let p = prods.get(r.sku);
        if (!p) {
            p = { sku: r.sku, productLabel: r.product_label, productId: r.product_id, monthly: {}, totalQty: 0, totalValue: 0, avgQty: 0, abc: 'C', cumulativePct: 0 };
            prods.set(r.sku, p);
        }
        const key = ym(r.year, r.month);
        p.monthly[key] = (p.monthly[key] ?? 0) + Number(r.qty);
        p.totalQty += Number(r.qty);
        p.totalValue += Number(r.value_cop);
    }

    const result: SalespersonPortfolio[] = [];
    for (const [label, prodMap] of bySalesperson) {
        const products = [...prodMap.values()];
        // Valor para ABC = cantidad × costo (si hay costo); si no, el valor de venta.
        const abcValue = (p: PortfolioProduct) => {
            const cost = p.productId ? costById.get(p.productId) : undefined;
            return cost ? p.totalQty * cost : p.totalValue;
        };
        const classified = classifyAbc(products.map(p => ({ key: p.sku, value: abcValue(p) })), abcOptions);
        const abcBySku = new Map(classified.map(c => [c.key, c]));
        for (const p of products) {
            const c = abcBySku.get(p.sku);
            p.abc = c?.abc ?? 'C';
            p.cumulativePct = c?.cumulativePct ?? 100;
            p.avgQty = Math.round((p.totalQty / windowMonths.length) * 100) / 100;
        }
        products.sort((a, b) => b.totalValue - a.totalValue);
        const info = aliasInfo.get(label) ?? { id: null, sep: false };
        result.push({
            salespersonLabel: label,
            salespersonId: info.id,
            isSeparate: info.sep,
            months: windowMonths,
            products,
            counts: {
                A: products.filter(p => p.abc === 'A').length,
                B: products.filter(p => p.abc === 'B').length,
                C: products.filter(p => p.abc === 'C').length,
            },
            totalValue: products.reduce((s, p) => s + p.totalValue, 0),
        });
    }

    result.sort((a, b) => b.totalValue - a.totalValue);
    return result;
}
