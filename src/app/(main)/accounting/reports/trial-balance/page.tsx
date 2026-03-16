import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { dimensionService } from '@/features/accounting/services/dimensionService';
import { settingsService } from '@/features/settings/services/settingsService';
import { TrialBalanceTable } from '@/features/accounting/components/TrialBalanceTable';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { TrialBalanceExportActions } from '@/features/accounting/components/TrialBalanceExportActions';
import { ShieldCheck, Info, Layers } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function TrialBalancePage({
    searchParams
}: {
    searchParams: Promise<{ startDate?: string; endDate?: string; dimension?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const startDate = params.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = params.endDate || new Date().toISOString().split('T')[0];
    const dimensionValueId = params.dimension || undefined;

    const [data, tenant, dimensions] = await Promise.all([
        accountingService.getTrialBalance(supabase, startDate, endDate, dimensionValueId),
        settingsService.getTenantInfo(supabase),
        dimensionService.getDimensionOptions(supabase),
    ]);

    const totalDebit = data.reduce((s, r) => s + (r.debit || 0), 0);
    const totalCredit = data.reduce((s, r) => s + (r.credit || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

    // Resolve the selected dimension value label for display
    let activeDimensionLabel: string | null = null;
    if (dimensionValueId) {
        for (const { dimension, values } of dimensions) {
            const found = values.find(v => v.id === dimensionValueId);
            if (found) {
                activeDimensionLabel = `${dimension.name} / ${found.name}`;
                break;
            }
        }
    }

    const exportData = data.map(r => ({
        code: r.code,
        name: r.name,
        initial_balance: 0,
        debits: r.debit,
        credits: r.credit,
        final_balance: r.balance,
    }));

    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in duration-500">

            <VisualReportHeader
                title="Balance de Comprobación"
                subtitle={`${startDate} — ${endDate}`}
                tenant={tenant}
            />

            {/* Summary + Filters + Export */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="flex items-center gap-8">
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cuentas Activas</p>
                        <div className="flex items-baseline gap-3">
                            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                                {data.length}
                            </h2>
                            <span className="text-sm font-medium text-slate-400">registros</span>
                        </div>
                    </div>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${isBalanced ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                        <ShieldCheck className={`h-4 w-4 ${isBalanced ? 'text-emerald-500' : 'text-rose-500'}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isBalanced ? 'PARTIDA DOBLE OK' : 'DESCUADRE DETECTADO'}
                        </span>
                    </div>
                    {activeDimensionLabel && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-violet-50 border-violet-100">
                            <Layers className="h-4 w-4 text-violet-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
                                {activeDimensionLabel}
                            </span>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <ReportingFilters dimensions={dimensions} />
                    <TrialBalanceExportActions
                        data={exportData}
                        options={{
                            title: 'Balance de Comprobación',
                            companyName: tenant?.name ?? '',
                            companyNit: tenant?.nit ?? '',
                            period: `${startDate} - ${endDate}`,
                        }}
                        fileName={`balance-comprobacion-${startDate}`}
                    />
                </div>
            </div>

            <TrialBalanceTable
                rows={data}
                startDate={startDate}
                endDate={endDate}
                tenant={tenant}
            />

            {/* Footnote */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center gap-4">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-300 shadow-sm shrink-0">
                    <Info className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-xs font-semibold text-slate-600">Integridad de Saldos Contables</p>
                    <p className="text-[10px] text-slate-400">
                        Consolidación de saldos acumulados para <span className="text-indigo-500 font-medium">{tenant?.name}</span> — Ciclo Fiscal {new Date().getFullYear()}
                        {activeDimensionLabel && (
                            <> — filtrado por dimensión <span className="text-violet-500 font-medium">{activeDimensionLabel}</span></>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
