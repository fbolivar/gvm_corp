import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { financialReportService } from '@/features/accounting/services/financialReportService';
import { settingsService } from '@/features/settings/services/settingsService';
import { HierarchicalFinancialTable } from '@/features/accounting/components/HierarchicalFinancialTable';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { ReportExportActions } from '@/features/accounting/components/ReportExportActions';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Percent, Info, Activity, ArrowRight } from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"

export default async function ProfitAndLossPage({
    searchParams
}: {
    searchParams: Promise<{ startDate?: string, endDate?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const startDate = params.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = params.endDate || new Date().toISOString().split('T')[0];

    const [data, tenant] = await Promise.all([
        accountingService.getProfitAndLoss(supabase, startDate, endDate),
        settingsService.getTenantInfo(supabase)
    ]);

    const incomeTree = financialReportService.buildHierarchy(data.income);
    const expensesTree = financialReportService.buildHierarchy(data.expenses);

    const margin = data.totalIncome > 0 ? ((data.netProfit / data.totalIncome) * 100).toFixed(1) : '0';
    const isProfit = data.netProfit >= 0;

    return (
        <div className="page-container space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 💎 PREMIUM HEADER */}
            <VisualReportHeader
                title="Estado de Resultados"
                subtitle={`${startDate} » ${endDate}`}
                tenant={tenant}
            />

            {/* 📊 INDUSTRIAL STRIP (Summary Data) */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-1">
                <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] leading-none mb-3">Resultado Neto del Ejercicio</span>
                        <div className="flex items-center gap-4">
                            <h2 className={cn(
                                "text-5xl font-black tracking-tighter italic leading-none",
                                isProfit ? 'text-emerald-600' : 'text-rose-600'
                            )}>
                                ${data.netProfit.toLocaleString('es-CO')}
                            </h2>
                            <Badge className={cn(
                                "h-8 px-4 rounded-full border-none font-black text-[10px] tracking-widest flex items-center gap-2",
                                isProfit ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            )}>
                                {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {isProfit ? 'UTILIDAD' : 'PÉRDIDA'}
                            </Badge>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-5">
                    <ReportingFilters />
                    <div className="h-14 border-l border-slate-100 mx-2 hidden md:block" />
                    <ReportExportActions
                        title="Estado de Resultados"
                        companyName={tenant?.name || 'EMPRESA'}
                        companyNit={tenant?.nit}
                        companyAddress={tenant?.address}
                        companyPhone={tenant?.phone}
                        logoUrl={tenant?.logo_url || undefined}
                        period={`${startDate} a ${endDate}`}
                        sections={[
                            { title: 'Ingresos', rows: data.income, total: data.totalIncome },
                            { title: 'Gastos y Costos', rows: data.expenses, total: data.totalExpenses }
                        ]}
                        fileName={`Estado_Resultados_${startDate}_${endDate}`}
                    />
                </div>
            </div>

            {/* 🎯 KPI V3 DASHBOARD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="bg-white rounded-[3.5rem] p-10 shadow-premium border border-slate-50 group hover:translate-y-[-8px] transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-32 w-32 text-slate-900" />
                    </div>
                    <div className="space-y-6 relative z-10">
                        <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                            <BarChart3 className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ingresos Operativos</p>
                            <h3 className="text-4xl font-black text-slate-900 italic tracking-tighter leading-none">
                                ${data.totalIncome.toLocaleString('es-CO')}
                            </h3>
                            <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest mt-2">Ventas Netas Consolidadas</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-[3.5rem] p-10 shadow-premium border border-slate-50 group hover:translate-y-[-8px] transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                        <TrendingDown className="h-32 w-32 text-slate-900" />
                    </div>
                    <div className="space-y-6 relative z-10">
                        <div className="h-14 w-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner">
                            <Activity className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Egresos & Costos</p>
                            <h3 className="text-4xl font-black text-slate-900 italic tracking-tighter leading-none">
                                ${data.totalExpenses.toLocaleString('es-CO')}
                            </h3>
                            <p className="text-[9px] text-rose-500 font-bold uppercase tracking-widest mt-2">Costo de Ventas + Gastos Admin</p>
                        </div>
                    </div>
                </div>

                <div className={cn(
                    "rounded-[3.5rem] p-10 shadow-active transition-all relative overflow-hidden group hover:translate-y-[-8px]",
                    isProfit ? "bg-slate-900 text-white" : "bg-rose-900 text-white"
                )}>
                    <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform">
                        <DollarSign className="h-32 w-32 text-white" />
                    </div>
                    <div className="space-y-6 relative z-10">
                        <div className="flex items-center justify-between">
                            <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-md shadow-inner">
                                <Percent className="h-7 w-7" />
                            </div>
                            <div className="bg-white/10 px-4 py-2 rounded-full backdrop-blur-md border border-white/5">
                                <span className="text-[10px] font-black tracking-widest">{margin}% MARGEN NETO</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">Utilidad del Periodo</p>
                            <h3 className="text-4xl font-black text-white italic tracking-tighter leading-none">
                                ${data.netProfit.toLocaleString('es-CO')}
                            </h3>
                            <div className="flex items-center gap-2 mt-3 text-emerald-400">
                                <TrendingUp className="h-3 w-3" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Ratio de Rentabilidad Positivo</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🏗️ DETAIL ARCHITECTURE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-12 space-y-12">
                    <HierarchicalFinancialTable
                        title="Ingresos"
                        nodes={incomeTree}
                        totalLabel="Total Ingresos Operativos"
                        totalValue={data.totalIncome}
                    />

                    <HierarchicalFinancialTable
                        title="Gastos / Costos"
                        nodes={expensesTree}
                        totalLabel="Total Gastos y Costos"
                        totalValue={data.totalExpenses}
                    />
                </div>
            </div>

            {/* 🛡️ FOOTNOTE ADVISORY */}
            <div className="bg-slate-50 p-12 rounded-[3.5rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="flex items-center gap-8">
                    <div className="h-16 w-16 bg-white rounded-3xl flex items-center justify-center text-slate-300 shadow-premium border border-slate-50">
                        <Info className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                        <h5 className="text-slate-900 font-black text-sm uppercase italic tracking-tight">Certificación de Cumplimiento NIIF</h5>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Ejecutado por <span className="text-indigo-400">{tenant?.name}</span> para Ciclo Fiscal 2026</p>
                    </div>
                </div>
                <Button variant="outline" className="h-14 rounded-2xl border-slate-200 text-[10px] font-black uppercase tracking-widest px-8 hover:bg-white hover:shadow-premium transition-all">
                    Ver Detalle de Auditoría <ArrowRight className="ml-3 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
