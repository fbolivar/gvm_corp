"use client"

import { useMemo } from "react"
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    Target,
    Activity,
    ShieldCheck,
    Calendar,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface LiquidityReportProps {
    ar: { total: number }[];
    ap: { total: number }[];
    totalLiquidity: number;
}

export function LiquidityReport({ ar, ap, totalLiquidity }: LiquidityReportProps) {
    const totalAR = useMemo(() => ar.reduce((sum, d) => sum + Number(d.total), 0), [ar]);
    const totalAP = useMemo(() => ap.reduce((sum, d) => sum + Number(d.total), 0), [ap]);
    const projectedBalance = totalLiquidity + totalAR - totalAP;

    const estimatedFixedCosts = totalAP > 0 ? totalAP : 5000000;
    const breakEvenSales = estimatedFixedCosts / 0.3;
    const arProgress = breakEvenSales > 0 ? Math.min((totalAR / breakEvenSales) * 100, 100) : 0;

    const fmt = (n: number) => new Intl.NumberFormat('es-CO').format(Math.round(n));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

            {/* PUNTO DE EQUILIBRIO */}
            <div className="lg:col-span-4">
                <Card className="rounded-2xl bg-slate-950 text-white p-6 shadow-md border-none h-full flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-indigo-400" />
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">Punto de Equilibrio</span>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 mb-1">Venta requerida para cubrir egresos</p>
                            <p className="text-2xl font-bold tracking-tight">${fmt(breakEvenSales)}</p>
                        </div>
                    </div>

                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 mt-6">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Progreso CxC</span>
                            <span className="text-sm font-bold text-white">{arProgress.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                style={{ width: `${arProgress}%` }}
                            />
                        </div>
                    </div>
                </Card>
            </div>

            {/* FLUJO PROYECTADO */}
            <div className="lg:col-span-8 space-y-5">
                <Card className="rounded-2xl bg-white border border-slate-100 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                            <Activity className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">Flujo Proyectado a 30 Días</h3>
                            <p className="text-[10px] text-slate-400">Liquidez + CxC - CxP = Balance proyectado</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-5">
                        <div className="bg-slate-50 rounded-xl p-4 text-center">
                            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-1">Liquidez</p>
                            <p className="text-lg font-bold text-slate-900">${fmt(totalLiquidity)}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-4 text-center">
                            <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wider mb-1">+ CxC</p>
                            <p className="text-lg font-bold text-emerald-700">${fmt(totalAR)}</p>
                        </div>
                        <div className="bg-rose-50 rounded-xl p-4 text-center">
                            <p className="text-[10px] text-rose-600 font-medium uppercase tracking-wider mb-1">- CxP</p>
                            <p className="text-lg font-bold text-rose-700">${fmt(totalAP)}</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className={cn("h-5 w-5", projectedBalance >= 0 ? "text-emerald-500" : "text-rose-500")} />
                            <div>
                                <p className="text-xs font-semibold text-slate-600">Balance Proyectado</p>
                                <p className="text-[10px] text-slate-400">
                                    Riesgo: {projectedBalance > 0 ? 'Bajo' : 'Crítico'}
                                </p>
                            </div>
                        </div>
                        <p className={cn(
                            "text-2xl font-bold tracking-tight",
                            projectedBalance >= 0 ? "text-slate-900" : "text-rose-600"
                        )}>
                            ${fmt(projectedBalance)}
                        </p>
                    </div>
                </Card>

                {/* Sugerencia */}
                <Card className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm">
                    <div className="flex items-center gap-4">
                        <Calendar className="h-5 w-5 text-slate-400 flex-shrink-0" />
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Se recomienda priorizar cobros con vencimiento mayor a 15 días para mantener el punto de equilibrio operativo.
                        </p>
                    </div>
                </Card>
            </div>
        </div>
    )
}
