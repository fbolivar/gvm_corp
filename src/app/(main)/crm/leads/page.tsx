import { createClient } from '@/lib/supabase/server';
import { crmService } from '@/features/crm/services/crmService';
import { LeadViewManager } from '@/features/crm/components/LeadViewManager';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Plus, Users, Sparkles, Target, Activity, Search, Filter, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { settingsService } from '@/features/settings/services/settingsService';

export default async function LeadsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [leads, tenant] = await Promise.all([
        crmService.getLeads(supabase),
        settingsService.getTenantInfo(supabase)
    ]);

    const newLeadsCount = leads.filter(l => l.status === 'NEW').length;
    const conversionRate = leads.length > 0 ? Math.round((leads.filter(l => l.status === 'CONVERTED').length / leads.length) * 100) : 0;

    return (
        <div className="space-y-16 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 🏎️ PREMIUM HEADER INDUSTRIAL V3 */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[4rem] p-12 md:p-24 text-white shadow-active border border-white/5 mx-6 mt-6">
                {/* Decorative Layers */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-125 group-hover:rotate-12 transition-all duration-[2000ms]">
                    <Target className="h-[25rem] w-[25rem] text-indigo-500" />
                </div>
                <div className="absolute -bottom-24 -left-24 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform duration-[3000ms]">
                    <Users className="h-[40rem] w-[40rem]" />
                </div>

                {/* Scanline Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent h-1 w-full animate-scanline pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-16">
                    <div className="space-y-8 max-w-4xl">
                        <div className="flex flex-wrap items-center gap-4">
                            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-6 py-2 text-[10px] font-black uppercase tracking-[0.4em] rounded-full shadow-inner italic">
                                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse mr-3 shadow-[0_0_8px_#6366f1]" />
                                CRM MASTER TERMINAL
                            </Badge>
                            <Badge variant="outline" className="bg-white/5 text-white/40 border-white/10 px-6 py-2 text-[10px] font-black uppercase tracking-[0.4em] rounded-full italic">
                                V3.0 PROSPECCIÓN
                            </Badge>
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-7xl md:text-9xl font-black tracking-tighter italic leading-[0.85] uppercase">
                                Directorio de <br />
                                <span className="text-indigo-500">Prospectos</span>
                            </h1>
                            <p className="text-white/40 text-sm md:text-xl font-black uppercase tracking-[0.4em] italic flex items-center gap-4">
                                <Activity className="h-6 w-6 text-indigo-500 animate-pulse" />
                                Gestión Maestra de Leads & Calificación
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-10 pt-4">
                            <div className="flex items-center gap-4">
                                <div className="h-4 w-4 rounded-full bg-emerald-500 shadow-[0_0_15px_#10b981]" />
                                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60 italic">SISTEMA ÍNTEGRO</span>
                            </div>
                            {tenant?.name && (
                                <div className="flex items-center gap-4">
                                    <div className="h-4 w-4 bg-white/20 rounded-full" />
                                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60 italic">{tenant.name}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
                        <div className="relative group/search w-full sm:w-[350px]">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 p-2 bg-white/10 rounded-xl text-indigo-400 shadow-inner group-hover/search:bg-indigo-500 group-hover/search:text-white transition-all duration-500">
                                <Search className="h-4 w-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="ORDEN DE BÚSQUEDA..."
                                className="w-full bg-white/5 border border-white/10 rounded-[2rem] h-20 pl-20 pr-8 text-[11px] font-black uppercase tracking-[0.4em] text-white focus:ring-4 focus:ring-indigo-500/20 focus:bg-white/10 focus:border-indigo-500/40 transition-all placeholder:text-white/20 shadow-inner"
                            />
                        </div>

                        <Button asChild className="h-20 px-12 rounded-[2rem] bg-indigo-600 hover:bg-white hover:text-slate-950 text-white font-black italic uppercase tracking-[0.2em] transform transition-all duration-500 hover:scale-105 active:scale-95 shadow-active group/btn border-none whitespace-nowrap">
                            <Link href="/crm/leads/new" className="flex items-center gap-6">
                                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center group-hover/btn:bg-slate-950/10 transition-all">
                                    <Plus className="h-6 w-6" />
                                </div>
                                REGISTRAR PROSPECTO
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* 📊 INDUSTRIAL SUMMARY GRID V3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 px-6">
                <Card className="border border-slate-100 bg-white shadow-premium rounded-[3.5rem] group hover:-translate-y-3 transition-all duration-700 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-125 transition-transform duration-1000">
                        <Users className="h-24 w-24 text-indigo-600" />
                    </div>
                    <CardContent className="p-10 space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="h-16 w-16 rounded-[1.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner group-hover:rotate-12 transition-all duration-700">
                                <Users className="h-8 w-8" />
                            </div>
                            <Badge className="bg-slate-950 text-white border-none font-black text-[10px] tracking-[0.3em] px-4 py-1 rounded-full italic leading-none">GLOBAL</Badge>
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2 italic">Captura Total de Leads</p>
                            <h3 className="text-6xl font-black text-slate-950 tracking-tighter italic leading-none">{leads.length}</h3>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100/50">
                            <div className="h-full w-full bg-indigo-500 rounded-full shadow-[0_0_12px_theme(colors.indigo.500/40)]" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-100 bg-white shadow-premium rounded-[3.5rem] group hover:-translate-y-3 transition-all duration-700 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-125 transition-transform duration-1000">
                        <Sparkles className="h-24 w-24 text-amber-600" />
                    </div>
                    <CardContent className="p-10 space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="h-16 w-16 rounded-[1.5rem] bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner group-hover:-rotate-12 transition-all duration-700">
                                <Sparkles className="h-8 w-8" />
                            </div>
                            <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-black text-[10px] tracking-[0.3em] px-4 py-1 rounded-full italic animate-pulse">ALTA PRIORIDAD</Badge>
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2 italic">Nuevos / 24 Horas</p>
                            <h3 className="text-6xl font-black text-slate-950 tracking-tighter italic leading-none">{newLeadsCount}</h3>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100/50">
                            <div className="h-full w-1/4 bg-amber-500 rounded-full shadow-[0_0_12px_theme(colors.amber.500/40)]" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-100 bg-white shadow-premium rounded-[3.5rem] group hover:-translate-y-3 transition-all duration-700 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-125 transition-transform duration-1000">
                        <Activity className="h-24 w-24 text-emerald-600" />
                    </div>
                    <CardContent className="p-10 space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="h-16 w-16 rounded-[1.5rem] bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner group-hover:rotate-12 transition-all duration-700">
                                <Activity className="h-8 w-8" />
                            </div>
                            <Badge className="bg-indigo-50 text-indigo-600 border border-indigo-100 font-black text-[10px] tracking-[0.3em] px-4 py-1 rounded-full italic">EFICIENCIA</Badge>
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2 italic">Tasa de Conversión</p>
                            <h3 className="text-6xl font-black text-slate-950 tracking-tighter italic leading-none">{conversionRate}%</h3>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100/50">
                            <div className="h-full w-2/3 bg-emerald-500 rounded-full shadow-[0_0_12px_theme(colors.emerald.500/40)]" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 📋 LISTADO DE LEADS INDUSTRIAL V3 */}
            <div className="px-6 space-y-12">
                <div className="flex items-center gap-6 px-4">
                    <div className="h-14 w-14 bg-slate-950 rounded-[1.5rem] flex items-center justify-center text-white shadow-active rotate-3">
                        <Users className="h-7 w-7 text-indigo-400" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-4xl font-black text-slate-950 tracking-tighter italic uppercase leading-none">Entidades en Prospección</h3>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.6em] italic">REGISTRO ACCIONABLE DE POTENCIALES CLIENTES</p>
                    </div>
                    <div className="ml-auto flex items-center gap-4">
                        <Button variant="outline" className="h-14 px-8 rounded-2xl border-slate-100 bg-white text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] hover:bg-slate-950 hover:text-white transition-all shadow-premium italic group/filter">
                            <Filter className="h-4 w-4 mr-4 group-hover/filter:rotate-180 transition-transform" /> FILTRAR DATA
                        </Button>
                    </div>
                </div>

                <Card className="border-none shadow-premium bg-white rounded-[4rem] overflow-hidden p-6 relative">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.01] pointer-events-none">
                        <Target className="h-64 w-64" />
                    </div>
                    <LeadViewManager leads={leads} />
                </Card>
            </div>

            {/* 🛡️ AUDIT FOOTER INDUSTRIAL V3 - PROTOCOLO DE PRIVACIDAD */}
            <div className="px-6">
                <div className="bg-slate-950 p-16 rounded-[4.5rem] text-white flex flex-col lg:flex-row items-center justify-between gap-12 shadow-active relative overflow-hidden group border border-white/5">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none group-hover:scale-125 transition-transform duration-[3000ms]">
                        <Target className="h-[20rem] w-[20rem] text-indigo-500" />
                    </div>
                    <div className="absolute -bottom-12 -left-12 p-12 opacity-[0.03] pointer-events-none">
                        <Sparkles className="h-[15rem] w-[15rem] text-white" />
                    </div>

                    <div className="flex items-center gap-10 relative z-10 text-center lg:text-left flex-col lg:flex-row max-w-4xl">
                        <div className="h-24 w-24 bg-white/10 rounded-[2rem] flex items-center justify-center text-white border border-white/10 shadow-inner group-hover:rotate-12 transition-transform duration-700 shrink-0">
                            <Sparkles className="h-12 w-12 text-indigo-400 animate-pulse" />
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 justify-center lg:justify-start">
                                <div className="h-1.5 w-12 bg-indigo-500 rounded-full" />
                                <h4 className="text-3xl font-black italic tracking-tighter uppercase leading-none text-white">Cumplimiento Habeas Data</h4>
                            </div>
                            <p className="text-sm text-white/40 leading-relaxed font-black uppercase tracking-widest italic">
                                Este directorio contiene información sensible. El manejo de estos datos está regido por la política de protección de datos de <span className="text-indigo-400 font-bold underline decoration-indigo-500/30">{tenant?.name}</span>. SISTEMA AUDITADO EN TIEMPO REAL.
                            </p>
                        </div>
                    </div>

                    <Button variant="outline" className="h-20 bg-white/5 border-white/10 text-white text-[11px] font-black uppercase tracking-[0.4em] px-12 hover:bg-white hover:text-slate-950 transition-all rounded-[2rem] relative z-10 shadow-active italic group/audit shrink-0">
                        Protocolo de Privacidad <ArrowRight className="ml-4 h-5 w-5 group-hover:translate-x-3 transition-transform" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
