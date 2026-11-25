import { statsBySalesperson } from './visitStats';
import type { CrmVisit } from '../types/visits';
import type { KpiSettings, ClientCategory, Semaphore, SalespersonKpi } from '../types/kpi';

/**
 * KPIs de seguimiento del planeador de visitas. Lógica pura y testeable:
 * cumplimiento por comercial (con semáforo configurable) y clasificación de
 * clientes derivada de los pedidos reales (con umbrales configurables).
 */

/** Semáforo de cumplimiento según los umbrales del tenant. */
export function semaphoreFor(pct: number, s: KpiSettings): Semaphore {
    if (pct >= s.visit_green_pct) return 'green';
    if (pct >= s.visit_amber_pct) return 'amber';
    return 'red';
}

interface SalespersonLite { id: string; name: string }

/**
 * KPI por comercial. Incluye a TODO el equipo (aunque tenga 0 visitas, para que
 * se vea quién no está visitando) y los que tengan visitas aunque no estén en la
 * lista. `targets` = meta de visitas del período por comercial.
 */
export function salespersonKpis(
    visits: CrmVisit[],
    salespeople: SalespersonLite[],
    targets: Map<string, number>,
    settings: KpiSettings,
    today: string,
): SalespersonKpi[] {
    const stats = new Map(statsBySalesperson(visits, today).map(s => [s.salesperson_id, s]));
    const nameOf = new Map(salespeople.map(s => [s.id, s.name]));
    const ids = new Set<string>([...salespeople.map(s => s.id), ...stats.keys()]);

    const rows: SalespersonKpi[] = [];
    for (const id of ids) {
        const st = stats.get(id);
        const planned = st?.planned ?? 0;
        const realizada = st?.realizada ?? 0;
        const compliance_pct = planned === 0 ? 0 : Math.round((realizada / planned) * 100);
        const target_visits = targets.get(id) ?? null;
        const target_pct = target_visits && target_visits > 0 ? Math.round((realizada / target_visits) * 100) : null;
        rows.push({
            salesperson_id: id,
            salesperson_name: st?.salesperson_name || nameOf.get(id) || 'Comercial',
            planned,
            realizada,
            no_realizada: st?.no_realizada ?? 0,
            reprogramada: st?.reprogramada ?? 0,
            pendiente: st?.pendiente ?? 0,
            overdue: st?.overdue_followups ?? 0,
            critical: st?.critical_accounts ?? 0,
            compliance_pct,
            semaphore: semaphoreFor(compliance_pct, settings),
            target_visits,
            target_pct,
        });
    }
    return rows.sort((a, b) => b.compliance_pct - a.compliance_pct || a.salesperson_name.localeCompare(b.salesperson_name));
}

interface AccountLite {
    orders_count: number;
    days_since_purchase: number | null;
    var_30d_pct: number | null;
}

/**
 * Clasifica un cliente a partir de sus pedidos reales, con los umbrales del tenant:
 *  - Potencial: nunca compró.
 *  - Inactivo: días sin compra > client_inactive_days.
 *  - Pasivo: días sin compra > client_passive_days.
 *  - En caída: compra reciente pero cayó ≥ drop_pct (30d vs 30d).
 *  - En crecimiento: compra reciente y creció ≥ growth_pct.
 *  - Activo: compra reciente, estable.
 */
export function classifyClient(a: AccountLite, s: KpiSettings): ClientCategory {
    if (a.orders_count === 0 || a.days_since_purchase === null) return 'POTENCIAL';
    if (a.days_since_purchase > s.client_inactive_days) return 'INACTIVO';
    if (a.days_since_purchase > s.client_passive_days) return 'PASIVO';
    if (a.var_30d_pct !== null && a.var_30d_pct <= -s.drop_pct) return 'EN_CAIDA';
    if (a.var_30d_pct !== null && a.var_30d_pct >= s.growth_pct) return 'EN_CRECIMIENTO';
    return 'ACTIVO';
}

export function classificationCounts(accounts: AccountLite[], s: KpiSettings): Record<ClientCategory, number> {
    const out: Record<ClientCategory, number> = {
        EN_CRECIMIENTO: 0, ACTIVO: 0, EN_CAIDA: 0, PASIVO: 0, INACTIVO: 0, POTENCIAL: 0,
    };
    for (const a of accounts) out[classifyClient(a, s)] += 1;
    return out;
}
