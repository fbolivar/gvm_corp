import { SupabaseClient } from '@supabase/supabase-js';

export interface DashboardKPIs {
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    accountsReceivable: number;
    pendingInvoicesCount: number;
    lowStockProducts: number;
    newCustomers: number;
    inventoryValue: number;
    contributionMargin: number;
    arAging: {
        current: number;
        overdue30: number;
        overdue60: number;
        overdue90: number;
    };
    salesByUOM: Array<{ uom: string; total: number }>;
    topProducts: Array<{ name: string; sku: string; qty: number; total: number }>;
}

export const dashboardService = {
    async getKPIs(client: SupabaseClient): Promise<DashboardKPIs> {
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

        const { accountingService } = await import('@/features/accounting/services/accountingService');

        let financials = { totalIncome: 0, totalExpenses: 0, netProfit: 0 };
        try {
            financials = await accountingService.getProfitAndLoss(client, firstDayOfMonth, lastDayOfMonth);
        } catch (e: any) {
            console.error("Error fetching P&L:", e?.message || e);
            if (e?.details) console.error("Details:", e.details);
            if (e?.hint) console.error("Hint:", e.hint);
        }

        // Accounts Receivable Aging
        // Fallback for missing due_date and balance columns (Error 42703)
        const { data: arInvoices, error: arError } = await client
            .from('documents')
            .select('balance, total, doc_type, status, issue_date, due_date')
            .eq('doc_type', 'INVOICE')
            .in('status', ['ACCEPTED', 'SIGNED']);

        if (arError) {
            console.error("Dashboard Service Error (arInvoices):", arError.message);
        }

        const aging = { current: 0, overdue30: 0, overdue60: 0, overdue90: 0 };
        const now = new Date();

        arInvoices?.forEach(inv => {
            // Use due_date if it exists, otherwise fallback to issue_date
            const rawDueDate = (inv as any).due_date || inv.issue_date;
            const dueDate = new Date(rawDueDate);
            const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
            const total = Number(inv.balance) || Number(inv.total) || 0;

            if (diffDays <= 0) aging.current += total;
            else if (diffDays <= 30) aging.overdue30 += total;
            else if (diffDays <= 60) aging.overdue60 += total;
            else aging.overdue90 += total;
        });

        const pendingTotal = (arInvoices?.reduce((sum, doc) => sum + (Number(doc.total) || 0), 0) || 0);

        const { count: newCustomers } = await client
            .from('parties')
            .select('*', { count: 'exact', head: true })
            .eq('is_customer', true)
            .gte('created_at', firstDayOfMonth);

        const { data: stockData } = await client.rpc('get_products_with_stock', {
            p_limit: 1000,
            p_offset: 0,
            p_search: ''
        });

        const lowStockCount = (stockData as any[])?.filter(p => Number(p.total_qty) <= Number(p.min_stock || 5)).length || 0;

        const { data: valuationData } = await client
            .from('products')
            .select('id, cost')
            .eq('status', 'active');

        let inventoryValuation = 0;
        if (valuationData && stockData) {
            stockData.forEach((s: any) => {
                const prod = valuationData.find(p => p.id === s.id);
                if (prod) {
                    inventoryValuation += (Number(s.total_qty) * (Number(prod.cost) || 0));
                }
            });
        }

        // Top Sold Products (Last 30 days)
        const { data: salesLines } = await client
            .from('document_lines')
            .select('product_id, qty, line_total, products(name, sku), documents!inner(doc_type, issue_date)')
            .eq('documents.doc_type', 'INVOICE')
            .gte('documents.issue_date', firstDayOfMonth);

        const productSales: Record<string, any> = {};
        salesLines?.forEach(line => {
            const p = line.products as any;
            if (!p) return;
            const pData = Array.isArray(p) ? p[0] : p;
            if (!pData) return;

            if (!productSales[line.product_id]) {
                productSales[line.product_id] = { name: pData.name, sku: pData.sku, qty: 0, total: 0 };
            }
            productSales[line.product_id].qty += Number(line.qty);
            productSales[line.product_id].total += Number(line.line_total);
        });

        const topProducts = Object.values(productSales)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        return {
            totalIncome: financials.totalIncome,
            totalExpenses: financials.totalExpenses,
            netProfit: financials.netProfit,
            accountsReceivable: pendingTotal,
            pendingInvoicesCount: arInvoices?.length || 0,
            newCustomers: newCustomers || 0,
            lowStockProducts: lowStockCount,
            inventoryValue: inventoryValuation,
            contributionMargin: financials.totalIncome - financials.totalExpenses,
            arAging: aging,
            salesByUOM: [],
            topProducts: topProducts as any[]
        };
    },

    async getARAgingInvoices(client: SupabaseClient, daysMin: number, daysMax: number | null) {
        const { data, error } = await client
            .from('documents')
            .select('id, number, total, due_date, parties(legal_name)')
            .eq('doc_type', 'INVOICE')
            .in('status', ['ACCEPTED', 'SIGNED']);

        if (error) {
            console.error("Supabase Error in getARAgingInvoices:", error);
            throw error;
        }

        const now = new Date();
        return (data || []).map(inv => ({
            ...inv,
            party: Array.isArray(inv.parties) ? inv.parties[0] : inv.parties
        })).filter(inv => {
            const dueDate = new Date(inv.due_date);
            const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));

            if (daysMax === null) return diffDays >= daysMin;
            if (daysMin === 0 && daysMax === 0) return diffDays <= 0;
            return diffDays >= daysMin && diffDays <= daysMax;
        }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    },

    async getRecentActivity(client: SupabaseClient, limit = 5) {
        const { data, error } = await client
            .from('documents')
            .select('id, number, doc_type, status, total, issue_date, party:parties(legal_name)')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    }
};
