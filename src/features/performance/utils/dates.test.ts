import { describe, it, expect } from 'vitest';
import { addDaysISO, diffDays } from './dates';

describe('addDaysISO', () => {
    it('suma 60 días de período de prueba cruzando de mes', () => {
        expect(addDaysISO('2026-08-01', 60)).toBe('2026-09-30');
    });

    it('cruza fin de año', () => {
        expect(addDaysISO('2026-12-15', 60)).toBe('2027-02-13');
    });

    it('resta días sin depender de la zona horaria', () => {
        expect(addDaysISO('2026-10-06', -45)).toBe('2026-08-22');
    });
});

describe('diffDays', () => {
    it('devuelve días completos entre fechas date-only', () => {
        expect(diffDays('2026-10-06', '2026-10-13')).toBe(7);
    });

    it('es negativo si la segunda fecha es anterior', () => {
        expect(diffDays('2026-10-06', '2026-10-01')).toBe(-5);
    });
});
