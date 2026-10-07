import { describe, it, expect } from 'vitest';
import { computeAccuracy } from './forecastAccuracy';

describe('computeAccuracy', () => {
    it('precisión 100% cuando pronóstico = real', () => {
        const out = computeAccuracy(
            [{ salespersonLabel: 'A', sku: 'X-1', qty: 100 }],
            [{ salespersonLabel: 'A', sku: 'X-1', qty: 100 }],
        );
        expect(out[0].accuracyPct).toBe(100);
        expect(out[0].products[0].diff).toBe(0);
    });

    it('refleja el ejemplo de Julián: pronosticó 500, vendió 484', () => {
        const out = computeAccuracy(
            [{ salespersonLabel: 'ALEX', sku: 'CEAC-1', qty: 500 }],
            [{ salespersonLabel: 'ALEX', sku: 'CEAC-1', qty: 484 }],
        );
        expect(out[0].forecastTotal).toBe(500);
        expect(out[0].actualTotal).toBe(484);
        expect(out[0].mae).toBe(16);
        expect(out[0].accuracyPct).toBe(96.8); // 1 - 16/500
    });

    it('cuenta un producto vendido que no se pronosticó', () => {
        const out = computeAccuracy(
            [{ salespersonLabel: 'A', sku: 'X-1', qty: 10 }],
            [{ salespersonLabel: 'A', sku: 'X-1', qty: 10 }, { salespersonLabel: 'A', sku: 'Y-2', qty: 40 }],
        );
        const sp = out[0];
        expect(sp.forecastTotal).toBe(10);
        expect(sp.actualTotal).toBe(50);
        expect(sp.products.find(p => p.sku === 'Y-2')!.diff).toBe(40);
        // mae = |10-10| + |0-40| = 40; base = max(10,50)=50 → 1 - 40/50 = 20%
        expect(sp.accuracyPct).toBe(20);
    });

    it('separa por comercial', () => {
        const out = computeAccuracy(
            [{ salespersonLabel: 'A', sku: 'X', qty: 5 }, { salespersonLabel: 'B', sku: 'X', qty: 5 }],
            [{ salespersonLabel: 'A', sku: 'X', qty: 5 }, { salespersonLabel: 'B', sku: 'X', qty: 5 }],
        );
        expect(out).toHaveLength(2);
    });

    it('no divide por cero sin datos', () => {
        expect(computeAccuracy([], [])).toEqual([]);
    });
});
