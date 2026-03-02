import { createClient } from '@/lib/supabase/server';
import { recurringInvoiceService } from '@/features/sales/services/recurringInvoiceService';
import { RecurringInvoiceList } from '@/features/sales/components/RecurringInvoiceList';
import { Button } from '@/shared/components/ui/button';
import { Plus, RefreshCw, Activity, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function RecurringInvoicesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const items = await recurringInvoiceService.getAll(supabase);

    const active    = items.filter(i => i.status === 'ACTIVE').length;
    const paused    = items.filter(i => i.status === 'PAUSED').length;
    const nextRun   = items
        .filter(i => i.status === 'ACTIVE')
        .sort((a, b) => a.next_run_date.localeCompare(b.next_run_date))[0]?.next_run_date ?? '—';

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* 💜 HEADER */}
            <div className="relative overflow-hidden bg-slate-950 rounded-[4rem] p-16 text-white shadow-active group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <RefreshCw className="h-64 w-64 text-white" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-8 bg-indigo-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Facturación Automatizada</span>
                        </div>
                        <h1 className="text-6xl md:text-7xl font-black tracking-tighter italic uppercase leading-[0.85]">
                            Facturas<br /><span className="text-slate-500">Recurrentes</span>
                        </h1>
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] max-w-sm">
                            Configure plantillas de facturación automática por frecuencia
                        </p>
                    </div>
                    <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest h-14 px-10 rounded-2xl shadow-active" asChild>
                        <Link href="/sales/recurring/new"><Plus className="h-4 w-4 mr-2" />Nueva Recurrencia</Link>
                    </Button>
                </div>
            </div>

            {/* KPI CHIPS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-premium flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                        <Activity className="h-7 w-7" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Activas</p>
                        <p className="text-4xl font-black text-slate-900 italic tracking-tighter">{active}</p>
                    </div>
                </div>
                <div className="bg-white rounded-[2.5rem] p-8 shadow-premium flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                        <Clock className="h-7 w-7" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pausadas</p>
                        <p className="text-4xl font-black text-slate-900 italic tracking-tighter">{paused}</p>
                    </div>
                </div>
                <div className="bg-white rounded-[2.5rem] p-8 shadow-premium flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                        <CheckCircle className="h-7 w-7" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Próxima Ejecución</p>
                        <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{nextRun}</p>
                    </div>
                </div>
            </div>

            {/* LIST */}
            <RecurringInvoiceList initialItems={items} />
        </div>
    );
}
