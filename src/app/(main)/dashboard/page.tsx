import { createClient } from '@/lib/supabase/server';
import { dashboardService } from '@/features/dashboard/services/dashboardService';
import { KPICard } from '@/features/dashboard/components/KPICard';
import { RecentSalesWidget } from '@/features/dashboard/components/RecentSalesWidget';
import { ActionGrid } from '@/features/dashboard/components/ActionGrid';
import { ARAgingWidget } from '@/features/dashboard/components/ARAgingWidget';
import { TopProductsWidget } from '@/features/dashboard/components/TopProductsWidget';
import {
    DollarSign,
    Briefcase,
    TrendingUp,
    AlertCircle,
    TrendingDown,
    Package,
    UserCheck,
    FlaskConical,
    ArrowRight,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/shared/lib/utils';

import { smartAlertService } from '@/features/notifications/services/smartAlertService';
import { CriticalAlertsPanel } from '@/features/dashboard/components/CriticalAlertsPanel';

/** Deterministic number formatter — avoids server/client locale mismatch (hydration errors) */
function fmtNum(n: number): string {
    const abs = Math.abs(Math.round(n));
    const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return n < 0 ? `-${formatted}` : formatted;
}

export default async function DashboardPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    try {
        smartAlertService.evaluateAndTriggerAlerts(supabase).catch(console.error);

        const [kpis, recentActivity, tenant, prevKpis, monthCount] = await Promise.all([
            dashboardService.getKPIs(supabase),
            dashboardService.getRecentActivity(supabase),
            settingsService.getTenantInfo(supabase),
            dashboardService.getPreviousMonthKPIs(supabase),
            dashboardService.getMonthInvoiceCount(supabase),
        ]);

        const calcTrend = (current: number, previous: number): number => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100 * 10) / 10;
        };

        const trendIncome = calcTrend(kpis.totalIncome, prevKpis.totalIncome);
        const trendOrders = calcTrend(monthCount, prevKpis.monthInvoicesCount);
        const trendNetProfit = calcTrend(kpis.netProfit, prevKpis.netProfit);

        const miniCards = [
            {
                label: 'Gasto Operativo',
                value: `$${fmtNum(kpis.totalExpenses)}`,
                icon: TrendingDown,
                bg: 'bg-rose-50',
                color: 'text-rose-500',
                trend: prevKpis.totalExpenses > 0 ? calcTrend(kpis.totalExpenses, prevKpis.totalExpenses) : null,
                trendGood: false,
            },
            {
                label: 'Nuevos Clientes',
                value: String(kpis.newCustomers),
                icon: UserCheck,
                bg: 'bg-indigo-50',
                color: 'text-indigo-500',
                trend: null,
                trendGood: true,
                badge: 'este mes',
            },
            {
                label: 'Lotes por Vencer',
                value: String(kpis.expiringLots30d),
                icon: FlaskConical,
                bg: kpis.expiringLots30d > 0 ? 'bg-amber-50' : 'bg-emerald-50',
                color: kpis.expiringLots30d > 0 ? 'text-amber-500' : 'text-emerald-500',
                trend: null,
                trendGood: true,
                badge: kpis.expiringLots30d > 0 ? 'próx 30d' : 'sin alertas',
                href: '/inventory/lots',
                ring: kpis.expiringLots30d > 0,
            },
        ];

        return (
            <div className="space-y-6 pb-16 animate-in fade-in duration-500">
                <VisualReportHeader
                    title="Dashboard"
                    subtitle="Reporte Gerencial — Vista Consolidada"
                    tenant={tenant}
                />

                {/* Smart Alerts */}
                <CriticalAlertsPanel />

                {/* KPI Grid */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <KPICard
                        variant="primary"
                        title="Facturación Bruta"
                        value={`$${fmtNum(kpis.totalIncome)}`}
                        icon={TrendingUp}
                        trend={{ value: Math.abs(trendIncome), label: 'vs mes anterior', isPositive: trendIncome >= 0 }}
                    />
                    <KPICard
                        title="Volumen Órdenes"
                        value={monthCount}
                        icon={Briefcase}
                        trend={{ value: Math.abs(trendOrders), label: 'vs mes anterior', isPositive: trendOrders >= 0 }}
                    />
                    <KPICard
                        title="Activos en Stock"
                        value={`$${fmtNum(kpis.inventoryValue)}`}
                        icon={Package}
                        trend={{ value: 0, label: 'valoración actual', isPositive: true }}
                    />
                    <KPICard
                        title="Margen Neto"
                        value={`$${fmtNum(kpis.netProfit)}`}
                        icon={DollarSign}
                        trend={{ value: Math.abs(trendNetProfit), label: 'vs mes anterior', isPositive: trendNetProfit >= 0 }}
                    />
                </div>

                {/* Operational Analytics */}
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-12 items-start">
                    <div className="lg:col-span-8 space-y-4">
                        {/* Mini metric cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {miniCards.map((card) => {
                                const inner = (
                                    <Card className={cn(
                                        'rounded-2xl border border-slate-100 bg-white shadow-sm',
                                        card.ring && 'ring-1 ring-amber-200',
                                    )}>
                                        <CardContent className="p-5 flex items-center gap-4">
                                            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', card.bg)}>
                                                <card.icon className={cn('h-5 w-5', card.color)} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{card.label}</p>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-xl font-bold text-slate-900 tabular-nums">{card.value}</span>
                                                    {card.trend !== null && (
                                                        <Badge className={cn(
                                                            'border-none font-semibold text-[9px] px-1.5 py-0.5 rounded-full',
                                                            (card.trendGood ? card.trend <= 0 : card.trend >= 0) ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600',
                                                        )}>
                                                            {card.trend > 0 ? '+' : ''}{card.trend}%
                                                        </Badge>
                                                    )}
                                                    {card.badge && (
                                                        <Badge variant="secondary" className="text-[9px] font-semibold">{card.badge}</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                                return card.href ? (
                                    <Link key={card.label} href={card.href} className="block">{inner}</Link>
                                ) : (
                                    <div key={card.label}>{inner}</div>
                                );
                            })}
                        </div>

                        {/* AR Aging + Top Products */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                            <div className="lg:col-span-7">
                                <ARAgingWidget aging={kpis.arAging} />
                            </div>
                            <div className="lg:col-span-5">
                                <TopProductsWidget products={kpis.topProducts} />
                            </div>
                        </div>

                        <RecentSalesWidget data={recentActivity} />
                    </div>

                    <div className="lg:col-span-4 space-y-4">
                        <ActionGrid />
                    </div>
                </div>

                {/* Low Stock Alert */}
                {kpis.lowStockProducts > 0 && (
                    <Card className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm overflow-hidden">
                        <CardContent className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                                    <AlertCircle className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-amber-900">Stock Crítico Detectado</h4>
                                    <p className="text-[10px] text-amber-700 mt-0.5">
                                        <span className="font-bold">{kpis.lowStockProducts} SKUs</span> operando bajo el nivel de seguridad.
                                    </p>
                                </div>
                            </div>
                            <Button asChild className="h-9 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-semibold gap-2 shrink-0">
                                <Link href="/inventory?filter=low_stock">
                                    Gestionar <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    } catch (error: unknown) {
        const err = error as Error;
        return (
            <div className="min-h-[400px] flex items-center justify-center p-8">
                <Card className="max-w-md w-full rounded-2xl border border-slate-100 bg-white shadow-sm">
                    <CardContent className="p-8 text-center space-y-4">
                        <div className="inline-flex h-12 w-12 rounded-xl bg-rose-50 items-center justify-center text-rose-500">
                            <AlertCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900">Error de Sistema</h1>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Falla en Sincronización de Datos</p>
                        </div>
                        <p className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl">{err.message}</p>
                        <Button className="w-full h-9 rounded-xl bg-slate-900 text-xs font-semibold">Reintentar</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }
}
