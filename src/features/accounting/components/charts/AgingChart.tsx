"use client"

import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts"
import { cn } from "@/shared/lib/utils"

export interface AgingBucket {
    label: string
    amount: number
    count: number
    color: string
    bg: string
}

export interface TopDebtor {
    name: string
    amount: number
}

interface AgingChartProps {
    buckets: AgingBucket[]
    topDebtors: TopDebtor[]
    title?: string
}

const PIE_COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444']

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]
    return (
        <div className="bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 shadow-active backdrop-blur-xl text-white">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">{d.name}</p>
            <p className="text-lg font-black italic tracking-tighter">${Number(d.value).toLocaleString('es-CO')}</p>
        </div>
    )
}

export function AgingChart({ buckets, topDebtors, title = "Distribución Cartera" }: AgingChartProps) {
    const pieData = buckets.map((b, i) => ({ name: b.label, value: b.amount, color: PIE_COLORS[i] }))
    const totalAmount = buckets.reduce((s, b) => s + b.amount, 0)

    return (
        <div className="bg-white rounded-[3.5rem] shadow-premium border border-slate-50 p-10 space-y-10">
            <div className="flex items-center gap-4">
                <div className="h-1 w-6 bg-primary rounded-full" />
                <h3 className="text-lg font-black italic uppercase tracking-tighter text-slate-950">{title}</h3>
                <span className="ml-auto text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Total ${totalAmount.toLocaleString('es-CO')}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                {/* Pie Chart */}
                <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={3}
                                dataKey="value"
                                animationBegin={0}
                                animationDuration={1200}
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend + buckets */}
                <div className="space-y-4">
                    {buckets.map((bucket, i) => {
                        const pct = totalAmount > 0 ? (bucket.amount / totalAmount) * 100 : 0
                        return (
                            <div key={bucket.label} className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{bucket.label}</span>
                                        <span className="text-[9px] font-black text-slate-300">({bucket.count})</span>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-700 italic">${bucket.amount.toLocaleString('es-CO')}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i] }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Top debtors bar chart */}
            {topDebtors.length > 0 && (
                <div className="pt-4 border-t border-slate-50">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6">Top Deudores</p>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topDebtors} layout="vertical" margin={{ left: 0, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                <XAxis type="number" tick={false} axisLine={false} tickLine={false} />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={110}
                                    tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="amount" fill="#6366f1" radius={[0, 6, 6, 0]} animationDuration={1200} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    )
}
