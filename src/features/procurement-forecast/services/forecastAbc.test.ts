import { describe, it, expect } from 'vitest';
import { classifyAbc } from './forecastAbc';

describe('classifyAbc', () => {
    it('ordena por valor descendente', () => {
        const out = classifyAbc([{ key: 'a', value: 10 }, { key: 'b', value: 100 }, { key: 'c', value: 50 }]);
        expect(out.map(o => o.key)).toEqual(['b', 'c', 'a']);
    });

    it('asigna A/B/C por acumulado (reparto realista)', () => {
        // total 100 → acumulados 40, 70, 90, 99, 100
        const out = classifyAbc([
            { key: 'a', value: 40 }, { key: 'b', value: 30 }, { key: 'c', value: 20 },
            { key: 'd', value: 9 }, { key: 'e', value: 1 },
        ]);
        const byKey = Object.fromEntries(out.map(o => [o.key, o.abc]));
        expect(byKey).toEqual({ a: 'A', b: 'A', c: 'A', d: 'B', e: 'C' });
    });

    it('rescata a B un producto de bajo acumulado pero alto valor (>600k)', () => {
        // 'big' queda al final del acumulado pero supera el piso de 600k → B, no C
        const out = classifyAbc([
            { key: 'dom', value: 100_000_000 },
            { key: 'big', value: 700_000 },
        ]);
        const big = out.find(o => o.key === 'big')!;
        expect(big.cumulativePct).toBeGreaterThan(99);
        expect(big.abc).toBe('B');
    });

    it('deja en C lo de bajo acumulado y bajo valor', () => {
        const out = classifyAbc([
            { key: 'dom', value: 100_000_000 },
            { key: 'small', value: 5_000 },
        ]);
        expect(out.find(o => o.key === 'small')!.abc).toBe('C');
    });

    it('respeta umbrales configurables', () => {
        const out = classifyAbc(
            [{ key: 'a', value: 80 }, { key: 'b', value: 20 }],
            { aThreshold: 80, bThreshold: 100, bValueFloor: 1_000_000 },
        );
        expect(out.find(o => o.key === 'a')!.abc).toBe('A'); // 80% acumulado ≤ 80
        expect(out.find(o => o.key === 'b')!.abc).toBe('B'); // 100% ≤ 100
    });

    it('maneja lista vacía', () => {
        expect(classifyAbc([])).toEqual([]);
    });
});
