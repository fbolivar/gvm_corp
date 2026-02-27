import { createClient } from '@/lib/supabase/server';
import { dashboardService, PreviousMonthKPIs } from '@/features/dashboard/services/dashboardService';
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
  Activity,
  UserCheck,
  Calendar,
  LayoutDashboard,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { settingsService } from '@/features/settings/services/settingsService';
import { redirect } from "next/navigation";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";

import { smartAlertService } from "@/features/notifications/services/smartAlertService";
import { CriticalAlertsPanel } from '@/features/dashboard/components/CriticalAlertsPanel';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  try {
    // Disparar evaluación de alertas inteligentes (Side effect en DB)
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

    return (
      <div className="page-container space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700">

        {/* 💎 PREMIUM COMMAND CENTER HEADER */}
        <div className="relative group overflow-hidden bg-slate-900 rounded-3xl p-8 md:p-12 text-white shadow-active">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-6 transition-all duration-1000">
            <LayoutDashboard className="h-48 w-48 text-white" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-1.5 w-8 bg-primary rounded-full" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Terminal de Gestión</span>
              </div>
              <h1 className="text-5xl md:text-8xl font-black tracking-tighter italic uppercase leading-[0.8] mb-4">
                Reporte <br /><span className="text-slate-500/50">Gerencial</span>
              </h1>
              <div className="flex items-center gap-4">
                <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.3em]">{tenant?.name} • 2026</p>
                <div className="hidden md:flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full backdrop-blur-md border border-primary/20">
                  <Activity className="h-2.5 w-2.5 text-primary animate-pulse" />
                  <span className="text-[8px] font-bold text-primary uppercase tracking-widest">Sincronizado</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 w-full lg:w-auto">
              <div className="flex flex-col items-end">
                <span className="text-slate-500 font-bold text-[9px] uppercase tracking-widest mb-1">Ciclo Operativo</span>
                <span className="text-base font-bold italic tracking-tight uppercase tabular-nums">
                  {new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 🛡️ SMART ALERTS PANEL */}
        <CriticalAlertsPanel />

        {/* 📊 MASTER KPI GRID */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            variant="primary"
            title="Facturación Bruta"
            value={`$${kpis.totalIncome.toLocaleString('es-CO')}`}
            icon={TrendingUp}
            trend={{ value: Math.abs(trendIncome), label: "vs mes anterior", isPositive: trendIncome >= 0 }}
          />
          <KPICard
            title="Volumen Órdenes"
            value={monthCount}
            icon={Briefcase}
            trend={{ value: Math.abs(trendOrders), label: "vs mes anterior", isPositive: trendOrders >= 0 }}
          />
          <KPICard
            title="Activos en Stock"
            value={`$${kpis.inventoryValue.toLocaleString('es-CO')}`}
            icon={Package}
            trend={{ value: 0, label: "valoración actual", isPositive: true }}
          />
          <KPICard
            title="Margen Neto"
            value={`$${kpis.netProfit.toLocaleString('es-CO')}`}
            icon={DollarSign}
            trend={{ value: Math.abs(trendNetProfit), label: "vs mes anterior", isPositive: trendNetProfit >= 0 }}
          />
        </div>

        {/* 🏗️ OPERATIONAL ANALYTICS */}
        <div className="grid gap-8 grid-cols-1 lg:grid-cols-12 items-start">
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="bg-white border-none shadow-sm p-6 flex items-center gap-4 rounded-xl group hover:bg-slate-50 transition-all duration-300">
                <div className="h-10 w-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-500 shadow-inner group-hover:rotate-6 transition-transform">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none italic">Gasto Operativo</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-extrabold text-slate-900 tracking-tight italic tabular-nums">${kpis.totalExpenses.toLocaleString('es-CO')}</span>
                    {prevKpis.totalExpenses > 0 && (() => {
                      const t = calcTrend(kpis.totalExpenses, prevKpis.totalExpenses);
                      return <Badge className={`border-none font-bold text-[7px] uppercase px-1 py-0.5 rounded-full ${t <= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{t > 0 ? '+' : ''}{t}%</Badge>;
                    })()}
                  </div>
                </div>
              </Card>

              <Card className="bg-white border-none shadow-sm p-6 flex items-center gap-4 rounded-xl group hover:bg-slate-50 transition-all duration-300">
                <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-inner group-hover:-rotate-6 transition-transform">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none italic">Nuevos Clientes</h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-extrabold text-slate-900 tracking-tight italic tabular-nums">{kpis.newCustomers}</span>
                    <Badge className="bg-slate-100 text-slate-500 border-none font-bold text-[7px] uppercase px-1 py-0.5 rounded-full">este mes</Badge>
                  </div>
                </div>
              </Card>
            </div>

            {/* 💎 NEW STRATEGIC ANALYTICS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7">
                <ARAgingWidget aging={kpis.arAging} />
              </div>
              <div className="lg:col-span-5">
                <TopProductsWidget products={kpis.topProducts} />
              </div>
            </div>

            <RecentSalesWidget data={recentActivity} />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center gap-3 px-2">
              <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-active">
                <Zap className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight italic uppercase leading-none">Acciones</h2>
            </div>
            <ActionGrid />
          </div>
        </div>

        {/* 🛡️ NOTIFICATION / ALERT V3 */}
        {kpis.lowStockProducts > 0 && (
          <div className="bg-amber-900 p-10 md:p-12 rounded-3xl text-white flex flex-col lg:flex-row items-center justify-between gap-8 shadow-active relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
              <AlertCircle className="h-40 w-40 text-white" />
            </div>
            <div className="flex items-center gap-8 relative z-10 text-center lg:text-left flex-col lg:flex-row">
              <div className="h-20 w-20 bg-white/10 rounded-2xl flex items-center justify-center text-white border border-white/10 shadow-inner rotate-6 group-hover:rotate-0 transition-transform duration-700">
                <Sparkles className="h-10 w-10 text-amber-400" />
              </div>
              <div className="space-y-2">
                <h4 className="text-2xl font-extrabold italic tracking-tight uppercase leading-none text-white">Stock Crítico Detectado</h4>
                <p className="text-xs text-white/40 leading-relaxed font-medium max-w-lg">
                  <span className="text-amber-400 font-bold">{kpis.lowStockProducts} SKUs</span> operando bajo el nivel de seguridad.
                  Se recomienda gestionar la reposición para evitar interrupciones.
                </p>
              </div>
            </div>
            <Button asChild className="h-12 px-8 rounded-xl bg-white text-slate-900 font-bold text-[10px] uppercase tracking-widest hover:bg-amber-400 hover:text-white transition-all shadow-active relative z-10 group/btn">
              <Link href="/inventory?filter=low_stock" className="flex items-center gap-3">
                Gestionar <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    );
  } catch (error: any) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-2xl shadow-premium">
          <div className="inline-flex h-16 w-16 rounded-xl bg-rose-50 items-center justify-center text-rose-500 shadow-inner">
            <AlertCircle className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight italic uppercase">Error de Sistema</h1>
            <p className="text-slate-400 font-bold text-[8px] uppercase tracking-widest leading-relaxed">Falla en Sincronización de Datos</p>
          </div>
          <p className="text-slate-500 font-medium leading-relaxed bg-slate-50 p-4 rounded-xl text-xs">{error.message}</p>
          <Button className="w-full bg-slate-900 text-white rounded-xl h-12 font-bold uppercase text-[10px] tracking-widest hover:bg-primary transition-all shadow-active active:scale-95">Reintentar Conexión</Button>
        </div>
      </div>
    )
  }
}
