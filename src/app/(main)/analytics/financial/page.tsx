import { createClient } from '@/lib/supabase/server'
import { FinancialDashboard } from '@/features/analytics/components/FinancialDashboard'
import { Metadata } from 'next'
import { BarChart2, Activity } from 'lucide-react'

export const metadata: Metadata = {
    title: 'BI Financiero | GVM Corp',
    description: 'Dashboard de Business Intelligence Financiero',
}

export interface MonthlyPnLRow {
    month: string
    income: number
    tax: number
}

export interface MonthlyExpenseRow {
    month: string
    expense: number
}

async function getMonthlyIncome(): Promise<MonthlyPnLRow[]> {
    const supabase = await createClient()
    const year = new Date().getFullYear()

    const { data, error } = await supabase
        .from('documents')
        .select('issue_date, total, taxes')
        .eq('doc_type', 'INVOICE')
        .neq('status', 'VOIDED')
        .gte('issue_date', `${year}-01-01`)
        .lte('issue_date', `${year}-12-31`)

    if (error || !data) {
        console.error('[financial/page] income error:', error?.message)
        return []
    }

    // Aggregate by month in TypeScript
    const map = new Map<string, { income: number; tax: number }>()
    data.forEach(row => {
        const month = (row.issue_date as string).slice(0, 7) + '-01'
        const entry = map.get(month) ?? { income: 0, tax: 0 }
        entry.income += Number(row.total ?? 0)
        entry.tax += Number((row as { taxes?: number }).taxes ?? 0)
        map.set(month, entry)
    })

    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, { income, tax }]) => ({ month, income, tax }))
}

async function getMonthlyExpenses(): Promise<MonthlyExpenseRow[]> {
    const supabase = await createClient()
    const year = new Date().getFullYear()

    const { data, error } = await supabase
        .from('documents')
        .select('issue_date, total')
        .eq('doc_type', 'VENDOR_BILL')
        .gte('issue_date', `${year}-01-01`)
        .lte('issue_date', `${year}-12-31`)

    if (error || !data) {
        console.error('[financial/page] expenses error:', error?.message)
        return []
    }

    // Aggregate by month in TypeScript
    const map = new Map<string, number>()
    data.forEach(row => {
        const month = (row.issue_date as string).slice(0, 7) + '-01'
        map.set(month, (map.get(month) ?? 0) + Number(row.total ?? 0))
    })

    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, expense]) => ({ month, expense }))
}

export default async function FinancialAnalyticsPage() {
    const [incomeRows, expenseRows] = await Promise.all([
        getMonthlyIncome(),
        getMonthlyExpenses(),
    ])

    return (
        <div className="page-container space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header */}
            <div className="relative group overflow-hidden bg-slate-900 rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-16 text-white shadow-active">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-transform duration-1000">
                    <BarChart2 className="h-64 w-64" />
                </div>

                <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-10 bg-emerald-500 rounded-full" />
                        <span className="text-xs font-black uppercase tracking-[0.5em] text-emerald-400">
                            Financial Intelligence v3.2
                        </span>
                    </div>
                    <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter italic uppercase leading-[0.8]">
                        Financiero <br />
                        <span className="text-slate-400 text-3xl sm:text-5xl md:text-7xl">P&amp;L</span>
                    </h1>
                    <div className="flex flex-wrap items-center gap-4">
                        <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.4em]">
                            Ingresos · Gastos · Utilidad neta · Salud financiera
                        </p>
                        <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-emerald-500/20">
                            <Activity className="h-3 w-3 text-emerald-400 animate-pulse" />
                            <span className="text-[9px] font-black text-white uppercase tracking-widest">
                                Año en curso
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <FinancialDashboard incomeRows={incomeRows} expenseRows={expenseRows} />
        </div>
    )
}
