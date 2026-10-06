import { classifyAccount } from './accountHealth';
import type { AccountStatus } from '../types/visits';

/**
 * Cartera de clientes: resumen por cuenta, alertas accionables y cumplimiento
 * de metas. Lógica pura sobre pedidos facturados ya leídos (sin Supabase).
 *
 * Nota de datos: la app solo tiene pedidos desde julio 2026; las comparaciones
 * "vs. año anterior" salen nulas hasta que se cargue la historia de WorldOffice.
 * Por eso la caída se mide en ventanas móviles: últimos 30 días vs. los 30
 * anteriores (comparar "agosto completo" contra "medio septiembre" marcaba en
 * caída a media cartera).
 */

export interface OrderRow {
    party_id: string;
    /** 'YYYY-MM-DD' */
    issue_date: string;
    total: number;
}

export interface AccountParty {
    id: string;
    legal_name: string;
    city: string | null;
    salesperson_id: string | null;
    phone?: string | null;
    email?: string | null;
    contact_name?: string | null;
}

export interface AccountSummary extends AccountParty {
    sales_month: number;
    sales_prev_month: number;
    sales_ytd: number;
    orders_count: number;
    last_purchase_date: string | null;
    /** Días desde la última compra; null si nunca compró. */
    days_since_purchase: number | null;
    /** Últimos 30 días y los 30 anteriores. */
    sales_30d: number;
    sales_prev_30d: number;
    /** Variación últimos 30 días vs. 30 anteriores en %; null sin base. */
    var_30d_pct: number | null;
    account_status: AccountStatus;
}

function addDays(date: string, days: number): string {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
    const [y1, m1, d1] = a.split('-').map(Number);
    const [y2, m2, d2] = b.split('-').map(Number);
    return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export function prevMonthKey(today: string): string {
    const y = Number(today.slice(0, 4));
    const m = Number(today.slice(5, 7));
    return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

export function summarizeAccounts(parties: AccountParty[], orders: OrderRow[], today: string): AccountSummary[] {
    const year = today.slice(0, 4);
    const month = today.slice(0, 7);
    const prevMonth = prevMonthKey(today);
    const from30 = addDays(today, -29);   // ventana actual: 30 días incluyendo hoy
    const from60 = addDays(today, -59);   // ventana anterior

    const acc = new Map<string, { m: number; pm: number; d30: number; d60: number; ytd: number; n: number; last: string | null }>();
    for (const o of orders) {
        let a = acc.get(o.party_id);
        if (!a) { a = { m: 0, pm: 0, d30: 0, d60: 0, ytd: 0, n: 0, last: null }; acc.set(o.party_id, a); }
        const d = o.issue_date.slice(0, 10);
        a.n += 1;
        if (!a.last || d > a.last) a.last = d;
        if (d.startsWith(year) && d <= today) a.ytd += o.total;
        if (d.startsWith(month)) a.m += o.total;
        if (d.startsWith(prevMonth)) a.pm += o.total;
        if (d >= from30 && d <= today) a.d30 += o.total;
        else if (d >= from60 && d < from30) a.d60 += o.total;
    }

    return parties.map(p => {
        const a = acc.get(p.id);
        const last = a?.last ?? null;
        const var_30d_pct = a && a.d60 > 0 ? Math.round(((a.d30 - a.d60) / a.d60) * 1000) / 10 : null;
        return {
            ...p,
            sales_month: a?.m ?? 0,
            sales_prev_month: a?.pm ?? 0,
            sales_ytd: a?.ytd ?? 0,
            sales_30d: a?.d30 ?? 0,
            sales_prev_30d: a?.d60 ?? 0,
            orders_count: a?.n ?? 0,
            last_purchase_date: last,
            days_since_purchase: last ? daysBetween(last, today) : null,
            var_30d_pct,
            // Sin historia del año anterior, "en caída" se decide por las ventanas de 30 días.
            account_status: refineStatus(
                classifyAccount({ today, last_purchase_date: last, sales_ytd: a?.ytd ?? 0, sales_prev_ytd: 0 }),
                var_30d_pct,
            ),
        };
    });
}

function refineStatus(base: AccountStatus, var30: number | null): AccountStatus {
    if (base === 'ACTIVO_CRECIMIENTO' && var30 !== null && var30 <= -30) return 'ACTIVO_CAIDA';
    return base;
}

/* ─── Alertas ─────────────────────────────────────────────────────────────── */

export type AlertKind = 'SIN_COMPRA' | 'EN_CAIDA' | 'INACTIVO';

export interface AccountAlert {
    kind: AlertKind;
    account: AccountSummary;
    /** Texto corto para la tarjeta. */
    reason: string;
    /** Tipo de gestión sugerido para planear la visita. */
    suggested_management: 'REACTIVACION' | 'RECUPERACION' | 'FIDELIZACION';
}

export const ALERT_LABELS: Record<AlertKind, string> = {
    SIN_COMPRA: 'Sin compra reciente',
    EN_CAIDA: 'Venta en caída',
    INACTIVO: 'Inactivos con historial',
};

/** Días sin comprar a partir de los cuales un cliente activo se vuelve alerta. */
export const NO_PURCHASE_DAYS = 45;
/** Caída últimos 30 días vs. 30 anteriores (%) que dispara alerta. */
export const DROP_PCT = -30;
/** Base mínima de la ventana anterior para hablar de caída (evita ruido de compras pequeñas). */
export const DROP_MIN_BASE = 500_000;

export function deriveAlerts(accounts: AccountSummary[]): AccountAlert[] {
    const out: AccountAlert[] = [];
    for (const a of accounts) {
        if (a.orders_count === 0) continue; // nunca compró: no es una cuenta a recuperar, es prospección
        if (a.var_30d_pct !== null && a.var_30d_pct <= DROP_PCT && a.sales_prev_30d >= DROP_MIN_BASE) {
            out.push({ kind: 'EN_CAIDA', account: a, suggested_management: 'RECUPERACION',
                reason: `Últimos 30 días ${a.var_30d_pct.toLocaleString('es-CO')} % frente a los 30 anteriores` });
        } else if (a.days_since_purchase !== null && a.days_since_purchase >= NO_PURCHASE_DAYS) {
            const inactive = a.account_status === 'INACTIVO_ANIO' || a.account_status === 'INACTIVO_LARGO';
            out.push({ kind: inactive ? 'INACTIVO' : 'SIN_COMPRA', account: a,
                suggested_management: inactive ? 'REACTIVACION' : 'FIDELIZACION',
                reason: `${a.days_since_purchase} días sin comprar` });
        }
    }
    // Primero las cuentas que más pesan.
    return out.sort((x, y) => y.account.sales_ytd - x.account.sales_ytd);
}

/* ─── Metas ───────────────────────────────────────────────────────────────── */

export interface TargetAttainment {
    target: number;
    achieved: number;
    /** % logrado sobre la meta (0-…); null si no hay meta. */
    attainment_pct: number | null;
    /** % del mes transcurrido (ritmo esperado a hoy). */
    expected_pct: number;
    /** Proyección a fin de mes manteniendo el ritmo actual. */
    projected: number;
    status: 'SIN_META' | 'ADELANTE' | 'AL_DIA' | 'ATRASADO';
}

export function daysInMonth(period: string): number {
    const [y, m] = period.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Cumplimiento con "ritmo": a mitad de mes se espera la mitad de la meta.
 * ADELANTE ≥ ritmo + 5 pts · AL_DIA dentro de ±5 · ATRASADO por debajo.
 */
export function attainment(target: number, achieved: number, period: string, today: string): TargetAttainment {
    const dim = daysInMonth(period);
    const elapsed = today.slice(0, 7) === period ? Math.min(Number(today.slice(8, 10)), dim)
        : today.slice(0, 7) > period ? dim : 0;
    const expected_pct = Math.round((elapsed / dim) * 100);
    const projected = elapsed > 0 ? Math.round((achieved / elapsed) * dim) : 0;
    if (target <= 0) return { target, achieved, attainment_pct: null, expected_pct, projected, status: 'SIN_META' };
    const attainment_pct = Math.round((achieved / target) * 1000) / 10;
    const diff = attainment_pct - expected_pct;
    return {
        target, achieved, attainment_pct, expected_pct, projected,
        status: diff >= 5 ? 'ADELANTE' : diff >= -5 ? 'AL_DIA' : 'ATRASADO',
    };
}
