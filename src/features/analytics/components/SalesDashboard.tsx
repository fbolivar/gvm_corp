'use client'

import { useMemo, useState } from 'react'
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { TrendingUp, TrendingDown, Users, Star, AlertTriangle, Activity } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { MonthlySalesRow, TopClientRow } from '@/app/(main)/analytics/sales/page'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    monthlySales: MonthlySalesRow[]
    topClients: TopClientRow[]
}

interface MonthlyChartPoint {
    month: string
    label: string
    currentYear: number
    prevYear: number
    currentCount: number
}

interface KpiSemaphore {
    label: string
    value: string
    detail: string
    color: 'green' | 'yellow' | 'red' | 'blue'
    icon: React.ComponentType<{ className?: string }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_LABELS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function formatCOP(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toLocaleString('es-CO')}`
}

function formatCOPFull(value: number): string {
    return `$${value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function truncate(text: string, max: number): string {
    return text.length > max ? `${text.substring(0, max)}…` : text
}

const CLIENT_GRADIENT = [
    '#6366f1', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd',
    '#818cf8', '#6d28d9', '#7c3aed', '#5b21b6', '#4c1d95',
]

const SEMAPHORE_COLORS: Record<KpiSemaphore['color'], string> = {
    green: 'bg-emerald-50 border-emerald-100 text-emerald-600',
    yellow: 'bg-amber-50 border-amber-100 text-amber-600',
    red: 'bg-rose-50 border-rose-100 text-rose-600',
    blue: 'bg-indigo-50 border-indigo-100 text-indigo-600',
}

const SEMAPHORE_ICON_COLORS: Record<KpiSemaphore['color'], string> = {
    green: 'bg-emerald-100 text-emerald-600',
    yellow: 'bg-amber-100 text-amber-600',
    red: 'bg-rose-100 text-rose-600',
    blue: 'bg-indigo-100 text-indigo-600',
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

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

function ComposedTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) return null
    return (
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[180px]">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{label}</p>
            {payload.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-4 mb-1">
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

function ClientTooltip({ active, payload }: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) return null
    return (
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-2xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Facturación</p>
            <p className="text-sm font-black text-white font-mono">{formatCOPFull(payload[0].value)}</p>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SalesDashboard({ monthlySales, topClients }: Props) {
    const currentYear = new Date().getFullYear()
    const prevYear = currentYear - 1

    // ── Build 12-month comparativo chart data ──
    const monthlyChartData = useMemo<MonthlyChartPoint[]>(() => {
        const map = new Map<number, { current: number; prev: number; count: number }>()
        for (let i = 1; i <= 12; i++) {
            map.set(i, { current: 0, prev: 0, count: 0 })
        }
        for (const row of monthlySales) {
            const m = new Date(row.month).getUTCMonth() + 1
            const entry = map.get(m)!
            if (row.year === currentYear) {
                entry.current = row.total
                entry.count = row.count
            } else {
                entry.prev = row.total
            }
        }
        return Array.from(map.entries()).map(([monthNum, vals]) => ({
            month: String(monthNum),
            label: MONTH_LABELS_ES[monthNum - 1],
            currentYear: vals.current,
            prevYear: vals.prev,
            currentCount: vals.count,
        }))
    }, [monthlySales, currentYear])

    // ── Build top clients bar data ──
    const topClientsData = useMemo(() =>
        topClients.map((c) => ({
            name: truncate(c.legal_name, 22),
            fullName: c.legal_name,
            total: c.total,
        })),
        [topClients]
    )

    // ── KPI Calculations ──
    const kpis = useMemo<KpiSemaphore[]>(() => {
        const currentMonthIdx = new Date().getMonth() // 0-based
        const currentData = monthlyChartData[currentMonthIdx]
        const prevMonthData = currentMonthIdx > 0 ? monthlyChartData[currentMonthIdx - 1] : null

        // MoM growth
        const momGrowth = prevMonthData && prevMonthData.currentYear > 0
            ? ((currentData.currentYear - prevMonthData.currentYear) / prevMonthData.currentYear) * 100
            : 0
        const momColor: KpiSemaphore['color'] = momGrowth > 5 ? 'green' : momGrowth >= 0 ? 'yellow' : 'red'

        // Ticket promedio vs año anterior
        const currentTotal = monthlyChartData.reduce((s, r) => s + r.currentYear, 0)
        const currentCount = monthlyChartData.reduce((s, r) => s + r.currentCount, 0)
        const prevTotal = monthlyChartData.reduce((s, r) => s + r.prevYear, 0)
        const prevCountApprox = monthlySales.filter(r => r.year === prevYear).reduce((s, r) => s + r.count, 0)
        const avgTicketCurrent = currentCount > 0 ? currentTotal / currentCount : 0
        const avgTicketPrev = prevCountApprox > 0 ? prevTotal / prevCountApprox : 0
        const ticketDiff = avgTicketPrev > 0
            ? ((avgTicketCurrent - avgTicketPrev) / avgTicketPrev) * 100
            : 0

        // Top 3 concentration
        const top3Total = topClients.slice(0, 3).reduce((s, c) => s + c.total, 0)
        const totalYear = topClients.reduce((s, c) => s + c.total, 0)
        const concentration = totalYear > 0 ? (top3Total / totalYear) * 100 : 0
        const concentrationColor: KpiSemaphore['color'] = concentration > 70 ? 'red' : concentration > 50 ? 'yellow' : 'green'

        // Peak month
        const peakMonth = monthlyChartData.reduce((best, cur) =>
            cur.currentYear > best.currentYear ? cur : best,
            monthlyChartData[0]
        )

        return [
            {
                label: 'Crecimiento MoM',
                value: `${momGrowth >= 0 ? '+' : ''}${momGrowth.toFixed(1)}%`,
                detail: prevMonthData
                    ? `vs ${MONTH_LABELS_ES[currentMonthIdx - 1] ?? 'mes anterior'}`
                    : 'Sin mes anterior',
                color: momColor,
                icon: momGrowth >= 0 ? TrendingUp : TrendingDown,
            },
            {
                label: 'Ticket Promedio',
                value: formatCOP(avgTicketCurrent),
                detail: `${ticketDiff >= 0 ? '+' : ''}${ticketDiff.toFixed(1)}% vs ${prevYear}`,
                color: ticketDiff >= 0 ? 'green' : 'red',
                icon: Activity,
            },
            {
                label: 'Concentración Top 3',
                value: `${concentration.toFixed(1)}%`,
                detail: `${topClients[0]?.legal_name ? truncate(topClients[0].legal_name, 18) : 'Sin datos'}`,
                color: concentrationColor,
                icon: concentrationColor === 'red' ? AlertTriangle : Users,
            },
            {
                label: 'Mes Pico',
                value: MONTH_LABELS_ES[parseInt(peakMonth.month) - 1] ?? '-',
                detail: formatCOP(peakMonth.currentYear),
                color: 'blue',
                icon: Star,
            },
        ]
    }, [monthlyChartData, topClients, monthlySales, currentYear, prevYear])

    return (
        <div className="space-y-12">
            {/* ─── KPI Semaphore Cards ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi) => (
                    <Card
                        key={kpi.label}
                        className={cn(
                            'border rounded-[2.5rem] shadow-premium group hover:translate-y-[-6px] transition-all duration-500 overflow-hidden',
                            SEMAPHORE_COLORS[kpi.color]
                        )}
                    >
                        <CardContent className="p-8 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className={cn(
                                    'h-12 w-12 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-500',
                                    SEMAPHORE_ICON_COLORS[kpi.color]
                                )}>
                                    <kpi.icon className="h-6 w-6" />
                                </div>
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{kpi.label}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-3xl font-black italic tracking-tighter leading-none">{kpi.value}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{kpi.detail}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ─── Comparativo Mensual ─────────────────────────────────────── */}
            <Card className="border-none bg-slate-900 shadow-active rounded-[4rem] overflow-hidden">
                <CardHeader className="p-10 md:p-14 border-b border-white/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-8 bg-indigo-500 rounded-full" />
                                <CardTitle className="text-2xl md:text-4xl font-black italic tracking-tighter text-white uppercase">
                                    Comparativo Mensual
                                </CardTitle>
                            </div>
                            <CardDescription className="text-slate-400 font-black uppercase tracking-widest text-[10px]">
                                Facturación {currentYear} vs {prevYear} por mes
                            </CardDescription>
                        </div>
                        <div className="flex gap-6 bg-black/20 p-4 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-sm bg-indigo-600" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{currentYear}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-0.5 w-6 bg-slate-400" style={{ borderTop: '2px dashed #94a3b8' }} />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{prevYear}</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 md:p-14">
                    <div className="h-[380px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={monthlyChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="label"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                                    tickFormatter={formatCOP}
                                    width={60}
                                />
                                <Tooltip content={<ComposedTooltip />} />
                                <Legend
                                    formatter={(val) => (
                                        <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                            {val === 'currentYear' ? String(currentYear) : String(prevYear)}
                                        </span>
                                    )}
                                />
                                <Bar
                                    dataKey="currentYear"
                                    name="currentYear"
                                    fill="#6366f1"
                                    radius={[6, 6, 0, 0]}
                                    maxBarSize={40}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="prevYear"
                                    name="prevYear"
                                    stroke="#94a3b8"
                                    strokeWidth={2}
                                    strokeDasharray="6 3"
                                    dot={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Top 10 Clientes ─────────────────────────────────────────── */}
            <Card className="border-none bg-white shadow-premium rounded-[4rem] overflow-hidden">
                <CardHeader className="p-10 md:p-14 border-b border-slate-50">
                    <div className="flex items-center gap-5">
                        <div className="h-14 w-14 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100 shadow-inner">
                            <Users className="h-7 w-7 text-indigo-600" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase">
                                Top 10 Clientes
                            </CardTitle>
                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 pt-1">
                                Concentración de facturación · Año {currentYear}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-8 md:p-14">
                    {topClientsData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <Users className="h-12 w-12 text-slate-200" />
                            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Sin datos de clientes</p>
                        </div>
                    ) : (
                        <div className="h-[420px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={topClientsData}
                                    margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis
                                        type="number"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }}
                                        tickFormatter={formatCOP}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#475569', fontSize: 9, fontWeight: 900 }}
                                        width={130}
                                    />
                                    <Tooltip content={<ClientTooltip />} />
                                    <Bar dataKey="total" radius={[0, 8, 8, 0]} maxBarSize={28}>
                                        {topClientsData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={CLIENT_GRADIENT[index % CLIENT_GRADIENT.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
