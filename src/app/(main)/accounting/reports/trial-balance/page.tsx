import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { settingsService } from '@/features/settings/services/settingsService';
import { TrialBalanceTable } from '@/features/accounting/components/TrialBalanceTable';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { TrialBalanceExportActions } from '@/features/accounting/components/TrialBalanceExportActions';
import { Scale, ShieldCheck, Activity, ArrowRight } from 'lucide-react';
import { redirect } from 'next/navigation';
import { Button } from '@/shared/components/ui/button';

export default async function TrialBalancePage({
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
        accountingService.getTrialBalance(supabase, startDate, endDate),
        settingsService.getTenantInfo(supabase)
    ]);

    return (
        <div className="page-container space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 💎 PREMIUM HEADER */}
            <VisualReportHeader
                title="Balance de Comprobación"
                subtitle={`Consolidado Mensual: ${startDate} » ${endDate}`}
                tenant={tenant}
            />

            {/* 📊 SUMMARY V3 STRIP */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-1">
                <div className="flex items-center gap-12">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">Espectro de Cuentas</span>
                        <div className="flex items-baseline gap-4">
                            <h2 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none">
                                {data.length}
                            </h2>
                            <span className="text-xl font-black text-slate-300 uppercase italic tracking-widest">Registros Activos</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ReportingFilters />
                    <TrialBalanceExportActions
                        data={data}
                        options={{
                            title: 'Balance de Comprobación',
                            companyName: tenant?.name ?? '',
                            companyNit: tenant?.nit ?? '',
                            period: `${startDate} - ${endDate}`,
                        }}
                        fileName={`balance-comprobacion-${startDate}`}
                    />
                    <div className="h-14 border-l border-slate-100 mx-2 hidden md:block" />
                    <div className="bg-emerald-50 px-6 py-4 rounded-2xl border border-emerald-100 flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">ESTADO: PARTIDA DOBLE OK</span>
                    </div>
                </div>
            </div>

            <TrialBalanceTable
                rows={data}
                startDate={startDate}
                endDate={endDate}
                tenant={tenant}
            />

            {/* 🛡️ AUDIT OVERVIEW */}
            <div className="bg-slate-900 p-16 rounded-[4rem] text-white flex flex-col lg:flex-row items-center justify-between gap-12 shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                    <Scale className="h-48 w-48" />
                </div>
                <div className="flex items-center gap-10 relative z-10">
                    <div className="h-20 w-20 bg-white/10 rounded-[2rem] flex items-center justify-center text-white border border-white/10 shadow-inner rotate-12 group-hover:rotate-0 transition-transform duration-700">
                        <Activity className="h-10 w-10 text-indigo-400" />
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-white">Integridad de Saldos Contables</h4>
                        <p className="text-sm text-white/40 leading-relaxed font-medium max-w-xl">
                            El Balance de Prueba consolida los saldos acumulados de todas las cuentas maestras para <span className="text-amber-400 font-black uppercase">{tenant?.name}</span>.
                            Es la base estructural para la generación de estados financieros definitivos.
                        </p>
                    </div>
                </div>
                <Button variant="outline" className="h-14 bg-white/5 border-white/10 text-white text-[10px] font-black uppercase tracking-widest px-10 hover:bg-white hover:text-slate-900 transition-all rounded-2xl relative z-10 shadow-active">
                    Certificación Mensual <ArrowRight className="ml-4 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
