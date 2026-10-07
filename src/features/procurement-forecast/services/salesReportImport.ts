// PRP-008 Fase 1 — lógica pura de parseo/agregación del informe de ventas de Viviana.
// Sin dependencias de Excel ni base de datos: testeable en aislamiento.

/** Fila cruda tomada de la hoja BASE del informe (una por línea de factura). */
export interface RawSalesRow {
    vendedor: string;      // "JOSE ALEXANDER CLAVIJO NIÑO" | "ZONA CENTRO PORCICULTURA"
    descripcion: string;   // "MUCOL-028 MUCOLIPTOL GARRAFA * 20 L"
    anio: number | string; // 2026
    mes: number | string;  // 9 | "9. SEPTIEMBRE 2026"
    cantidad: number | string;
    neto: number | string;
}

/** Fila agregada: un comercial × producto × mes. Lo que se envía al servidor. */
export interface AggregatedSalesRow {
    salespersonLabel: string;
    sku: string;
    productLabel: string;
    year: number;
    month: number;
    qty: number;
    valueCop: number;
}

/** Extrae el código (SKU) del primer token de la descripción. "MUCOL-028 MUCOLIPTOL…" → "MUCOL-028". */
export function extractSku(descripcion: string): string {
    const trimmed = (descripcion ?? '').trim();
    const match = trimmed.match(/^(\S+)\s+(.+)$/);
    return match ? match[1] : trimmed;
}

/** Normaliza el mes a 1–12. Acepta 9, "9", "9. SEPTIEMBRE 2026". 0 si no se reconoce. */
export function parseMonth(mes: number | string): number {
    if (typeof mes === 'number') return Number.isInteger(mes) && mes >= 1 && mes <= 12 ? mes : 0;
    const m = String(mes).trim().match(/^(\d{1,2})/);
    if (!m) return 0;
    const n = Number(m[1]);
    return n >= 1 && n <= 12 ? n : 0;
}

function toNumber(v: number | string): number {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    const n = Number(String(v).replace(/[^0-9.-]/g, ''));
    return isFinite(n) ? n : 0;
}

/**
 * Agrupa las líneas crudas por (vendedor, sku, año, mes) sumando cantidad y neto.
 * Descarta filas sin vendedor, sin descripción o con mes/año inválidos.
 * El productLabel conservado es la primera descripción vista para ese sku.
 */
export function aggregateSalesRows(rows: RawSalesRow[]): AggregatedSalesRow[] {
    const map = new Map<string, AggregatedSalesRow>();

    for (const r of rows) {
        const vendedor = (r.vendedor ?? '').trim();
        const descripcion = (r.descripcion ?? '').trim();
        if (!vendedor || !descripcion) continue;

        const year = toNumber(r.anio);
        const month = parseMonth(r.mes);
        if (year < 2000 || month < 1) continue;

        const sku = extractSku(descripcion);
        const key = `${vendedor}|||${sku}|||${year}|||${month}`;

        const existing = map.get(key);
        const qty = toNumber(r.cantidad);
        const valueCop = toNumber(r.neto);
        if (existing) {
            existing.qty += qty;
            existing.valueCop += valueCop;
        } else {
            map.set(key, { salespersonLabel: vendedor, sku, productLabel: descripcion, year, month, qty, valueCop });
        }
    }

    return [...map.values()];
}

/** Lista de vendedores distintos presentes en el agregado (para el mapeo de alias). */
export function distinctSalespeople(rows: AggregatedSalesRow[]): string[] {
    return [...new Set(rows.map(r => r.salespersonLabel))].sort();
}
