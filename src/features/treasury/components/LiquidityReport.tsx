"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
    TrendingUp,
    TrendingDown,
    Zap,
    Target,
    Activity,
    ShieldCheck,
    Scale,
    Calendar,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface LiquidityReportProps {
    ar: any[]; // Accounts Receivable (Invoices)
    ap: any[]; // Accounts Payable (Bills)
    totalLiquidity: number;
}

export function LiquidityReport({ ar, ap, totalLiquidity }: LiquidityReportProps) {
    const totalAR = useMemo(() => ar.reduce((sum, d) => sum + Number(d.total), 0), [ar]);
    const totalAP = useMemo(() => ap.reduce((sum, d) => sum + Number(d.total), 0), [ap]);
    const projectedBalance = totalLiquidity + totalAR - totalAP;

    // Break-even calculation (Simplified Estimation)
    // Formula: Fixed Costs (Estimated from AP avg) / Gross Margin (Defaulting to 30% if not set)
    const estimatedFixedCosts = totalAP > 0 ? totalAP : 5000000; // Fallback to 5M
    const breakEvenSales = estimatedFixedCosts / 0.3; // Assuming 30% margin

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-right-8 duration-1000">

            {/* 🎯 BREAK-EVEN & CRITICAL METRICS */}
            <div className="lg:col-span-4 space-y-8">
                <Card className="rounded-[3rem] bg-slate-950 text-white p-10 shadow-active relative overflow-hidden group border-none h-full flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform">
                        <Target className="h-48 w-48 text-white" />
                    </div>

                    <div className="space-y-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-10 bg-indigo-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 italic">Punto de Equilibrio (V3)</span>
                        </div>
                        <h3 className="text-4xl font-black italic uppercase tracking-tighter leading-tight">
                            Meta de Ventas <br /> <span className="text-indigo-400">Operativas</span>
                        </h3>
                        <div className="space-y-1">
                            <p className="text-5xl font-black tracking-tighter italic">
                                ${new Intl.NumberFormat('es-CO').format(Math.round(breakEvenSales))}
                            </p>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Venta requerida para cubrir egresos proyectados</p>
                        </div>
                    </div>

                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 mt-10 relative z-10">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Progreso Actual AR</p>
                                <p className="text-xl font-black text-white italic tracking-tighter">
                                    {((totalAR / breakEvenSales) * 100).toFixed(1)}%
                                </p>
                            </div>
                            <div className="h-2 w-32 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1]"
                                    style={{ width: `${Math.min((totalAR / breakEvenSales) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* 📈 PROJECTED CASH FLOW ENGINE */}
            <div className="lg:col-span-8 flex flex-col gap-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Receivable Pulse */}
                    <Card className="rounded-[3rem] bg-white border border-slate-50 p-10 shadow-premium group hover:border-indigo-100 transition-all">
                        <div className="flex items-center justify-between mb-8">
                            <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                                <TrendingUp className="h-7 w-7" />
                            </div>
                            <Badge variant="outline" className="font-black italic text-[9px] uppercase tracking-widest border-indigo-100 text-indigo-500 px-3 py-1 bg-indigo-50/30">
                                ENTRADA PROYECTADA
                            </Badge>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Cuentas por Cobrar (AR)</p>
                            <h4 className="text-4xl font-black text-slate-950 italic tracking-tighter">
                                ${new Intl.NumberFormat('es-CO').format(totalAR)}
                            </h4>
                        </div>
                        <div className="mt-8 flex items-center gap-2 text-emerald-500">
                            <ArrowUpRight className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest italic">Inyección de Liquidez</span>
                        </div>
                    </Card>

                    {/* Payable Pulse */}
                    <Card className="rounded-[3rem] bg-white border border-slate-50 p-10 shadow-premium group hover:border-rose-100 transition-all">
                        <div className="flex items-center justify-between mb-8">
                            <div className="h-14 w-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm">
                                <TrendingDown className="h-7 w-7" />
                            </div>
                            <Badge variant="outline" className="font-black italic text-[9px] uppercase tracking-widest border-rose-100 text-rose-500 px-3 py-1 bg-rose-50/30">
                                SALIDA PROYECTADA
                            </Badge>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Cuentas por Pagar (AP)</p>
                            <h4 className="text-4xl font-black text-slate-950 italic tracking-tighter">
                                ${new Intl.NumberFormat('es-CO').format(totalAP)}
                            </h4>
                        </div>
                        <div className="mt-8 flex items-center gap-2 text-rose-500">
                            <ArrowDownRight className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest italic">Compromisos de Salida</span>
                        </div>
                    </Card>
                </div>

                {/* FINAL PROJECTED BALANCE INDUSTRIAL */}
                <Card className="rounded-[3.5rem] bg-slate-50 border-2 border-dashed border-slate-200 p-10 flex flex-col md:flex-row items-center justify-between gap-10 group hover:border-indigo-400/50 transition-all active:scale-[0.99] duration-500">
                    <div className="flex items-center gap-6">
                        <div className="h-20 w-20 rounded-[2rem] bg-slate-950 flex items-center justify-center text-white shadow-active group-hover:rotate-12 transition-transform">
                            <Activity className="h-10 w-10 text-indigo-400" />
                        </div>
                        <div className="space-y-1">
                            <h5 className="text-2xl font-black text-slate-950 italic tracking-tighter uppercase leading-none">Flujo Proyectado a 30 Días</h5>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic tracking-[0.3em]">Cálculo Dinámico de Liquidez Final</p>
                        </div>
                    </div>

                    <div className="flex items-baseline gap-4 text-center md:text-right">
                        <span className={cn(
                            "text-6xl font-black italic tracking-tighter leading-none shadow-premium",
                            projectedBalance >= 0 ? "text-slate-950" : "text-rose-600"
                        )}>
                            ${new Intl.NumberFormat('es-CO').format(projectedBalance)}
                        </span>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest italic">COP</span>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-3 bg-white px-5 py-2 rounded-full border border-slate-100 shadow-sm">
                            <ShieldCheck className="h-4 w-4 text-indigo-500" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic leading-none">Nivel de Riesgo: {projectedBalance > 0 ? 'BAJO' : 'CRÍTICO'}</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* 📅 CALENDAR PERSPECTIVE (Decorative) */}
            <div className="lg:col-span-12">
                <div className="bg-white p-10 rounded-[3rem] shadow-premium border border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                            <Calendar className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h6 className="text-sm font-black text-slate-950 uppercase italic tracking-widest">Protocolo de Optimización de Caja</h6>
                            <p className="text-[10px] font-bold text-slate-400 max-w-xl italic">
                                El sistema sugiere priorizar los cobros con vencimiento mayor a 15 días para mantener el Punto de Equilibrio Operativo.
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" className="h-12 px-8 rounded-xl font-black text-[9px] uppercase tracking-widest text-indigo-600 bg-indigo-50 border-none shadow-premium">
                        CONFIGURAR COSTOS FIJOS
                    </Button>
                </div>
            </div>
        </div>
    )
}
