import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { financialReportService } from '@/features/accounting/services/financialReportService';
import { settingsService } from '@/features/settings/services/settingsService';
import { PLChart } from '@/features/accounting/components/charts/PLChart';
import { HierarchicalFinancialTable } from '@/features/accounting/components/HierarchicalFinancialTable';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { ReportExportActions } from '@/features/accounting/components/ReportExportActions';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Badge } from "@/shared/components/ui/badge"
import { TrendingUp, TrendingDown, BarChart3, Percent, Info, Activity, Scale } from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"

export default async function ProfitAndLossPage({
    searchParams
}: {
    searchParams: Promise<{ startDate?: string, endDate?: string, compareStart?: string, compareEnd?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const startDate = params.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = params.endDate || new Date().toISOString().split('T')[0];
    const compareStart = params.compareStart;
    const compareEnd = params.compareEnd;

    const [data, tenant, compareData] = await Promise.all([
        accountingService.getProfitAndLoss(supabase, startDate, endDate),
        settingsService.getTenantInfo(supabase),
        (compareStart && compareEnd)
            ? accountingService.getProfitAndLoss(supabase, compareStart, compareEnd).catch(() => null)
            : Promise.resolve(null),
    ]);

    const incomeTree = financialReportService.buildHierarchy(data.income);
    const expensesTree = financialReportService.buildHierarchy(data.expenses);

    const margin = data.totalIncome > 0 ? ((data.netProfit / data.totalIncome) * 100).toFixed(1) : '0';
    const isProfit = data.netProfit >= 0;

    const calcDelta = (current: number, previous: number) =>
        previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;

    const incomeMap = new Map(data.income.map((i: { name: string; balance: number }) => [i.name, i.balance]));
    const expenseMap = new Map(data.expenses.map((e: { name: string; balance: number }) => [e.name, e.balance]));
    const allAccounts = new Set([...incomeMap.keys(), ...expenseMap.keys()]);
    const plCategories = Array.from(allAccounts)
        .map(name => ({
            name: name.length > 18 ? name.slice(0, 18) + '...' : name,
            income: Number(incomeMap.get(name) || 0),
            expense: Number(expenseMap.get(name) || 0),
        }))
        .filter(c => c.income > 0 || c.expense > 0)
        .slice(0, 8);

    const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 0 });

    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in duration-500">

            <VisualReportHeader
                title="Estado de Resultados"
                subtitle={`${startDate} — ${endDate}`}
                tenant={tenant}
            />

            {/* Resultado Neto + Filtros + Export */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Resultado Neto del Ejercicio</p>
                    <div className="flex items-center gap-3">
                        <h2 className={cn(
                            "text-3xl font-bold tracking-tight",
                            isProfit ? 'text-emerald-600' : 'text-rose-600'
                        )}>
                            ${fmt(data.netProfit)}
                        </h2>
                        <Badge className={cn(
                            "h-7 px-3 rounded-full border-none font-semibold text-[10px] tracking-wider flex items-center gap-1.5",
                            isProfit ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                            {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {isProfit ? 'UTILIDAD' : 'PERDIDA'}
                        </Badge>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <ReportingFilters />
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

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <BarChart3 className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ingresos</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">${fmt(data.totalIncome)}</p>
                    <p className="text-[10px] text-indigo-500 font-medium mt-1">Ventas Netas Consolidadas</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                            <Activity className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Egresos y Costos</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">${fmt(data.totalExpenses)}</p>
                    <p className="text-[10px] text-rose-500 font-medium mt-1">Costo de Ventas + Gastos Admin</p>
                </div>

                <div className={cn(
                    "rounded-2xl p-6 shadow-sm",
                    isProfit ? "bg-slate-900 text-white" : "bg-rose-900 text-white"
                )}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                            <Percent className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-semibold bg-white/10 px-3 py-1 rounded-full tracking-wider">
                            {margin}% MARGEN
                        </span>
                    </div>
                    <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1">Utilidad del Periodo</p>
                    <p className="text-2xl font-bold text-white tracking-tight">${fmt(data.netProfit)}</p>
                    <div className="flex items-center gap-1.5 mt-2 text-emerald-400">
                        <TrendingUp className="h-3 w-3" />
                        <span className="text-[9px] font-medium uppercase tracking-wider">
                            Rentabilidad {isProfit ? 'Positiva' : 'Negativa'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Grafico P&L */}
            <PLChart
                categories={plCategories}
                totalIncome={data.totalIncome}
                totalExpenses={data.totalExpenses}
                netProfit={data.netProfit}
            />

            {/* Comparativa de Periodos */}
            {compareData && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Scale className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Comparativa de Periodos</h3>
                            <p className="text-[10px] text-slate-400">
                                {startDate} — {endDate} vs {compareStart} — {compareEnd}
                            </p>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {[
                            { label: 'Ingresos Operativos', current: data.totalIncome, previous: compareData.totalIncome, positiveGood: true },
                            { label: 'Gastos y Costos', current: data.totalExpenses, previous: compareData.totalExpenses, positiveGood: false },
                            { label: 'Utilidad Neta', current: data.netProfit, previous: compareData.netProfit, positiveGood: true },
                        ].map(({ label, current, previous, positiveGood }) => {
                            const delta = calcDelta(current, previous);
                            const isImprovement = positiveGood ? delta >= 0 : delta <= 0;
                            return (
                                <div key={label} className="grid grid-cols-4 items-center gap-4 py-4">
                                    <span className="text-xs font-semibold text-slate-600">{label}</span>
                                    <div>
                                        <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Actual</p>
                                        <span className="text-base font-bold text-slate-900 tabular-nums">${fmt(current)}</span>
                                    </div>
                                    <div>
                                        <p className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">Anterior</p>
                                        <span className="text-base font-medium text-slate-400 tabular-nums">${fmt(previous)}</span>
                                    </div>
                                    <Badge className={cn(
                                        "h-7 px-3 rounded-full border-none font-semibold text-[10px] tracking-wider w-fit",
                                        isImprovement ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                    )}>
                                        {isImprovement ? <TrendingUp className="h-3 w-3 mr-1 inline" /> : <TrendingDown className="h-3 w-3 mr-1 inline" />}
                                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                                    </Badge>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Tablas de Detalle */}
            <div className="space-y-8">
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

            {/* Footnote NIIF */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center gap-4">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-300 shadow-sm shrink-0">
                    <Info className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs font-semibold text-slate-600">Certificacion NIIF</p>
                    <p className="text-[10px] text-slate-400">
                        Ejecutado por <span className="text-indigo-500 font-medium">{tenant?.name}</span> — Ciclo Fiscal {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </div>
    );
}
