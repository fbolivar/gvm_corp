import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { EntryList } from '@/features/accounting/components/EntryList';
import { BookOpen, Calculator, Calendar, Plus, Search, FileText, Layers, Activity } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function EntriesPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const entries = await accountingService.getEntries(supabase, { limit: 100 });

    // Calculate quick stats
    const totalToday = entries.length;
    const totalVolume = entries.reduce((acc, entry) => {
        const debit = entry.lines?.reduce((sum: number, l: any) => sum + Number(l.debit), 0) || 0;
        return acc + debit;
    }, 0);

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* 🛡️ PREMIUM HEADER POD */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-transform duration-1000">
                    <BookOpen className="h-24 w-24" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-10 bg-indigo-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Libro Diario Maestro v3.0</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight mb-2">
                            Asientos <br /><span className="text-slate-400">Contables</span>
                        </h1>
                        <div className="flex items-center gap-4">
                            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.4em]">Trazabilidad Financiera & Auditoría</p>
                            <div className="hidden md:flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                                <Activity className="h-3 w-3 text-indigo-400 animate-pulse" />
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">Balance Estricto Activo</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                        <Button variant="outline" asChild className="h-14 flex-1 md:flex-none px-10 rounded-[2rem] border-none bg-white/5 hover:bg-white/10 text-white font-black hover:scale-105 transition-all active:scale-95 backdrop-blur-md">
                            <Link href="/accounting/reports" className="flex items-center gap-4">
                                <Calculator className="h-6 w-6 text-indigo-500" />
                                <div className="flex flex-col items-start leading-none text-left">
                                    <span className="text-[10px] uppercase tracking-widest opacity-40">Módulo</span>
                                    <span className="text-xs uppercase tracking-widest">Reportes</span>
                                </div>
                            </Link>
                        </Button>
                        <Button asChild className="h-14 flex-1 md:flex-none px-12 rounded-[2rem] bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-active transition-all hover:scale-105 active:scale-95 border-none">
                            <Link href="/accounting/entries/new" className="flex items-center gap-4">
                                <Plus className="h-7 w-7" />
                                <div className="flex flex-col items-start leading-none text-left">
                                    <span className="text-[10px] uppercase tracking-widest opacity-60">Operación</span>
                                    <span className="text-xs uppercase tracking-widest">Nuevo Asiento</span>
                                </div>
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* 📊 INDUSTRIAL STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white rounded-[2.5rem] p-10 shadow-premium flex items-center justify-between group hover:translate-y-[-4px] transition-all border border-slate-50">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Volumen Movimientos</p>
                        <h3 className="text-4xl font-black text-slate-900 italic tracking-tighter">{totalToday}</h3>
                        <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest">Asientos Registrados</p>
                    </div>
                    <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                        <Layers className="h-8 w-8" />
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-10 shadow-premium flex items-center justify-between group hover:translate-y-[-4px] transition-all border border-slate-50">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Flujo Transaccional</p>
                        <h3 className="text-4xl font-black text-slate-900 italic tracking-tighter">
                            ${totalVolume.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </h3>
                        <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Impacto en Débitos</p>
                    </div>
                    <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                        <Calculator className="h-8 w-8" />
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] p-10 shadow-premium flex items-center justify-between group hover:translate-y-[-4px] transition-all border border-slate-50">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Período Fiscal</p>
                        <h3 className="text-4xl font-black text-slate-900 italic tracking-tighter">FEBRERO</h3>
                        <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest">Ejecución 2026</p>
                    </div>
                    <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:bg-amber-50 group-hover:text-amber-600 transition-all">
                        <Calendar className="h-8 w-8" />
                    </div>
                </div>
            </div>

            {/* 📋 LIST CONTAINER */}
            <div className="space-y-8">
                <div className="flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-1 bg-indigo-600 rounded-full" />
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Movimientos Recientes</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-indigo-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="BUSCAR POR DESCRIPCIÓN..."
                                className="h-12 w-64 md:w-80 bg-white rounded-2xl border-none shadow-premium pl-12 pr-6 text-[10px] font-black tracking-widest uppercase focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                            />
                        </div>
                    </div>
                </div>

                <EntryList entries={entries} />
            </div>
        </div>
    );
}
