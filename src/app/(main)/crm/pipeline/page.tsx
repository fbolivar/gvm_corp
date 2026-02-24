import { createClient } from "@/lib/supabase/server"
import { crmService } from "@/features/crm/services/crmService"
import { PipelineViewManager } from "@/features/crm/components/PipelineViewManager"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Plus, TrendingUp, Target, Zap, Activity, ShieldCheck, ArrowRight } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader'
import { settingsService } from "@/features/settings/services/settingsService"

export default async function PipelinePage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [opportunities, tenant] = await Promise.all([
        crmService.getOpportunities(supabase),
        settingsService.getTenantInfo(supabase)
    ]);

    const totalPipelineValue = opportunities.reduce((acc: number, curr: any) => acc + (curr.value || 0), 0);
    const winRate = opportunities.length > 0 ? (opportunities.filter(o => o.stage === 'CLOSED_WON').length / opportunities.length) * 100 : 0;

    return (
        <div className="space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 🏎️ PREMIUM HEADER INDUSTRIAL V3 */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[4rem] p-12 md:p-24 text-white shadow-active border border-white/5 mx-6 mt-6">
                {/* Decorative Layers */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-125 group-hover:rotate-12 transition-all duration-[2000ms]">
                    <Target className="h-[25rem] w-[25rem] text-indigo-500" />
                </div>
                <div className="absolute -bottom-24 -left-24 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform duration-[3000ms]">
                    <TrendingUp className="h-[40rem] w-[40rem]" />
                </div>

                {/* Scanline Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent h-1 w-full animate-scanline pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-16">
                    <div className="space-y-8 max-w-4xl">
                        <div className="flex flex-wrap items-center gap-4">
                            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-6 py-2 text-[10px] font-black uppercase tracking-[0.4em] rounded-full shadow-inner italic">
                                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse mr-3 shadow-[0_0_8px_#6366f1]" />
                                PIPELINE DE COMANDO
                            </Badge>
                            <Badge variant="outline" className="bg-white/5 text-white/40 border-white/10 px-6 py-2 text-[10px] font-black uppercase tracking-[0.4em] rounded-full italic">
                                V3.0 COMERCIAL
                            </Badge>
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-7xl md:text-9xl font-black tracking-tighter italic leading-[0.85] uppercase">
                                Pipeline <br />
                                <span className="text-indigo-500">Comercial</span>
                            </h1>
                            <p className="text-white/40 text-sm md:text-xl font-black uppercase tracking-[0.4em] italic flex items-center gap-4">
                                <Activity className="h-6 w-6 text-indigo-500 animate-pulse" />
                                Monitoreo Visual del Flujo de Oportunidades
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-10 pt-4">
                            <div className="flex items-center gap-4">
                                <div className="h-4 w-4 rounded-full bg-emerald-500 shadow-[0_0_15px_#10b981]" />
                                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/60 italic">SISTEMA DETERMINÍSTICO</span>
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
                        <Button asChild className="h-20 px-12 rounded-[2rem] bg-indigo-600 hover:bg-white hover:text-slate-950 text-white font-black italic uppercase tracking-[0.2em] transform transition-all duration-500 hover:scale-105 active:scale-95 shadow-active group/btn border-none whitespace-nowrap">
                            <Link href="/crm/opportunities/new" className="flex items-center gap-6">
                                <Plus className="h-6 w-6 text-indigo-400 group-hover/btn:text-slate-950 transition-colors" />
                                NUEVA OPORTUNIDAD
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* 📊 INDUSTRIAL SUMMARY GRID V3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 px-6">
                <div className="bg-white p-12 rounded-[4rem] shadow-premium border border-slate-50 flex flex-col gap-8 group hover:-translate-y-3 transition-all duration-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:scale-125 transition-transform duration-1000">
                        <Zap className="h-24 w-24 text-indigo-600" />
                    </div>
                    <div className="flex justify-between items-start">
                        <div className="h-16 w-16 bg-slate-950 rounded-[1.5rem] flex items-center justify-center text-white shadow-active rotate-3 group-hover:rotate-0 transition-transform duration-500">
                            <Target className="h-8 w-8 text-indigo-400" />
                        </div>
                        <Badge variant="outline" className="border-slate-100 text-slate-400 font-black text-[10px] tracking-[0.4em] px-4 py-1 rounded-full italic uppercase leading-none mt-2">Nominal</Badge>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] italic leading-none">Capital en Negociación</p>
                        <div className="flex items-baseline gap-4">
                            <h2 className="text-6xl font-black text-slate-950 tracking-tighter italic leading-none">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalPipelineValue)}
                            </h2>
                            <span className="text-xl font-black text-slate-200 uppercase italic tracking-widest leading-none">COP</span>
                        </div>
                    </div>
                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100/50">
                        <div className="h-full w-full bg-indigo-500 rounded-full shadow-[0_0_12px_theme(colors.indigo.500/40)]" />
                    </div>
                </div>

                <div className="bg-white p-12 rounded-[4rem] shadow-premium border border-slate-50 flex flex-col gap-8 group hover:-translate-y-3 transition-all duration-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:scale-125 transition-transform duration-1000">
                        <TrendingUp className="h-24 w-24 text-emerald-600" />
                    </div>
                    <div className="flex justify-between items-start">
                        <div className="h-16 w-16 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center text-emerald-600 shadow-inner group-hover:rotate-12 transition-transform duration-500 border border-emerald-100">
                            <Zap className="h-8 w-8" />
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-black text-[10px] tracking-[0.4em] px-4 py-1 rounded-full italic animate-pulse">ALTO DESEMPEÑO</Badge>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] italic leading-none">Tasa de Exito</p>
                        <h3 className="text-6xl font-black text-slate-950 tracking-tighter italic leading-none">{winRate.toFixed(1)}%</h3>
                    </div>
                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100/50">
                        <div className="h-full w-2/3 bg-emerald-500 rounded-full shadow-[0_0_12px_theme(colors.emerald.500/40)]" />
                    </div>
                </div>

                <div className="bg-slate-950 p-12 rounded-[4.5rem] shadow-active border border-white/5 flex flex-col gap-8 group hover:-translate-y-3 transition-all duration-700 relative overflow-hidden text-white">
                    <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none group-hover:scale-125 transition-transform duration-1000">
                        <Activity className="h-24 w-24 text-indigo-400" />
                    </div>
                    <div className="flex justify-between items-start">
                        <div className="h-16 w-16 bg-white/10 rounded-[1.5rem] flex items-center justify-center text-white border border-white/10 shadow-inner group-hover:rotate-[-12deg] transition-transform duration-500">
                            <Activity className="h-8 w-8 text-indigo-400" />
                        </div>
                        <Badge className="bg-indigo-500 text-white border-none font-black text-[10px] tracking-[0.4em] px-4 py-1 rounded-full italic active:scale-95 transition-all">SINCRO TOTAL</Badge>
                    </div>
                    <div className="space-y-4">
                        <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.5em] italic leading-none">Estado de Flujo</p>
                        <h4 className="text-3xl font-black text-white tracking-tighter italic uppercase leading-tight">Mesa de Comando <br /><span className="text-indigo-400">Sincronizada</span></h4>
                    </div>
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.4em] italic leading-relaxed">
                        Actualización en tiempo real vía <span className="text-white/60">CRM Industrial Node X</span>
                    </p>
                </div>
            </div>

            {/* 📋 GESTION VISUAL DE PIPELINE INDUSTRIAL V3 */}
            <div className="px-6">
                <PipelineViewManager opportunities={opportunities} />
            </div>

            {/* 🛡️ AUDIT FOOTER INDUSTRIAL V3 - CERTIFICACIÓN DE PIPELINE */}
            <div className="px-6">
                <div className="bg-slate-950 p-16 rounded-[4.5rem] text-white flex flex-col lg:flex-row items-center justify-between gap-12 shadow-active relative overflow-hidden group border border-white/5">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none group-hover:scale-125 transition-transform duration-[3000ms]">
                        <Target className="h-[20rem] w-[20rem] text-indigo-500" />
                    </div>
                    <div className="absolute -bottom-12 -left-12 p-12 opacity-[0.03] pointer-events-none">
                        <ShieldCheck className="h-[15rem] w-[15rem] text-white" />
                    </div>

                    <div className="flex items-center gap-10 relative z-10 text-center lg:text-left flex-col lg:flex-row max-w-4xl">
                        <div className="h-24 w-24 bg-white/10 rounded-[2rem] flex items-center justify-center text-white border border-white/10 shadow-inner group-hover:rotate-12 transition-transform duration-700 shrink-0">
                            <ShieldCheck className="h-12 w-12 text-emerald-400 animate-pulse" />
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 justify-center lg:justify-start">
                                <div className="h-1.5 w-12 bg-indigo-500 rounded-full" />
                                <h4 className="text-3xl font-black italic tracking-tighter uppercase leading-none text-white">Certificación de Pipeline Comercial</h4>
                            </div>
                            <p className="text-sm text-white/40 leading-relaxed font-black uppercase tracking-widest italic">
                                Este embudo representa el capital proyectado para <span className="text-indigo-400 font-bold underline decoration-indigo-500/30">{tenant?.name}</span>. SISTEMA AUDITADO EN TIEMPO REAL BAJO PROTOCOLO V3.
                            </p>
                        </div>
                    </div>

                    <Button variant="outline" className="h-20 bg-white/5 border-white/10 text-white text-[11px] font-black uppercase tracking-[0.4em] px-12 hover:bg-white hover:text-slate-950 transition-all rounded-[2rem] relative z-10 shadow-active italic group/audit shrink-0">
                        Protocolo de Cierre <ArrowRight className="ml-4 h-5 w-5 group-hover:translate-x-3 transition-transform" />
                    </Button>
                </div>
            </div>
        </div>
    )
}
