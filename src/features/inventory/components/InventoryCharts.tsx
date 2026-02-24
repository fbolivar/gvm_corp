"use client"

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Activity, TrendingUp, Zap } from 'lucide-react';

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
        <Card className="col-span-4 lg:col-span-8 rounded-[3rem] bg-slate-950 border-none shadow-2xl overflow-hidden group">
            <CardHeader className="p-10 pb-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
                    <Zap className="h-32 w-32 text-indigo-500 blur-2xl" />
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                                <Activity className="h-5 w-5 text-indigo-400" />
                            </div>
                            <CardTitle className="text-3xl font-black text-white italic tracking-tighter leading-none">
                                Dinámica Global
                            </CardTitle>
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
                            Flujo Operativo de Mercancías • <span className="text-indigo-400">Ventana de 7 Días</span>
                        </p>
                    </div>

                    <div className="flex items-center gap-8 bg-slate-900/50 p-6 rounded-[2rem] border border-white/5 backdrop-blur-sm">
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] uppercase font-black text-emerald-500 tracking-widest pl-1">Entradas</span>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                                    <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                                </div>
                                <span className="text-2xl font-black text-white font-mono tracking-tighter tabular-nums">
                                    {totalEntry.toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="h-10 w-px bg-white/10" />
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] uppercase font-black text-rose-500 tracking-widest pl-1">Salidas</span>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-rose-500/10 rounded-lg flex items-center justify-center">
                                    <ArrowDownRight className="h-4 w-4 text-rose-400" />
                                </div>
                                <span className="text-2xl font-black text-white font-mono tracking-tighter tabular-nums">
                                    {totalExit.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-6 pb-10">
                <div className="h-[350px] w-full">
                    {isMounted ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorEntry" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.4} />
                                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.03} vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#475569"
                                    fontSize={10}
                                    fontWeight={900}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={20}
                                    tickFormatter={(str) => str.toUpperCase()}
                                />
                                <YAxis
                                    stroke="#475569"
                                    fontSize={10}
                                    fontWeight={900}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}`}
                                />
                                <Tooltip
                                    cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }}
                                    contentStyle={{
                                        backgroundColor: 'rgba(2, 6, 23, 0.95)',
                                        borderColor: 'rgba(255, 255, 255, 0.1)',
                                        borderRadius: '24px',
                                        padding: '24px',
                                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                        backdropFilter: 'blur(12px)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}
                                    itemStyle={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}
                                    labelStyle={{ color: '#64748b', marginBottom: '12px', fontSize: '10px', fontWeight: '900', letterSpacing: '0.2em' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="entry"
                                    name="Entradas Log"
                                    stroke="#10b981"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorEntry)"
                                    animationDuration={2000}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="exit"
                                    name="Salidas Log"
                                    stroke="#f43f5e"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorExit)"
                                    animationDuration={2500}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center">
                            <div className="animate-pulse flex space-x-4">
                                <div className="flex-1 space-y-4 py-1">
                                    <div className="h-4 bg-slate-400/20 rounded w-3/4"></div>
                                    <div className="space-y-2">
                                        <div className="h-4 bg-slate-400/20 rounded"></div>
                                        <div className="h-4 bg-slate-400/20 rounded w-5/6"></div>
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
