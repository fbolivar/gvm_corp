/**
 * Validación de la recepción de un traslado, pieza por pieza.
 *
 * Cada renglón recibido lleva lote, fecha de vencimiento y cantidad. Una misma
 * línea del traslado puede recibirse en varios renglones (dos lotes distintos)
 * y en varias tandas (recepción parcial hoy, el resto mañana).
 *
 * Toda la aritmética vive aquí, en funciones puras con tests: recibir de más,
 * duplicar un lote o dejar pasar un renglón sin lote descuadra el inventario
 * de las dos bodegas a la vez, y eso no se nota hasta el siguiente conteo.
 */

/** Un renglón capturado en el formulario de recepción. */
export interface ReceiptDraft {
    /** Línea del traslado a la que pertenece. */
    line_id: string;
    lot_number?: string | null;
    /** Vencimiento del lote (YYYY-MM-DD). */
    expiration_date?: string | null;
    qty: number;
}

/** Lo que el traslado espera para una línea. */
export interface TransferLineState {
    line_id: string;
    /** Nombre visible, para que los mensajes de error digan qué producto es. */
    label: string;
    product_id?: string | null;
    /** Cantidad enviada. */
    qty: number;
    /** Cantidad ya recibida en recepciones anteriores. */
    qty_received: number;
    /** El producto ya maneja lotes en el sistema → el lote es obligatorio. */
    requires_lot: boolean;
}

export interface ValidationResult {
    ok: boolean;
    errors: string[];
    /** Renglones que sí se van a registrar (cantidad > 0). */
    receipts: ReceiptDraft[];
    /** Cantidad total recibida por línea, sumando las recepciones previas. */
    totalsByLine: Record<string, number>;
}

/** Pendiente por recibir de una línea. Nunca negativo. */
export function pendingQty(line: Pick<TransferLineState, 'qty' | 'qty_received'>): number {
    return Math.max(0, round4(Number(line.qty) - Number(line.qty_received ?? 0)));
}

/** Redondeo a 4 decimales: evita que 0.1 + 0.2 dispare un falso "recibes de más". */
export function round4(n: number): number {
    return Math.round(n * 10000) / 10000;
}

/** Normaliza el lote: espacios fuera y mayúsculas, para que "en0117" y "EN0117 " sean el mismo. */
export function normalizeLot(lot: string | null | undefined): string | null {
    const clean = (lot ?? '').trim().toUpperCase();
    return clean.length > 0 ? clean : null;
}

export function validateReceipt(
    drafts: ReceiptDraft[],
    lines: TransferLineState[],
): ValidationResult {
    const errors: string[] = [];
    const byLine = new Map(lines.map(l => [l.line_id, l]));

    // Solo cuentan los renglones con cantidad: el formulario arranca con filas en cero.
    const active = drafts
        .filter(d => Number(d.qty) > 0)
        .map(d => ({ ...d, qty: round4(Number(d.qty)), lot_number: normalizeLot(d.lot_number) }));

    if (active.length === 0) {
        return {
            ok: false,
            errors: ['Escribe la cantidad recibida de al menos un producto.'],
            receipts: [],
            totalsByLine: {},
        };
    }

    const totalsByLine: Record<string, number> = {};
    const lotsSeen = new Map<string, Set<string>>();

    for (const d of active) {
        const line = byLine.get(d.line_id);
        if (!line) {
            errors.push('Hay un renglón que no corresponde a este traslado.');
            continue;
        }

        if (line.requires_lot && !d.lot_number) {
            errors.push(`${line.label}: escribe el lote. Este producto maneja lotes.`);
        }

        if (d.expiration_date && Number.isNaN(Date.parse(d.expiration_date))) {
            errors.push(`${line.label}: la fecha de vencimiento no es válida.`);
        }

        // Un mismo lote repetido en dos renglones de la misma línea: casi siempre
        // es un doble registro, y sumarlo dejaría el inventario inflado.
        if (d.lot_number) {
            const seen = lotsSeen.get(d.line_id) ?? new Set<string>();
            if (seen.has(d.lot_number)) {
                errors.push(`${line.label}: el lote ${d.lot_number} está repetido. Súmalo en un solo renglón.`);
            }
            seen.add(d.lot_number);
            lotsSeen.set(d.line_id, seen);
        }

        totalsByLine[d.line_id] = round4((totalsByLine[d.line_id] ?? 0) + d.qty);
    }

    // Nadie puede recibir más de lo que se envió.
    for (const [lineId, received] of Object.entries(totalsByLine)) {
        const line = byLine.get(lineId);
        if (!line) continue;
        const pending = pendingQty(line);
        if (received > pending) {
            errors.push(
                `${line.label}: intentas recibir ${received} y solo quedan ${pending} pendientes.`,
            );
        }
    }

    return {
        ok: errors.length === 0,
        errors,
        receipts: active,
        totalsByLine,
    };
}

/**
 * Estado del traslado después de aplicar la recepción: queda RECEIVED solo
 * cuando todas las líneas llegaron completas; si falta algo sigue EN TRÁNSITO.
 */
export function nextTransferStatus(
    lines: TransferLineState[],
    totalsByLine: Record<string, number>,
): 'RECEIVED' | 'IN_TRANSIT' {
    const complete = lines.every(l => {
        const total = round4(Number(l.qty_received ?? 0) + (totalsByLine[l.line_id] ?? 0));
        return total >= Number(l.qty);
    });
    return complete ? 'RECEIVED' : 'IN_TRANSIT';
}
