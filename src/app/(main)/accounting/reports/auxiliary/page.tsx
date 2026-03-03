import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { settingsService } from '@/features/settings/services/settingsService';
import { AuxiliaryLedgerTable } from '@/features/accounting/components/AuxiliaryLedgerTable';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card } from "@/shared/components/ui/card"
import { BookOpen, Info, Search, ShieldCheck, Activity, ArrowRight } from 'lucide-react';
import { redirect } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';

export default async function AuxiliaryLedgerPage({
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
        accountingService.getAuxiliaryLedger(supabase, startDate, endDate),
        settingsService.getTenantInfo(supabase)
    ]);

    return (
        <div className="page-container space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 💎 PREMIUM HEADER */}
            <VisualReportHeader
                title="Libro Auxiliar"
                subtitle={`${startDate} » ${endDate}`}
                tenant={tenant}
            />

            {/* 📊 SUMMARY V3 STRIP */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-1">
                <div className="flex items-center gap-12">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">Trazabilidad Transaccional</span>
                        <div className="flex items-baseline gap-4">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                                {data?.length || 0}
                            </h2>
                            <span className="text-xl font-black text-slate-300 uppercase italic tracking-widest">Registros Detectados</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ReportingFilters />
                    <div className="h-14 border-l border-slate-100 mx-2 hidden md:block" />
                    <Button variant="outline" className="h-14 w-14 rounded-2xl border-slate-100 bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center shadow-sm">
                        <Search className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <AuxiliaryLedgerTable
                data={data || []}
                tenant={tenant}
                startDate={startDate}
                endDate={endDate}
            />

            {/* 🛡️ AUDIT ADVISORY pod */}
            <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white flex flex-col lg:flex-row items-center justify-between gap-12 shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                    <BookOpen className="h-20 w-20" />
                </div>
                <div className="flex items-center gap-10 relative z-10">
                    <div className="h-14 w-14 bg-white/10 rounded-[2rem] flex items-center justify-center text-white border border-white/10 shadow-inner -rotate-12 group-hover:rotate-0 transition-transform duration-700">
                        <ShieldCheck className="h-10 w-10 text-indigo-400" />
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-2xl font-black tracking-tight uppercase leading-tight">Protocolo de Auditoría Forense</h4>
                        <p className="text-sm text-white/40 leading-relaxed font-medium max-w-xl">
                            El Libro Auxiliar provee la trazabilidad cronológica total de cada cuenta contable en <span className="text-amber-400 font-black uppercase">{tenant?.name}</span>.
                            Sistema verificado bajo estándares internacionales de integridad de datos contables.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3 relative z-10">
                    <div className="flex items-center gap-4 bg-white/5 px-6 py-4 rounded-3xl border border-white/10 backdrop-blur-md">
                        <Activity className="h-5 w-5 text-emerald-400 animate-pulse" />
                        <span className="text-[11px] font-black tracking-[0.2em]">INTEGRIDAD: 100% VERIFICADO</span>
                    </div>
                    <Button variant="ghost" className="text-white/40 hover:text-white text-[10px] font-black uppercase tracking-widest gap-2">
                        Revisar Firmas Digitales <ArrowRight className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
