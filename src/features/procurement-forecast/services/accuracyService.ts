import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from '@/shared/lib/fetchAllRows';
import { computeAccuracy, type QtyRow, type SalespersonAccuracy } from './forecastAccuracy';

/**
 * Precisión del período: cruza el pronóstico (forecast_lines) con las ventas reales
 * del mismo mes (sales_history_import). Requiere que el informe de ese mes ya esté importado.
 */
export async function getForecastAccuracy(
    client: SupabaseClient,
    period: { id: string; year: number; month: number },
): Promise<{ rows: SalespersonAccuracy[]; hasActuals: boolean }> {
    const forecastLines = await fetchAllRows<{ salesperson_label: string; sku: string; product_label: string; forecast_qty: number | null; is_one_off: boolean }>(
        ({ from, to }) => client
            .from('forecast_lines')
            .select('salesperson_label, sku, product_label, forecast_qty, is_one_off')
            .eq('period_id', period.id)
            .order('id')
            .range(from, to),
        { label: 'accuracy-forecast' },
    );
    const actualRows = await fetchAllRows<{ salesperson_label: string; sku: string; product_label: string; qty: number }>(
        ({ from, to }) => client
            .from('sales_history_import')
            .select('salesperson_label, sku, product_label, qty')
            .eq('year', period.year).eq('month', period.month)
            .order('id')
            .range(from, to),
        { label: 'accuracy-actual' },
    );

    const forecast: QtyRow[] = forecastLines.map(l => ({
        salespersonLabel: l.salesperson_label,
        sku: l.sku,
        productLabel: l.product_label,
        qty: l.is_one_off ? 0 : Number(l.forecast_qty ?? 0),
    }));
    const actual: QtyRow[] = actualRows.map(r => ({
        salespersonLabel: r.salesperson_label,
        sku: r.sku,
        productLabel: r.product_label,
        qty: Number(r.qty),
    }));

    return { rows: computeAccuracy(forecast, actual), hasActuals: actual.length > 0 };
}
