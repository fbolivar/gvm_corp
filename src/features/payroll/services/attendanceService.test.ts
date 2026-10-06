import { describe, test, expect, vi } from 'vitest';

// scheduleService toca la base; aquí solo se prueba la aritmética pura.
vi.mock('./scheduleService', () => ({ scheduleService: { getEmployeeSchedule: vi.fn() } }));

import { attendanceService } from './attendanceService';
import type { WorkSchedule } from '../types';

const schedule: WorkSchedule = {
    id: 's1',
    tenant_id: 't1',
    name: 'Oficina',
    start_time: '08:00',
    end_time: '17:00',
    break_minutes: 60,
    grace_minutes: 15,
    is_night_shift: false,
    is_default: true,
};

// Instantes en UTC: exactamente lo que recibe el servidor en Vercel.
const utc = (iso: string) => new Date(iso);

describe('retardo (calculateLateness)', () => {
    test('el caso real de Entrerríos: 09:48 Bogotá son 108 minutos tarde, no 409', () => {
        // 14:48 UTC = 09:48 Bogotá. Con el bug salía 409 (14:48 − 08:00).
        const r = attendanceService.calculateLateness(utc('2026-09-15T14:48:59Z'), schedule);
        expect(r.status).toBe('LATE');
        expect(r.lateMinutes).toBe(108);
    });

    test('dentro del periodo de gracia no es retardo', () => {
        // 08:10 Bogotá = 13:10 UTC
        const r = attendanceService.calculateLateness(utc('2026-09-15T13:10:00Z'), schedule);
        expect(r).toEqual({ lateMinutes: 0, status: 'PRESENT' });
    });

    test('un minuto después de la gracia ya cuenta desde la hora de entrada', () => {
        // 08:16 Bogotá = 13:16 UTC → 16 minutos tarde (se cuenta desde las 08:00)
        const r = attendanceService.calculateLateness(utc('2026-09-15T13:16:00Z'), schedule);
        expect(r).toEqual({ lateMinutes: 16, status: 'LATE' });
    });

    test('llegar antes de la hora nunca es retardo', () => {
        const r = attendanceService.calculateLateness(utc('2026-09-15T12:30:00Z'), schedule);
        expect(r.status).toBe('PRESENT');
    });
});

describe('horas trabajadas (calculateHours)', () => {
    test('jornada normal 8 am a 5 pm: 8 horas netas, sin extras ni nocturnas', () => {
        const r = attendanceService.calculateHours(
            utc('2026-09-15T13:00:00Z'), // 08:00 Bogotá
            utc('2026-09-15T22:00:00Z'), // 17:00 Bogotá
            schedule,
        );
        expect(r.totalWorked).toBe(8);
        expect(r.overtimeHours).toBe(0);
        expect(r.nightHours).toBe(0);
        expect(r.sundayHours).toBe(0);
    });

    test('salir a las 4 pm no genera horas nocturnas aunque en UTC sean las 21:00', () => {
        const r = attendanceService.calculateHours(
            utc('2026-09-14T13:00:00Z'), // 08:00
            utc('2026-09-14T21:00:00Z'), // 16:00
            schedule,
        );
        expect(r.nightHours).toBe(0);
    });

    test('las horas después de las 9 pm sí son nocturnas', () => {
        const r = attendanceService.calculateHours(
            utc('2026-09-15T18:00:00Z'), // 13:00 Bogotá
            utc('2026-09-16T04:00:00Z'), // 23:00 Bogotá (ya es día 16 en UTC)
            schedule,
        );
        expect(r.nightHours).toBe(2);
    });

    test('un sábado en la noche no cuenta como domingo', () => {
        // Sábado 19 de septiembre, 14:00 a 20:00 Bogotá (01:00 UTC del domingo 20)
        const r = attendanceService.calculateHours(
            utc('2026-09-19T19:00:00Z'),
            utc('2026-09-20T01:00:00Z'),
            schedule,
        );
        expect(r.sundayHours).toBe(0);
    });

    test('el domingo todas las horas son dominicales', () => {
        // Domingo 20 de septiembre, 08:00 a 12:00 Bogotá
        const r = attendanceService.calculateHours(
            utc('2026-09-20T13:00:00Z'),
            utc('2026-09-20T17:00:00Z'),
            schedule,
        );
        expect(r.sundayHours).toBe(3); // 4 h − 1 h de descanso
    });
});

describe('turno flexible (comerciales y socios)', () => {
    const flexible: WorkSchedule = { ...schedule, name: 'Comerciales', is_flexible: true };

    test('nunca marca retardo, a la hora que llegue', () => {
        // 11:30 Bogotá
        const r = attendanceService.calculateLateness(utc('2026-09-15T16:30:00Z'), flexible);
        expect(r).toEqual({ lateMinutes: 0, status: 'PRESENT' });
    });

    test('registra las horas trabajadas pero no genera horas extra', () => {
        // 06:00 a 20:00 Bogotá: 14 h − 1 h de descanso = 13 h trabajadas, 0 extra
        const r = attendanceService.calculateHours(
            utc('2026-09-15T11:00:00Z'),
            utc('2026-09-16T01:00:00Z'),
            flexible,
        );
        expect(r.totalWorked).toBe(13);
        expect(r.overtimeHours).toBe(0);
        expect(r.status).toBe('PRESENT');
    });
});

describe('salida anticipada (isEarlyLeave)', () => {
    test('salir a las 3 pm con turno hasta las 5 pm es anticipado por 120 minutos', () => {
        // 15:00 Bogotá = 20:00 UTC
        const r = attendanceService.isEarlyLeave(utc('2026-09-16T20:00:00Z'), schedule);
        expect(r).toEqual({ early: true, expectedEnd: '17:00', minutesEarly: 120 });
    });

    test('salir a la hora exacta o después no es anticipado', () => {
        expect(attendanceService.isEarlyLeave(utc('2026-09-16T22:00:00Z'), schedule).early).toBe(false);
        expect(attendanceService.isEarlyLeave(utc('2026-09-16T23:30:00Z'), schedule).early).toBe(false);
    });

    test('respeta la excepción del día: viernes termina a las 17:00 aunque el base sea 17:30', () => {
        const melisa: WorkSchedule = {
            ...schedule, start_time: '07:00', end_time: '17:30',
            days: [{ weekday: 5, start_time: '07:00', end_time: '17:00' }],
        };
        // Viernes 18-sep 17:10 Bogotá = 22:10 UTC → ya pasó la hora del viernes
        expect(attendanceService.isEarlyLeave(utc('2026-09-18T22:10:00Z'), melisa).early).toBe(false);
        // Jueves 17-sep 17:10 → el jueves termina 17:30: anticipado 20 min
        expect(attendanceService.isEarlyLeave(utc('2026-09-17T22:10:00Z'), melisa)).toMatchObject({ early: true, minutesEarly: 20 });
    });

    test('un turno flexible nunca tiene salida anticipada', () => {
        const flexible: WorkSchedule = { ...schedule, is_flexible: true };
        expect(attendanceService.isEarlyLeave(utc('2026-09-16T15:00:00Z'), flexible).early).toBe(false);
    });
});
