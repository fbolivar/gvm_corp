import { describe, it, expect } from 'vitest';
import { extractSku, parseMonth, aggregateSalesRows, distinctSalespeople, type RawSalesRow } from './salesReportImport';

describe('extractSku', () => {
    it('toma el primer token como SKU', () => {
        expect(extractSku('MUCOL-028 MUCOLIPTOL GARRAFA * 20 L')).toBe('MUCOL-028');
        expect(extractSku('FLORA-946 FLORAVET 50P *1 KG')).toBe('FLORA-946');
    });
    it('devuelve el texto completo si no hay espacio', () => {
        expect(extractSku('SOLOCODIGO')).toBe('SOLOCODIGO');
    });
});

describe('parseMonth', () => {
    it('acepta número directo', () => expect(parseMonth(9)).toBe(9));
    it('extrae el número de "9. SEPTIEMBRE 2026"', () => expect(parseMonth('9. SEPTIEMBRE 2026')).toBe(9));
    it('extrae "12. DICIEMBRE 2026"', () => expect(parseMonth('12. DICIEMBRE 2026')).toBe(12));
    it('devuelve 0 si no reconoce', () => expect(parseMonth('SEPTIEMBRE')).toBe(0));
});

describe('aggregateSalesRows', () => {
    const base: RawSalesRow = { vendedor: 'CARLOS ALBERTO', descripcion: 'HAWKP-166 HAWKER', anio: 2026, mes: '9. SEPTIEMBRE 2026', cantidad: 4, neto: 955556 };

    it('suma cantidad y neto del mismo comercial/producto/mes', () => {
        const out = aggregateSalesRows([base, { ...base, cantidad: 2, neto: 495000 }]);
        expect(out).toHaveLength(1);
        expect(out[0].qty).toBe(6);
        expect(out[0].valueCop).toBe(1450556);
        expect(out[0].sku).toBe('HAWKP-166');
    });

    it('separa por mes distinto', () => {
        const out = aggregateSalesRows([base, { ...base, mes: '8. AGOSTO 2026' }]);
        expect(out).toHaveLength(2);
    });

    it('separa por comercial distinto', () => {
        const out = aggregateSalesRows([base, { ...base, vendedor: 'ANA MARIA' }]);
        expect(out).toHaveLength(2);
    });

    it('descarta filas sin vendedor, sin descripción o con mes inválido', () => {
        const out = aggregateSalesRows([
            base,
            { ...base, vendedor: '' },
            { ...base, descripcion: '' },
            { ...base, mes: 'SEPTIEMBRE' },
        ]);
        expect(out).toHaveLength(1);
    });

    it('acepta cantidad/neto como string numérico (sin símbolos)', () => {
        const out = aggregateSalesRows([{ ...base, cantidad: '4', neto: '$ 955556' }]);
        expect(out[0].qty).toBe(4);
        expect(out[0].valueCop).toBe(955556);
    });
});

describe('distinctSalespeople', () => {
    it('devuelve comerciales únicos ordenados', () => {
        const rows = aggregateSalesRows([
            { vendedor: 'B PERSONA', descripcion: 'X-1 P', anio: 2026, mes: 9, cantidad: 1, neto: 1 },
            { vendedor: 'A PERSONA', descripcion: 'X-1 P', anio: 2026, mes: 9, cantidad: 1, neto: 1 },
        ]);
        expect(distinctSalespeople(rows)).toEqual(['A PERSONA', 'B PERSONA']);
    });
});
