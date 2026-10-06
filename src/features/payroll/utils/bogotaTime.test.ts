import { describe, test, expect } from 'vitest';
import {
    bogotaDateString,
    bogotaHour,
    bogotaMinutesOfDay,
    bogotaWeekday,
    scheduleTimeToMinutes,
    bogotaTimeLabel,
} from './bogotaTime';

// Los instantes se construyen en UTC a propósito: es lo que ve Vercel.
const utc = (iso: string) => new Date(iso);

describe('fecha de la marcación en Bogotá', () => {
    test('a media mañana coincide con la fecha UTC', () => {
        expect(bogotaDateString(utc('2026-09-15T14:48:59Z'))).toBe('2026-09-15');
    });

    test('después de las 7 pm en Bogotá la fecha UTC ya es mañana, pero la marcación es de hoy', () => {
        // 19:30 Bogotá del 14 = 00:30 UTC del 15. Antes se guardaba como día 15.
        expect(bogotaDateString(utc('2026-09-15T00:30:00Z'))).toBe('2026-09-14');
    });

    test('a las 11:59 pm de Bogotá sigue siendo hoy', () => {
        expect(bogotaDateString(utc('2026-09-15T04:59:59Z'))).toBe('2026-09-14');
    });

    test('a la medianoche de Bogotá cambia el día', () => {
        expect(bogotaDateString(utc('2026-09-15T05:00:00Z'))).toBe('2026-09-15');
    });

    test('el cambio de mes y de año se resuelve en hora Bogotá', () => {
        expect(bogotaDateString(utc('2027-01-01T02:00:00Z'))).toBe('2026-12-31');
    });
});

describe('hora y minutos del día', () => {
    test('el caso real de la tablet: 14:48 UTC son las 09:48 en Entrerríos', () => {
        const d = utc('2026-09-15T14:48:59Z');
        expect(bogotaHour(d)).toBe(9);
        expect(bogotaMinutesOfDay(d)).toBe(9 * 60 + 48);
    });

    test('las 4:00 pm no son franja nocturna aunque en UTC sean las 21:00', () => {
        expect(bogotaHour(utc('2026-09-14T21:00:00Z'))).toBe(16);
    });

    test('cruza la medianoche UTC sin romper la hora', () => {
        expect(bogotaHour(utc('2026-09-15T02:15:00Z'))).toBe(21);
        expect(bogotaMinutesOfDay(utc('2026-09-15T02:15:00Z'))).toBe(21 * 60 + 15);
    });
});

describe('día de la semana', () => {
    test('un sábado a las 8 pm en Bogotá sigue siendo sábado, no domingo', () => {
        // 2026-09-19 es sábado. 20:00 Bogotá = 01:00 UTC del domingo 20.
        expect(bogotaWeekday(utc('2026-09-20T01:00:00Z'))).toBe(6);
    });

    test('el domingo se detecta en hora Bogotá', () => {
        // Domingo 20 a las 10 am Bogotá = 15:00 UTC.
        expect(bogotaWeekday(utc('2026-09-20T15:00:00Z'))).toBe(0);
    });
});

describe('horario', () => {
    test('convierte HH:MM a minutos', () => {
        expect(scheduleTimeToMinutes('08:00')).toBe(480);
        expect(scheduleTimeToMinutes('17:30')).toBe(1050);
    });

    test('tolera una cadena rota sin explotar', () => {
        expect(scheduleTimeToMinutes('')).toBe(0);
    });
});

describe('hora para la tablet', () => {
    test('muestra la hora colombiana aunque el servidor esté en UTC', () => {
        const label = bogotaTimeLabel(utc('2026-09-15T14:48:59Z'));
        expect(label).toMatch(/09:48/);
    });
});
