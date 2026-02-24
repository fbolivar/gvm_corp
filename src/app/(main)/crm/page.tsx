import { createClient } from '@/lib/supabase/server';
import { crmService } from '@/features/crm/services/crmService';
import { redirect } from 'next/navigation';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { settingsService } from '@/features/settings/services/settingsService';
import { CRMInsightsDashboard } from '@/features/crm/components/CRMInsightsDashboard';
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import Link from "next/link"
import {
    Plus,
    Sparkles,
    Target,
    Activity,
    LayoutDashboard
} from "lucide-react"

export default async function CRMDashboard() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [stats, tenant] = await Promise.all([
        crmService.getDashboardStats(supabase),
        settingsService.getTenantInfo(supabase)
    ]);

    return (
        <div className="page-container space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 💎 PREMIUM HEADER INDUSTRIAL V3 */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[4rem] p-12 md:p-24 text-white shadow-active border border-white/5 mx-6 mt-6">
                {/* Decorative Layers */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-125 group-hover:rotate-12 transition-all duration-[2000ms]">
                    <Target className="h-[25rem] w-[25rem] text-primary" />
                </div>
                <div className="absolute -bottom-24 -left-24 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform duration-[3000ms]">
                    <Activity className="h-[40rem] w-[40rem]" />
                </div>

                {/* Scanline Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-transparent h-1 w-full animate-scanline pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-16">
                    <div className="space-y-8">
                        <div className="flex items-center gap-6">
                            <div className="h-14 w-14 bg-indigo-500 rounded-[1.5rem] flex items-center justify-center text-slate-950 shadow-active rotate-6 group-hover:rotate-0 transition-all duration-700">
                                <Sparkles className="h-8 w-8" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black uppercase tracking-[0.6em] text-indigo-500 italic">Terminal de Inteligencia CRM v3.2</span>
                                <div className="h-1 w-20 bg-indigo-500/40 rounded-full mt-2" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h1 className="text-7xl md:text-9xl font-black tracking-tighter italic uppercase leading-[0.8] mb-4">
                                Centro de <br /><span className="text-slate-600">Inteligencia</span>
                            </h1>
                            <div className="flex flex-wrap items-center gap-8">
                                <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-full border border-white/10 backdrop-blur-3xl shadow-active group/metric">
                                    <Target className="h-4 w-4 text-indigo-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-white/80 uppercase tracking-[0.3em] italic">Pipeline Saludable: 94.2%</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-slate-500 font-black text-[11px] uppercase tracking-[0.5em] italic">Estrategia Comercial • 2026</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-8 w-full lg:w-auto">
                        <Button variant="ghost" asChild className="h-28 flex-1 lg:flex-none px-12 rounded-[2.5rem] border border-white/10 bg-white/5 hover:bg-white/10 text-white font-black hover:scale-105 transition-all shadow-active active:scale-95 group/btn relative overflow-hidden">
                            <Link href="/crm/pipeline" className="flex items-center gap-6">
                                <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-indigo-500 to-transparent translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                                <div className="h-16 w-16 rounded-2xl bg-white/5 flex items-center justify-center text-indigo-500 group-hover/btn:scale-110 transition-transform relative z-10 border border-white/5">
                                    <LayoutDashboard className="h-8 w-8" />
                                </div>
                                <div className="flex flex-col items-start leading-none text-left relative z-10">
                                    <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500 mb-2 font-black italic">ESTRATEGIA</span>
                                    <span className="text-2xl uppercase tracking-tighter italic font-black">PIPELINE</span>
                                </div>
                            </Link>
                        </Button>
                        <Button asChild className="h-28 flex-1 lg:flex-none px-14 rounded-[2.5rem] bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black shadow-active transition-all hover:scale-105 active:scale-95 border-none group/action relative overflow-hidden">
                            <Link href="/crm/leads/new" className="flex items-center gap-6">
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/action:translate-y-0 transition-transform duration-500" />
                                <div className="h-16 w-16 rounded-2xl bg-slate-950/20 flex items-center justify-center group-hover/action:scale-110 transition-transform relative z-10">
                                    <Plus className="h-10 w-10" />
                                </div>
                                <div className="flex flex-col items-start leading-none text-left relative z-10">
                                    <span className="text-[10px] uppercase tracking-[0.3em] text-slate-950/60 mb-2 font-black italic">PROSPECCIÓN</span>
                                    <span className="text-2xl uppercase tracking-tighter italic font-black">NUEVO LEAD</span>
                                </div>
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* 📈 DASHBOARD VISUAL (Client Component) */}
            <div className="px-6">
                <CRMInsightsDashboard stats={stats} />
            </div>

            {/* 🛡️ AUDIT FOOTER INDUSTRIAL V3 */}
            <div className="px-6 mb-12">
                <div className="bg-slate-950 p-16 rounded-[4.5rem] text-white flex flex-col lg:flex-row items-center justify-between gap-12 shadow-active relative overflow-hidden group border border-white/5">
                    {/* Background decoration */}
                    <div className="absolute inset-0 opacity-[0.02] bg-grid-white pointer-events-none" />

                    <div className="flex flex-col lg:flex-row items-center gap-12 relative z-10 w-full lg:w-auto">
                        <div className="h-24 w-24 bg-white/5 p-4 rounded-[2rem] border border-white/10 flex items-center justify-center group-hover:rotate-[360deg] transition-transform duration-[2000ms] shadow-active">
                            <Target className="h-12 w-12 text-primary animate-pulse" />
                        </div>
                        <div className="space-y-3 text-center lg:text-left">
                            <h4 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Blindaje de Prospección</h4>
                            <p className="text-slate-500 font-extrabold text-[11px] uppercase tracking-[0.6em] italic">Cada contacto y oportunidad está blindado bajo el Protocolo Habeas Data v3.2.</p>
                        </div>
                    </div>

                    <div className="relative z-10 flex flex-wrap justify-center gap-8">
                        <div className="flex flex-col items-center lg:items-end">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2 italic">ESTADO DEL NODO</span>
                            <Badge className="bg-primary/20 text-primary border border-primary/30 px-8 py-2.5 rounded-full font-black text-[11px] uppercase tracking-[0.5em] italic shadow-active animate-pulse">
                                SISTEMA ÍNTEGRO
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
