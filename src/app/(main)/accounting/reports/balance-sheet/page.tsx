import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { financialReportService } from '@/features/accounting/services/financialReportService';
import { settingsService } from '@/features/settings/services/settingsService';
import { HierarchicalFinancialTable } from '@/features/accounting/components/HierarchicalFinancialTable';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { ReportExportActions } from '@/features/accounting/components/ReportExportActions';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Landmark, Info, Calculator, PieChart, Activity, ShieldCheck, Scale, ArrowRight } from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"

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

    const checkBalance = Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity + data.netIncome)) < 1;
    const diff = data.totalAssets - (data.totalLiabilities + data.totalEquity + data.netIncome);

    return (
        <div className="page-container space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 💎 PREMIUM HEADER */}
            <VisualReportHeader
                title="Balance Situacional"
                subtitle={`Corte Global a: ${endDate}`}
                tenant={tenant}
            />

            {/* 📊 INDUSTRIAL STRIP (Primary Metric) */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-1">
                <div className="flex items-center gap-12">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">Masa Patrimonial Activa</span>
                        <div className="flex items-center gap-6">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                                ${data.totalAssets.toLocaleString('es-CO')}
                            </h2>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-emerald-500 font-black tracking-widest leading-none mb-1">CUMPLIMIENTO</span>
                                <span className="text-[9px] text-slate-300 font-bold tracking-widest leading-none">NIIF / Full</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-5">
                    <ReportingFilters />
                    <div className="h-14 border-l border-slate-100 mx-2 hidden md:block" />
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* 🛡️ SIDEBAR ANALYTICS */}
                <div className="lg:col-span-4 space-y-10">
                    <div className="sticky top-10 space-y-10">
                        {/* Ecuación Contable Master Card */}
                        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-active relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform">
                                <Calculator className="h-40 w-40 text-white" />
                            </div>

                            <div className="space-y-8 relative z-10">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black italic uppercase tracking-tighter">Ecuación Maestro</h3>
                                    <div className="h-10 w-10 bg-white/5 rounded-xl flex items-center justify-center text-indigo-400">
                                        <Scale className="h-5 w-5" />
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Activos</span>
                                            <span className="text-lg font-black font-mono">${data.totalAssets.toLocaleString()}</span>
                                        </div>
                                        <div className="h-px bg-white/10" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Pasivos + Pat.</span>
                                            <span className="text-lg font-black font-mono">${(data.totalLiabilities + data.totalEquity + data.netIncome).toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {checkBalance ? (
                                        <div className="h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center gap-3 text-emerald-400">
                                            <ShieldCheck className="h-5 w-5" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Libros Equilibrados</span>
                                        </div>
                                    ) : (
                                        <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-2xl flex flex-col items-center gap-2 text-rose-400 animate-pulse">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Diferencia Detectada</span>
                                            <span className="text-xl font-black italic font-mono underline underline-offset-4 decoration-rose-400/50">${diff.toLocaleString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Patrimonio Composition Card */}
                        <div className="bg-white rounded-[2.5rem] p-10 shadow-premium border border-slate-50 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform text-slate-900">
                                <PieChart className="h-32 w-32" />
                            </div>

                            <div className="space-y-8 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-inner">
                                        <Activity className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">Capas de Capital</h3>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex justify-between items-center px-4">
                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Respaldo Social</span>
                                        <span className="text-sm font-black text-slate-900 font-mono tracking-tighter italic">${data.totalEquity.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center px-4">
                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Excedente / Pérdida</span>
                                        <span className={cn(
                                            "text-sm font-black font-mono tracking-tighter italic",
                                            data.netIncome >= 0 ? 'text-emerald-500' : 'text-rose-500'
                                        )}>
                                            ${data.netIncome.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="pt-6 border-t border-slate-100 flex justify-between items-center px-4">
                                        <span className="text-[10px] text-slate-900 font-black uppercase tracking-[0.2em]">Patrimonio Neto</span>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-black text-slate-900 font-mono tracking-tighter italic">${(data.totalEquity + data.netIncome).toLocaleString()}</span>
                                            <span className="text-[9px] font-bold text-slate-300">COP</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Technical Advisory */}
                        <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                                    <Landmark className="h-5 w-5" />
                                </div>
                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Base de Medición</h4>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed font-bold italic pr-4">
                                Estados financieros preparados bajo costo histórico expresados en moneda funcional local, conforme al Marco Técnico Normativo NIIF para PYMES.
                            </p>
                        </div>
                    </div>
                </div>

                {/* 🏗️ TABLES CORE */}
                <div className="lg:col-span-8 space-y-12">
                    <HierarchicalFinancialTable
                        title="Activos"
                        nodes={assetsTree}
                        totalLabel="Total Activos Maestro"
                        totalValue={data.totalAssets}
                    />

                    <HierarchicalFinancialTable
                        title="Pasivos"
                        nodes={liabilitiesTree}
                        totalLabel="Total Masa Pasiva"
                        totalValue={data.totalLiabilities}
                    />

                    <HierarchicalFinancialTable
                        title="Patrimonio"
                        nodes={equityTree}
                        totalLabel="Total Patrimonio Líquido"
                        totalValue={data.totalEquity + data.netIncome}
                    />

                    {/* Finalization Footer */}
                    <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-10 shadow-active relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                            <Scale className="h-20 w-20" />
                        </div>
                        <div className="flex items-center gap-8 relative z-10">
                            <div className="h-14 w-14 bg-white/10 rounded-3xl flex items-center justify-center text-white backdrop-blur-md shadow-inner border border-white/10 rotate-12 transition-transform group-hover:rotate-0">
                                <ShieldCheck className="h-8 w-8" />
                            </div>
                            <div className="space-y-1">
                                <h5 className="text-xl font-black italic tracking-tighter uppercase leading-none">Cierre de Periodo Fiscal</h5>
                                <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.4em]">Auditado: Generado automáticamente por GVM-CORE-v3</p>
                            </div>
                        </div>
                        <Button variant="outline" className="h-14 bg-white/5 border-white/10 text-white text-[10px] font-black uppercase tracking-widest px-10 hover:bg-white hover:text-slate-900 transition-all rounded-2xl relative z-10">
                            Auditoría Detallada <ArrowRight className="ml-4 h-4 w-4" />
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
}
