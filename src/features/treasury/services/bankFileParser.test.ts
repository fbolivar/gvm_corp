import { describe, it, expect } from 'vitest';
import {
    parseBankDate, parseBankAmount, parseBankRows, guessMapping,
    type ColumnMapping,
} from './bankFileParser';

describe('parseBankDate', () => {
    it('lee el formato colombiano dd/mm/aaaa', () => {
        expect(parseBankDate('05/08/2026')).toBe('2026-08-05');
        expect(parseBankDate('5-8-2026')).toBe('2026-08-05');
    });

    it('lee el formato ISO', () => {
        expect(parseBankDate('2026-08-05')).toBe('2026-08-05');
    });

    it('lee dd-MMM-aaaa en español', () => {
        expect(parseBankDate('05-AGO-2026')).toBe('2026-08-05');
        expect(parseBankDate('05-DIC-26')).toBe('2026-12-05');
    });

    it('lee el número de serie de Excel', () => {
        // 46239 = 05/08/2026 en la numeración de Excel
        expect(parseBankDate(46239)).toBe('2026-08-05');
    });

    it('devuelve vacío si no reconoce la fecha', () => {
        expect(parseBankDate('FECHA')).toBe('');
        expect(parseBankDate('')).toBe('');
        expect(parseBankDate(null)).toBe('');
    });
});

describe('parseBankAmount', () => {
    it('lee el formato colombiano con punto de miles', () => {
        expect(parseBankAmount('1.234.567')).toBe(1234567);
        expect(parseBankAmount('1.234.567,89')).toBe(1234567.89);
    });

    it('lee el formato anglosajón', () => {
        expect(parseBankAmount('1,234,567.89')).toBe(1234567.89);
    });

    it('reconoce negativos con signo, guion final y paréntesis', () => {
        expect(parseBankAmount('-1.234.567')).toBe(-1234567);
        expect(parseBankAmount('1.234.567-')).toBe(-1234567);
        expect(parseBankAmount('(1.234.567)')).toBe(-1234567);
    });

    it('ignora símbolos de moneda y espacios', () => {
        expect(parseBankAmount(' $ 1.234.567 COP ')).toBe(1234567);
    });

    it('trata 1.234 como mil doscientos treinta y cuatro (no como decimal)', () => {
        expect(parseBankAmount('1.234')).toBe(1234);
    });

    it('respeta los decimales de dos dígitos con coma', () => {
        expect(parseBankAmount('1234,50')).toBe(1234.5);
    });

    it('devuelve 0 para vacíos', () => {
        expect(parseBankAmount('')).toBe(0);
        expect(parseBankAmount(null)).toBe(0);
    });
});

describe('parseBankRows', () => {
    const mapping: ColumnMapping = { date: 0, description: 1, amount: 2 };

    it('convierte las filas válidas y descarta encabezados y saldos', () => {
        const rows: unknown[][] = [
            ['FECHA', 'DESCRIPCION', 'VALOR'],
            ['01/08/2026', 'CONSIGNACION CLIENTE', '1.500.000'],
            ['02/08/2026', 'PAGO PROVEEDOR', '-750.000'],
            ['03/08/2026', 'SALDO ANTERIOR', '0'],
            [],
        ];
        const { lines, descartadas } = parseBankRows(rows, mapping);
        expect(lines).toHaveLength(2);
        expect(descartadas).toBe(3);
        expect(lines[0]).toEqual({ date: '2026-08-01', description: 'CONSIGNACION CLIENTE', amount: 1500000, reference: undefined });
        expect(lines[1].amount).toBe(-750000);
    });

    it('combina columnas separadas de débito y crédito', () => {
        const rows: unknown[][] = [
            ['01/08/2026', 'CONSIGNACION', '', '2.000.000'],
            ['02/08/2026', 'RETIRO', '500.000', ''],
        ];
        const { lines } = parseBankRows(rows, { date: 0, description: 1, debit: 2, credit: 3 });
        expect(lines[0].amount).toBe(2000000);   // entra
        expect(lines[1].amount).toBe(-500000);   // sale
    });

    it('pone una descripción por defecto si el banco no la trae', () => {
        const { lines } = parseBankRows([['01/08/2026', '', '100']], mapping);
        expect(lines[0].description).toBe('MOVIMIENTO BANCARIO');
    });
});

describe('guessMapping', () => {
    it('reconoce encabezados con una sola columna de valor', () => {
        const m = guessMapping(['Fecha', 'Descripción', 'Valor', 'Referencia']);
        expect(m.date).toBe(0);
        expect(m.description).toBe(1);
        expect(m.amount).toBe(2);
        expect(m.reference).toBe(3);
    });

    it('reconoce encabezados con débito y crédito separados', () => {
        const m = guessMapping(['FECHA', 'CONCEPTO', 'DEBITO', 'CREDITO']);
        expect(m.debit).toBe(2);
        expect(m.credit).toBe(3);
        expect(m.amount).toBeUndefined();
    });

    it('funciona sin tildes ni mayúsculas', () => {
        const m = guessMapping(['fecha', 'detalle', 'importe']);
        expect(m.date).toBe(0);
        expect(m.description).toBe(1);
        expect(m.amount).toBe(2);
    });
});
