/**
 * Motor de COSTO DE VENTA (función pura, testeable).
 *
 * Cuando se vende mercancía hay que descargar el inventario y llevar su costo al
 * gasto. El asiento, por cada tarifa de IVA del producto:
 *   Débito : Costo de ventas      (61352201 / 02 / 03 según 0 / 5 / 19%)
 *   Crédito: Inventario            (143501 / 03 / 05 según 0 / 5 / 19%)
 * Es el espejo de la ENTRADA de inventario de compras (misma cuenta, lado opuesto).
 *
 * El costo unitario de cada línea lo resuelve el servicio (hoy: `products.cost`,
 * último costo; a futuro, promedio ponderado cuando las compras estén en la app).
 * Este motor solo arma el asiento: no toca Supabase.
 *
 * Pendiente de confirmación del contador: cuentas exactas por tarifa y método de
 * costo. La estructura (débito costo / crédito inventario por tarifa) es estándar.
 */

export type Nature = 'D' | 'C';
export type CostConcept = 'COSTO' | 'INVENTARIO';

/** Mapa cuenta de costo ↔ cuenta de inventario para una tarifa de IVA. */
export interface CostAccountRule {
    iva_rate: number;          // 0 | 5 | 19
    cost_account: string;      // débito (clase 6)
    inventory_account: string; // crédito (clase 14)
}

export interface CostLine {
    qty: number;
    unit_cost: number;         // costo unitario (0 = sin costo cargado)
    iva_rate: number;          // tarifa de IVA del producto (define el par de cuentas)
}

export interface CostJournalLine {
    account_code: string;
    debit: number;
    credit: number;
    concept: CostConcept;
    iva_rate: number;
}

export interface CostResult {
    lines: CostJournalLine[];
    totals: { costo: number; debit: number; credit: number; sin_costo: number };
    warnings: string[];
}

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function buildCostOfSalesEntry(lines: CostLine[], rules: CostAccountRule[]): CostResult {
    const warnings: string[] = [];
    const out: CostJournalLine[] = [];

    // Costo por tarifa (solo líneas con costo > 0). Las de costo 0 se cuentan aparte
    // para avisar: no descuadran el asiento (no generan movimiento), pero subvaloran
    // el costo de venta hasta que se cargue el costo del producto.
    const costoByRate = new Map<number, number>();
    let sinCosto = 0;
    for (const l of lines) {
        const qty = Number(l.qty) || 0;
        const unit = Number(l.unit_cost) || 0;
        const rate = Number(l.iva_rate) || 0;
        const amount = qty * unit;
        if (unit <= 0) { sinCosto += qty; continue; }
        costoByRate.set(rate, (costoByRate.get(rate) ?? 0) + amount);
    }

    let totalCosto = 0;
    for (const [rate, costo] of [...costoByRate.entries()].sort((a, b) => a[0] - b[0])) {
        const v = round2(costo);
        if (v === 0) continue;
        const rule = rules.find(r => Number(r.iva_rate) === rate);
        if (!rule) {
            warnings.push(`No hay cuentas de costo/inventario para la tarifa ${rate}%.`);
            continue;
        }
        out.push({ account_code: rule.cost_account, debit: v, credit: 0, concept: 'COSTO', iva_rate: rate });
        out.push({ account_code: rule.inventory_account, debit: 0, credit: v, concept: 'INVENTARIO', iva_rate: rate });
        totalCosto += v;
    }

    if (sinCosto > 0) {
        warnings.push(`${round2(sinCosto)} unidad(es) vendida(s) de productos SIN costo cargado: su costo de venta no se registró. Carga el costo del producto.`);
    }

    const debit = round2(out.reduce((s, l) => s + l.debit, 0));
    const credit = round2(out.reduce((s, l) => s + l.credit, 0));
    return { lines: out, totals: { costo: round2(totalCosto), debit, credit, sin_costo: round2(sinCosto) }, warnings };
}
