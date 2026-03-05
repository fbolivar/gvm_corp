import { ExecutiveDashboard } from '@/features/analytics/components/ExecutiveDashboard';
import { dashboardService } from '@/features/dashboard/services/dashboardService';
import { createClient } from '@/lib/supabase/server';
import { ARAgingWidget } from '@/features/dashboard/components/ARAgingWidget';
import { TopProductsWidget } from '@/features/dashboard/components/TopProductsWidget';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Metadata } from 'next';
import { TrendingUp, BarChart2, ArrowRight } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cn } from '@/shared/lib/utils';

export const metadata: Metadata = {
    title: 'Business Intelligence — GVM Corp',
    description: 'Tablero de Control Ejecutivo y Análisis de Rentabilidad',
};

export default async function AnalyticsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [kpis, tenant] = await Promise.all([
        dashboardService.getKPIs(supabase),
        settingsService.getTenantInfo(supabase),
    ]);

    const biModules = [
        {
            href: '/analytics/sales',
            title: 'Ventas BI',
            subtitle: 'Comparativo anual · Top 10 clientes · KPIs',
            icon: TrendingUp,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            tags: ['Comparativo', 'Top Clientes', 'MoM Growth'],
            tagStyle: 'bg-indigo-50 text-indigo-600 border-indigo-200',
        },
        {
            href: '/analytics/financial',
            title: 'Financiero BI',
            subtitle: 'P&L mensual · Margen · Salud financiera',
            icon: BarChart2,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            tags: ['P&L', 'Margen', 'Radar Score'],
            tagStyle: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        },
    ];

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Business Intelligence"
                subtitle="BI Gerencial — Tablero de Control Ejecutivo"
                tenant={tenant}
            />

            {/* BI Sub-dashboards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {biModules.map((mod) => (
                    <Link key={mod.href} href={mod.href} className="group block">
                        <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", mod.bg)}>
                                            <mod.icon className={cn("h-5 w-5", mod.color)} />
                                        </div>
                                        <div className="space-y-2">
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-900">{mod.title}</h3>
                                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{mod.subtitle}</p>
                                            </div>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {mod.tags.map((tag) => (
                                                    <Badge key={tag} variant="outline" className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full border", mod.tagStyle)}>
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-600 transition-colors shrink-0 mt-1" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Strategic BI Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ARAgingWidget aging={kpis.arAging} />
                <TopProductsWidget products={kpis.topProducts} />
            </div>

            <ExecutiveDashboard />
        </div>
    );
}
