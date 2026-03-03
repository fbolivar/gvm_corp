import { SupabaseClient } from '@supabase/supabase-js';

export interface CashFlowInflow {
    date: string;
    amount: number;
    source: string;
    description: string;
    category: 'RECEIVABLE' | 'RECURRING_INCOME';
}

export interface CashFlowOutflow {
    date: string;
    amount: number;
    source: string;
    description: string;
    category: 'PAYABLE' | 'PURCHASE_ORDER' | 'RECURRING_EXPENSE';
}

export interface DailyProjection {
    date: string;
    inflow: number;
    outflow: number;
    balance: number;
}

export interface CashFlowSummary {
    totalInflows: number;
    totalOutflows: number;
    netCashFlow: number;
    lowestBalance: number;
    lowestBalanceDate: string;
    daysUntilNegative: number | null;
}

export interface CashFlowProjection {
    currentBalance: number;
    projectedInflows: CashFlowInflow[];
    projectedOutflows: CashFlowOutflow[];
    dailyProjection: DailyProjection[];
    summary: CashFlowSummary;
}

export const cashFlowService = {
    async getProjection(client: SupabaseClient, days: number = 90): Promise<CashFlowProjection> {
        const today = new Date().toISOString().split('T')[0];
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        const futureDateStr = futureDate.toISOString().split('T')[0];

        // 1. Get current treasury balance (sum all active treasury accounts)
        const { data: accounts } = await client
            .from('treasury_accounts')
            .select('balance')
            .eq('is_active', true);

        const currentBalance = accounts?.reduce((sum, a) => sum + (Number(a.balance) || 0), 0) ?? 0;

        // 2. Get receivables — pending invoices with due_date in window
        const { data: receivables } = await client
            .from('documents')
            .select('id, number, total, balance, due_date, issue_date, party:parties(legal_name)')
            .eq('doc_type', 'INVOICE')
            .in('status', ['ACCEPTED', 'SIGNED'])
            .gte('due_date', today)
            .lte('due_date', futureDateStr);

        // 3. Get payables — pending vendor bills with due_date in window
        const { data: payables } = await client
            .from('documents')
            .select('id, number, total, balance, due_date, issue_date, party:parties(legal_name)')
            .eq('doc_type', 'VENDOR_BILL')
            .in('status', ['ACCEPTED', 'SIGNED'])
            .gte('due_date', today)
            .lte('due_date', futureDateStr);

        // 4. Get approved POs — committed outflows keyed on expected_delivery
        const { data: purchaseOrders } = await client
            .from('purchase_orders')
            .select('id, po_number, total, expected_delivery, supplier:parties(legal_name)')
            .in('status', ['APPROVED', 'PARTIALLY_RECEIVED'])
            .gte('expected_delivery', today)
            .lte('expected_delivery', futureDateStr);

        // Build inflows
        const projectedInflows: CashFlowInflow[] = (receivables || []).map((inv) => ({
            date: inv.due_date || inv.issue_date || today,
            amount: Number(inv.balance) || Number(inv.total) || 0,
            source: `FAC-${inv.number}`,
            description: `Cobro ${(inv.party as { legal_name?: string } | null)?.legal_name ?? 'Cliente'}`,
            category: 'RECEIVABLE',
        }));

        // Build outflows
        const projectedOutflows: CashFlowOutflow[] = [
            ...(payables || []).map((bill) => ({
                date: bill.due_date || bill.issue_date || today,
                amount: Number(bill.balance) || Number(bill.total) || 0,
                source: `CXP-${bill.number}`,
                description: `Pago ${(bill.party as { legal_name?: string } | null)?.legal_name ?? 'Proveedor'}`,
                category: 'PAYABLE' as const,
            })),
            ...(purchaseOrders || []).map((po) => ({
                date: po.expected_delivery || today,
                amount: Number(po.total) || 0,
                source: po.po_number || 'OC',
                description: `OC ${(po.supplier as { legal_name?: string } | null)?.legal_name ?? 'Proveedor'}`,
                category: 'PURCHASE_ORDER' as const,
            })),
        ];

        // Initialize a daily map covering today through futureDate (inclusive)
        const dailyMap: Record<string, { inflow: number; outflow: number }> = {};
        for (let d = 0; d <= days; d++) {
            const dt = new Date();
            dt.setDate(dt.getDate() + d);
            dailyMap[dt.toISOString().split('T')[0]] = { inflow: 0, outflow: 0 };
        }

        // Accumulate inflows and outflows into daily buckets
        for (const item of projectedInflows) {
            if (dailyMap[item.date]) dailyMap[item.date].inflow += item.amount;
        }
        for (const item of projectedOutflows) {
            if (dailyMap[item.date]) dailyMap[item.date].outflow += item.amount;
        }

        // Build running balance projection
        let runningBalance = currentBalance;
        let lowestBalance = currentBalance;
        let lowestBalanceDate = today;
        let daysUntilNegative: number | null = null;
        const nowMs = new Date().getTime();

        const dailyProjection: DailyProjection[] = Object.entries(dailyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, { inflow, outflow }]) => {
                runningBalance += inflow - outflow;

                if (runningBalance < lowestBalance) {
                    lowestBalance = runningBalance;
                    lowestBalanceDate = date;
                }

                if (runningBalance < 0 && daysUntilNegative === null) {
                    daysUntilNegative = Math.ceil(
                        (new Date(date).getTime() - nowMs) / (1000 * 3600 * 24)
                    );
                }

                return { date, inflow, outflow, balance: runningBalance };
            });

        const totalInflows = projectedInflows.reduce((s, i) => s + i.amount, 0);
        const totalOutflows = projectedOutflows.reduce((s, o) => s + o.amount, 0);

        return {
            currentBalance,
            projectedInflows,
            projectedOutflows,
            dailyProjection,
            summary: {
                totalInflows,
                totalOutflows,
                netCashFlow: totalInflows - totalOutflows,
                lowestBalance,
                lowestBalanceDate,
                daysUntilNegative,
            },
        };
    },
};
