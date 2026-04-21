"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { logisticsService } from "../services/logisticsService"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import {
    Truck,
    Package,
    CheckCircle2,
    AlertCircle,
    ShoppingBag,
    Sparkles,
    ArrowRight,
} from "lucide-react"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    ResponsiveContainer,
    Tooltip,
    Cell,
    PieChart,
    Pie,
    Legend,
} from "recharts"

type DashboardFilter = 'PENDING' | 'PACKING' | 'IN_TRANSIT' | 'DELIVERED'

export function LogisticsDashboard({
    refreshKey,
    onCardClick,
}: {
    refreshKey: number
    onCardClick?: (filter: DashboardFilter) => void
}) {
    const supabase = createClient()
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadStats()
    }, [refreshKey])

    async function loadStats() {
        setLoading(true)
        setError(null)
        try {
            const data = await logisticsService.getDashboardStats(supabase)
            setStats(data)
        } catch (err: any) {
            console.error(err)
            setError(err.message || "Error al cargar estadísticas")
        } finally {
            setLoading(false)
        }
    }

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(4).fill(0).map((_, i) => <div key={i} className="h-40 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
    )

    if (error) return (
        <div className="p-10 text-center bg-white border border-slate-100 shadow-premium rounded-2xl">
            <div className="h-16 w-16 bg-rose-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-rose-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight italic uppercase">Error de Conexión</h3>
            <p className="text-slate-500 text-xs font-bold mt-1 mb-6 uppercase tracking-widest">{error}</p>
            <Button onClick={() => loadStats()} className="bg-slate-900 text-white rounded-xl h-10 px-6 font-black uppercase tracking-widest text-[9px]">
                Reintentar
            </Button>
        </div>
    )

    if (!stats) return null

    const cards: Array<{
        title: string
        value: number
        icon: typeof ShoppingBag
        color: string
        bg: string
        hex: string
        desc: string
        filter: DashboardFilter
    }> = [
        {
            title: "Pedidos Pendientes",
            value: stats.ordersToProcess,
            icon: ShoppingBag,
            color: "text-amber-600",
            bg: "bg-amber-50",
            hex: "#f59e0b",
            desc: "Órdenes esperando despacho",
            filter: 'PENDING',
        },
        {
            title: "En Empaque",
            value: stats.packed,
            icon: Package,
            color: "text-blue-600",
            bg: "bg-blue-50",
            hex: "#0ea5e9",
            desc: "Mercancía siendo alistada",
            filter: 'PACKING',
        },
        {
            title: "En Camino",
            value: stats.shipped,
            icon: Truck,
            color: "text-purple-600",
            bg: "bg-purple-50",
            hex: "#a855f7",
            desc: "Despachos con guía activa",
            filter: 'IN_TRANSIT',
        },
        {
            title: "Entregados",
            value: stats.delivered,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            hex: "#10b981",
            desc: "Entregas exitosas",
            filter: 'DELIVERED',
        }
    ]

    const chartData = cards.map(c => ({ name: c.title, value: c.value, fill: c.hex }))
    const hasData = cards.some(c => c.value > 0)

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* KPI Grid — clickable */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => {
                    const isClickable = !!onCardClick
                    return (
                        <button
                            key={idx}
                            type="button"
                            disabled={!isClickable}
                            onClick={() => onCardClick?.(card.filter)}
                            className="text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-xl"
                        >
                            <Card className={`border-none bg-white shadow-premium rounded-xl group transition-all duration-300 overflow-hidden ${isClickable ? 'hover:scale-[1.02] hover:shadow-active cursor-pointer' : ''}`}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
                                    <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">{card.title}</h3>
                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-white transition-all ${card.bg} ${card.color}`}>
                                        <card.icon className="h-5 w-5" />
                                    </div>
                                </CardHeader>
                                <CardContent className="px-6 pb-6 space-y-2">
                                    <div className="text-3xl font-black text-slate-900 tracking-tighter italic leading-none">{card.value}</div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{card.desc}</p>
                                        {isClickable && (
                                            <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </button>
                    )
                })}
            </div>

            {/* Visual chart — distribution of current shipments */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card className="lg:col-span-3 border-none bg-white shadow-premium rounded-2xl p-2">
                    <CardContent className="p-6 space-y-5">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">Distribución de despachos</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Estado actual del flujo logístico</p>
                        </div>
                        {hasData ? (
                            <div className="h-60">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                                            contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600 }}
                                        />
                                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                            {chartData.map((entry, i) => (
                                                <Cell key={i} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-60 flex flex-col items-center justify-center text-slate-300">
                                <Package className="h-10 w-10 mb-2" />
                                <p className="text-xs font-bold uppercase tracking-widest">Sin datos aún</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 border-none bg-white shadow-premium rounded-2xl p-2">
                    <CardContent className="p-6 space-y-5">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">Proporción</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Participación por etapa</p>
                        </div>
                        {hasData ? (
                            <div className="h-60">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData.filter(d => d.value > 0)}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={70}
                                            paddingAngle={3}
                                        >
                                            {chartData.map((entry, i) => (
                                                <Cell key={i} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                                        <Legend
                                            verticalAlign="bottom"
                                            iconSize={8}
                                            wrapperStyle={{ fontSize: 10, fontWeight: 700 }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-60 flex flex-col items-center justify-center text-slate-300">
                                <Sparkles className="h-8 w-8 mb-2" />
                                <p className="text-xs font-bold uppercase tracking-widest">Sin datos aún</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Carriers Stat Table */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <Card className="lg:col-span-8 border-none bg-white shadow-premium rounded-2xl p-2">
                    <CardContent className="p-6 lg:p-8 space-y-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1 text-center sm:text-left">
                                <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight italic uppercase">Uso por Transportadora</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Distribución de carga logística por aliado.</p>
                            </div>
                            <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center self-center sm:self-auto shadow-sm">
                                <Truck className="h-6 w-6 text-primary" />
                            </div>
                        </div>

                        <div className="space-y-8 lg:space-y-10 overflow-x-hidden">
                            {Object.entries(stats.byCarrier || {}).length === 0 ? (
                                <div className="text-slate-300 italic py-12 text-center text-sm font-medium">No hay envíos registrados para este periodo.</div>
                            ) : (
                                Object.entries(stats.byCarrier).map(([name, count]: [string, any]) => {
                                    const percentage = Math.round((count / stats.total) * 100);
                                    return (
                                        <div key={name} className="group">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 mb-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-sm font-black text-slate-900 italic uppercase tracking-tight">{name}</span>
                                                    <div className="hidden sm:block h-1 w-1 rounded-full bg-slate-200" />
                                                    <span className="text-[8px] font-black text-primary uppercase tracking-[0.1em] bg-primary/5 px-2 py-0.5 rounded-md">{percentage}% del total</span>
                                                </div>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">{count} Envíos</span>
                                            </div>
                                            <div className="h-3 bg-slate-50 rounded-full overflow-hidden p-0.5 border border-slate-100 shadow-inner">
                                                <div
                                                    className="h-full bg-slate-900 rounded-full transition-all duration-[1500ms] shadow-sm"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="lg:col-span-4 space-y-6">
                    <Card className="bg-slate-900 border-none shadow-premium rounded-2xl p-2 relative overflow-hidden group">
                        <Sparkles className="absolute -bottom-6 -right-6 h-24 w-24 text-white/5 -rotate-12" />
                        <CardHeader className="relative z-10 px-6 pt-6">
                            <CardTitle className="text-lg font-black text-white tracking-tight flex items-center gap-2 italic uppercase">
                                <AlertCircle className="h-5 w-5 text-indigo-300" />
                                Estado Operativo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="relative z-10 px-6 pb-6 space-y-6 text-white">
                            <div className="space-y-0.5">
                                <p className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none">Volumen Total Activo</p>
                                <h3 className="text-3xl font-black italic leading-none tracking-tighter uppercase">{stats.total} Guías</h3>
                            </div>

                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md flex gap-4 hover:bg-white/10 transition-all border-l-4 border-l-emerald-500">
                                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                </div>
                                <div className="leading-tight">
                                    <p className="text-xs font-bold text-white">Servidores Online</p>
                                    <p className="text-[10px] text-white/50 font-medium mt-1">Sincronización LogiTrack activa.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-[#f0f9ff] border-none shadow-sm rounded-2xl p-6 space-y-3">
                        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <Package className="h-5 w-5 text-sky-600" />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">Optimización</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-relaxed">Prioriza transportadoras con mejores tiempos de entrega.</p>
                    </Card>
                </div>
            </div>
        </div>
    )
}
