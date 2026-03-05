import { createClient } from '@/lib/supabase/server';
import { FinancialDashboard } from '@/features/analytics/components/FinancialDashboard';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
    title: 'BI Financiero — GVM Corp',
    description: 'Dashboard de Business Intelligence Financiero',
};

export interface MonthlyPnLRow {
    month: string;
    income: number;
    tax: number;
}

export interface MonthlyExpenseRow {
    month: string;
    expense: number;
}

async function getMonthlyIncome(supabase: Awaited<ReturnType<typeof createClient>>): Promise<MonthlyPnLRow[]> {
    const year = new Date().getFullYear();

    const { data, error } = await supabase
        .from('documents')
        .select('issue_date, total, taxes')
        .eq('doc_type', 'INVOICE')
        .neq('status', 'VOIDED')
        .gte('issue_date', `${year}-01-01`)
        .lte('issue_date', `${year}-12-31`);

    if (error || !data) {
        console.error('[financial/page] income error:', error?.message);
        return [];
    }

    const map = new Map<string, { income: number; tax: number }>();
    data.forEach(row => {
        const month = (row.issue_date as string).slice(0, 7) + '-01';
        const entry = map.get(month) ?? { income: 0, tax: 0 };
        entry.income += Number(row.total ?? 0);
        entry.tax += Number((row as { taxes?: number }).taxes ?? 0);
        map.set(month, entry);
    });

    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, { income, tax }]) => ({ month, income, tax }));
}

async function getMonthlyExpenses(supabase: Awaited<ReturnType<typeof createClient>>): Promise<MonthlyExpenseRow[]> {
    const year = new Date().getFullYear();

    const { data, error } = await supabase
        .from('documents')
        .select('issue_date, total')
        .eq('doc_type', 'VENDOR_BILL')
        .gte('issue_date', `${year}-01-01`)
        .lte('issue_date', `${year}-12-31`);

    if (error || !data) {
        console.error('[financial/page] expenses error:', error?.message);
        return [];
    }

    const map = new Map<string, number>();
    data.forEach(row => {
        const month = (row.issue_date as string).slice(0, 7) + '-01';
        map.set(month, (map.get(month) ?? 0) + Number(row.total ?? 0));
    });

    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, expense]) => ({ month, expense }));
}

export default async function FinancialAnalyticsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [incomeRows, expenseRows, tenant] = await Promise.all([
        getMonthlyIncome(supabase),
        getMonthlyExpenses(supabase),
        settingsService.getTenantInfo(supabase),
    ]);

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Financiero BI"
                subtitle="BI Gerencial — P&L, Margen y Salud Financiera"
                tenant={tenant}
            />

            <FinancialDashboard incomeRows={incomeRows} expenseRows={expenseRows} />
        </div>
    );
}
