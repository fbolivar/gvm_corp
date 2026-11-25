import 'server-only'
import crypto from 'crypto'

/**
 * Autorización de los crons de Vercel.
 *
 * SEGURIDAD (auditoría 2026-11-24): la comparación es de tiempo constante y EXIGE
 * que `CRON_SECRET` exista. Antes se comparaba contra `Bearer ${process.env.CRON_SECRET}`:
 * si la variable faltaba en algún entorno, la cadena esperada era el literal
 * "Bearer undefined" y cualquiera que lo enviara disparaba backups/depreciación.
 */
export function isCronAuthorized(authHeader: string | null): boolean {
    const secret = process.env.CRON_SECRET
    if (!secret) return false
    const a = Buffer.from(authHeader ?? '')
    const b = Buffer.from(`Bearer ${secret}`)
    return a.length === b.length && crypto.timingSafeEqual(a, b)
}
