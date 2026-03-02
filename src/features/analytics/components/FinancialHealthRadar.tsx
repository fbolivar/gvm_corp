'use client'

import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    Radar,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { ShieldCheck } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RadarPoint {
    axis: string
    score: number
    fullMark: number
}

interface Props {
    radarData: RadarPoint[]
    healthScore: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FinancialHealthRadar({ radarData, healthScore }: Props) {
    const healthColor: 'emerald' | 'amber' | 'rose' =
        healthScore >= 70 ? 'emerald' : healthScore >= 50 ? 'amber' : 'rose'

    return (
        <Card className="lg:col-span-5 border-none bg-slate-950 shadow-active rounded-[4rem] text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                <ShieldCheck className="h-48 w-48" />
            </div>
            <CardHeader className="p-10 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                        <ShieldCheck className="h-7 w-7 text-indigo-400" />
                    </div>
                    <div>
                        <CardTitle className="text-xl md:text-2xl font-black italic tracking-tighter text-white uppercase leading-none">
                            Salud Financiera
                        </CardTitle>
                        <CardDescription className="text-slate-500 text-[10px] font-black uppercase tracking-widest pt-1">
                            Score multidimensional
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-10 pt-0 flex flex-col items-center relative z-10 space-y-6">
                {/* Score Badge */}
                <div className="flex items-center gap-4">
                    <div className={cn(
                        'h-20 w-20 rounded-full border-4 flex flex-col items-center justify-center shadow-lg',
                        healthColor === 'emerald' ? 'border-emerald-500 bg-emerald-500/10' :
                            healthColor === 'amber' ? 'border-amber-500 bg-amber-500/10' :
                                'border-rose-500 bg-rose-500/10'
                    )}>
                        <span className={cn(
                            'text-3xl font-black italic tracking-tighter',
                            healthColor === 'emerald' ? 'text-emerald-400' :
                                healthColor === 'amber' ? 'text-amber-400' : 'text-rose-400'
                        )}>
                            {healthScore}
                        </span>
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Score</span>
                    </div>
                    <div>
                        <p className={cn(
                            'text-sm font-black italic uppercase tracking-tighter',
                            healthColor === 'emerald' ? 'text-emerald-400' :
                                healthColor === 'amber' ? 'text-amber-400' : 'text-rose-400'
                        )}>
                            {healthColor === 'emerald' ? 'Saludable' : healthColor === 'amber' ? 'Moderado' : 'Critico'}
                        </p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
                            Promedio 6 ejes
                        </p>
                    </div>
                </div>

                <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                            <PolarGrid stroke="rgba(255,255,255,0.06)" />
                            <PolarAngleAxis
                                dataKey="axis"
                                tick={{ fill: '#64748b', fontSize: 9, fontWeight: 900 }}
                            />
                            <Radar
                                name="Salud"
                                dataKey="score"
                                stroke="#6366f1"
                                fill="#6366f1"
                                fillOpacity={0.25}
                                strokeWidth={2}
                            />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '1rem',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    backgroundColor: '#0f172a',
                                    color: '#fff',
                                    fontSize: 10,
                                    fontWeight: 900,
                                }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>

                {/* Axis Mini List */}
                <div className="w-full grid grid-cols-2 gap-2">
                    {radarData.map((axis) => (
                        <div
                            key={axis.axis}
                            className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/5"
                        >
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{axis.axis}</span>
                            <span className="text-[9px] font-black text-indigo-300">{axis.score}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
