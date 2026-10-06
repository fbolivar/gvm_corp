import type { WorkSchedule, WorkScheduleDay } from '../types';

/**
 * Horario efectivo de un turno para un día concreto.
 *
 * Un turno tiene una hora base de entrada y salida, y opcionalmente
 * excepciones por día de la semana (`days`). Aquí se resuelve cuál aplica, para
 * que el retardo y las horas extra se calculen contra el horario real de ESE
 * día y no contra el base: quien entra a las 8:00 un lunes cuyo horario dice
 * 8:00 no está tarde aunque de martes a jueves entre a las 7:30.
 */

export interface EffectiveTimes {
    start_time: string;
    end_time: string;
    /** true cuando se aplicó una excepción del día en vez del horario base. */
    overridden: boolean;
}

/** Nombres de los días en el orden de JavaScript: 0 = domingo. */
export const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;

export function effectiveTimes(
    schedule: Pick<WorkSchedule, 'start_time' | 'end_time'> & { days?: WorkScheduleDay[] | null },
    weekday: number,
): EffectiveTimes {
    const day = (schedule.days ?? []).find(d => Number(d.weekday) === weekday);
    if (day && day.start_time && day.end_time) {
        return { start_time: normalize(day.start_time), end_time: normalize(day.end_time), overridden: true };
    }
    return { start_time: normalize(schedule.start_time), end_time: normalize(schedule.end_time), overridden: false };
}

/** Postgres devuelve `time` como 'HH:MM:SS'; el formulario maneja 'HH:MM'. */
export function normalize(hhmm: string): string {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm ?? ''));
    if (!m) return '00:00';
    return `${m[1].padStart(2, '0')}:${m[2]}`;
}

/**
 * Resume las excepciones para mostrarlas ("Vie 07:00–17:00"). Vacío si el turno
 * es igual todos los días.
 */
export function describeDayOverrides(days: WorkScheduleDay[] | null | undefined): string[] {
    return [...(days ?? [])]
        .sort((a, b) => Number(a.weekday) - Number(b.weekday))
        .map(d => `${WEEKDAY_LABELS[Number(d.weekday)]?.slice(0, 3) ?? '?'} ${normalize(d.start_time)}–${normalize(d.end_time)}`);
}
