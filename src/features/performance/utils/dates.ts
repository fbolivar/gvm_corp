const DAY_MS = 86_400_000;

/** Suma días a una fecha date-only 'YYYY-MM-DD' sin depender de la zona horaria del proceso. */
export function addDaysISO(date: string, days: number): string {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Días completos entre dos fechas date-only (b − a). */
export function diffDays(a: string, b: string): number {
    const [ay, am, ad] = a.split('-').map(Number);
    const [by, bm, bd] = b.split('-').map(Number);
    return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / DAY_MS);
}
