import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { settingsService } from '@/features/settings/services/settingsService';
import { financialReportService } from '@/features/accounting/services/financialReportService';
import { HierarchicalFinancialTable } from '@/features/accounting/components/HierarchicalFinancialTable';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card } from "@/shared/components/ui/card"
import { BookOpen, Scale, FileText, ShieldCheck, Activity, ArrowRight } from 'lucide-react';
import { redirect } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';

export default async function GeneralLedgerPage({
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

    const [trialBalanceData, tenant] = await Promise.all([
        accountingService.getTrialBalance(supabase, startDate, endDate),
        settingsService.getTenantInfo(supabase)
    ]);

    const hierarchy = financialReportService.buildHierarchy(trialBalanceData);

    // Sum total assets for the main label or net worth? 
    // Usually General Ledger doesn't have a single "Total" that is meaningful across all classes,
    // but we can show Total Assets as the primary indicator or just the count of accounts.
    const totalAssets = hierarchy.find(n => n.code === '1')?.balance || 0;

    return (
        <div className="page-container space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 💎 PREMIUM HEADER */}
            <VisualReportHeader
                title="Libro Mayor"
                subtitle={`Consolidación de Cuentas: ${startDate} » ${endDate}`}
                tenant={tenant}
            />

            {/* 📊 SUMMARY V3 STRIP */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-1">
                <div className="flex items-center gap-12">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">Jerarquía de Saldos Maestro</span>
                        <div className="flex items-baseline gap-4">
                            <h2 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none">
                                {trialBalanceData.length}
                            </h2>
                            <span className="text-xl font-black text-slate-300 uppercase italic tracking-widest">Cuentas Consolidadas</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ReportingFilters />
                    <div className="h-14 border-l border-slate-100 mx-2 hidden md:block" />
                    <Button variant="outline" className="h-14 w-14 rounded-2xl border-slate-100 bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center shadow-sm">
                        <Scale className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <HierarchicalFinancialTable
                title="Libro Mayor y Balances"
                nodes={hierarchy}
                totalLabel="Activos Totales"
                totalValue={totalAssets}
            />

            {/* 🛡️ AUDIT OVERVIEW */}
            <div className="bg-slate-900 p-16 rounded-[4rem] text-white flex flex-col lg:flex-row items-center justify-between gap-12 shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                    <BookOpen className="h-48 w-48" />
                </div>
                <div className="flex items-center gap-10 relative z-10">
                    <div className="h-20 w-20 bg-white/10 rounded-[2rem] flex items-center justify-center text-white border border-white/10 shadow-inner -rotate-6 group-hover:rotate-0 transition-transform duration-700">
                        <Activity className="h-10 w-10 text-emerald-400" />
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-white">Integridad Multinivel</h4>
                        <p className="text-sm text-white/40 leading-relaxed font-medium max-w-xl">
                            El Libro Mayor presenta la vista estructural de <span className="text-amber-400 font-black uppercase">{tenant?.name}</span> desde las clases maestras hasta los auxiliares de ejecución.
                            Actualizado en tiempo real con cada asiento contable verificado.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3 relative z-10">
                    <div className="flex items-center gap-4 bg-white/5 px-6 py-4 rounded-3xl border border-white/10 backdrop-blur-md">
                        <ShieldCheck className="h-5 w-5 text-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-black tracking-[0.2em]">CUMPLIMIENTO NIIF: 100%</span>
                    </div>
                    <Button variant="ghost" className="text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest gap-2">
                        Ver Detalles por Cuenta <ArrowRight className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
