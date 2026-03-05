'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Briefcase, ChevronRight, TrendingUp } from 'lucide-react';
import { ARDetailDialog } from './ARDetailDialog';
import { useState } from 'react';
import { cn } from '@/shared/lib/utils';

interface Props {
    aging: {
        current: number;
        overdue30: number;
        overdue60: number;
        overdue90: number;
    };
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
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <CardHeader className="p-5 pb-0 flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shrink-0">
                                <Briefcase className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-bold text-slate-900">Aging de Recaudo</CardTitle>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Análisis de Cartera</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total por Cobrar</p>
                        <p className="text-lg font-bold text-slate-900 tabular-nums">${total.toLocaleString('es-CO')}</p>
                    </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex cursor-pointer">
                        {segments.map((s, idx) => (
                            <div
                                key={idx}
                                style={{ width: total > 0 ? `${(s.value / total) * 100}%` : '0%' }}
                                className={cn(s.color, 'h-full transition-all duration-700 hover:opacity-90')}
                                onClick={() => setSelectedBucket(s)}
                                title={`${s.label}: $${s.value.toLocaleString('es-CO')}`}
                            />
                        ))}
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {segments.map((s, idx) => (
                            <div
                                key={idx}
                                onClick={() => setSelectedBucket(s)}
                                className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</span>
                                    <Badge className={cn(s.color, 'text-white border-none text-[9px] font-semibold')}>
                                        {total > 0 ? Math.round((s.value / total) * 100) : 0}%
                                    </Badge>
                                </div>
                                <div className="flex items-end justify-between">
                                    <p className="text-sm font-bold text-slate-900 tabular-nums">${s.value.toLocaleString('es-CO')}</p>
                                    <ChevronRight className="h-3 w-3 text-slate-300" />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                                <TrendingUp className="h-3.5 w-3.5" />
                            </div>
                            <p className="text-[10px] font-semibold text-slate-400 max-w-[200px] leading-tight">
                                El <span className="text-emerald-500 font-bold">{(total > 0 ? (aging.current / total) * 100 : 0).toFixed(1)}%</span> de la cartera está al día.
                            </p>
                        </div>
                        <button className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                            Detalle <ChevronRight className="h-3 w-3" />
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
    );
}
