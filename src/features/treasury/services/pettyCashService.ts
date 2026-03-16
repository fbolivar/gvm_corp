import { SupabaseClient } from '@supabase/supabase-js';

// ── Types ──────────────────────────────────────────────────────────────────────

export type PettyCashStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type PettyCashTxType = 'REIMBURSEMENT' | 'EXPENSE' | 'OPENING';
export type ExpenseCategory =
    | 'TRANSPORTE'
    | 'PAPELERIA'
    | 'ASEO'
    | 'ALIMENTACION'
    | 'OTROS';

export interface PettyCashFund {
    id: string;
    tenant_id: string;
    name: string;
    custodian_id: string | null;
    treasury_account_id: string | null;
    max_amount: number;
    current_balance: number;
    status: PettyCashStatus;
    created_at: string;
    updated_at: string | null;
    /** Joined via profiles */
    custodian_name?: string | null;
}

export interface PettyCashTransaction {
    id: string;
    tenant_id: string;
    fund_id: string;
    type: PettyCashTxType;
    amount: number;
    description: string;
    receipt_number: string | null;
    expense_category: string | null;
    created_by: string | null;
    created_at: string;
}

export interface CreateFundInput {
    name: string;
    custodian_id?: string | null;
    treasury_account_id?: string | null;
    max_amount: number;
    opening_balance: number;
}

export interface AddExpenseInput {
    amount: number;
    description: string;
    receipt_number?: string | null;
    expense_category?: ExpenseCategory | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function getTenantId(client: SupabaseClient): Promise<string> {
    const { data: rpcData, error: rpcError } = await client.rpc('get_my_tenant_id');
    if (!rpcError && rpcData) return rpcData as string;

    const { data: tenantData } = await client
        .from('tenants')
        .select('id')
        .limit(1)
        .maybeSingle();

    return (tenantData?.id as string) ?? '134320f0-20ef-4a56-8087-050d517c8282';
}

// ── Service ────────────────────────────────────────────────────────────────────

export const pettyCashService = {

    /**
     * List all petty cash funds for the current tenant, including custodian name.
     */
    async getFunds(client: SupabaseClient): Promise<PettyCashFund[]> {
        const { data, error } = await client
            .from('petty_cash_funds')
            .select(`
                id,
                tenant_id,
                name,
                custodian_id,
                treasury_account_id,
                max_amount,
                current_balance,
                status,
                created_at,
                updated_at
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[pettyCash] getFunds:', error.message);
            return [];
        }

        const funds = data as PettyCashFund[];

        // Resolve custodian names from profiles in a single batch
        const custodianIds = funds
            .map((f) => f.custodian_id)
            .filter((id): id is string => id !== null);

        if (custodianIds.length > 0) {
            const { data: profiles } = await client
                .from('profiles')
                .select('id, full_name')
                .in('id', custodianIds);

            const profileMap = new Map<string, string>(
                (profiles ?? []).map((p: { id: string; full_name: string | null }) => [
                    p.id,
                    p.full_name ?? 'Sin nombre',
                ])
            );

            return funds.map((f) => ({
                ...f,
                custodian_name: f.custodian_id ? (profileMap.get(f.custodian_id) ?? null) : null,
            }));
        }

        return funds.map((f) => ({ ...f, custodian_name: null }));
    },

    /**
     * Fetch a single fund with its full transaction history.
     */
    async getFundById(
        client: SupabaseClient,
        id: string
    ): Promise<{ fund: PettyCashFund; transactions: PettyCashTransaction[] } | null> {
        const { data: fund, error: fundError } = await client
            .from('petty_cash_funds')
            .select('*')
            .eq('id', id)
            .single();

        if (fundError || !fund) {
            console.error('[pettyCash] getFundById:', fundError?.message);
            return null;
        }

        const { data: transactions, error: txError } = await client
            .from('petty_cash_transactions')
            .select('*')
            .eq('fund_id', id)
            .order('created_at', { ascending: false });

        if (txError) {
            console.error('[pettyCash] getFundById transactions:', txError.message);
            return { fund: fund as PettyCashFund, transactions: [] };
        }

        return {
            fund: fund as PettyCashFund,
            transactions: (transactions ?? []) as PettyCashTransaction[],
        };
    },

    /**
     * Create a new petty cash fund and record an OPENING transaction.
     */
    async createFund(
        client: SupabaseClient,
        input: CreateFundInput
    ): Promise<PettyCashFund> {
        const tenant_id = await getTenantId(client);

        const { data: fund, error: fundError } = await client
            .from('petty_cash_funds')
            .insert({
                tenant_id,
                name: input.name,
                custodian_id: input.custodian_id ?? null,
                treasury_account_id: input.treasury_account_id ?? null,
                max_amount: input.max_amount,
                current_balance: input.opening_balance,
                status: 'ACTIVE',
            })
            .select()
            .single();

        if (fundError) throw new Error(fundError.message);

        // Record the opening transaction
        const { data: authData } = await client.auth.getUser();
        const created_by = authData?.user?.id ?? null;

        await client.from('petty_cash_transactions').insert({
            tenant_id,
            fund_id: fund.id,
            type: 'OPENING',
            amount: input.opening_balance,
            description: `Apertura de caja menor: ${input.name}`,
            receipt_number: null,
            expense_category: null,
            created_by,
        });

        return fund as PettyCashFund;
    },

    /**
     * Add an expense transaction, reducing the fund balance.
     * Throws if the fund has insufficient balance.
     */
    async addExpense(
        client: SupabaseClient,
        fundId: string,
        input: AddExpenseInput
    ): Promise<PettyCashTransaction> {
        const tenant_id = await getTenantId(client);

        // Fetch current balance
        const { data: fund, error: fundError } = await client
            .from('petty_cash_funds')
            .select('current_balance, status')
            .eq('id', fundId)
            .single();

        if (fundError || !fund) throw new Error('Caja menor no encontrada');
        if (fund.status !== 'ACTIVE') throw new Error('La caja menor no está activa');
        if (fund.current_balance < input.amount) {
            throw new Error(
                `Saldo insuficiente. Disponible: ${fund.current_balance.toLocaleString('es-CO')}`
            );
        }

        const newBalance = Number(fund.current_balance) - Number(input.amount);

        // Update balance
        const { error: updateError } = await client
            .from('petty_cash_funds')
            .update({ current_balance: newBalance })
            .eq('id', fundId);

        if (updateError) throw new Error(updateError.message);

        const { data: authData } = await client.auth.getUser();
        const created_by = authData?.user?.id ?? null;

        const { data: tx, error: txError } = await client
            .from('petty_cash_transactions')
            .insert({
                tenant_id,
                fund_id: fundId,
                type: 'EXPENSE',
                amount: input.amount,
                description: input.description,
                receipt_number: input.receipt_number ?? null,
                expense_category: input.expense_category ?? null,
                created_by,
            })
            .select()
            .single();

        if (txError) throw new Error(txError.message);
        return tx as PettyCashTransaction;
    },

    /**
     * Reimburse a fund (REIMBURSEMENT), increasing the balance up to max_amount.
     */
    async addReimbursement(
        client: SupabaseClient,
        fundId: string,
        amount: number,
        description: string
    ): Promise<PettyCashTransaction> {
        const tenant_id = await getTenantId(client);

        const { data: fund, error: fundError } = await client
            .from('petty_cash_funds')
            .select('current_balance, max_amount, status')
            .eq('id', fundId)
            .single();

        if (fundError || !fund) throw new Error('Caja menor no encontrada');
        if (fund.status !== 'ACTIVE') throw new Error('La caja menor no está activa');

        const newBalance = Math.min(
            Number(fund.current_balance) + Number(amount),
            Number(fund.max_amount)
        );

        const { error: updateError } = await client
            .from('petty_cash_funds')
            .update({ current_balance: newBalance })
            .eq('id', fundId);

        if (updateError) throw new Error(updateError.message);

        const { data: authData } = await client.auth.getUser();
        const created_by = authData?.user?.id ?? null;

        const { data: tx, error: txError } = await client
            .from('petty_cash_transactions')
            .insert({
                tenant_id,
                fund_id: fundId,
                type: 'REIMBURSEMENT',
                amount,
                description: description || `Reembolso caja menor`,
                receipt_number: null,
                expense_category: null,
                created_by,
            })
            .select()
            .single();

        if (txError) throw new Error(txError.message);
        return tx as PettyCashTransaction;
    },

    /**
     * Close a petty cash fund — sets status to CLOSED.
     */
    async closeFund(client: SupabaseClient, fundId: string): Promise<void> {
        const { error } = await client
            .from('petty_cash_funds')
            .update({ status: 'CLOSED' })
            .eq('id', fundId);

        if (error) throw new Error(error.message);
    },
};
