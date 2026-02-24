
import { ExecutiveDashboard } from '@/features/analytics/components/ExecutiveDashboard'
import { dashboardService } from '@/features/dashboard/services/dashboardService'
import { createClient } from '@/lib/supabase/server'
import { ARAgingWidget } from '@/features/dashboard/components/ARAgingWidget'
import { TopProductsWidget } from '@/features/dashboard/components/TopProductsWidget'
import { Metadata } from 'next'
import { TrendingUp, Cpu, PieChart, Zap, Activity } from 'lucide-react'

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

