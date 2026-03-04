import { createClient } from '@/lib/supabase/server';
import { fiscalPeriodService, CHECKLIST_ITEMS } from '@/features/accounting/services/fiscalPeriodService';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { PeriodCloseClient } from './PeriodCloseClient';
import { CalendarRange, CheckCircle, Lock, Clock } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function PeriodClosePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [allPeriods, tenant] = await Promise.all([
        fiscalPeriodService.getAll(supabase),
        settingsService.getTenantInfo(supabase),
    ]);

    const periodsWithItems = await Promise.all(
        allPeriods.map(async period => {
            try {
                return await fiscalPeriodService.getWithItems(supabase, period.id);
            } catch {
                return { period, items: [] };
            }
        })
    );

    const closedCount = allPeriods.filter(p => p.status === 'CLOSED').length;
    const openCount = allPeriods.filter(p => p.status === 'OPEN').length;
    const closingCount = allPeriods.filter(p => p.status === 'CLOSING').length;

    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in duration-500">

            <VisualReportHeader
                title="Cierre Contable"
                subtitle="Verificación y bloqueo de períodos fiscales"
                tenant={tenant}
            />

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Períodos', value: allPeriods.length, icon: CalendarRange, color: 'text-slate-600', bg: 'bg-slate-100' },
                    { label: 'Abiertos', value: openCount, icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'En Proceso', value: closingCount, icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Cerrados', value: closedCount, icon: Lock, color: 'text-rose-600', bg: 'bg-rose-50' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg} ${kpi.color}`}>
                            <kpi.icon className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                            <p className="text-xl font-bold text-slate-900 tracking-tight">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <PeriodCloseClient periods={periodsWithItems} />
        </div>
    );
}
