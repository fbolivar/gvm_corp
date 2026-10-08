import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from '@/shared/lib/fetchAllRows';

export interface MissingProduct {
    sku: string;
    productLabel: string;
    totalQty: number;
    months: number;   // en cuántos meses apareció
}

/**
 * Productos del informe que NO están en el catálogo del sistema (product_id nulo).
 * El histórico igual se guardó; esta lista ayuda a Compras a crearlos en el catálogo.
 */
export async function getMissingProducts(client: SupabaseClient): Promise<MissingProduct[]> {
    const rows = await fetchAllRows<{ sku: string; product_label: string; qty: number; year: number; month: number }>(
        ({ from, to }) => client
            .from('sales_history_import')
            .select('sku, product_label, qty, year, month')
            .is('product_id', null)
            .order('id')
            .range(from, to),
        { label: 'missing-products' },
    );

    const map = new Map<string, { label: string; qty: number; months: Set<string> }>();
    for (const r of rows) {
        let m = map.get(r.sku);
        if (!m) { m = { label: r.product_label, qty: 0, months: new Set() }; map.set(r.sku, m); }
        m.qty += Number(r.qty);
        m.months.add(`${r.year}-${r.month}`);
    }

    return [...map.entries()]
        .map(([sku, m]) => ({ sku, productLabel: m.label, totalQty: m.qty, months: m.months.size }))
        .sort((a, b) => b.totalQty - a.totalQty);
}
