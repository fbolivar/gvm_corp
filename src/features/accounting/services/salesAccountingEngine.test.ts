import { describe, it, expect } from 'vitest';
import {
    buildSalesEntry,
    resolveLineIvaRate,
    resolvePaymentForm,
    type AccountingRule,
    type TaxRates,
} from './salesAccountingEngine';

/**
 * Casos tomados de la matriz real del contador (docs/CONTABILIZACION AUTOMATICA
 * VENTAS GVM.xlsx). Congelan el comportamiento del asiento de ventas.
 */

// FV / 19% / crédito / Persona Jurídica — según la matriz aplica retefuente y
// autorretención, pero NO ICA ni reteIVA.
const REGLAS_FV_19_PJ: AccountingRule[] = [
    { iva_rate: 19, account_code: '13050501', nature: 'D', concept: 'CARTERA' },
    { iva_rate: 19, account_code: '41352203', nature: 'C', concept: 'INGRESO' },
    { iva_rate: 19, account_code: '24080101', nature: 'C', concept: 'IVA' },
    { iva_rate: 19, account_code: '13551501', nature: 'D', concept: 'RETEFUENTE' },
    { iva_rate: 19, account_code: '13551511', nature: 'D', concept: 'AUTORRENTA_ANTICIPO' },
    { iva_rate: 19, account_code: '23657501', nature: 'C', concept: 'AUTORRENTA_PASIVO' },
];

const SIN_TARIFAS: TaxRates = {};
const CON_TARIFAS: TaxRates = {
    RETEFUENTE: { rate: 2.5, min_base: 524000 },
    RETEICA: { rate: 0.966, min_base: 1414000 },
    RETEIVA: { rate: 15, min_base: 0 },
    AUTORRENTA: { rate: 0.55, min_base: 0 },
};

const docFV = (lines: Array<{ qty: number; unit_price: number; iva_rate: number }>) => ({
    doc_kind: 'FV' as const,
    payment_form: 'CREDITO' as const,
    taxpayer_code: 'PJ',
    lines,
});

describe('buildSalesEntry — factura al 19%', () => {
    it('arma el asiento base y cuadra débito con crédito', () => {
        // Arrange
        const doc = docFV([{ qty: 10, unit_price: 100000, iva_rate: 19 }]);

        // Act
        const r = buildSalesEntry(doc, REGLAS_FV_19_PJ, SIN_TARIFAS);

        // Assert
        expect(r.totals.base).toBe(1000000);
        expect(r.totals.iva).toBe(190000);
        expect(r.totals.cartera).toBe(1190000);
        expect(r.totals.debit).toBe(r.totals.credit);
        expect(r.warnings).toEqual([]);

        const ingreso = r.lines.find(l => l.concept === 'INGRESO')!;
        expect(ingreso.account_code).toBe('41352203');
        expect(ingreso.credit).toBe(1000000);

        const iva = r.lines.find(l => l.concept === 'IVA')!;
        expect(iva.account_code).toBe('24080101');
        expect(iva.credit).toBe(190000);
    });

    it('sin tarifas confirmadas no practica retenciones, pero sí autorretención si tiene tarifa', () => {
        // Arrange
        const doc = docFV([{ qty: 1, unit_price: 1000000, iva_rate: 19 }]);

        // Act
        const r = buildSalesEntry(doc, REGLAS_FV_19_PJ, SIN_TARIFAS);

        // Assert
        expect(r.totals.retefuente).toBe(0);
        expect(r.totals.autorrenta).toBe(0);
        expect(r.lines.some(l => l.concept === 'RETEFUENTE')).toBe(false);
    });

    it('con tarifas: descuenta retefuente de la cartera y deja la autorretención por partida doble', () => {
        // Arrange
        const doc = docFV([{ qty: 1, unit_price: 1000000, iva_rate: 19 }]);

        // Act
        const r = buildSalesEntry(doc, REGLAS_FV_19_PJ, CON_TARIFAS);

        // Assert
        expect(r.totals.retefuente).toBe(25000);          // 1.000.000 × 2,5%
        expect(r.totals.autorrenta).toBe(5500);           // 1.000.000 × 0,55%
        expect(r.totals.cartera).toBe(1165000);           // 1.000.000 + 190.000 − 25.000
        expect(r.totals.debit).toBe(r.totals.credit);

        // La autorretención no toca la cartera: va al débito y al crédito.
        const anticipo = r.lines.find(l => l.concept === 'AUTORRENTA_ANTICIPO')!;
        const pasivo = r.lines.find(l => l.concept === 'AUTORRENTA_PASIVO')!;
        expect(anticipo.debit).toBe(5500);
        expect(pasivo.credit).toBe(5500);
    });

    it('no practica retefuente por debajo de la base de $524.000', () => {
        // Arrange
        const doc = docFV([{ qty: 1, unit_price: 400000, iva_rate: 19 }]);

        // Act
        const r = buildSalesEntry(doc, REGLAS_FV_19_PJ, CON_TARIFAS);

        // Assert
        expect(r.totals.retefuente).toBe(0);
        expect(r.totals.cartera).toBe(476000); // 400.000 + 76.000, sin descuento
    });

    it('no practica ICA ni reteIVA si el contador no los puso para ese cliente', () => {
        // Arrange
        const doc = docFV([{ qty: 1, unit_price: 5000000, iva_rate: 19 }]);

        // Act
        const r = buildSalesEntry(doc, REGLAS_FV_19_PJ, CON_TARIFAS);

        // Assert — la base supera ambos mínimos, pero no hay regla que las active
        expect(r.totals.reteica).toBe(0);
        expect(r.totals.reteiva).toBe(0);
    });
});

describe('buildSalesEntry — factura con varias tarifas', () => {
    const REGLAS_MIXTAS: AccountingRule[] = [
        ...REGLAS_FV_19_PJ,
        { iva_rate: 0, account_code: '13050501', nature: 'D', concept: 'CARTERA' },
        { iva_rate: 0, account_code: '41352201', nature: 'C', concept: 'INGRESO' },
        { iva_rate: 5, account_code: '13050501', nature: 'D', concept: 'CARTERA' },
        { iva_rate: 5, account_code: '41352202', nature: 'C', concept: 'INGRESO' },
        { iva_rate: 5, account_code: '24080103', nature: 'C', concept: 'IVA' },
    ];

    it('usa la cuenta de ingreso de cada tarifa y una sola cartera', () => {
        // Arrange
        const doc = docFV([
            { qty: 1, unit_price: 1000000, iva_rate: 19 },
            { qty: 1, unit_price: 500000, iva_rate: 5 },
            { qty: 1, unit_price: 300000, iva_rate: 0 },
        ]);

        // Act
        const r = buildSalesEntry(doc, REGLAS_MIXTAS, SIN_TARIFAS);

        // Assert
        const ingresos = r.lines.filter(l => l.concept === 'INGRESO');
        expect(ingresos.map(l => l.account_code).sort()).toEqual(['41352201', '41352202', '41352203']);
        expect(r.lines.filter(l => l.concept === 'CARTERA')).toHaveLength(1);
        expect(r.totals.base).toBe(1800000);
        expect(r.totals.iva).toBe(215000); // 190.000 + 25.000 + 0
        expect(r.totals.debit).toBe(r.totals.credit);
    });

    it('no duplica la retención en una factura de varias tarifas', () => {
        // Arrange
        const doc = docFV([
            { qty: 1, unit_price: 1000000, iva_rate: 19 },
            { qty: 1, unit_price: 1000000, iva_rate: 5 },
        ]);

        // Act
        const r = buildSalesEntry(doc, REGLAS_MIXTAS, CON_TARIFAS);

        // Assert
        expect(r.lines.filter(l => l.concept === 'RETEFUENTE')).toHaveLength(1);
        expect(r.totals.retefuente).toBe(50000); // 2.000.000 × 2,5%, una sola vez
        expect(r.totals.debit).toBe(r.totals.credit);
    });
});

describe('buildSalesEntry — nota crédito', () => {
    const REGLAS_NC_19_PJ: AccountingRule[] = [
        { iva_rate: 19, account_code: '13050501', nature: 'C', concept: 'CARTERA' },
        { iva_rate: 19, account_code: '417503', nature: 'D', concept: 'INGRESO' },
        { iva_rate: 19, account_code: '24080210', nature: 'D', concept: 'IVA' },
        { iva_rate: 19, account_code: '13551501', nature: 'C', concept: 'RETEFUENTE' },
    ];

    it('invierte el asiento: devolución al débito y cartera al crédito', () => {
        // Arrange
        const doc = { doc_kind: 'NC' as const, payment_form: 'CREDITO' as const, taxpayer_code: 'PJ', lines: [{ qty: 1, unit_price: 1000000, iva_rate: 19 }] };

        // Act
        const r = buildSalesEntry(doc, REGLAS_NC_19_PJ, SIN_TARIFAS);

        // Assert
        expect(r.lines.find(l => l.concept === 'INGRESO')!.debit).toBe(1000000);
        expect(r.lines.find(l => l.concept === 'IVA')!.debit).toBe(190000);
        expect(r.lines.find(l => l.concept === 'CARTERA')!.credit).toBe(1190000);
        expect(r.totals.debit).toBe(r.totals.credit);
    });
});

describe('buildSalesEntry — casos que deben avisar', () => {
    it('avisa y no arma nada si no hay reglas para esa combinación', () => {
        // Arrange
        const doc = docFV([{ qty: 1, unit_price: 100000, iva_rate: 19 }]);

        // Act
        const r = buildSalesEntry(doc, [], SIN_TARIFAS);

        // Assert
        expect(r.lines).toHaveLength(0);
        expect(r.warnings[0]).toContain('Sin reglas contables');
    });

    it('avisa si falta la cuenta de ingreso de una tarifa presente', () => {
        // Arrange — factura con 5% pero reglas solo del 19%
        const doc = docFV([{ qty: 1, unit_price: 100000, iva_rate: 5 }]);

        // Act
        const r = buildSalesEntry(doc, REGLAS_FV_19_PJ, SIN_TARIFAS);

        // Assert
        expect(r.warnings.some(w => w.includes('cuenta de ingreso'))).toBe(true);
    });
});

describe('resolveLineIvaRate', () => {
    it('prefiere lo guardado en la línea sobre la categoría del producto', () => {
        expect(resolveLineIvaRate([{ rate: 5 }], 'IVA_19')).toBe(5);
    });

    it('cae en la categoría del producto cuando la línea no trae tarifa', () => {
        expect(resolveLineIvaRate(null, 'IVA_19')).toBe(19);
        expect(resolveLineIvaRate(undefined, undefined)).toBe(0);
    });
});

describe('resolvePaymentForm', () => {
    it('respeta la forma de pago guardada en el documento', () => {
        expect(resolvePaymentForm('CONTADO', 30)).toBe('CONTADO');
    });

    it('deduce del plazo del tercero cuando el documento no la trae', () => {
        expect(resolvePaymentForm(null, 30)).toBe('CREDITO');
        expect(resolvePaymentForm(null, 0)).toBe('CONTADO');
        expect(resolvePaymentForm(undefined, null)).toBe('CONTADO');
    });
});
