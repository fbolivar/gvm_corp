import { createClient } from '@/lib/supabase/server';
import { SalesDashboard } from '@/features/analytics/components/SalesDashboard';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
    title: 'BI Ventas — GVM Corp',
    description: 'Dashboard de Business Intelligence de Ventas',
};

export interface MonthlySalesRow {
    month: string;
    total: number;
    count: number;
    year: number;
}

export interface TopClientRow {
    legal_name: string;
    total: number;
}

export default async function SalesAnalyticsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [monthlySalesResult, topClientsResult, tenant] = await Promise.all([
        supabase.rpc('get_monthly_sales'),
        supabase.rpc('get_top_clients', { p_limit: 10 }),
        settingsService.getTenantInfo(supabase),
    ]);

    const monthlySales: MonthlySalesRow[] = monthlySalesResult.data ?? [];
    const topClients: TopClientRow[] = topClientsResult.data ?? [];

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Ventas BI"
                subtitle="BI Gerencial — Comparativo Anual y Top Clientes"
                tenant={tenant}
            />

            <SalesDashboard monthlySales={monthlySales} topClients={topClients} />
        </div>
    );
}
