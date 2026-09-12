import type { TransferWithDetails, TransferReceipt } from '../types';

/**
 * Arma el consolidado de mercancía recibida que va al PDF del traslado.
 *
 * Vive fuera del servicio de PDF para poder probarlo sin renderizar: lo que
 * importa —que cada renglón lleve su lote, su vencimiento y su cantidad, y que
 * el total cuadre— es justo lo que el bodeguero firma al recibir.
 */

export interface ReceiptRow {
    index: number;
    sku: string;
    reference: string;
    lot: string;
    expiration: string | null;
    qty: number;
    receiver: string;
    receivedAt: string;
}

export interface ReceiptSummary {
    rows: ReceiptRow[];
    total: number;
}

export function buildReceiptRows(transfer: Pick<TransferWithDetails, 'lines' | 'receipts'>): ReceiptSummary {
    const receipts: TransferReceipt[] = [...(transfer.receipts ?? [])].sort(
        (a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime(),
    );

    const lineById = new Map((transfer.lines ?? []).map(l => [l.id, l]));
    let total = 0;

    const rows = receipts.map((r, i) => {
        const line = lineById.get(r.transfer_line_id);
        const product = line?.product as { sku?: string; name?: string } | undefined;
        const qty = Number(r.qty) || 0;
        total += qty;

        return {
            index: i + 1,
            sku: product?.sku ?? '',
            reference: product?.name ?? line?.description ?? 'Producto',
            // Sin lote es válido para productos que no los manejan; se deja
            // explícito en el documento en vez de una celda vacía.
            lot: r.lot_number ?? 'Sin lote',
            expiration: r.expiration_date ?? null,
            qty,
            receiver: r.receiver?.full_name ?? '',
            receivedAt: r.received_at,
        };
    });

    return { rows, total: Math.round(total * 10000) / 10000 };
}
