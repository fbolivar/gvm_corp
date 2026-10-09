import { describe, it, expect } from 'vitest';
import { buildPurchaseEntry, type PurchaseRule, type TaxRates } from './purchaseAccountingEngine';

// Reglas de compra remisionada (CREM) al 19%
const CREM_19: PurchaseRule[] = [
    { iva_rate: 19, account_code: '143505', nature: 'D', concept: 'INVENTARIO' },
    { iva_rate: 19, account_code: '24080221', nature: 'D', concept: 'IVA' },
    { iva_rate: 19, account_code: '221001', nature: 'C', concept: 'PROVEEDORES' },
    { iva_rate: 19, account_code: '23654001', nature: 'C', concept: 'RETEFUENTE' },
];

const NO_TAXES: TaxRates = {};

describe('buildPurchaseEntry', () => {
    it('compra 19% sin retenciones: inventario + IVA = proveedores', () => {
        const r = buildPurchaseEntry(
            { doc_kind: 'CREM', payment_form: 'CREDITO', taxpayer_code: 'PJ', lines: [{ qty: 100, unit_price: 1000, iva_rate: 19 }] },
            CREM_19, NO_TAXES,
        );
        expect(r.totals.base).toBe(100000);
        expect(r.totals.iva).toBe(19000);
        expect(r.totals.proveedores).toBe(119000);
        expect(r.totals.debit).toBe(119000);
        expect(r.totals.credit).toBe(119000);
        expect(r.totals.debit).toBe(r.totals.credit);
        expect(r.warnings).toHaveLength(0);
    });

    it('aplica retefuente al proveedor y cuadra', () => {
        const r = buildPurchaseEntry(
            { doc_kind: 'CREM', payment_form: 'CREDITO', taxpayer_code: 'PJ', lines: [{ qty: 100, unit_price: 1000, iva_rate: 19 }] },
            CREM_19, { RETEFUENTE: { rate: 2.5, min_base: 0 } },
        );
        expect(r.totals.retefuente).toBe(2500);
        expect(r.totals.proveedores).toBe(116500); // 100000 + 19000 - 2500
        expect(r.totals.debit).toBe(r.totals.credit);
    });

    it('no practica retefuente si la base no supera el mínimo', () => {
        const r = buildPurchaseEntry(
            { doc_kind: 'CREM', payment_form: 'CREDITO', taxpayer_code: 'PJ', lines: [{ qty: 1, unit_price: 1000, iva_rate: 19 }] },
            CREM_19, { RETEFUENTE: { rate: 2.5, min_base: 1_000_000 } },
        );
        expect(r.totals.retefuente).toBe(0);
        expect(r.totals.debit).toBe(r.totals.credit);
    });

    it('devolución a proveedor (DMP) invierte el asiento', () => {
        const DMP: PurchaseRule[] = [
            { iva_rate: 0, account_code: '143502', nature: 'C', concept: 'INVENTARIO' },
            { iva_rate: 0, account_code: '220501', nature: 'D', concept: 'PROVEEDORES' },
        ];
        const r = buildPurchaseEntry(
            { doc_kind: 'DMP', payment_form: 'CREDITO', taxpayer_code: 'EXTERIOR', lines: [{ qty: 10, unit_price: 5000, iva_rate: 0 }] },
            DMP, NO_TAXES,
        );
        const inv = r.lines.find(l => l.concept === 'INVENTARIO')!;
        const prov = r.lines.find(l => l.concept === 'PROVEEDORES')!;
        expect(inv.credit).toBe(50000);   // inventario al crédito (sale del inventario)
        expect(prov.debit).toBe(50000);   // proveedores al débito
        expect(r.totals.debit).toBe(r.totals.credit);
    });

    it('compra mixta 0% y 19%', () => {
        const rules: PurchaseRule[] = [
            { iva_rate: 0, account_code: '143501', nature: 'D', concept: 'INVENTARIO' },
            ...CREM_19,
        ];
        const r = buildPurchaseEntry(
            { doc_kind: 'CREM', payment_form: 'CREDITO', taxpayer_code: 'PJ', lines: [
                { qty: 1, unit_price: 50000, iva_rate: 0 },
                { qty: 1, unit_price: 100000, iva_rate: 19 },
            ] },
            rules, NO_TAXES,
        );
        expect(r.totals.base).toBe(150000);
        expect(r.totals.iva).toBe(19000);
        expect(r.totals.proveedores).toBe(169000);
        expect(r.totals.debit).toBe(r.totals.credit);
    });

    it('sin reglas: warning y asiento vacío', () => {
        const r = buildPurchaseEntry(
            { doc_kind: 'CREM', payment_form: 'CONTADO', taxpayer_code: 'XX', lines: [{ qty: 1, unit_price: 1000, iva_rate: 19 }] },
            [], NO_TAXES,
        );
        expect(r.lines).toHaveLength(0);
        expect(r.warnings.length).toBeGreaterThan(0);
    });
});
