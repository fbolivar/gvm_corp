import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAllRows } from '@/shared/lib/fetchAllRows';
import { summarizeAccounts, deriveAlerts, attainment, type AccountParty, type AccountSummary, type OrderRow, type TargetAttainment } from '../utils/accountSummary';
import { monthRange } from '../utils/visitStats';
import { visitService, type Salesperson } from './visitService';

/**
 * Cartera de clientes y metas por comercial.
 *
 * La venta se lee SIEMPRE de los pedidos facturados (SALES_ORDER ACCEPTED) y
 * se atribuye al comercial por la cartera (parties.salesperson_id): el mismo
 * dato que usan Ventas y el planeador de visitas.
 */

export interface SalesTarget {
    id: string;
    salesperson_id: string;
    period: string;
    target_amount: number;
    target_visits: number;
}

export interface TeamMemberPerformance extends Salesperson {
    accounts: number;
    active_accounts: number;
    alerts: number;
    visits_done: number;
    visits_planned: number;
    sales: TargetAttainment;
    target_visits: number;
}

async function loadOrders(client: SupabaseClient, sinceYear: string): Promise<OrderRow[]> {
    const rows = await fetchAllRows<{ party_id: string; issue_date: string; total: number | null }>(
        ({ from, to }) => client
            .from('documents')
            .select('party_id, issue_date, total')
            .eq('doc_type', 'SALES_ORDER')
            .eq('status', 'ACCEPTED')
            .gte('issue_date', `${sinceYear}-01-01`)
            .not('party_id', 'is', null)
            .order('id')
            .range(from, to),
        { label: 'crm.accounts.orders' },
    );
    return rows.map(r => ({ party_id: r.party_id, issue_date: String(r.issue_date).slice(0, 10), total: Number(r.total ?? 0) }));
}

async function loadCustomers(client: SupabaseClient, salespersonId?: string): Promise<AccountParty[]> {
    return fetchAllRows<AccountParty>(
        ({ from, to }) => {
            let q = client.from('parties').select('id, legal_name, city, salesperson_id, phone, email, contact_name').eq('is_customer', true);
            if (salespersonId) q = q.eq('salesperson_id', salespersonId);
            return q.order('legal_name').order('id').range(from, to);
        },
        { label: 'crm.accounts.parties' },
    );
}

export const accountService = {
    /** Cartera con métricas. Sin salespersonId trae todos los clientes (vista gerente). */
    async listAccounts(client: SupabaseClient, today: string, salespersonId?: string): Promise<AccountSummary[]> {
        const prevYear = String(Number(today.slice(0, 4)) - 1);
        const [parties, orders] = await Promise.all([loadCustomers(client, salespersonId), loadOrders(client, prevYear)]);
        return summarizeAccounts(parties, orders, today)
            .sort((a, b) => (b.sales_ytd - a.sales_ytd) || a.legal_name.localeCompare(b.legal_name));
    },

    async assignAccounts(client: SupabaseClient, partyIds: string[], salespersonId: string | null): Promise<number> {
        const { data, error } = await client
            .from('parties')
            .update({ salesperson_id: salespersonId })
            .in('id', partyIds)
            .eq('is_customer', true)
            .select('id');
        if (error) throw new Error(error.message);
        return data?.length ?? 0;
    },

    async getTargets(client: SupabaseClient, period: string): Promise<SalesTarget[]> {
        const { data, error } = await client
            .from('crm_sales_targets')
            .select('id, salesperson_id, period, target_amount, target_visits')
            .eq('period', period);
        if (error) throw new Error(error.message);
        return (data ?? []).map(t => ({ ...t, target_amount: Number(t.target_amount), target_visits: Number(t.target_visits) })) as SalesTarget[];
    },

    async upsertTarget(client: SupabaseClient, tenantId: string, userId: string, t: Omit<SalesTarget, 'id'>): Promise<void> {
        const { error } = await client
            .from('crm_sales_targets')
            .upsert(
                { tenant_id: tenantId, salesperson_id: t.salesperson_id, period: t.period, target_amount: t.target_amount, target_visits: t.target_visits, created_by: userId },
                { onConflict: 'tenant_id,salesperson_id,period' },
            );
        if (error) throw new Error(error.message);
    },

    /**
     * Tablero del equipo para un mes: cartera, cuentas activas, alertas,
     * visitas y cumplimiento de meta por comercial.
     */
    async teamPerformance(client: SupabaseClient, userId: string, period: string, today: string): Promise<TeamMemberPerformance[]> {
        const prevYear = String(Number(today.slice(0, 4)) - 1);
        const [team, parties, orders, targets, visits] = await Promise.all([
            visitService.getSalespeople(client, userId),
            loadCustomers(client),
            loadOrders(client, prevYear),
            this.getTargets(client, period),
            visitService.list(client, monthRange(`${period}-01`)),
        ]);
        const accounts = summarizeAccounts(parties, orders, today);
        const alertIds = new Set(deriveAlerts(accounts).map(a => a.account.id));
        const targetOf = new Map(targets.map(t => [t.salesperson_id, t]));

        // Venta del período por comercial, atribuida por la cartera del cliente.
        const salespersonOf = new Map(parties.map(p => [p.id, p.salesperson_id]));
        const periodSales = new Map<string, number>();
        for (const o of orders) {
            if (!o.issue_date.startsWith(period)) continue;
            const sp = salespersonOf.get(o.party_id);
            if (sp) periodSales.set(sp, (periodSales.get(sp) ?? 0) + o.total);
        }

        return team
            .map(m => {
                const mine = accounts.filter(a => a.salesperson_id === m.id);
                const t = targetOf.get(m.id);
                const myVisits = visits.filter(v => v.salesperson_id === m.id);
                return {
                    ...m,
                    accounts: mine.length,
                    active_accounts: mine.filter(a => a.account_status === 'ACTIVO_CRECIMIENTO' || a.account_status === 'ACTIVO_CAIDA').length,
                    alerts: mine.filter(a => alertIds.has(a.id)).length,
                    visits_done: myVisits.filter(v => v.status === 'REALIZADA').length,
                    visits_planned: myVisits.length,
                    sales: attainment(t?.target_amount ?? 0, periodSales.get(m.id) ?? 0, period, today),
                    target_visits: t?.target_visits ?? 0,
                };
            })
            // Sin cartera ni meta no aparece: evita llenar el tablero con gerencia.
            .filter(m => m.accounts > 0 || m.sales.target > 0)
            .sort((a, b) => (b.sales.attainment_pct ?? -1) - (a.sales.attainment_pct ?? -1) || a.name.localeCompare(b.name));
    },
};
