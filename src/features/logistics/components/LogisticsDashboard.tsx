"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { logisticsService } from "../services/logisticsService"
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import {
    Truck,
    Package,
    Clock,
    CheckCircle2,
    TrendingUp,
    AlertCircle,
    ShoppingBag,
    Sparkles
} from "lucide-react"

export function LogisticsDashboard({ refreshKey }: { refreshKey: number }) {
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

    const cards = [
        {
            title: "Pedidos Pendientes",
            value: stats.ordersToProcess,
            icon: ShoppingBag,
            color: "text-amber-600",
            bg: "bg-amber-50",
            desc: "Órdenes esperando despacho"
        },
        {
            title: "En Empaque",
            value: stats.packed,
            icon: Package,
            color: "text-blue-600",
            bg: "bg-blue-50",
            desc: "Mercancía siendo alistada"
        },
        {
            title: "En Camino",
            value: stats.shipped,
            icon: Truck,
            color: "text-purple-600",
            bg: "bg-purple-50",
            desc: "Despachos con guía activa"
        },
        {
            title: "Entregados",
            value: stats.delivered,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            desc: "Entregas exitosas"
        }
    ]

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                    <Card key={idx} className="border-none bg-white shadow-premium rounded-xl group hover:scale-[1.02] transition-all duration-300 overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
                            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">{card.title}</h3>
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shadow-sm group-hover:bg-primary group-hover:text-white transition-all ${card.bg} ${card.color}`}>
                                <card.icon className="h-5 w-5" />
                            </div>
                        </CardHeader>
                        <CardContent className="px-6 pb-6 space-y-0.5">
                            <div className="text-3xl font-black text-slate-900 tracking-tighter italic leading-none">{card.value}</div>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{card.desc}</p>
                        </CardContent>
                    </Card>
                ))}
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
