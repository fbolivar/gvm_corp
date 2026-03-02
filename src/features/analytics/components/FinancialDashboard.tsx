'use client'

import { useMemo } from 'react'
import {
    BarChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    ReferenceLine,
    ComposedChart,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { MonthlyPnLRow, MonthlyExpenseRow } from '@/app/(main)/analytics/financial/page'
import { FinancialHealthRadar } from './FinancialHealthRadar'
import type { RadarPoint } from './FinancialHealthRadar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    incomeRows: MonthlyPnLRow[]
    expenseRows: MonthlyExpenseRow[]
}

interface PnLPoint {
    label: string
    income: number
    expense: number
    net: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_LABELS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function formatCOP(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${Math.abs(value).toLocaleString('es-CO')}`
}

function formatCOPFull(value: number): string {
    return `$${value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function clamp(val: number, min = 0, max = 100): number {
    return Math.min(max, Math.max(min, val))
}

// ─── Custom Tooltips ──────────────────────────────────────────────────────────

interface TooltipPayloadItem {
    name: string
    value: number
    color: string
}

interface CustomTooltipProps {
    active?: boolean
    payload?: TooltipPayloadItem[]
    label?: string
}

function PnLTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) return null
    return (
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[200px]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{label}</p>
            {payload.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-6 mb-1">
                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: item.color }}>
                        {item.name}
                    </span>
                    <span className="text-[11px] font-black text-white font-mono">
                        {formatCOPFull(item.value)}
                    </span>
                </div>
            ))}
        </div>
    )
}

function AreaTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) return null
    const income = payload.find(p => p.name === 'income')?.value ?? 0
    const expense = payload.find(p => p.name === 'expense')?.value ?? 0
    const net = income - expense
    return (
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[190px]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{label}</p>
            <div className="space-y-1">
                <div className="flex items-center justify-between gap-6">
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Ingresos</span>
                    <span className="text-[11px] font-black text-white font-mono">{formatCOP(income)}</span>
                </div>
                <div className="flex items-center justify-between gap-6">
                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Gastos</span>
                    <span className="text-[11px] font-black text-white font-mono">{formatCOP(expense)}</span>
                </div>
                <div className="border-t border-white/10 mt-2 pt-2 flex items-center justify-between gap-6">
                    <span className={cn('text-[9px] font-black uppercase tracking-widest', net >= 0 ? 'text-indigo-400' : 'text-rose-400')}>
                        Utilidad
                    </span>
                    <span className={cn('text-[11px] font-black font-mono', net >= 0 ? 'text-indigo-300' : 'text-rose-400')}>
                        {formatCOP(net)}
                    </span>
                </div>
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FinancialDashboard({ incomeRows, expenseRows }: Props) {
    const currentYear = new Date().getFullYear()

    // ── Merge income + expense into 12-month P&L array ──
    const pnlData = useMemo<PnLPoint[]>(() => {
        const map = new Map<number, PnLPoint>()
        for (let i = 1; i <= 12; i++) {
            map.set(i, { label: MONTH_LABELS_ES[i - 1], income: 0, expense: 0, net: 0 })
        }
        for (const row of incomeRows) {
            const m = new Date(row.month).getUTCMonth() + 1
            const entry = map.get(m)!
            entry.income = row.income
            entry.net = entry.income - entry.expense
        }
        for (const row of expenseRows) {
            const m = new Date(row.month).getUTCMonth() + 1
            const entry = map.get(m)!
            entry.expense = row.expense
            entry.net = entry.income - entry.expense
        }
        return Array.from(map.values())
    }, [incomeRows, expenseRows])

    // ── Summary KPIs ──
    const summary = useMemo(() => {
        const totalIncome = pnlData.reduce((s, r) => s + r.income, 0)
        const totalExpense = pnlData.reduce((s, r) => s + r.expense, 0)
        const totalNet = totalIncome - totalExpense
        const margin = totalIncome > 0 ? (totalNet / totalIncome) * 100 : 0
        const positiveMonths = pnlData.filter(r => r.net > 0).length
        return { totalIncome, totalExpense, totalNet, margin, positiveMonths }
    }, [pnlData])

    // ── Radar data ──
    const radarData = useMemo<RadarPoint[]>(() => {
        const liquidityScore = clamp(summary.positiveMonths * 8.33)
        const marginScore = clamp(summary.margin * 5)
        const cobrosScore = clamp((pnlData.filter(r => r.income > 0).length / 12) * 100)
        const inventoryScore = summary.totalIncome > 0 ? 65 : 20
        const firstQuarter = pnlData.slice(0, 3).reduce((s, r) => s + r.income, 0)
        const lastQuarter = pnlData.slice(9, 12).reduce((s, r) => s + r.income, 0)
        const growthScore = firstQuarter > 0
            ? clamp(((lastQuarter - firstQuarter) / firstQuarter) * 100 + 50)
            : 50
        const solvencyScore = summary.totalExpense > 0
            ? clamp((summary.totalIncome / summary.totalExpense) * 50)
            : 50

        return [
            { axis: 'Liquidez', score: Math.round(liquidityScore), fullMark: 100 },
            { axis: 'Margen', score: Math.round(marginScore), fullMark: 100 },
            { axis: 'Cobros', score: Math.round(cobrosScore), fullMark: 100 },
            { axis: 'Inventario', score: inventoryScore, fullMark: 100 },
            { axis: 'Crecimiento', score: Math.round(growthScore), fullMark: 100 },
            { axis: 'Solvencia', score: Math.round(solvencyScore), fullMark: 100 },
        ]
    }, [summary, pnlData])

    const healthScore = useMemo(() => {
        return Math.round(radarData.reduce((s, r) => s + r.score, 0) / radarData.length)
    }, [radarData])

    return (
        <div className="space-y-12">
            {/* ─── Summary KPI Row ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Ingresos Totales', value: formatCOP(summary.totalIncome), full: formatCOPFull(summary.totalIncome), icon: TrendingUp, color: 'emerald' },
                    { label: 'Gastos Totales', value: formatCOP(summary.totalExpense), full: formatCOPFull(summary.totalExpense), icon: TrendingDown, color: 'rose' },
                    { label: 'Utilidad Neta', value: formatCOP(summary.totalNet), full: formatCOPFull(summary.totalNet), icon: DollarSign, color: summary.totalNet >= 0 ? 'indigo' : 'rose' },
                    { label: 'Margen %', value: `${summary.margin.toFixed(1)}%`, full: `Meses positivos: ${summary.positiveMonths}`, icon: Activity, color: summary.margin >= 10 ? 'emerald' : summary.margin >= 0 ? 'amber' : 'rose' },
                ].map((stat) => (
                    <Card key={stat.label} className="border-none bg-white shadow-premium rounded-[2.5rem] group hover:translate-y-[-6px] transition-all duration-500 overflow-hidden">
                        <CardContent className="p-8 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className={cn(
                                    'h-12 w-12 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-500',
                                    stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                        stat.color === 'rose' ? 'bg-rose-50 text-rose-600' :
                                            stat.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                                                'bg-amber-50 text-amber-600'
                                )}>
                                    <stat.icon className="h-6 w-6" />
                                </div>
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-right leading-relaxed max-w-[80px]">
                                    {stat.label}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-3xl font-black italic tracking-tighter text-slate-900 leading-none">{stat.value}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{stat.full}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ─── P&L Waterfall ───────────────────────────────────────────── */}
            <Card className="border-none bg-slate-900 shadow-active rounded-[4rem] overflow-hidden">
                <CardHeader className="p-10 md:p-14 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-8 bg-emerald-500 rounded-full" />
                        <CardTitle className="text-2xl md:text-4xl font-black italic tracking-tighter text-white uppercase">
                            P&amp;L Mensual
                        </CardTitle>
                    </div>
                    <CardDescription className="text-slate-400 font-black uppercase tracking-widest text-[10px] mt-2">
                        Ingresos, gastos y utilidad neta — {currentYear}
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8 md:p-14">
                    <div className="h-[380px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={pnlData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} tickFormatter={formatCOP} width={60} />
                                <Tooltip content={<PnLTooltip />} />
                                <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                                <Bar dataKey="expense" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={36} />
                                <Line type="monotone" dataKey="net" name="Utilidad Neta" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4, strokeWidth: 0 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Area + Radar Row ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Margen de Contribucion */}
                <Card className="lg:col-span-7 border-none bg-white shadow-premium rounded-[4rem] overflow-hidden">
                    <CardHeader className="p-10 md:p-12 border-b border-slate-50">
                        <div className="flex items-center gap-5">
                            <div className="h-14 w-14 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-inner">
                                <DollarSign className="h-7 w-7 text-emerald-600" />
                            </div>
                            <div>
                                <CardTitle className="text-xl md:text-2xl font-black italic tracking-tighter text-slate-900 uppercase">
                                    Margen de Contribucion
                                </CardTitle>
                                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 pt-1">
                                    Zona de utilidad entre ingresos y gastos
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 md:p-12">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={pnlData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} tickFormatter={formatCOP} width={55} />
                                    <Tooltip content={<AreaTooltip />} />
                                    <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4 2" />
                                    <Area type="monotone" dataKey="income" name="income" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" />
                                    <Area type="monotone" dataKey="expense" name="expense" stroke="#f43f5e" strokeWidth={2} fill="url(#expenseGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <FinancialHealthRadar radarData={radarData} healthScore={healthScore} />
            </div>
        </div>
    )
}
