// PRP-008 Fase 5 — precisión del pronóstico: lo pronosticado vs. lo vendido real.
// Lógica pura, testeable sin base de datos.

export interface QtyRow { salespersonLabel: string; sku: string; productLabel?: string; qty: number }

export interface ProductAccuracy {
    sku: string;
    productLabel: string;
    forecast: number;
    actual: number;
    diff: number;   // actual - forecast (negativo = vendió menos de lo pronosticado)
}

export interface SalespersonAccuracy {
    salespersonLabel: string;
    forecastTotal: number;
    actualTotal: number;
    mae: number;          // Σ |forecast - actual| por producto
    accuracyPct: number;  // 0–100: 100 = clavado
    products: ProductAccuracy[];
}

/**
 * Cruza pronóstico y ventas reales por (comercial, producto) y calcula precisión.
 * accuracyPct = 100 · (1 − Σ|f−a| / base), base = max(ΣF, ΣA, 1), acotado a [0,100].
 * Penaliza tanto sobre- como sub-pronóstico y maneja ceros sin dividir por cero.
 */
export function computeAccuracy(forecast: QtyRow[], actual: QtyRow[]): SalespersonAccuracy[] {
    type Cell = { forecast: number; actual: number; label: string };
    const bySp = new Map<string, Map<string, Cell>>();

    const put = (r: QtyRow, field: 'forecast' | 'actual') => {
        let prods = bySp.get(r.salespersonLabel);
        if (!prods) { prods = new Map(); bySp.set(r.salespersonLabel, prods); }
        let cell = prods.get(r.sku);
        if (!cell) { cell = { forecast: 0, actual: 0, label: r.productLabel ?? r.sku }; prods.set(r.sku, cell); }
        cell[field] += r.qty;
        if (r.productLabel && cell.label === r.sku) cell.label = r.productLabel;
    };
    for (const r of forecast) put(r, 'forecast');
    for (const r of actual) put(r, 'actual');

    const result: SalespersonAccuracy[] = [];
    for (const [label, prods] of bySp) {
        const products: ProductAccuracy[] = [];
        let fTotal = 0, aTotal = 0, mae = 0;
        for (const [sku, c] of prods) {
            products.push({ sku, productLabel: c.label, forecast: c.forecast, actual: c.actual, diff: c.actual - c.forecast });
            fTotal += c.forecast; aTotal += c.actual; mae += Math.abs(c.forecast - c.actual);
        }
        const base = Math.max(fTotal, aTotal, 1);
        const accuracyPct = Math.max(0, Math.min(100, Math.round((1 - mae / base) * 1000) / 10));
        products.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
        result.push({ salespersonLabel: label, forecastTotal: fTotal, actualTotal: aTotal, mae, accuracyPct, products });
    }
    result.sort((a, b) => b.actualTotal - a.actualTotal);
    return result;
}
