import { describe, it, expect } from 'vitest';
import { buildCostOfSalesEntry, type CostAccountRule } from './costOfSalesEngine';

const RULES: CostAccountRule[] = [
    { iva_rate: 0, cost_account: '61352201', inventory_account: '143501' },
    { iva_rate: 5, cost_account: '61352202', inventory_account: '143503' },
    { iva_rate: 19, cost_account: '61352203', inventory_account: '143505' },
];

describe('buildCostOfSalesEntry', () => {
    it('arma débito costo y crédito inventario por tarifa, cuadrado', () => {
        const r = buildCostOfSalesEntry(
            [{ qty: 10, unit_cost: 1000, iva_rate: 19 }],
            RULES,
        );
        expect(r.totals.costo).toBe(10000);
        expect(r.totals.debit).toBe(r.totals.credit);
        expect(r.lines).toEqual([
            { account_code: '61352203', debit: 10000, credit: 0, concept: 'COSTO', iva_rate: 19 },
            { account_code: '143505', debit: 0, credit: 10000, concept: 'INVENTARIO', iva_rate: 19 },
        ]);
    });

    it('mezcla varias tarifas, una línea de costo por cada una', () => {
        const r = buildCostOfSalesEntry(
            [
                { qty: 2, unit_cost: 500, iva_rate: 0 },
                { qty: 3, unit_cost: 100, iva_rate: 5 },
                { qty: 1, unit_cost: 1000, iva_rate: 19 },
            ],
            RULES,
        );
        // 1000 (0%) + 300 (5%) + 1000 (19%)
        expect(r.totals.costo).toBe(2300);
        expect(r.totals.debit).toBe(r.totals.credit);
        expect(r.lines.filter(l => l.concept === 'COSTO').map(l => l.account_code))
            .toEqual(['61352201', '61352202', '61352203']);
    });

    it('agrupa varias líneas de la misma tarifa en una sola cuenta', () => {
        const r = buildCostOfSalesEntry(
            [
                { qty: 1, unit_cost: 100, iva_rate: 19 },
                { qty: 1, unit_cost: 400, iva_rate: 19 },
            ],
            RULES,
        );
        const costo = r.lines.filter(l => l.concept === 'COSTO');
        expect(costo.length).toBe(1);
        expect(costo[0]).toMatchObject({ account_code: '61352203', debit: 500 });
    });

    it('productos sin costo: no descuadran y avisan', () => {
        const r = buildCostOfSalesEntry(
            [
                { qty: 5, unit_cost: 0, iva_rate: 19 },   // sin costo
                { qty: 2, unit_cost: 100, iva_rate: 19 }, // con costo
            ],
            RULES,
        );
        expect(r.totals.costo).toBe(200);
        expect(r.totals.sin_costo).toBe(5);
        expect(r.totals.debit).toBe(r.totals.credit);
        expect(r.warnings.some(w => w.includes('SIN costo'))).toBe(true);
    });

    it('todo sin costo: asiento vacío, cuadrado en 0', () => {
        const r = buildCostOfSalesEntry([{ qty: 3, unit_cost: 0, iva_rate: 5 }], RULES);
        expect(r.lines).toEqual([]);
        expect(r.totals.debit).toBe(0);
        expect(r.totals.credit).toBe(0);
        expect(r.totals.sin_costo).toBe(3);
    });

    it('tarifa sin regla de cuentas: avisa', () => {
        const r = buildCostOfSalesEntry([{ qty: 1, unit_cost: 100, iva_rate: 19 }], [RULES[0]]);
        expect(r.warnings.some(w => w.includes('19%'))).toBe(true);
    });
});
