import { SupabaseClient } from '@supabase/supabase-js';
import { Budget, BudgetLine } from '../types';

export const budgetService = {
    async listBudgets(client: SupabaseClient, tenantId: string): Promise<Budget[]> {
        const { data, error } = await client
            .from('budgets')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('year', { ascending: false });
        if (error) { console.error('[budget] listBudgets:', error.message); return []; }
        return (data ?? []) as Budget[];
    },

    async getBudgetWithLines(client: SupabaseClient, budgetId: string) {
        const [{ data: budget, error: be }, { data: lines, error: le }] = await Promise.all([
            client.from('budgets').select('*').eq('id', budgetId).single(),
            client.from('budget_lines').select('*').eq('budget_id', budgetId).order('line_type').order('category'),
        ]);
        if (be) { console.error('[budget] getBudgetWithLines budget:', be.message); return { budget: {} as Budget, lines: [] as BudgetLine[] }; }
        if (le) { console.error('[budget] getBudgetWithLines lines:', le.message); return { budget: budget as Budget, lines: [] as BudgetLine[] }; }
        return { budget: budget as Budget, lines: (lines ?? []) as BudgetLine[] };
    },

    async createBudget(client: SupabaseClient, data: Omit<Budget, 'id' | 'created_at' | 'updated_at'>) {
        const { data: created, error } = await client
            .from('budgets')
            .insert(data)
            .select()
            .single();
        if (error) throw error;
        return created as Budget;
    },

    async updateBudgetTotals(client: SupabaseClient, budgetId: string) {
        const { data: lines } = await client
            .from('budget_lines')
            .select('line_type, amount')
            .eq('budget_id', budgetId);

        const totalIncome  = (lines ?? []).filter(l => l.line_type === 'INCOME').reduce((s, l) => s + Number(l.amount), 0);
        const totalExpense = (lines ?? []).filter(l => l.line_type === 'EXPENSE').reduce((s, l) => s + Number(l.amount), 0);

        const { error } = await client
            .from('budgets')
            .update({ total_income: totalIncome, total_expense: totalExpense })
            .eq('id', budgetId);
        if (error) throw error;
    },

    async upsertLine(client: SupabaseClient, line: Omit<BudgetLine, 'created_at' | 'updated_at'>) {
        const { data, error } = await client
            .from('budget_lines')
            .upsert(line)
            .select()
            .single();
        if (error) throw error;
        await this.updateBudgetTotals(client, line.budget_id);
        return data as BudgetLine;
    },

    async deleteLine(client: SupabaseClient, lineId: string, budgetId: string) {
        const { error } = await client.from('budget_lines').delete().eq('id', lineId);
        if (error) throw error;
        await this.updateBudgetTotals(client, budgetId);
    },

    /**
     * Obtiene el ejecutado real comparando contra documentos y transacciones del año
     */
    async getActualVsBudget(
        client: SupabaseClient,
        tenantId: string,
        year: number,
        lines: BudgetLine[]
    ): Promise<Record<string, { budgeted: number; actual: number }>> {
        const startDate = `${year}-01-01`;
        const endDate   = `${year}-12-31`;

        const [{ data: salesDocs }, { data: purchaseDocs }, { data: txs }] = await Promise.all([
            client.from('documents')
                .select('subtotal, taxes, total, doc_type')
                .in('doc_type', ['INVOICE'])
                .gte('issue_date', startDate)
                .lte('issue_date', endDate)
                .not('status', 'eq', 'VOIDED'),
            client.from('documents')
                .select('subtotal, taxes, total, doc_type')
                .in('doc_type', ['VENDOR_BILL'])
                .gte('issue_date', startDate)
                .lte('issue_date', endDate),
            client.from('treasury_transactions')
                .select('amount, transaction_type')
                .gte('date', startDate)
                .lte('date', endDate),
        ]);

        const totalSales   = (salesDocs    ?? []).reduce((s, d) => s + Number(d.total), 0);
        const totalPurchases = (purchaseDocs ?? []).reduce((s, d) => s + Number(d.total), 0);
        const totalPayroll = (txs ?? [])
            .filter(t => t.transaction_type === 'PAYMENT')
            .reduce((s, t) => s + Number(t.amount), 0);

        // Build a simple mapping category → actual
        const result: Record<string, { budgeted: number; actual: number }> = {};

        for (const line of lines) {
            if (!result[line.category]) {
                result[line.category] = { budgeted: 0, actual: 0 };
            }
            result[line.category].budgeted += Number(line.amount);

            // Heuristic mapping
            const cat = line.category.toLowerCase();
            if (cat.includes('venta') || cat.includes('ingreso')) {
                result[line.category].actual = totalSales;
            } else if (cat.includes('costo') || cat.includes('compra')) {
                result[line.category].actual = totalPurchases;
            } else if (cat.includes('nómina') || cat.includes('nomina') || cat.includes('personal')) {
                result[line.category].actual = totalPayroll * 0.6; // portion estimate
            }
        }

        return result;
    }
};
