import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { financialReportService } from '@/features/accounting/services/financialReportService';
import { settingsService } from '@/features/settings/services/settingsService';
import { HierarchicalFinancialTable } from '@/features/accounting/components/HierarchicalFinancialTable';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { ReportExportActions } from '@/features/accounting/components/ReportExportActions';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { ShieldCheck, AlertCircle, Info } from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"

export default async function BalanceSheetPage({
    searchParams
}: {
    searchParams: Promise<{ startDate?: string, endDate?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const startDate = params.startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = params.endDate || new Date().toISOString().split('T')[0];

    const [data, tenant] = await Promise.all([
        accountingService.getBalanceSheet(supabase, startDate, endDate),
        settingsService.getTenantInfo(supabase)
    ]);

    const assetsTree = financialReportService.buildHierarchy(data.assets);
    const liabilitiesTree = financialReportService.buildHierarchy(data.liabilities);
    const equityTree = financialReportService.buildHierarchy(data.equity);

    const totalPasivoPatrimonio = data.totalLiabilities + data.totalEquity + data.netIncome;
    const checkBalance = Math.abs(data.totalAssets - totalPasivoPatrimonio) < 1;
    const diff = data.totalAssets - totalPasivoPatrimonio;

    const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 0 });

    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in duration-500">

            <VisualReportHeader
                title="Balance General"
                subtitle={`Corte a: ${endDate}`}
                tenant={tenant}
            />

            {/* Filtros + Export */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Activos</p>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                        ${fmt(data.totalAssets)}
                    </h2>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <ReportingFilters />
                    <ReportExportActions
                        title="Balance General"
                        companyName={tenant?.name || 'EMPRESA'}
                        companyNit={tenant?.nit}
                        companyAddress={tenant?.address}
                        companyPhone={tenant?.phone}
                        logoUrl={tenant?.logo_url || undefined}
                        period={`A corte de ${endDate}`}
                        sections={[
                            { title: 'Activos', rows: data.assets, total: data.totalAssets },
                            { title: 'Pasivos', rows: data.liabilities, total: data.totalLiabilities },
                            { title: 'Patrimonio', rows: data.equity, total: data.totalEquity + data.netIncome }
                        ]}
                        fileName={`Balance_General_${endDate}`}
                    />
                </div>
            </div>

            {/* Ecuación Contable + KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Activos</p>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight font-mono tabular-nums">${fmt(data.totalAssets)}</p>
                    <p className="text-[10px] text-indigo-500 font-medium mt-1">Masa Patrimonial Activa</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Pasivos</p>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight font-mono tabular-nums">${fmt(data.totalLiabilities)}</p>
                    <p className="text-[10px] text-rose-500 font-medium mt-1">Obligaciones Totales</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Patrimonio</p>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight font-mono tabular-nums">${fmt(data.totalEquity)}</p>
                    <p className={cn("text-[10px] font-medium mt-1", data.netIncome >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        Resultado: ${fmt(data.netIncome)}
                    </p>
                </div>

                <div className={cn(
                    "rounded-2xl p-6 shadow-sm",
                    checkBalance ? "bg-slate-900 text-white" : "bg-rose-900 text-white"
                )}>
                    <div className="flex items-center justify-between mb-3">
                        {checkBalance ? (
                            <ShieldCheck className="h-5 w-5 text-emerald-400" />
                        ) : (
                            <AlertCircle className="h-5 w-5 text-rose-400" />
                        )}
                        <span className={cn(
                            "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                            checkBalance ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                        )}>
                            {checkBalance ? 'CUADRADO' : 'DESCUADRE'}
                        </span>
                    </div>
                    <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1">Ecuación Contable</p>
                    <p className="text-lg font-bold text-white tracking-tight">
                        A = P + Pt {checkBalance ? '' : `(${fmt(diff)})`}
                    </p>
                    <p className="text-[9px] text-white/40 mt-1">
                        Activos vs Pasivos + Patrimonio
                    </p>
                </div>
            </div>

            {/* Tablas de Detalle */}
            <div className="space-y-8">
                <HierarchicalFinancialTable
                    title="Activos"
                    nodes={assetsTree}
                    totalLabel="Total Activos"
                    totalValue={data.totalAssets}
                />

                <HierarchicalFinancialTable
                    title="Pasivos"
                    nodes={liabilitiesTree}
                    totalLabel="Total Pasivos"
                    totalValue={data.totalLiabilities}
                />

                <HierarchicalFinancialTable
                    title="Patrimonio"
                    nodes={equityTree}
                    totalLabel="Total Patrimonio"
                    totalValue={data.totalEquity + data.netIncome}
                />
            </div>

            {/* Footnote NIIF */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center gap-4">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-300 shadow-sm shrink-0">
                    <Info className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs font-semibold text-slate-600">Base de Medición NIIF</p>
                    <p className="text-[10px] text-slate-400">
                        Preparado bajo costo histórico en moneda funcional — <span className="text-indigo-500 font-medium">{tenant?.name}</span> — Ciclo Fiscal {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </div>
    );
}
