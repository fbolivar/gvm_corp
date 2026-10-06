import type { CrmVisit, VisitStatus, ManagementType, MeetingType } from '../types/visits';

/**
 * KPIs del tablero de visitas — réplica de la hoja TABLERO del Excel,
 * calculados en memoria a partir de la lista de visitas ya filtrada.
 * Lógica pura y testeada: aquí no hay Supabase.
 */

export interface SalespersonStats {
    salesperson_id: string;
    salesperson_name: string;
    planned: number;
    agendada: number;
    realizada: number;
    reprogramada: number;
    no_realizada: number;
    pendiente: number;
    /** % de visitas realizadas sobre el total planeado (0-100). */
    progress_pct: number;
    /** Visitas de prioridad 1 a clientes. */
    critical_accounts: number;
    /** Seguimientos cuya fecha ya pasó y la visita no está cerrada. */
    overdue_followups: number;
}

const CLOSED: VisitStatus[] = ['REALIZADA', 'NO_REALIZADA'];

/** Visita vencida: sigue abierta (pendiente/agendada/reprogramada) y su fecha planeada ya pasó. */
export function isOverdue(v: Pick<CrmVisit, 'status' | 'planned_date'>, today: string): boolean {
    return !CLOSED.includes(v.status) && v.planned_date < today;
}

/** Seguimiento pendiente: la visita se realizó y la fecha de próximo seguimiento ya pasó sin una visita posterior. */
export function isFollowupDue(v: Pick<CrmVisit, 'status' | 'next_followup_date'>, today: string): boolean {
    return v.status === 'REALIZADA' && !!v.next_followup_date && v.next_followup_date <= today;
}

export function statsBySalesperson(visits: CrmVisit[], today: string): SalespersonStats[] {
    const map = new Map<string, SalespersonStats>();
    for (const v of visits) {
        let s = map.get(v.salesperson_id);
        if (!s) {
            s = {
                salesperson_id: v.salesperson_id,
                salesperson_name: v.salesperson_name,
                planned: 0, agendada: 0, realizada: 0, reprogramada: 0, no_realizada: 0, pendiente: 0,
                progress_pct: 0, critical_accounts: 0, overdue_followups: 0,
            };
            map.set(v.salesperson_id, s);
        }
        s.planned += 1;
        if (v.status === 'AGENDADA') s.agendada += 1;
        else if (v.status === 'REALIZADA') s.realizada += 1;
        else if (v.status === 'REPROGRAMADA') s.reprogramada += 1;
        else if (v.status === 'NO_REALIZADA') s.no_realizada += 1;
        else s.pendiente += 1;
        if (!v.is_internal && v.priority === 1) s.critical_accounts += 1;
        if (isOverdue(v, today) || isFollowupDue(v, today)) s.overdue_followups += 1;
    }
    for (const s of map.values()) {
        s.progress_pct = s.planned === 0 ? 0 : Math.round((s.realizada / s.planned) * 100);
    }
    return [...map.values()].sort((a, b) => a.salesperson_name.localeCompare(b.salesperson_name));
}

export function countBy<K extends string>(visits: CrmVisit[], pick: (v: CrmVisit) => K): Record<K, number> {
    const out = {} as Record<K, number>;
    for (const v of visits) {
        const k = pick(v);
        out[k] = (out[k] ?? 0) + 1;
    }
    return out;
}

export const byMeetingType = (visits: CrmVisit[]) => countBy<MeetingType>(visits, v => v.meeting_type);
export const byManagementType = (visits: CrmVisit[]) => countBy<ManagementType>(visits, v => v.management_type);
export const byStatus = (visits: CrmVisit[]) => countBy<VisitStatus>(visits, v => v.status);

/** Lunes y domingo (YYYY-MM-DD) de la semana que contiene `date`. */
export function weekRange(date: string): { from: string; to: string } {
    const [y, m, d] = date.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const dow = (dt.getUTCDay() + 6) % 7; // lunes = 0
    const monday = new Date(dt.getTime() - dow * 86_400_000);
    const sunday = new Date(monday.getTime() + 6 * 86_400_000);
    const fmt = (x: Date) => x.toISOString().slice(0, 10);
    return { from: fmt(monday), to: fmt(sunday) };
}

/** Primer y último día (YYYY-MM-DD) del mes que contiene `date`. */
export function monthRange(date: string): { from: string; to: string } {
    const [y, m] = date.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate(); // día 0 del mes siguiente
    return { from: `${date.slice(0, 7)}-01`, to: `${date.slice(0, 7)}-${String(last).padStart(2, '0')}` };
}
