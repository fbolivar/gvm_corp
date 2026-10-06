/**
 * Hora de Bogotá para el control de asistencia.
 *
 * Por qué existe: el servidor de producción (Vercel) corre en UTC, cinco horas
 * adelante de Colombia. Todo cálculo que use `getHours()`, `getDay()` o
 * `toISOString().split('T')[0]` sobre `new Date()` sale desplazado:
 *   - una entrada a las 09:48 se comparaba como 14:48 → 409 minutos de retardo;
 *   - una salida a las 7:30 pm caía en la fecha del día SIGUIENTE, así que en vez
 *     de cerrar la jornada abría una entrada nueva para mañana;
 *   - las 4:00 pm contaban como franja nocturna (21:00 UTC);
 *   - un sábado después de las 7 pm contaba como domingo.
 * En la máquina de desarrollo (Windows en hora colombiana) todo se veía bien,
 * por eso el error solo apareció con la tablet real.
 *
 * Colombia no tiene horario de verano: el desfase es siempre −05:00, así que se
 * resuelve con aritmética fija y `getUTC*`, sin depender de la zona del proceso.
 */

/** Desfase de Bogotá respecto a UTC. Fijo: Colombia no cambia de hora. */
export const BOGOTA_OFFSET_MINUTES = -5 * 60;

/** Instante desplazado para que `getUTC*` devuelva los componentes de Bogotá. */
function shifted(d: Date): Date {
    return new Date(d.getTime() + BOGOTA_OFFSET_MINUTES * 60_000);
}

/** Fecha calendario en Bogotá, 'YYYY-MM-DD'. Es la `work_date` de la marcación. */
export function bogotaDateString(d: Date = new Date()): string {
    const s = shifted(d);
    const y = s.getUTCFullYear();
    const m = String(s.getUTCMonth() + 1).padStart(2, '0');
    const day = String(s.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Hora del día en Bogotá (0–23). */
export function bogotaHour(d: Date): number {
    return shifted(d).getUTCHours();
}

/** Minutos transcurridos desde la medianoche de Bogotá (0–1439). */
export function bogotaMinutesOfDay(d: Date): number {
    const s = shifted(d);
    return s.getUTCHours() * 60 + s.getUTCMinutes();
}

/** Día de la semana en Bogotá: 0 = domingo … 6 = sábado. */
export function bogotaWeekday(d: Date): number {
    return shifted(d).getUTCDay();
}

/** Hora 'HH:MM' de un horario ('08:00') a minutos desde medianoche. */
export function scheduleTimeToMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
}

/** Hora legible para mostrar en la tablet, siempre en hora colombiana. */
export function bogotaTimeLabel(d: Date = new Date()): string {
    return d.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Bogota',
    });
}
