
import { ExecutiveDashboard } from '@/features/analytics/components/ExecutiveDashboard'
import { dashboardService } from '@/features/dashboard/services/dashboardService'
import { createClient } from '@/lib/supabase/server'
import { ARAgingWidget } from '@/features/dashboard/components/ARAgingWidget'
import { TopProductsWidget } from '@/features/dashboard/components/TopProductsWidget'
import { Metadata } from 'next'
import { TrendingUp, Cpu, PieChart, Zap, Activity, BarChart2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
    title: 'Business Intelligence | SaaS Factory',
    description: 'Tablero de Control Ejecutivo y Análisis de Rentabilidad',
}

export default async function AnalyticsPage() {
    const supabase = await createClient();
    const kpis = await dashboardService.getKPIs(supabase);

    return (
        <div className="page-container space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 🛡️ PREMIUM INDUSTRIAL HEADER */}
            <div className="relative group overflow-hidden bg-slate-900 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-16 text-white shadow-active">
                {/* Decorative Background Icons */}
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-transform duration-1000">
                    <TrendingUp className="h-64 w-64" />
                </div>
                <div className="absolute -bottom-20 -left-20 opacity-[0.05] pointer-events-none">
                    <Cpu className="h-80 w-80" />
                </div>

                <div className="relative z-10 space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-10 bg-indigo-500 rounded-full" />
                            <span className="text-xs font-black uppercase tracking-[0.5em] text-indigo-400">Intelligence Nexus v3.2</span>
                        </div>
                        <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter italic uppercase leading-[0.8] mb-2">
                            Métrica & <br /><span className="text-slate-400 text-3xl sm:text-5xl md:text-7xl">Rentabilidad</span>
                        </h1>
                        <div className="flex flex-wrap items-center gap-4">
                            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.4em]">Análisis Algorítmico de Desempeño (2026)</p>
                            <div className="flex items-center gap-2 bg-indigo-500/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-indigo-500/20">
                                <Activity className="h-3 w-3 text-indigo-400 animate-pulse" />
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">Sincronizado con Contabilidad</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 🔭 BI SUB-DASHBOARDS QUICK ACCESS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link href="/analytics/sales" className="group block">
                    <div className="relative overflow-hidden bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-premium hover:shadow-active hover:border-indigo-100 hover:translate-y-[-6px] transition-all duration-500">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none group-hover:scale-110 group-hover:rotate-6 transition-transform duration-700">
                            <TrendingUp className="h-32 w-32 text-indigo-600" />
                        </div>
                        <div className="flex items-start justify-between gap-4 relative z-10">
                            <div className="space-y-3">
                                <div className="h-14 w-14 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                    <TrendingUp className="h-7 w-7 text-indigo-600 group-hover:text-white transition-colors" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">
                                        Ventas BI
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                        Comparativo anual · Top 10 clientes · KPIs
                                    </p>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {['Comparativo', 'Top Clientes', 'MoM Growth'].map((tag) => (
                                        <span key={tag} className="text-[8px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full border border-indigo-100">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <ArrowRight className="h-6 w-6 text-slate-200 group-hover:text-indigo-600 group-hover:translate-x-2 transition-all duration-300 shrink-0 mt-1" />
                        </div>
                    </div>
                </Link>

                <Link href="/analytics/financial" className="group block">
                    <div className="relative overflow-hidden bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-premium hover:shadow-active hover:border-emerald-100 hover:translate-y-[-6px] transition-all duration-500">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none group-hover:scale-110 group-hover:rotate-6 transition-transform duration-700">
                            <BarChart2 className="h-32 w-32 text-emerald-600" />
                        </div>
                        <div className="flex items-start justify-between gap-4 relative z-10">
                            <div className="space-y-3">
                                <div className="h-14 w-14 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-inner group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                                    <BarChart2 className="h-7 w-7 text-emerald-600 group-hover:text-white transition-colors" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">
                                        Financiero BI
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                        P&amp;L mensual · Margen · Salud financiera
                                    </p>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {['P&L', 'Margen', 'Radar Score'].map((tag) => (
                                        <span key={tag} className="text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-100">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <ArrowRight className="h-6 w-6 text-slate-200 group-hover:text-emerald-600 group-hover:translate-x-2 transition-all duration-300 shrink-0 mt-1" />
                        </div>
                    </div>
                </Link>
            </div>

            {/* 💎 STRATEGIC BI ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-12">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <ARAgingWidget aging={kpis.arAging} />
                        <TopProductsWidget products={kpis.topProducts} />
                    </div>
                </div>
            </div>

            <ExecutiveDashboard />
        </div>
    )
}

