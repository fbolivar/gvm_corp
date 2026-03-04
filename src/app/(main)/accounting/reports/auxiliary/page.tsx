import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { settingsService } from '@/features/settings/services/settingsService';
import { AuxiliaryLedgerTable } from '@/features/accounting/components/AuxiliaryLedgerTable';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Info } from 'lucide-react';
import { redirect } from 'next/navigation';

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
        <div className="page-container space-y-8 pb-20 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Libro Auxiliar"
                subtitle={`${startDate} — ${endDate}`}
                tenant={tenant}
            />

            {/* Summary + Filters */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Movimientos Registrados</p>
                    <div className="flex items-baseline gap-3">
                        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                            {data?.length || 0}
                        </h2>
                        <span className="text-sm font-medium text-slate-400">registros</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <ReportingFilters />
                </div>
            </div>

            <AuxiliaryLedgerTable
                data={data || []}
                tenant={tenant}
                startDate={startDate}
                endDate={endDate}
            />

            {/* Footnote */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center gap-4">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-300 shadow-sm shrink-0">
                    <Info className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs font-semibold text-slate-600">Trazabilidad Transaccional</p>
                    <p className="text-[10px] text-slate-400">
                        Detalle cronológico de cada cuenta contable — <span className="text-indigo-500 font-medium">{tenant?.name}</span> — Ciclo Fiscal {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </div>
    );
}
