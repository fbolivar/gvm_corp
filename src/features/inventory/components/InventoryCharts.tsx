"use client"

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

interface ChartData {
    date: string;
    entry: number;
    exit: number;
}

interface Props {
    data: ChartData[];
}

export function InventoryCharts({ data }: Props) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const totalEntry = data.reduce((acc, curr) => acc + curr.entry, 0);
    const totalExit = data.reduce((acc, curr) => acc + curr.exit, 0);

    return (
        <Card className="col-span-4 lg:col-span-8 rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden group">
            <CardHeader className="p-6 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 bg-blue-50 rounded-lg flex items-center justify-center">
                                <Activity className="h-4 w-4 text-blue-600" />
                            </div>
                            <CardTitle className="text-lg font-extrabold text-slate-900 tracking-tight">
                                Dinámica Global
                            </CardTitle>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            Flujo Operativo de Mercancías • <span className="text-primary">Ventana de 7 Días</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] uppercase font-bold text-emerald-600 tracking-widest pl-1">Entradas</span>
                            <div className="flex items-center gap-2">
                                <div className="h-7 w-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                                </div>
                                <span className="text-lg font-extrabold text-slate-900 font-mono tracking-tight tabular-nums italic">
                                    {totalEntry.toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div className="flex flex-col gap-1">
                            <span className="text-[8px] uppercase font-bold text-rose-600 tracking-widest pl-1">Salidas</span>
                            <div className="flex items-center gap-2">
                                <div className="h-7 w-7 bg-rose-50 rounded-lg flex items-center justify-center">
                                    <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" />
                                </div>
                                <span className="text-lg font-extrabold text-slate-900 font-mono tracking-tight tabular-nums italic">
                                    {totalExit.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-4 pb-6">
                <div className="h-[300px] w-full">
                    {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorEntry" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.15} />
                                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#94a3b8"
                                    fontSize={9}
                                    fontWeight={700}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                    tickFormatter={(str) => str.toUpperCase()}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={9}
                                    fontWeight={700}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}`}
                                />
                                <Tooltip
                                    cursor={{ stroke: '#6366f1', strokeWidth: 1.5, strokeDasharray: '4 4' }}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.97)',
                                        borderColor: '#e2e8f0',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.1)',
                                        border: '1px solid #e2e8f0'
                                    }}
                                    itemStyle={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase' as const, color: '#1e293b' }}
                                    labelStyle={{ color: '#94a3b8', marginBottom: '8px', fontSize: '9px', fontWeight: '700', letterSpacing: '0.15em' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="entry"
                                    name="Entradas"
                                    stroke="#10b981"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorEntry)"
                                    animationDuration={1500}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="exit"
                                    name="Salidas"
                                    stroke="#f43f5e"
                                    strokeWidth={2.5}
                                    fillOpacity={1}
                                    fill="url(#colorExit)"
                                    animationDuration={2000}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center">
                            <div className="animate-pulse flex space-x-4">
                                <div className="flex-1 space-y-4 py-1">
                                    <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 bg-slate-100 rounded"></div>
                                        <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
