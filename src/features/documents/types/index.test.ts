import { describe, it, expect } from 'vitest';
import { documentSchema, missingCatalogProductLines } from './index';

// Reunión con Andrés (contador), 2026-09-29: Factura y Nota Crédito exigen
// producto real del catálogo (nunca texto libre); en el resto de documentos
// el texto libre sigue permitido, pero el IVA debe elegirse a propósito —
// antes quedaba en 0% sin que nadie lo notara.

const REAL_PRODUCT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

function baseDoc(overrides: Record<string, unknown> = {}) {
    return {
        doc_type: 'SALES_ORDER',
        party_id: 'party-1',
        issue_date: '2026-09-30',
        lines: [],
        ...overrides,
    };
}

// missingCatalogProductLines() vive APARTE del schema a propósito: el schema
// corre también al editar, y 3 facturas reales ya tenían 14 líneas de texto
// libre de antes de esta regla — exigirla ahí las habría dejado imposibles
// de guardar. Los llamadores (acciones de creación, DocumentForm en modo
// nuevo) la invocan explícitamente, nunca al editar.
describe('missingCatalogProductLines — producto de catálogo obligatorio en Factura/Nota Crédito (solo al crear)', () => {
    it('reporta la línea sin product_id en INVOICE', () => {
        const missing = missingCatalogProductLines({
            doc_type: 'INVOICE',
            lines: [{ description: 'Algo escrito a mano', qty: 1, unit_price: 100 }],
        } as any);
        expect(missing).toEqual([0]);
    });

    it('reporta la línea sin product_id en CREDIT_NOTE', () => {
        const missing = missingCatalogProductLines({
            doc_type: 'CREDIT_NOTE',
            lines: [{ description: 'Algo escrito a mano', qty: 1, unit_price: 100 }],
        } as any);
        expect(missing).toEqual([0]);
    });

    it('no reporta nada si la línea SÍ tiene product_id en INVOICE', () => {
        const missing = missingCatalogProductLines({
            doc_type: 'INVOICE',
            lines: [{ product_id: REAL_PRODUCT_ID, description: 'Producto real', qty: 1, unit_price: 100 }],
        } as any);
        expect(missing).toEqual([]);
    });

    it('NO exige product_id en SALES_ORDER (pedidos siguen aceptando texto libre)', () => {
        const missing = missingCatalogProductLines({
            doc_type: 'SALES_ORDER',
            lines: [{ description: 'Algo escrito a mano', qty: 1, unit_price: 100 }],
        } as any);
        expect(missing).toEqual([]);
    });

    it('NO exige product_id en QUOTATION ni DELIVERY_NOTE', () => {
        for (const doc_type of ['QUOTATION', 'DELIVERY_NOTE']) {
            const missing = missingCatalogProductLines({
                doc_type,
                lines: [{ description: 'Algo escrito a mano', qty: 1, unit_price: 100 }],
            } as any);
            expect(missing).toEqual([]);
        }
    });
});

describe('documentSchema — el schema (usado también al EDITAR) nunca exige producto de catálogo', () => {
    it('acepta una línea sin product_id en INVOICE a nivel de schema (la regla vive en missingCatalogProductLines, no aquí)', () => {
        const result = documentSchema.safeParse(baseDoc({
            doc_type: 'INVOICE',
            lines: [{ description: 'Algo escrito a mano', qty: 1, unit_price: 100, tax_config: [{ rate: 19 }] }],
        }));
        expect(result.success).toBe(true);
    });
});

describe('documentSchema — IVA obligatorio en líneas sin producto', () => {
    it('rechaza una línea de texto libre sin tax_config (antes quedaba en 0% silencioso)', () => {
        const result = documentSchema.safeParse(baseDoc({
            lines: [{ description: 'Algo escrito a mano', qty: 1, unit_price: 100 }],
        }));
        expect(result.success).toBe(false);
    });

    it('rechaza una línea de texto libre con tax_config vacío', () => {
        const result = documentSchema.safeParse(baseDoc({
            lines: [{ description: 'Algo escrito a mano', qty: 1, unit_price: 100, tax_config: [] }],
        }));
        expect(result.success).toBe(false);
    });

    it('acepta 0% IVA cuando se elige explícitamente (no es lo mismo que no elegir)', () => {
        const result = documentSchema.safeParse(baseDoc({
            lines: [{ description: 'Algo escrito a mano', qty: 1, unit_price: 100, tax_config: [{ rate: 0, type: 'IVA', name: 'IVA' }] }],
        }));
        expect(result.success).toBe(true);
    });

    it('no exige tax_config si la línea SÍ tiene product_id (el IVA lo determina el producto)', () => {
        const result = documentSchema.safeParse(baseDoc({
            lines: [{ product_id: REAL_PRODUCT_ID, description: 'Producto real', qty: 1, unit_price: 100 }],
        }));
        expect(result.success).toBe(true);
    });
});
