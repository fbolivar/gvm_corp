import type { AccountStatus, PartyCommercialSnapshot } from '../types/visits';

/**
 * Ficha comercial del cliente calculada a partir de sus pedidos reales.
 *
 * Reemplaza las 11 columnas INDEX/MATCH del Excel (venta acumulada, variación,
 * última compra, producto principal, mayor caída, estado de la cuenta) que se
 * alimentaban de una foto manual del informe de WorldOffice. Aquí se calcula
 * en vivo con los pedidos facturados de la app.
 *
 * Lógica pura: recibe las filas ya leídas y la fecha "hoy" (Bogotá).
 */

export interface SaleRow {
    /** 'YYYY-MM-DD' */
    issue_date: string;
    total: number;
}

export interface SaleLineRow {
    issue_date: string;
    product_name: string;
    line_total: number;
}

function pct(current: number, previous: number): number | null {
    if (previous <= 0) return null;
    return Math.round(((current - previous) / previous) * 1000) / 10;
}

function shiftYear(date: string, years: number): string {
    return `${Number(date.slice(0, 4)) + years}${date.slice(4)}`;
}

/** Regla de estado de la cuenta (misma semántica que la hoja BD CLIENTES del Excel). */
export function classifyAccount(input: {
    today: string;
    last_purchase_date: string | null;
    sales_ytd: number;
    sales_prev_ytd: number;
}): AccountStatus {
    const { today, last_purchase_date: last } = input;
    if (!last) return 'SIN_HISTORIAL';
    const yearStart = `${today.slice(0, 4)}-01-01`;
    const monthStart = `${today.slice(0, 7)}-01`;
    if (last < shiftYear(today, -1)) return 'INACTIVO_LARGO';
    if (last < yearStart) return 'INACTIVO_ANIO';
    if (last < monthStart) return 'SIN_COMPRA_MES';
    if (input.sales_prev_ytd > 0 && input.sales_ytd < input.sales_prev_ytd) return 'ACTIVO_CAIDA';
    return 'ACTIVO_CRECIMIENTO';
}

export function buildSnapshot(partyId: string, today: string, sales: SaleRow[], lines: SaleLineRow[]): PartyCommercialSnapshot {
    const year = today.slice(0, 4);
    const prevYear = String(Number(year) - 1);
    const month = today.slice(0, 7);
    const prevMonth = `${prevYear}${today.slice(4, 7)}`;
    const prevToday = shiftYear(today, -1);

    let sales_ytd = 0, sales_prev_ytd = 0, sales_month = 0, sales_prev_month = 0, orders_count_ytd = 0;
    let last: string | null = null;

    for (const s of sales) {
        const d = s.issue_date;
        if (!last || d > last) last = d;
        if (d.startsWith(year) && d <= today) { sales_ytd += s.total; orders_count_ytd += 1; }
        if (d.startsWith(prevYear) && d <= prevToday) sales_prev_ytd += s.total;
        if (d.startsWith(month)) sales_month += s.total;
        if (d.startsWith(prevMonth)) sales_prev_month += s.total;
    }

    // Producto principal (año en curso) y mayor caída vs. año anterior.
    const cur = new Map<string, number>();
    const prev = new Map<string, number>();
    for (const l of lines) {
        if (l.issue_date.startsWith(year)) cur.set(l.product_name, (cur.get(l.product_name) ?? 0) + l.line_total);
        else if (l.issue_date.startsWith(prevYear) && l.issue_date <= prevToday) prev.set(l.product_name, (prev.get(l.product_name) ?? 0) + l.line_total);
    }
    let top_product: string | null = null, topVal = 0;
    for (const [name, v] of cur) if (v > topVal) { topVal = v; top_product = name; }

    let biggest_drop_product: string | null = null, drop = 0;
    for (const [name, pv] of prev) {
        const diff = (cur.get(name) ?? 0) - pv;
        if (diff < drop) { drop = diff; biggest_drop_product = name; }
    }

    return {
        party_id: partyId,
        sales_ytd, sales_prev_ytd, var_ytd_pct: pct(sales_ytd, sales_prev_ytd),
        sales_month, sales_prev_month, var_month_pct: pct(sales_month, sales_prev_month),
        last_purchase_date: last,
        orders_count_ytd,
        top_product,
        biggest_drop_product,
        account_status: classifyAccount({ today, last_purchase_date: last, sales_ytd, sales_prev_ytd }),
    };
}
