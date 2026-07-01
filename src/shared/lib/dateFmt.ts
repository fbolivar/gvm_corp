/**
 * Formatea una fecha 'YYYY-MM-DD' (o ISO) en hora local sin correrla un día.
 *
 * Bug que evita: `new Date('2026-07-01')` se interpreta como medianoche UTC,
 * y al mostrarla en Colombia (UTC-5) retrocede a "30 de junio". Aquí las
 * fechas de solo día se construyen con componentes locales para que no se muevan.
 */
/** Parsea 'YYYY-MM-DD' (o ISO) como fecha LOCAL (evita el corrimiento UTC de un día). */
export function parseLocalDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    const d = m
        ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
        : new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

export function formatLocalDate(
    value: string | null | undefined,
    opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' },
    locale = 'es-CO',
): string {
    if (!value) return '—';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    const d = m
        ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
        : new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(locale, opts);
}
