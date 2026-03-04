import { SupabaseClient } from '@supabase/supabase-js';

export type BudgetStatus = 'DRAFT' | 'APPROVED' | 'CLOSED';

export interface Budget {
    id: string;
    tenant_id: string;
    name: string;
    year: number;
    status: BudgetStatus;
    notes: string | null;
    created_at: string;
}

export interface BudgetLine {
    id: string;
    budget_id: string;
    tenant_id: string;
    category: string;
    account_name: string;
    sort_order: number;
    m01: number; m02: number; m03: number; m04: number;
    m05: number; m06: number; m07: number; m08: number;
    m09: number; m10: number; m11: number; m12: number;
}

export type MonthKey = 'm01'|'m02'|'m03'|'m04'|'m05'|'m06'|'m07'|'m08'|'m09'|'m10'|'m11'|'m12';
export const MONTH_KEYS: MonthKey[] = ['m01','m02','m03','m04','m05','m06','m07','m08','m09','m10','m11','m12'];
export const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export const BUDGET_CATEGORIES: { key: string; label: string; color: string; sign: 1 | -1 }[] = [
    { key: 'INGRESOS',       label: 'Ingresos',                color: 'text-emerald-600', sign: 1  },
    { key: 'COSTO_VENTAS',   label: 'Costo de Ventas',         color: 'text-rose-500',    sign: -1 },
    { key: 'GASTOS_ADMIN',   label: 'Gastos Administrativos',  color: 'text-amber-600',   sign: -1 },
    { key: 'GASTOS_VENTAS',  label: 'Gastos de Ventas',        color: 'text-orange-500',  sign: -1 },
    { key: 'NOMINA',         label: 'Nómina',                  color: 'text-indigo-600',  sign: -1 },
    { key: 'CAPEX',          label: 'Inversiones (CAPEX)',      color: 'text-slate-500',   sign: -1 },
];

/** Default seed lines per category */
const SEED_LINES: Omit<BudgetLine, 'id'|'budget_id'|'tenant_id'|'m01'|'m02'|'m03'|'m04'|'m05'|'m06'|'m07'|'m08'|'m09'|'m10'|'m11'|'m12'>[] = [
    { category: 'INGRESOS',      account_name: 'Ventas de productos',             sort_order: 0 },
    { category: 'INGRESOS',      account_name: 'Ventas de servicios',             sort_order: 1 },
    { category: 'COSTO_VENTAS',  account_name: 'Costo de mercancía vendida',      sort_order: 0 },
    { category: 'GASTOS_ADMIN',  account_name: 'Gastos generales y admón.',       sort_order: 0 },
    { category: 'GASTOS_ADMIN',  account_name: 'Servicios públicos y arriendos',  sort_order: 1 },
    { category: 'GASTOS_VENTAS', account_name: 'Publicidad y mercadeo',           sort_order: 0 },
    { category: 'NOMINA',        account_name: 'Nómina administrativa',           sort_order: 0 },
    { category: 'NOMINA',        account_name: 'Nómina operativa',                sort_order: 1 },
    { category: 'CAPEX',         account_name: 'Adquisición de activos fijos',    sort_order: 0 },
];

export function lineTotal(line: BudgetLine): number {
    return MONTH_KEYS.reduce((s, k) => s + Number(line[k]), 0);
}

export interface ActualByMonth { [month: string]: number } // month = '01'..'12'

export interface ActualsMap {
    INGRESOS:      ActualByMonth;
    COSTO_VENTAS:  ActualByMonth;
    NOMINA:        ActualByMonth;
    GASTOS:        ActualByMonth; // VENDOR_BILL covers admin+ventas combined
}

export const budgetService = {
    async getAll(client: SupabaseClient): Promise<Budget[]> {
        const { data, error } = await client
            .from('budgets')
            .select('*')
            .order('year', { ascending: false });
        if (error) { console.error('[budget] getAll:', error.message); return []; }
        return (data ?? []) as Budget[];
    },

    async getWithLines(client: SupabaseClient, id: string): Promise<{ budget: Budget; lines: BudgetLine[] }> {
        const [{ data: budget, error: be }, { data: lines, error: le }] = await Promise.all([
            client.from('budgets').select('*').eq('id', id).single(),
            client.from('budget_lines').select('*').eq('budget_id', id).order('sort_order'),
        ]);
        if (be) { console.error('[budget] getWithLines:', be.message); return { budget: {} as Budget, lines: [] }; }
        if (le) { console.error('[budget] getWithLines lines:', le.message); return { budget: budget as Budget, lines: [] }; }
        return { budget: budget as Budget, lines: (lines ?? []) as BudgetLine[] };
    },

    async create(client: SupabaseClient, name: string, year: number, notes?: string): Promise<Budget> {
        const { data: tenantRow } = await client.from('tenants').select('id').limit(1).single();
        const { data: { user } } = await client.auth.getUser();
        const tenant_id = tenantRow?.id;

        const { data, error } = await client
            .from('budgets')
            .insert({ name, year, notes: notes ?? null, tenant_id, created_by: user?.id })
            .select()
            .single();
        if (error) throw error;

        // Seed lines
        const zero = { m01:0,m02:0,m03:0,m04:0,m05:0,m06:0,m07:0,m08:0,m09:0,m10:0,m11:0,m12:0 };
        const seedRows = SEED_LINES.map(s => ({ ...s, ...zero, budget_id: data.id, tenant_id }));
        await client.from('budget_lines').insert(seedRows);
        return data as Budget;
    },

    async upsertLine(client: SupabaseClient, lineId: string, month: MonthKey, value: number): Promise<void> {
        const { error } = await client
            .from('budget_lines')
            .update({ [month]: value })
            .eq('id', lineId);
        if (error) throw error;
    },

    async updateStatus(client: SupabaseClient, id: string, status: BudgetStatus): Promise<void> {
        const { error } = await client.from('budgets').update({ status }).eq('id', id);
        if (error) throw error;
    },

    async getActuals(client: SupabaseClient, year: number): Promise<ActualsMap> {
        const startDate = `${year}-01-01`;
        const endDate   = `${year}-12-31`;

        // Query all relevant documents in the year
        const { data: docs } = await client
            .from('documents')
            .select('doc_type, issue_date, total')
            .gte('issue_date', startDate)
            .lte('issue_date', endDate)
            .neq('status', 'VOIDED')
            .in('doc_type', ['INVOICE', 'CREDIT_NOTE', 'PAYROLL', 'VENDOR_BILL']);

        const result: ActualsMap = {
            INGRESOS:     {},
            COSTO_VENTAS: {},
            NOMINA:       {},
            GASTOS:       {},
        };

        for (const doc of docs ?? []) {
            const month = String(new Date(doc.issue_date + 'T12:00:00').getMonth() + 1).padStart(2, '0');
            const amount = Number(doc.total) || 0;
            switch (doc.doc_type) {
                case 'INVOICE':
                    result.INGRESOS[month] = (result.INGRESOS[month] ?? 0) + amount;
                    break;
                case 'CREDIT_NOTE':
                    result.INGRESOS[month] = (result.INGRESOS[month] ?? 0) - amount;
                    break;
                case 'PAYROLL':
                    result.NOMINA[month] = (result.NOMINA[month] ?? 0) + amount;
                    break;
                case 'VENDOR_BILL':
                    result.GASTOS[month] = (result.GASTOS[month] ?? 0) + amount;
                    break;
            }
        }
        return result;
    },
};
