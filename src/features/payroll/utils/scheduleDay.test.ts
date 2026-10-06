import { describe, test, expect } from 'vitest';
import { effectiveTimes, normalize, describeDayOverrides } from './scheduleDay';

// El turno de Lina en Entrerríos: base 07:30–18:00, lunes y viernes entra a las 8:00.
const lina = {
    start_time: '07:30',
    end_time: '18:00',
    days: [
        { weekday: 1, start_time: '08:00', end_time: '18:00' },
        { weekday: 5, start_time: '08:00', end_time: '18:00' },
    ],
};

describe('horario efectivo por día', () => {
    test('un día sin excepción usa el horario base', () => {
        expect(effectiveTimes(lina, 2)).toEqual({ start_time: '07:30', end_time: '18:00', overridden: false });
    });

    test('un día con excepción usa la excepción', () => {
        expect(effectiveTimes(lina, 1)).toEqual({ start_time: '08:00', end_time: '18:00', overridden: true });
        expect(effectiveTimes(lina, 5).start_time).toBe('08:00');
    });

    test('sin lista de días siempre aplica el base', () => {
        expect(effectiveTimes({ start_time: '07:00', end_time: '17:30' }, 5).start_time).toBe('07:00');
        expect(effectiveTimes({ start_time: '07:00', end_time: '17:30', days: null }, 5).overridden).toBe(false);
    });

    test('el weekday puede venir como texto desde la base', () => {
        const s = { start_time: '07:00', end_time: '17:30', days: [{ weekday: '5' as unknown as number, start_time: '07:00', end_time: '17:00' }] };
        expect(effectiveTimes(s, 5).end_time).toBe('17:00');
    });
});

describe('normalización de horas', () => {
    test('acepta HH:MM:SS de Postgres y devuelve HH:MM', () => {
        expect(normalize('07:30:00')).toBe('07:30');
        expect(normalize('7:05')).toBe('07:05');
    });

    test('un valor roto no revienta el cálculo', () => {
        expect(normalize('')).toBe('00:00');
        expect(normalize(undefined as unknown as string)).toBe('00:00');
    });
});

describe('descripción de excepciones', () => {
    test('lista los días distintos en orden y en formato corto', () => {
        expect(describeDayOverrides(lina.days)).toEqual(['Lun 08:00–18:00', 'Vie 08:00–18:00']);
    });

    test('vacío cuando el turno es igual todos los días', () => {
        expect(describeDayOverrides([])).toEqual([]);
        expect(describeDayOverrides(undefined)).toEqual([]);
    });
});
