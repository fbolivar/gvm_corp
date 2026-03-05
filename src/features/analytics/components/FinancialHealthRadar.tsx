'use client';

import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    Radar,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RadarPoint {
    axis: string;
    score: number;
    fullMark: number;
}

interface Props {
    radarData: RadarPoint[];
    healthScore: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FinancialHealthRadar({ radarData, healthScore }: Props) {
    const healthColor: 'emerald' | 'amber' | 'rose' =
        healthScore >= 70 ? 'emerald' : healthScore >= 50 ? 'amber' : 'rose';

    return (
        <Card className="lg:col-span-5 rounded-2xl border border-slate-100 bg-slate-900 shadow-sm text-white overflow-hidden">
            <CardHeader className="p-5">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-bold text-white">
                            Salud Financiera
                        </CardTitle>
                        <CardDescription className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                            Score multidimensional
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex flex-col items-center space-y-4">
                {/* Score Badge */}
                <div className="flex items-center gap-4">
                    <div className={cn(
                        'h-16 w-16 rounded-full border-4 flex flex-col items-center justify-center',
                        healthColor === 'emerald' ? 'border-emerald-500 bg-emerald-500/10' :
                            healthColor === 'amber' ? 'border-amber-500 bg-amber-500/10' :
                                'border-rose-500 bg-rose-500/10',
                    )}>
                        <span className={cn(
                            'text-2xl font-bold tabular-nums',
                            healthColor === 'emerald' ? 'text-emerald-400' :
                                healthColor === 'amber' ? 'text-amber-400' : 'text-rose-400',
                        )}>
                            {healthScore}
                        </span>
                        <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wider">Score</span>
                    </div>
                    <div>
                        <p className={cn(
                            'text-sm font-bold',
                            healthColor === 'emerald' ? 'text-emerald-400' :
                                healthColor === 'amber' ? 'text-amber-400' : 'text-rose-400',
                        )}>
                            {healthColor === 'emerald' ? 'Saludable' : healthColor === 'amber' ? 'Moderado' : 'Crítico'}
                        </p>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                            Promedio 6 ejes
                        </p>
                    </div>
                </div>

                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                            <PolarGrid stroke="rgba(255,255,255,0.06)" />
                            <PolarAngleAxis
                                dataKey="axis"
                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
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
                                    borderRadius: '0.75rem',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    backgroundColor: '#1e293b',
                                    color: '#fff',
                                    fontSize: 11,
                                    fontWeight: 600,
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
                            className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5 border border-white/5"
                        >
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{axis.axis}</span>
                            <span className="text-[10px] font-bold text-indigo-300 tabular-nums">{axis.score}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
