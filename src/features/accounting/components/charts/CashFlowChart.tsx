"use client"

import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

export interface CashFlowPoint {
    date: string
    inflow: number
    outflow: number
    balance: number
    net?: number
}

interface CashFlowChartProps {
    data: CashFlowPoint[]
    title?: string
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 shadow-active backdrop-blur-xl text-white min-w-[180px]">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 mb-3">{label}</p>
            {payload.map((p: any) => (
                <div key={p.dataKey} className="flex justify-between gap-8 mb-1">
                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: p.color }}>{p.name}</span>
                    <span className="text-[10px] font-black font-mono italic">${Number(p.value).toLocaleString('es-CO')}</span>
                </div>
            ))}
        </div>
    )
}

const fmt = (n: number) => `$${(n / 1000000).toFixed(1)}M`

export function CashFlowChart({ data, title = "Flujo de Caja" }: CashFlowChartProps) {
    // Sample every 3 days for readability if more than 15 points
    const displayData = data.length > 15
        ? data.filter((_, i) => i % 3 === 0 || i === data.length - 1)
        : data

    const chartData = displayData.map(d => ({
        ...d,
        label: (() => {
            try { return format(parseISO(d.date), 'dd MMM', { locale: es }) }
            catch { return d.date }
        })()
    }))

    // Inflow/Outflow daily bar chart (aggregate weekly)
    const weeklyData: { week: string; inflow: number; outflow: number }[] = []
    for (let i = 0; i < data.length; i += 7) {
        const slice = data.slice(i, i + 7)
        const weekStart = slice[0]?.date
        if (!weekStart) continue
        weeklyData.push({
            week: (() => { try { return format(parseISO(weekStart), 'dd MMM', { locale: es }) } catch { return weekStart } })(),
            inflow: slice.reduce((s, d) => s + d.inflow, 0),
            outflow: slice.reduce((s, d) => s + d.outflow, 0),
        })
    }

    return (
        <div className="bg-white rounded-[3.5rem] shadow-premium border border-slate-50 p-10 space-y-10">
            <div className="flex items-center gap-4">
                <div className="h-1 w-6 bg-primary rounded-full" />
                <h3 className="text-lg font-black italic uppercase tracking-tighter text-slate-950">{title}</h3>
            </div>

            {/* Balance evolution area chart */}
            <div>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 mb-4">Evolución Saldo Proyectado</p>
                <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                            <defs>
                                <linearGradient id="cfBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={fmt} tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} width={55} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                name="Saldo"
                                stroke="#6366f1"
                                strokeWidth={2.5}
                                fill="url(#cfBalanceGrad)"
                                animationDuration={1400}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Weekly inflow vs outflow */}
            {weeklyData.length > 0 && (
                <div className="pt-4 border-t border-slate-50">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 mb-4">Ingresos vs Egresos por Semana</p>
                    <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData} barCategoryGap="30%" margin={{ left: 0, right: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="week" tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={fmt} tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} width={50} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="inflow" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={1200} />
                                <Bar dataKey="outflow" name="Egresos" fill="#ef4444" radius={[4, 4, 0, 0]} animationDuration={1400} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    )
}
