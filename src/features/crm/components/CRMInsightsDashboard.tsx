"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
    Target,
    TrendingUp,
    UserPlus,
    Plus,
    Sparkles,
    ChevronRight,
    Activity,
    ArrowRight,
    LayoutDashboard,
    BarChart as BarChartIcon,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/shared/lib/utils"
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend,
} from 'recharts';


interface Props {
    stats: {
        newLeads: number;
        pipelineValue: number;
        forecastValue: number;
        winRate: number;
        openOpportunitiesCount: number;
        leadFunnel: { new: number; contacted: number; qualified: number; converted: number };
        stagesDistribution: Record<string, number>;
        recentLeads: Array<Record<string, unknown>>;
        [key: string]: unknown;
    };
}

export function CRMInsightsDashboard({ stats }: Props) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);

    const funnelData = [
        { name: 'Nuevos', value: stats.leadFunnel.new, fill: '#6366f1' },
        { name: 'Contactados', value: stats.leadFunnel.contacted, fill: '#8b5cf6' },
        { name: 'Calificados', value: stats.leadFunnel.qualified, fill: '#d946ef' },
        { name: 'Convertidos', value: stats.leadFunnel.converted, fill: '#10b981' },
    ];

    const stageData = Object.entries(stats.stagesDistribution).map(([stage, value]) => ({
        name: stage.replace('_', ' '),
        value: value as number
    })).sort((a, b) => b.value - a.value);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <UserPlus className="h-5 w-5" />
                            </div>
                            <Badge className="bg-emerald-50 text-emerald-600 border-none font-semibold text-[10px] tracking-wider px-2 py-0.5 rounded-full">+12.4%</Badge>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Entrada de Leads</p>
                            <h3 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">{stats.newLeads}</h3>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full w-1/2 bg-indigo-500 rounded-full" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <Target className="h-5 w-5" />
                            </div>
                            <Badge className="bg-slate-900 text-white border-none font-semibold text-[10px] tracking-wider px-2 py-0.5 rounded-full">{stats.openOpportunitiesCount} activos</Badge>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Valor Pipeline</p>
                            <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none truncate">
                                ${stats.pipelineValue.toLocaleString('es-CO')}
                            </h3>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full w-2/3 bg-amber-500 rounded-full" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-800 bg-slate-900 shadow-sm rounded-2xl text-white">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <Badge className="bg-indigo-500 text-white border-none font-semibold text-[10px] tracking-wider px-2 py-0.5 rounded-full">Forecast</Badge>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Forecast de Ventas</p>
                            <h3 className="text-2xl font-bold text-white tracking-tight leading-none truncate">
                                ${stats.forecastValue.toLocaleString('es-CO')}
                            </h3>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full w-3/4 bg-indigo-500 rounded-full" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl">
                    <CardContent className="p-5 space-y-3">
                        <div className="flex justify-between items-start">
                            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <Activity className="h-5 w-5" />
                            </div>
                            <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-semibold text-[10px] tracking-wider px-2 py-0.5 rounded-full">Alto</Badge>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Tasa de Conversión</p>
                            <h3 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">{stats.winRate.toFixed(1)}%</h3>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full w-1/3 bg-emerald-500 rounded-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="p-5 pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900">Distribución de Pipeline</CardTitle>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Volumen por etapa</p>
                            </div>
                            <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                                <BarChartIcon className="h-4 w-4" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-2">
                        <div className="h-[280px] w-full">
                            {isMounted && (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stageData} layout="vertical" margin={{ left: 10, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                                            width={100}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '10px 14px', fontSize: '12px' }}
                                            formatter={(value: number | undefined) => [`$${(value ?? 0).toLocaleString('es-CO')}`, 'Valor']}
                                        />
                                        <Bar dataKey="value" fill="#6366f1" radius={[0, 8, 8, 0]} barSize={28}>
                                            {stageData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#818cf8'} fillOpacity={1 - (index * 0.1)} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="p-5 pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900">Embudo de Conversión</CardTitle>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Eficiencia del ciclo de ventas</p>
                            </div>
                            <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Sparkles className="h-4 w-4" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-2">
                        <div className="h-[280px] w-full">
                            {isMounted && (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={funnelData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={100}
                                            paddingAngle={8}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {funnelData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '10px 14px', fontSize: '12px' }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            align="center"
                                            iconType="circle"
                                            iconSize={8}
                                            formatter={(value) => <span className="text-xs font-medium text-slate-500 ml-1">{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Leads + Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="p-5 pb-3 border-b border-slate-50 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-bold text-slate-900">Leads Recientes</CardTitle>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Actividad de prospección</p>
                        </div>
                        <Button variant="outline" asChild className="h-8 px-4 rounded-lg font-semibold text-[10px] uppercase tracking-wider">
                            <Link href="/crm/leads">Ver todos</Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid gap-2">
                            {stats.recentLeads.map((lead) => {
                                const id = String(lead.id ?? '');
                                const name = String(lead.name ?? '');
                                const company = String(lead.company_name ?? 'Particular');
                                const status = String(lead.status ?? '');
                                const createdAt = String(lead.created_at ?? '');
                                return (
                                <div key={id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-50 hover:border-indigo-100 hover:bg-indigo-50/20 transition-all">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-9 w-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                            <UserPlus className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-400 font-medium truncate">{company}</span>
                                                <span className="text-[10px] text-slate-300">•</span>
                                                <span className="text-[10px] text-slate-400">{createdAt ? new Date(createdAt).toLocaleDateString() : ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <Badge className={cn(
                                            "border px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wider rounded-full",
                                            status === 'NEW' ? 'border-indigo-200 text-indigo-600 bg-indigo-50' :
                                                status === 'CONVERTED' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 'border-slate-200 text-slate-500 bg-slate-50'
                                        )}>
                                            {status}
                                        </Badge>
                                        <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-lg hover:bg-slate-100">
                                            <Link href={`/crm/leads/${id}/edit`}><ChevronRight className="h-4 w-4" /></Link>
                                        </Button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Actions Panel */}
                <div className="flex flex-col gap-4">
                    <Card className="border border-slate-800 bg-slate-900 shadow-sm rounded-2xl text-white p-5">
                        <div className="space-y-4">
                            <div>
                                <div className="h-0.5 w-8 bg-indigo-500 rounded-full mb-3" />
                                <h3 className="text-lg font-bold tracking-tight">Terminal Operativa</h3>
                                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mt-1">Estación de comando CRM</p>
                            </div>

                            <div className="grid gap-2">
                                <Button asChild className="h-11 rounded-xl bg-white text-slate-900 hover:bg-indigo-50 font-semibold text-xs border-none transition-all">
                                    <Link href="/crm/leads/new" className="flex items-center gap-3">
                                        <Plus className="h-4 w-4" />
                                        Registrar Lead
                                        <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="h-11 rounded-xl bg-white/5 border-white/10 text-white hover:bg-white hover:text-slate-900 font-semibold text-xs transition-all">
                                    <Link href="/crm/pipeline" className="flex items-center gap-3">
                                        <Target className="h-4 w-4" />
                                        Pipeline Master
                                        <LayoutDashboard className="h-3.5 w-3.5 ml-auto opacity-40" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl p-5">
                        <div className="flex items-start gap-4">
                            <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                                <Activity className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Estado del Forecast</p>
                                <h4 className="text-sm font-bold text-slate-900 mb-2">Determinístico</h4>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Proyección de cierres basada en probabilidad ponderada vs valor nominal del pipeline activo.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
