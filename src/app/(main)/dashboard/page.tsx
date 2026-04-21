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
    LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { PageHeader } from '@/shared/components/ui/page-header';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/shared/lib/utils';

import { smartAlertService } from '@/features/notifications/services/smartAlertService';
import { CriticalAlertsPanel } from '@/features/dashboard/components/CriticalAlertsPanel';
import { ActiveUsersWidget } from '@/features/dashboard/components/ActiveUsersWidget';

function fmtNum(n: number): string {
    const abs = Math.abs(Math.round(n));
    const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return n < 0 ? `-${formatted}` : formatted;
}

// Mapa de prioridad: primer módulo con permiso que se use como landing si el
// usuario no tiene acceso al Dashboard gerencial.
const MODULE_TO_ROUTE: Record<string, string> = {
    logistics: '/logistics',
    sales: '/sales',
    purchasing: '/purchasing',
    inventory: '/inventory',
    accounting: '/accounting',
    treasury: '/treasury',
    payroll: '/payroll',
    dian: '/dian',
    documents: '/documents',
    crm: '/crm',
    production: '/production',
    analytics: '/analytics',
    support: '/support',
    technology: '/technology',
    contracts: '/contracts',
    training: '/academy',
    budget: '/budget',
    collaboration: '/collaboration',
    settings: '/settings',
};

export default async function DashboardPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // ─── Guard: solo roles con acceso a 'dashboard' ven el panel gerencial ───
    // Otros roles son redirigidos a su primer módulo con permiso.
    const { data: ut } = await supabase
        .from('user_tenants')
        .select('role, role_id')
        .eq('user_id', user.id)
        .maybeSingle();

    const HIGH_LEVEL_ROLES = ['SUPER ADMINISTRADOR', 'ADMINISTRADOR', 'owner', 'admin'];
    const isHighLevel = ut?.role ? HIGH_LEVEL_ROLES.includes(ut.role) : false;

    if (!isHighLevel && ut?.role_id) {
        const { data: perms } = await supabase
            .from('role_permissions')
            .select('module_key, can_view')
            .eq('role_id', ut.role_id);

        const allowed = new Set((perms ?? []).filter(p => p.can_view).map(p => p.module_key));

        if (!allowed.has('dashboard')) {
            // Buscar el primer módulo con permiso siguiendo el orden del mapa
            for (const [mod, route] of Object.entries(MODULE_TO_ROUTE)) {
                if (allowed.has(mod)) {
                    redirect(route);
                }
            }
            // Sin módulos asignados: ir a "mi nómina" (siempre visible) como fallback
            redirect('/my-payroll');
        }
    }

    try {
        smartAlertService.evaluateAndTriggerAlerts(supabase).catch(console.error);

        const [kpis, recentActivity, prevKpis, monthCount, { data: profile }, { data: userTenant }] = await Promise.all([
            dashboardService.getKPIs(supabase),
            dashboardService.getRecentActivity(supabase),
            dashboardService.getPreviousMonthKPIs(supabase),
            dashboardService.getMonthInvoiceCount(supabase),
            supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
            supabase.from('user_tenants').select('tenant_id').eq('user_id', user.id).maybeSingle(),
        ]);

        const tenantId = userTenant?.tenant_id;
        const userFullName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario';

        const calcTrend = (current: number, previous: number): number => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100 * 10) / 10;
        };

        const trendIncome = calcTrend(kpis.totalIncome, prevKpis.totalIncome);
        const trendOrders = calcTrend(monthCount, prevKpis.monthInvoicesCount);
        const trendNetProfit = calcTrend(kpis.netProfit, prevKpis.netProfit);

        const miniCards = [
            {
                label: 'Gasto operativo',
                value: `$${fmtNum(kpis.totalExpenses)}`,
                icon: TrendingDown,
                tint: 'bg-rose-50 text-rose-600',
                trend: prevKpis.totalExpenses > 0 ? calcTrend(kpis.totalExpenses, prevKpis.totalExpenses) : null,
                trendGood: false,
            },
            {
                label: 'Nuevos clientes',
                value: String(kpis.newCustomers),
                icon: UserCheck,
                tint: 'bg-sky-50 text-sky-600',
                trend: null,
                trendGood: true,
                badge: 'este mes',
            },
            {
                label: 'Lotes por vencer',
                value: String(kpis.expiringLots30d),
                icon: FlaskConical,
                tint: kpis.expiringLots30d > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600',
                trend: null,
                trendGood: true,
                badge: kpis.expiringLots30d > 0 ? 'próx 30d' : 'sin alertas',
                href: '/inventory/lots',
                ring: kpis.expiringLots30d > 0,
            },
        ];

        const now = new Date();
        const monthLabel = now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

        return (
            <div className="page-container">
                <PageHeader
                    title={`Bienvenido, ${userFullName}`}
                    description={`Panel gerencial · ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`}
                    icon={LayoutDashboard}
                />

                <CriticalAlertsPanel />

                {/* KPI Grid */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-6">
                    <KPICard
                        variant="primary"
                        title="Facturación bruta"
                        value={`$${fmtNum(kpis.totalIncome)}`}
                        icon={TrendingUp}
                        trend={{ value: Math.abs(trendIncome), label: 'vs mes anterior', isPositive: trendIncome >= 0 }}
                    />
                    <KPICard
                        title="Volumen órdenes"
                        value={monthCount}
                        icon={Briefcase}
                        trend={{ value: Math.abs(trendOrders), label: 'vs mes anterior', isPositive: trendOrders >= 0 }}
                    />
                    <KPICard
                        title="Activos en stock"
                        value={`$${fmtNum(kpis.inventoryValue)}`}
                        icon={Package}
                        trend={{ value: 0, label: 'valoración actual', isPositive: true }}
                    />
                    <KPICard
                        title="Margen neto"
                        value={`$${fmtNum(kpis.netProfit)}`}
                        icon={DollarSign}
                        trend={{ value: Math.abs(trendNetProfit), label: 'vs mes anterior', isPositive: trendNetProfit >= 0 }}
                    />
                </div>

                {/* Operational Analytics */}
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-12 items-start mt-6">
                    <div className="lg:col-span-8 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {miniCards.map((card) => {
                                const inner = (
                                    <div className={cn(
                                        'surface-card p-5 flex items-center gap-4 h-full transition-all',
                                        card.ring && 'ring-1 ring-amber-300',
                                        card.href && 'hover:shadow-md hover:border-slate-300'
                                    )}>
                                        <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', card.tint)}>
                                            <card.icon className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="kpi-label">{card.label}</p>
                                            <div className="flex items-baseline gap-2 flex-wrap mt-0.5">
                                                <span className="text-xl font-bold text-slate-900 tabular-nums">{card.value}</span>
                                                {card.trend !== null && (
                                                    <StatusBadge tone={(card.trendGood ? card.trend <= 0 : card.trend >= 0) ? 'success' : 'danger'}>
                                                        {card.trend > 0 ? '+' : ''}{card.trend}%
                                                    </StatusBadge>
                                                )}
                                                {card.badge && (
                                                    <span className="text-[11px] text-slate-500">{card.badge}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                                return card.href ? (
                                    <Link key={card.label} href={card.href} className="block">{inner}</Link>
                                ) : (
                                    <div key={card.label}>{inner}</div>
                                );
                            })}
                        </div>

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
                        {tenantId && (
                            <ActiveUsersWidget
                                tenantId={tenantId}
                                userId={user.id}
                                userFullName={userFullName}
                            />
                        )}
                    </div>
                </div>

                {/* Low Stock Alert */}
                {kpis.lowStockProducts > 0 && (
                    <div className="mt-6 surface-card bg-amber-50/60 border-amber-200 p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-h3 text-amber-900">Stock crítico detectado</h4>
                                <p className="text-sm text-amber-800 mt-0.5">
                                    <span className="font-semibold">{kpis.lowStockProducts} SKUs</span> bajo nivel de seguridad.
                                </p>
                            </div>
                        </div>
                        <Button asChild variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100">
                            <Link href="/inventory?filter=low_stock">
                                Gestionar <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                            </Link>
                        </Button>
                    </div>
                )}
            </div>
        );
    } catch (error: unknown) {
        const err = error as Error;
        return (
            <div className="page-container">
                <div className="surface-card p-8 text-center max-w-md mx-auto mt-8">
                    <div className="inline-flex h-12 w-12 rounded-xl bg-rose-50 items-center justify-center text-rose-600 mb-4">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <h1 className="text-h2 mb-1">Error cargando el dashboard</h1>
                    <p className="text-caption mb-4">Falla en sincronización de datos</p>
                    <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg mb-4">{err.message}</p>
                    <Button asChild variant="outline">
                        <Link href="/dashboard">Reintentar</Link>
                    </Button>
                </div>
            </div>
        );
    }
}
