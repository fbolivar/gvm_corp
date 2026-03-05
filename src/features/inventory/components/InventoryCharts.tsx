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
        <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-5 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-9 bg-blue-50 rounded-lg flex items-center justify-center">
                            <Activity className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-slate-900">
                                Flujo de Inventario
                            </CardTitle>
                            <p className="text-[10px] text-slate-400 font-medium">Ventana de 7 dias</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 bg-emerald-50 rounded-md flex items-center justify-center">
                                <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                            </div>
                            <div>
                                <span className="text-[10px] text-emerald-600 font-semibold">Entradas</span>
                                <p className="text-sm font-bold text-slate-900 tabular-nums">{totalEntry.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-slate-200" />
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 bg-rose-50 rounded-md flex items-center justify-center">
                                <ArrowDownRight className="h-3 w-3 text-rose-600" />
                            </div>
                            <div>
                                <span className="text-[10px] text-rose-600 font-semibold">Salidas</span>
                                <p className="text-sm font-bold text-slate-900 tabular-nums">{totalExit.toLocaleString()}</p>
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
                                    fontWeight={600}
                                    tickLine={false}
                                    axisLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#94a3b8"
                                    fontSize={9}
                                    fontWeight={600}
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
                                        padding: '12px',
                                        boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
                                        border: '1px solid #e2e8f0'
                                    }}
                                    itemStyle={{ fontSize: '11px', fontWeight: '600', color: '#1e293b' }}
                                    labelStyle={{ color: '#94a3b8', marginBottom: '6px', fontSize: '10px', fontWeight: '600' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="entry"
                                    name="Entradas"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorEntry)"
                                    animationDuration={1500}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="exit"
                                    name="Salidas"
                                    stroke="#f43f5e"
                                    strokeWidth={2}
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
