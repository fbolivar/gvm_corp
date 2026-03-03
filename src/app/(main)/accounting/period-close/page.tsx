import { createClient } from '@/lib/supabase/server';
import { fiscalPeriodService, CHECKLIST_ITEMS } from '@/features/accounting/services/fiscalPeriodService';
import { PeriodCloseClient } from './PeriodCloseClient';
import { CalendarRange, CheckCircle, Lock, Clock } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function PeriodClosePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const allPeriods = await fiscalPeriodService.getAll(supabase);

    // Fetch checklist items for each period
    const periodsWithItems = await Promise.all(
        allPeriods.map(async period => {
            try {
                const result = await fiscalPeriodService.getWithItems(supabase, period.id);
                return result;
            } catch {
                return { period, items: [] };
            }
        })
    );

    const closedCount  = allPeriods.filter(p => p.status === 'CLOSED').length;
    const openCount    = allPeriods.filter(p => p.status === 'OPEN').length;
    const closingCount = allPeriods.filter(p => p.status === 'CLOSING').length;
    const totalItems   = allPeriods.length * CHECKLIST_ITEMS.length;

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* 🔒 HEADER */}
            <div className="relative overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <CalendarRange className="h-24 w-24 text-white" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-2 w-8 bg-rose-500 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-rose-400">Gobernanza Contable</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight uppercase leading-tight mb-4">
                        Cierre<br /><span className="text-slate-500">Contable</span>
                    </h1>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] max-w-lg">
                        Protocolo de verificación y bloqueo de períodos fiscales
                    </p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Períodos', value: allPeriods.length, icon: CalendarRange, color: 'text-slate-600', bg: 'bg-slate-100' },
                    { label: 'Abiertos',       value: openCount,          icon: Clock,         color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'En Proceso',     value: closingCount,       icon: CheckCircle,   color: 'text-amber-600',   bg: 'bg-amber-50' },
                    { label: 'Cerrados',       value: closedCount,        icon: Lock,          color: 'text-rose-600',    bg: 'bg-rose-50' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-[2.5rem] p-7 shadow-premium flex items-center gap-5">
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${kpi.bg} ${kpi.color}`}>
                            <kpi.icon className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                            <p className="text-3xl font-black text-slate-900 italic tracking-tighter">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main interactive panel */}
            <PeriodCloseClient periods={periodsWithItems} />
        </div>
    );
}
