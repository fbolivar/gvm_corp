import { SupabaseClient } from '@supabase/supabase-js';

export type PeriodStatus = 'OPEN' | 'CLOSING' | 'CLOSED';

export interface FiscalPeriod {
    id: string;
    tenant_id: string;
    period: string;  // YYYY-MM
    status: PeriodStatus;
    closed_by: string | null;
    closed_at: string | null;
    notes: string | null;
    created_at: string;
}

export interface PeriodCloseItem {
    id: string;
    period_id: string;
    item_key: string;
    is_confirmed: boolean;
    confirmed_at: string | null;
    confirmed_by: string | null;
}

export const CHECKLIST_ITEMS: { key: string; label: string; description: string }[] = [
    {
        key: 'invoices_reviewed',
        label: 'Facturas de venta revisadas',
        description: 'Verificar que todas las facturas del período están emitidas y registradas.',
    },
    {
        key: 'expenses_reviewed',
        label: 'Gastos y compras revisados',
        description: 'Confirmar que todos los gastos del período están contabilizados.',
    },
    {
        key: 'bank_reconciliation',
        label: 'Conciliación bancaria completada',
        description: 'Todas las cuentas bancarias han sido conciliadas con el extracto del período.',
    },
    {
        key: 'depreciation_posted',
        label: 'Depreciación del período registrada',
        description: 'Los activos fijos activos tienen registrado el mes de depreciación correspondiente.',
    },
    {
        key: 'payroll_settled',
        label: 'Nómina del período liquidada',
        description: 'La nómina ha sido liquidada y contabilizada para todos los empleados.',
    },
    {
        key: 'adjusting_entries',
        label: 'Asientos de ajuste aplicados',
        description: 'Revisar y aplicar asientos de ajuste por diferidos, provisiones y accruals.',
    },
];

export function periodLabel(period: string): string {
    const [year, month] = period.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long' });
}

export const fiscalPeriodService = {
    async getAll(client: SupabaseClient): Promise<FiscalPeriod[]> {
        const { data, error } = await client
            .from('fiscal_periods')
            .select('*')
            .order('period', { ascending: false });
        if (error) { console.error('[fiscalPeriod] getAll:', error.message); return []; }
        return (data ?? []) as FiscalPeriod[];
    },

    async getWithItems(
        client: SupabaseClient,
        periodId: string
    ): Promise<{ period: FiscalPeriod; items: PeriodCloseItem[] }> {
        const [{ data: period, error: pe }, { data: items, error: ie }] = await Promise.all([
            client.from('fiscal_periods').select('*').eq('id', periodId).single(),
            client.from('period_close_items').select('*').eq('period_id', periodId),
        ]);
        if (pe) { console.error('[fiscalPeriod] getWithItems period:', pe.message); return { period: {} as FiscalPeriod, items: [] }; }
        if (ie) { console.error('[fiscalPeriod] getWithItems items:', ie.message); return { period: period as FiscalPeriod, items: [] }; }
        return { period: period as FiscalPeriod, items: (items ?? []) as PeriodCloseItem[] };
    },

    async createPeriod(client: SupabaseClient, period: string, notes?: string): Promise<FiscalPeriod> {
        const { data: tenantRow } = await client.from('tenants').select('id').limit(1).single();
        const { data, error } = await client
            .from('fiscal_periods')
            .insert({ period, notes: notes ?? null, tenant_id: tenantRow?.id })
            .select()
            .single();
        if (error) throw error;

        // Seed checklist items
        const seedItems = CHECKLIST_ITEMS.map(c => ({
            tenant_id: tenantRow?.id,
            period_id: data.id,
            item_key: c.key,
            is_confirmed: false,
        }));
        await client.from('period_close_items').insert(seedItems);

        return data as FiscalPeriod;
    },

    async confirmItem(
        client: SupabaseClient,
        itemId: string,
        confirm: boolean
    ): Promise<void> {
        const { data: { user } } = await client.auth.getUser();
        const { error } = await client
            .from('period_close_items')
            .update({
                is_confirmed: confirm,
                confirmed_at: confirm ? new Date().toISOString() : null,
                confirmed_by: confirm ? user?.id : null,
            })
            .eq('id', itemId);
        if (error) throw error;
    },

    async updateStatus(
        client: SupabaseClient,
        periodId: string,
        status: PeriodStatus
    ): Promise<void> {
        const { data: { user } } = await client.auth.getUser();
        const updates: Record<string, unknown> = { status };
        if (status === 'CLOSED') {
            updates.closed_by = user?.id;
            updates.closed_at = new Date().toISOString();
        }
        const { error } = await client
            .from('fiscal_periods')
            .update(updates)
            .eq('id', periodId);
        if (error) throw error;
    },
};
