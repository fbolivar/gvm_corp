import { describe, test, expect } from 'vitest';
import { buildReceiptRows } from './receiptRows';

const transfer = {
    lines: [
        { id: 'L1', qty: 10, qty_received: 6, description: '', product: { sku: 'MIXFM-321', name: 'MIXILAND F.MFCO' } },
        { id: 'L2', qty: 5, qty_received: 5, description: 'Item sin código', product: undefined },
    ],
    receipts: [
        {
            id: 'R2', transfer_line_id: 'L1', lot_number: 'EN0118', expiration_date: '2026-12-31',
            qty: 4, received_at: '2026-09-08T10:00:00Z', receiver: { full_name: 'ANA GÓMEZ' },
        },
        {
            id: 'R1', transfer_line_id: 'L1', lot_number: 'EN0117', expiration_date: '2026-09-30',
            qty: 2, received_at: '2026-09-07T10:00:00Z', receiver: { full_name: 'ANA GÓMEZ' },
        },
        {
            id: 'R3', transfer_line_id: 'L2', lot_number: null, expiration_date: null,
            qty: 5, received_at: '2026-09-09T10:00:00Z', receiver: null,
        },
    ],
} as unknown as Parameters<typeof buildReceiptRows>[0];

describe('consolidado de recepción para el PDF', () => {
    test('ordena los renglones del más antiguo al más reciente', () => {
        const { rows } = buildReceiptRows(transfer);
        expect(rows.map(r => r.lot)).toEqual(['EN0117', 'EN0118', 'Sin lote']);
        expect(rows.map(r => r.index)).toEqual([1, 2, 3]);
    });

    test('lleva código, referencia, lote y vencimiento de cada renglón', () => {
        const { rows } = buildReceiptRows(transfer);
        expect(rows[0]).toMatchObject({
            sku: 'MIXFM-321',
            reference: 'MIXILAND F.MFCO',
            lot: 'EN0117',
            expiration: '2026-09-30',
            qty: 2,
            receiver: 'ANA GÓMEZ',
        });
    });

    test('un producto recibido en dos lotes aparece como dos renglones', () => {
        const { rows } = buildReceiptRows(transfer);
        const deL1 = rows.filter(r => r.sku === 'MIXFM-321');
        expect(deL1).toHaveLength(2);
        expect(deL1.map(r => r.qty)).toEqual([2, 4]);
    });

    test('el total suma todo lo recibido', () => {
        expect(buildReceiptRows(transfer).total).toBe(11);
    });

    test('un ítem sin producto usa su descripción y se marca "Sin lote"', () => {
        const { rows } = buildReceiptRows(transfer);
        expect(rows[2]).toMatchObject({ sku: '', reference: 'Item sin código', lot: 'Sin lote', expiration: null, receiver: '' });
    });

    test('un traslado sin recepciones no rompe el PDF', () => {
        const vacio = buildReceiptRows({ lines: [], receipts: [] } as never);
        expect(vacio.rows).toEqual([]);
        expect(vacio.total).toBe(0);
    });

    test('los decimales no arrastran error de coma flotante en el total', () => {
        const conDecimales = buildReceiptRows({
            lines: [{ id: 'L1', qty: 1, product: { sku: 'X', name: 'X' } }],
            receipts: [
                { id: 'A', transfer_line_id: 'L1', qty: 0.1, received_at: '2026-09-07T10:00:00Z' },
                { id: 'B', transfer_line_id: 'L1', qty: 0.2, received_at: '2026-09-07T11:00:00Z' },
            ],
        } as never);
        expect(conDecimales.total).toBe(0.3);
    });
});
