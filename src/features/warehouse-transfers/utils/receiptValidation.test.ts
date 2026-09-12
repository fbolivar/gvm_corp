import { describe, test, expect } from 'vitest';
import {
    validateReceipt,
    nextTransferStatus,
    pendingQty,
    normalizeLot,
    TransferLineState,
} from './receiptValidation';

const line = (over: Partial<TransferLineState> = {}): TransferLineState => ({
    line_id: 'L1',
    label: 'MIXILAND F.MFCO',
    product_id: 'P1',
    qty: 10,
    qty_received: 0,
    requires_lot: false,
    ...over,
});

describe('pendiente por recibir', () => {
    test('descuenta lo ya recibido', () => {
        expect(pendingQty({ qty: 10, qty_received: 4 })).toBe(6);
    });

    test('nunca es negativo aunque hayan recibido de más', () => {
        expect(pendingQty({ qty: 10, qty_received: 12 })).toBe(0);
    });
});

describe('normalización del lote', () => {
    test('quita espacios y unifica mayúsculas', () => {
        expect(normalizeLot(' en0117 ')).toBe('EN0117');
    });

    test('vacío se guarda como sin lote', () => {
        expect(normalizeLot('   ')).toBeNull();
        expect(normalizeLot(undefined)).toBeNull();
    });
});

describe('validación de la recepción', () => {
    test('acepta una recepción normal con lote y vencimiento', () => {
        // Arrange: el caso de la planilla — lote EN0117, vence 30/09/2026, 2 unidades.
        const drafts = [{ line_id: 'L1', lot_number: 'EN0117', expiration_date: '2026-09-30', qty: 2 }];

        // Act
        const result = validateReceipt(drafts, [line()]);

        // Assert
        expect(result.ok).toBe(true);
        expect(result.errors).toEqual([]);
        expect(result.totalsByLine).toEqual({ L1: 2 });
    });

    test('sin cantidades no se registra nada', () => {
        const result = validateReceipt([{ line_id: 'L1', qty: 0 }], [line()]);
        expect(result.ok).toBe(false);
        expect(result.errors[0]).toContain('al menos un producto');
    });

    test('rechaza recibir más de lo enviado, contando lo ya recibido', () => {
        // Arrange: de 10 enviadas ya llegaron 8; intentan recibir 3 más.
        const drafts = [{ line_id: 'L1', qty: 3 }];

        // Act
        const result = validateReceipt(drafts, [line({ qty_received: 8 })]);

        // Assert
        expect(result.ok).toBe(false);
        expect(result.errors[0]).toContain('solo quedan 2');
    });

    test('permite repartir una línea en dos lotes distintos', () => {
        const drafts = [
            { line_id: 'L1', lot_number: 'EN0117', expiration_date: '2026-09-30', qty: 6 },
            { line_id: 'L1', lot_number: 'EN0118', expiration_date: '2026-12-31', qty: 4 },
        ];

        const result = validateReceipt(drafts, [line()]);

        expect(result.ok).toBe(true);
        expect(result.totalsByLine).toEqual({ L1: 10 });
    });

    test('la suma de varios lotes tampoco puede pasarse del envío', () => {
        const drafts = [
            { line_id: 'L1', lot_number: 'A', qty: 6 },
            { line_id: 'L1', lot_number: 'B', qty: 7 },
        ];
        const result = validateReceipt(drafts, [line()]);
        expect(result.ok).toBe(false);
        expect(result.errors[0]).toContain('recibir 13');
    });

    test('avisa si repiten el mismo lote en dos renglones', () => {
        const drafts = [
            { line_id: 'L1', lot_number: 'EN0117', qty: 2 },
            { line_id: 'L1', lot_number: 'en0117 ', qty: 3 },
        ];
        const result = validateReceipt(drafts, [line()]);
        expect(result.ok).toBe(false);
        expect(result.errors.some(e => e.includes('EN0117') && e.includes('repetido'))).toBe(true);
    });

    test('exige lote cuando el producto ya maneja lotes', () => {
        const result = validateReceipt([{ line_id: 'L1', qty: 5 }], [line({ requires_lot: true })]);
        expect(result.ok).toBe(false);
        expect(result.errors[0]).toContain('escribe el lote');
    });

    test('no exige lote cuando el producto no los maneja', () => {
        const result = validateReceipt([{ line_id: 'L1', qty: 5 }], [line({ requires_lot: false })]);
        expect(result.ok).toBe(true);
    });

    test('rechaza una fecha de vencimiento inválida', () => {
        const result = validateReceipt(
            [{ line_id: 'L1', lot_number: 'A', expiration_date: '30/09/2026', qty: 1 }],
            [line()],
        );
        expect(result.ok).toBe(false);
        expect(result.errors[0]).toContain('fecha de vencimiento');
    });

    test('ignora renglones que no pertenecen al traslado', () => {
        const result = validateReceipt([{ line_id: 'OTRA', qty: 1 }], [line()]);
        expect(result.ok).toBe(false);
        expect(result.errors[0]).toContain('no corresponde');
    });

    test('los decimales no disparan un falso exceso', () => {
        // 0.1 + 0.2 en coma flotante da 0.30000000000000004
        const drafts = [
            { line_id: 'L1', lot_number: 'A', qty: 0.1 },
            { line_id: 'L1', lot_number: 'B', qty: 0.2 },
        ];
        const result = validateReceipt(drafts, [line({ qty: 0.3 })]);
        expect(result.ok).toBe(true);
        expect(result.totalsByLine.L1).toBe(0.3);
    });
});

describe('estado del traslado tras recibir', () => {
    test('queda RECIBIDO cuando todo llegó completo', () => {
        expect(nextTransferStatus([line()], { L1: 10 })).toBe('RECEIVED');
    });

    test('sigue EN TRÁNSITO con una recepción parcial', () => {
        expect(nextTransferStatus([line()], { L1: 4 })).toBe('IN_TRANSIT');
    });

    test('suma lo recibido antes para decidir si ya está completo', () => {
        expect(nextTransferStatus([line({ qty_received: 7 })], { L1: 3 })).toBe('RECEIVED');
    });

    test('con dos líneas, basta que falte una para seguir en tránsito', () => {
        const lines = [line(), line({ line_id: 'L2', label: 'OTRO' })];
        expect(nextTransferStatus(lines, { L1: 10, L2: 5 })).toBe('IN_TRANSIT');
        expect(nextTransferStatus(lines, { L1: 10, L2: 10 })).toBe('RECEIVED');
    });
});
