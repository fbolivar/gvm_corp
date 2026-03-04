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

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: unknown[]; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-lg text-white min-w-[150px]">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-2">{label}</p>
            {(payload as { dataKey: string; color: string; name: string; value: number }[]).map((p) => (
                <div key={p.dataKey} className="flex justify-between gap-4 mb-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: p.color }}>{p.name}</span>
                    <span className="text-[10px] font-bold font-mono">${Number(p.value).toLocaleString('es-CO')}</span>
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

    const summaryData = [
        { name: 'Ingresos', value: totalIncome, color: '#10b981' },
        { name: 'Egresos', value: totalExpenses, color: '#ef4444' },
        { name: 'Utilidad', value: Math.abs(netProfit), color: netProfit >= 0 ? '#6366f1' : '#f97316' },
    ]

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-1 w-5 bg-indigo-500 rounded-full" />
                    <h3 className="text-sm font-bold text-slate-900">Estado de Resultados</h3>
                </div>
                <span className={`text-sm font-bold tracking-tight ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {netProfit >= 0 ? '+' : '-'}${Math.abs(netProfit).toLocaleString('es-CO')} neto
                </span>
            </div>

            {/* Summary 3-bar chart */}
            <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summaryData} margin={{ left: 0, right: 0, top: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={fmt} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} width={55} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" name="Monto" radius={[6, 6, 0, 0]} animationDuration={800}>
                            {summaryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* By category grouped bar chart */}
            {chartData.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Ingresos vs Costos por Categoria</p>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barCategoryGap="25%" margin={{ left: 0, right: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0}
                                    angle={-25}
                                    textAnchor="end"
                                    height={40}
                                />
                                <YAxis tickFormatter={fmt} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} width={55} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={800} />
                                <Bar dataKey="expense" name="Costos" fill="#ef4444" radius={[4, 4, 0, 0]} animationDuration={1000} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    )
}
