"use client"

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell
} from "recharts"

export interface PLCategory {
    name: string
    income: number
    expense: number
}

interface PLChartProps {
    categories: PLCategory[]
    totalIncome: number
    totalExpenses: number
    netProfit: number
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 shadow-active backdrop-blur-xl text-white min-w-[160px]">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 mb-3">{label}</p>
            {payload.map((p: any) => (
                <div key={p.dataKey} className="flex justify-between gap-6 mb-1">
                    <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: p.color }}>{p.name}</span>
                    <span className="text-[10px] font-black font-mono italic">${Number(p.value).toLocaleString('es-CO')}</span>
                </div>
            ))}
        </div>
    )
}

const fmt = (n: number) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
    return `$${n}`
}

export function PLChart({ categories, totalIncome, totalExpenses, netProfit }: PLChartProps) {
    const chartData = categories.filter(c => c.income > 0 || c.expense > 0)

    // Summary KPI bars
    const summaryData = [
        { name: 'Ingresos', value: totalIncome, color: '#10b981' },
        { name: 'Egresos', value: totalExpenses, color: '#ef4444' },
        { name: 'Utilidad', value: Math.abs(netProfit), color: netProfit >= 0 ? '#6366f1' : '#f97316' },
    ]

    return (
        <div className="bg-white rounded-[3.5rem] shadow-premium border border-slate-50 p-10 space-y-10">
            <div className="flex items-center gap-4">
                <div className="h-1 w-6 bg-primary rounded-full" />
                <h3 className="text-lg font-black italic uppercase tracking-tighter text-slate-950">Estado de Resultados</h3>
                <span className={`ml-auto text-sm font-black italic tracking-tighter ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {netProfit >= 0 ? '+' : '-'}${Math.abs(netProfit).toLocaleString('es-CO')} neto
                </span>
            </div>

            {/* Summary 3-bar chart */}
            <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summaryData} margin={{ left: 0, right: 0, top: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={fmt} tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} width={55} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" name="Monto" radius={[8, 8, 0, 0]} animationDuration={1200}>
                            {summaryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* By category grouped bar chart */}
            {chartData.length > 0 && (
                <div className="pt-4 border-t border-slate-50">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 mb-4">Ingresos vs Costos por Categoría</p>
                    <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barCategoryGap="25%" margin={{ left: 0, right: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 700 }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0}
                                    angle={-30}
                                    textAnchor="end"
                                    height={40}
                                />
                                <YAxis tickFormatter={fmt} tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} width={55} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={1200} />
                                <Bar dataKey="expense" name="Costos" fill="#ef4444" radius={[4, 4, 0, 0]} animationDuration={1400} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    )
}
