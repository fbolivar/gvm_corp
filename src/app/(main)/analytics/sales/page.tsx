import { createClient } from '@/lib/supabase/server'
import { SalesDashboard } from '@/features/analytics/components/SalesDashboard'
import { Metadata } from 'next'
import { TrendingUp, Activity } from 'lucide-react'

export const metadata: Metadata = {
    title: 'BI Ventas | GVM Corp',
    description: 'Dashboard de Business Intelligence de Ventas',
}

export interface MonthlySalesRow {
    month: string
    total: number
    count: number
    year: number
}

export interface TopClientRow {
    legal_name: string
    total: number
}

async function getMonthlySales(): Promise<MonthlySalesRow[]> {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_monthly_sales')

    if (error || !data) {
        console.error('[sales/page] monthlySales error:', error?.message)
        return []
    }

    return (data as MonthlySalesRow[]) ?? []
}

async function getTopClients(): Promise<TopClientRow[]> {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_top_clients', { p_limit: 10 })

    if (error || !data) {
        console.error('[sales/page] topClients error:', error?.message)
        return []
    }

    return (data as TopClientRow[]) ?? []
}

export default async function SalesAnalyticsPage() {
    const [monthlySales, topClients] = await Promise.all([
        getMonthlySales(),
        getTopClients(),
    ])

    return (
        <div className="page-container space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header */}
            <div className="relative group overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-active">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-transform duration-1000">
                    <TrendingUp className="h-24 w-24" />
                </div>

                <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-10 bg-indigo-500 rounded-full" />
                        <span className="text-xs font-black uppercase tracking-[0.5em] text-indigo-400">
                            Sales Intelligence v3.2
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-tight">
                        Ventas <br />
                        <span className="text-slate-400">Análisis</span>
                    </h1>
                    <div className="flex flex-wrap items-center gap-4">
                        <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.4em]">
                            Comparativo anual · Top clientes · KPIs de crecimiento
                        </p>
                        <div className="flex items-center gap-2 bg-indigo-500/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-indigo-500/20">
                            <Activity className="h-3 w-3 text-indigo-400 animate-pulse" />
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">
                                Datos en tiempo real
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <SalesDashboard monthlySales={monthlySales} topClients={topClients} />
        </div>
    )
}
