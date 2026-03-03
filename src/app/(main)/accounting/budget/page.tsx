import { createClient } from '@/lib/supabase/server';
import { budgetService } from '@/features/accounting/services/budgetService';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Plus, BarChart3, ArrowRight, CheckCircle, Clock, Lock } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function BudgetsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const budgets = await budgetService.getAll(supabase);

    const STATUS_MAP = {
        DRAFT:    { label: 'Borrador',  color: 'bg-slate-100 text-slate-600',     icon: Clock },
        APPROVED: { label: 'Aprobado',  color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
        CLOSED:   { label: 'Cerrado',   color: 'bg-rose-100 text-rose-700',       icon: Lock },
    };

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* HEADER */}
            <div className="relative overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active group">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <BarChart3 className="h-24 w-24 text-white" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-8 bg-indigo-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Control de Gestión</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                            Presupuesto<br /><span className="text-slate-500">Anual</span>
                        </h1>
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">
                            Planificación financiera · Real vs. Presupuestado por mes
                        </p>
                    </div>
                    <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest h-14 px-10 rounded-2xl shadow-active" asChild>
                        <Link href="/accounting/budget/new"><Plus className="h-4 w-4 mr-2" />Nuevo Presupuesto</Link>
                    </Button>
                </div>
            </div>

            {/* LIST */}
            {budgets.length === 0 ? (
                <div className="py-32 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center gap-6">
                    <BarChart3 className="h-16 w-16 text-slate-200" />
                    <div className="space-y-2">
                        <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Sin Presupuestos</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Cree su primer presupuesto anual para comenzar el control financiero</p>
                    </div>
                    <Button className="bg-slate-900 hover:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest h-14 px-10 rounded-2xl shadow-active" asChild>
                        <Link href="/accounting/budget/new">Crear Presupuesto</Link>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {budgets.map(b => {
                        const si = STATUS_MAP[b.status];
                        const Icon = si.icon;
                        return (
                            <Link key={b.id} href={`/accounting/budget/${b.id}`} className="group bg-white rounded-[2.5rem] p-10 shadow-premium border border-transparent hover:border-indigo-100 hover:shadow-active hover:translate-y-[-4px] transition-all duration-500 block">
                                <div className="flex items-start justify-between mb-8">
                                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                        <BarChart3 className="h-7 w-7" />
                                    </div>
                                    <Badge className={`border-none text-[8px] font-black uppercase tracking-widest rounded-full px-3 ${si.color}`}>
                                        <Icon className="h-3 w-3 mr-1 inline" />{si.label}
                                    </Badge>
                                </div>
                                <div className="space-y-1 mb-8">
                                    <h3 className="text-xl font-black text-slate-900 italic tracking-tighter group-hover:text-indigo-600 transition-colors">{b.name}</h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Año fiscal {b.year}</p>
                                    {b.notes && <p className="text-xs text-slate-400 mt-1">{b.notes}</p>}
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{new Date(b.created_at).toLocaleDateString('es-CO')}</p>
                                    <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
