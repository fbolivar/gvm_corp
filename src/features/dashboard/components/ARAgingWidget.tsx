"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Progress } from "@/shared/components/ui/progress"
import { Badge } from "@/shared/components/ui/badge"
import { Briefcase, ChevronRight, TrendingUp } from "lucide-react"
import { ARDetailDialog } from "./ARDetailDialog"
import { useState } from "react"

interface Props {
    aging: {
        current: number;
        overdue30: number;
        overdue60: number;
        overdue90: number;
    }
}

export function ARAgingWidget({ aging }: Props) {
    const [selectedBucket, setSelectedBucket] = useState<{ label: string; min: number; max: number | null; color: string } | null>(null);
    const total = aging.current + aging.overdue30 + aging.overdue60 + aging.overdue90;

    const segments = [
        { label: 'Al Día', value: aging.current, color: 'bg-emerald-500', textColor: 'text-emerald-500', min: 0, max: 0 },
        { label: '1-30 Días', value: aging.overdue30, color: 'bg-amber-500', textColor: 'text-amber-500', min: 1, max: 30 },
        { label: '31-60 Días', value: aging.overdue60, color: 'bg-orange-500', textColor: 'text-orange-500', min: 31, max: 60 },
        { label: '+90 Días', value: aging.overdue90, color: 'bg-rose-500', textColor: 'text-rose-500', min: 61, max: null },
    ];

    return (
        <>
            <Card className="bg-slate-900 border-none rounded-[2.5rem] p-8 text-white shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                    <Briefcase className="h-48 w-48 text-white" />
                </div>

                <CardHeader className="p-0 mb-8 flex flex-row items-center justify-between pointer-events-none">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="h-1.5 w-6 bg-primary rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Análisis de Cartera</span>
                        </div>
                        <CardTitle className="text-3xl font-black italic uppercase tracking-tighter italic">Aging de Recaudo</CardTitle>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Total por Cobrar</p>
                        <p className="text-2xl font-black italic tracking-tighter text-white tabular-nums">${total.toLocaleString('es-CO')}</p>
                    </div>
                </CardHeader>

                <CardContent className="p-0 space-y-8 relative z-10">
                    <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden flex cursor-pointer">
                        {segments.map((s, idx) => (
                            <div
                                key={idx}
                                style={{ width: total > 0 ? `${(s.value / total) * 100}%` : '0%' }}
                                className={`${s.color} h-full transition-all duration-1000 hover:opacity-100 hover:scale-y-125 opacity-80`}
                                onClick={() => setSelectedBucket(s)}
                                title={`${s.label}: $${s.value.toLocaleString('es-CO')}`}
                            />
                        ))}
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {segments.map((s, idx) => (
                            <div
                                key={idx}
                                onClick={() => setSelectedBucket(s)}
                                className="space-y-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.07] transition-all cursor-pointer group/bucket"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{s.label}</span>
                                    <Badge className={`${s.color} text-white border-none text-[8px] font-black`}>
                                        {total > 0 ? Math.round((s.value / total) * 100) : 0}%
                                    </Badge>
                                </div>
                                <div className="flex items-end justify-between">
                                    <p className="text-lg font-black italic tracking-tighter tabular-nums">${s.value.toLocaleString('es-CO')}</p>
                                    <ChevronRight className="h-3 w-3 text-white/20 group-hover/bucket:text-white transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest max-w-[200px] leading-tight text-left">
                                El <span className="text-emerald-400">{(total > 0 ? (aging.current / total) * 100 : 0).toFixed(1)}%</span> de la cartera está al día.
                            </p>
                        </div>
                        <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:gap-3 transition-all">
                            Detalle Completo <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </CardContent>
            </Card>

            <ARDetailDialog
                isOpen={!!selectedBucket}
                onClose={() => setSelectedBucket(null)}
                bucket={selectedBucket}
            />
        </>
    )
}
