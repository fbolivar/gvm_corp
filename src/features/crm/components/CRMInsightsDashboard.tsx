"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
    Users,
    Target,
    TrendingUp,
    UserPlus,
    Plus,
    Sparkles,
    ArrowUpRight,
    Search,
    ChevronRight,
    Heart,
    Zap,
    CircleDot,
    Activity,
    ArrowRight,
    LayoutDashboard,
    PieChart as PieChartIcon,
    BarChart3,
    BarChart as BarChartIcon
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
    AreaChart,
    Area
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

interface Props {
    stats: any;
}

export function CRMInsightsDashboard({ stats }: Props) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);
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
        <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 📊 INDUSTRIAL SUMMARY GRID V3 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                <Card className="border border-slate-100 bg-white shadow-premium rounded-[3rem] group hover:-translate-y-3 transition-all duration-700 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-125 transition-transform duration-1000">
                        <UserPlus className="h-24 w-24 text-indigo-600" />
                    </div>
                    <CardContent className="p-10 space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="h-16 w-16 rounded-[1.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner group-hover:rotate-12 transition-all duration-700">
                                <UserPlus className="h-8 w-8" />
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[10px] tracking-[0.2em] px-4 py-1 rounded-full italic">+12.4%</Badge>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">VS MES PREV</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2 italic">Entrada de Leads</p>
                            <h3 className="text-6xl font-black text-slate-950 tracking-tighter italic leading-none">{stats.newLeads}</h3>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100/50">
                            <div className="h-full w-1/2 bg-indigo-500 rounded-full shadow-[0_0_12px_theme(colors.indigo.500/40)]" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-100 bg-white shadow-premium rounded-[3rem] group hover:-translate-y-3 transition-all duration-700 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-125 transition-transform duration-1000">
                        <Target className="h-24 w-24 text-amber-600" />
                    </div>
                    <CardContent className="p-10 space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="h-16 w-16 rounded-[1.5rem] bg-amber-50 flex items-center justify-center text-amber-600 shadow-inner group-hover:-rotate-12 transition-all duration-700">
                                <Target className="h-8 w-8" />
                            </div>
                            <Badge className="bg-slate-950 text-white border-none font-black text-[10px] tracking-[0.3em] px-4 py-1 rounded-full italic leading-none">{stats.openOpportunitiesCount} ACTIVOS</Badge>
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2 italic">Valor de Tubería</p>
                            <h3 className="text-4xl font-black text-slate-950 tracking-tighter italic leading-none truncate">
                                ${stats.pipelineValue.toLocaleString('es-CO')}
                            </h3>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100/50">
                            <div className="h-full w-2/3 bg-amber-500 rounded-full shadow-[0_0_12px_theme(colors.amber.500/40)]" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none bg-slate-950 shadow-active rounded-[3.5rem] group hover:-translate-y-3 transition-all duration-700 overflow-hidden relative text-white">
                    <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_50%_50%,#4f46e5,transparent)] group-hover:opacity-10 transition-opacity" />
                    <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none group-hover:scale-125 transition-transform duration-1000">
                        <TrendingUp className="h-24 w-24 text-indigo-400" />
                    </div>
                    <CardContent className="p-10 space-y-6 relative z-10">
                        <div className="flex justify-between items-start">
                            <div className="h-16 w-16 rounded-[1.5rem] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-active group-hover:scale-110 transition-all duration-700">
                                <TrendingUp className="h-8 w-8" />
                            </div>
                            <Badge className="bg-indigo-500 text-white border-none font-black text-[10px] tracking-[0.4em] px-4 py-1 rounded-full italic animate-pulse">PRONÓSTICO</Badge>
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-white/40 uppercase tracking-[0.4em] mb-2 italic uppercase">Forecast de Ventas</p>
                            <h3 className="text-4xl font-black text-white tracking-tighter italic leading-none truncate">
                                ${stats.forecastValue.toLocaleString('es-CO')}
                            </h3>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden shadow-inner border border-white/5">
                            <div className="h-full w-3/4 bg-indigo-500 rounded-full shadow-[0_0_15px_theme(colors.indigo.500)]" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-slate-100 bg-white shadow-premium rounded-[3rem] group hover:-translate-y-3 transition-all duration-700 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-125 transition-transform duration-1000">
                        <Activity className="h-24 w-24 text-emerald-600" />
                    </div>
                    <CardContent className="p-10 space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="h-16 w-16 rounded-[1.5rem] bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner group-hover:rotate-12 transition-all duration-700">
                                <Activity className="h-8 w-8" />
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-black text-[10px] tracking-[0.3em] px-4 py-1 rounded-full italic">ALTO NIVEL</Badge>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic leading-none mt-1">QUARTILE 1</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2 italic">Tasa de Conversión</p>
                            <h3 className="text-6xl font-black text-slate-950 tracking-tighter italic leading-none">{stats.winRate.toFixed(1)}%</h3>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden shadow-inner border border-slate-100/50">
                            <div className="h-full w-1/3 bg-emerald-500 rounded-full shadow-[0_0_12px_theme(colors.emerald.500/40)]" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 📈 INDUSTRIAL ANALYTICS CENTER V3 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Distribution Chart */}
                <Card className="border-none bg-white shadow-premium rounded-[4rem] overflow-hidden p-3 group/chart relative">
                    <div className="absolute top-0 left-0 p-12 opacity-[0.01] pointer-events-none">
                        <BarChart3 className="h-64 w-64 text-slate-900" />
                    </div>
                    <CardHeader className="p-12 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <CardTitle className="text-4xl font-black text-slate-950 italic tracking-tighter uppercase leading-none">Distribución de <br /><span className="text-indigo-500">Pipeline</span></CardTitle>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.6em] italic">VOLUMEN FINANCIERO POR ETAPA</p>
                            </div>
                            <div className="h-20 w-20 rounded-[2rem] bg-slate-950 flex items-center justify-center text-white shadow-active group-hover/chart:rotate-12 transition-all duration-700">
                                <BarChartIcon className="h-10 w-10" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-12 pt-0">
                        <div className="h-[350px] w-full mt-10">
                            {isMounted && (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stageData} layout="vertical" margin={{ left: 20, right: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#0f172a', fontSize: 10, fontWeight: '900' }}
                                            width={120}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '20px', backgroundColor: '#0f172a', color: 'white' }}
                                            itemStyle={{ color: '#818cf8', fontWeight: '900', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.1em' }}
                                            labelStyle={{ color: 'white', marginBottom: '8px', fontWeight: '900', fontSize: '14px', fontStyle: 'italic' }}
                                            formatter={(value: any) => [`$${value.toLocaleString('es-CO')}`, 'VALOR TOTAL']}
                                        />
                                        <Bar dataKey="value" fill="#6366f1" radius={[0, 20, 20, 0]} barSize={40}>
                                            {stageData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#818cf8'} fillOpacity={1 - (index * 0.1)} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Funnel Chart */}
                <Card className="border-none bg-white shadow-premium rounded-[4rem] overflow-hidden p-3 group/funnel relative">
                    <div className="absolute bottom-0 right-0 p-12 opacity-[0.01] pointer-events-none">
                        <Sparkles className="h-64 w-64 text-indigo-500" />
                    </div>
                    <CardHeader className="p-12 pb-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <CardTitle className="text-4xl font-black text-slate-950 italic tracking-tighter uppercase leading-none">Embudo de <br /><span className="text-indigo-500">Conversión</span></CardTitle>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.6em] italic">EFICIENCIA DEL CICLO DE VENTAS</p>
                            </div>
                            <div className="h-20 w-20 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-inner group-hover/funnel:scale-110 transition-all duration-700">
                                <Sparkles className="h-10 w-10" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-12 pt-0">
                        <div className="h-[350px] w-full mt-10">
                            {isMounted && (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={funnelData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={120}
                                            paddingAngle={12}
                                            dataKey="value"
                                            stroke="none"
                                            animationBegin={0}
                                            animationDuration={1500}
                                        >
                                            {funnelData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} className="hover:scale-105 transition-transform origin-center duration-500 cursor-pointer" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '20px', backgroundColor: '#0f172a', color: 'white' }}
                                            itemStyle={{ color: '#white', fontWeight: '900', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.1em' }}
                                            labelStyle={{ display: 'none' }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            align="center"
                                            iconType="circle"
                                            iconSize={8}
                                            formatter={(value) => <span className="text-[11px] font-black uppercase text-slate-500 tracking-[0.2em] italic ml-2">{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 🌐 TRANSACCIONAL HUB V3 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <Card className="lg:col-span-2 border-none bg-white shadow-premium rounded-[4rem] overflow-hidden group/hub relative">
                    <CardHeader className="p-12 pb-6 border-b border-slate-50 flex flex-row items-center justify-between bg-slate-50/30">
                        <div>
                            <CardTitle className="text-4xl font-black text-slate-950 italic tracking-tighter uppercase leading-none">Traffic <span className="text-slate-400">Hub</span></CardTitle>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.6em] italic mt-3">ACTIVIDAD RECIENTE DE PROSPECCIÓN</p>
                        </div>
                        <Button variant="outline" asChild className="h-14 px-10 rounded-2xl border-slate-200 bg-white font-black text-[11px] uppercase tracking-[0.4em] hover:bg-slate-950 hover:text-white transition-all shadow-premium italic active:scale-95">
                            <Link href="/crm/leads">ACCESO TOTAL</Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-10">
                        <div className="grid gap-6">
                            {stats.recentLeads.map((lead: any) => (
                                <div key={lead.id} className="flex items-center justify-between p-8 rounded-[2.5rem] bg-white border border-slate-100 hover:border-indigo-100 hover:shadow-active transition-all duration-500 group/row relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/0 via-indigo-50/0 to-indigo-50/50 opacity-0 group-hover/row:opacity-100 transition-opacity pointer-events-none" />

                                    <div className="flex items-center gap-8 relative z-10">
                                        <div className="h-20 w-20 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-slate-400 group-hover/row:bg-slate-950 group-hover/row:text-white transition-all duration-700 shadow-inner group-hover/row:rotate-12 group-hover/row:scale-110">
                                            <UserPlus className="h-8 w-8" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-2xl font-black text-slate-950 italic tracking-tighter uppercase leading-none group-hover/row:text-indigo-600 transition-colors">{lead.name}</p>
                                            <div className="flex items-center gap-4">
                                                <Badge variant="outline" className="bg-slate-50 border-none text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full text-slate-400 italic leading-none">{lead.company_name || 'Particular'}</Badge>
                                                <div className="h-1 w-1 rounded-full bg-slate-200" />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic leading-none">REGISTRO: {new Date(lead.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-10 relative z-10">
                                        <Badge className={cn(
                                            "border-[1.5px] px-6 py-2.5 font-black text-[11px] uppercase tracking-[0.4em] rounded-full shadow-inner italic leading-none whitespace-nowrap",
                                            lead.status === 'NEW' ? 'border-indigo-100 text-indigo-600 bg-indigo-50/30' :
                                                lead.status === 'CONVERTED' ? 'border-emerald-100 text-emerald-600 bg-emerald-50/30' : 'border-slate-100 text-slate-400 bg-slate-50'
                                        )}>
                                            <div className="h-2 w-2 rounded-full bg-current animate-pulse mr-3" />
                                            {lead.status}
                                        </Badge>
                                        <Button variant="ghost" size="icon" asChild className="h-16 w-16 rounded-2xl bg-slate-50 hover:bg-slate-950 hover:text-white transition-all duration-500 shadow-inner active:scale-90 border border-transparent hover:border-slate-100">
                                            <Link href={`/crm/leads/${lead.id}/edit`}><ChevronRight className="h-8 w-8" /></Link>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* TACTICAL ACTIONS V3 */}
                <div className="flex flex-col gap-10">
                    <Card className="border-none bg-slate-950 shadow-active rounded-[4.5rem] overflow-hidden text-white p-14 relative group overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,#4f46e5,transparent)] opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity duration-[2000ms]" />
                        <div className="absolute -bottom-12 -right-12 p-12 opacity-[0.05] pointer-events-none group-hover:scale-125 transition-transform duration-[3000ms]">
                            <Zap className="h-[15rem] w-[15rem] text-white" />
                        </div>

                        <div className="relative z-10 space-y-12">
                            <div className="space-y-4">
                                <div className="h-1 w-12 bg-indigo-500 rounded-full" />
                                <h3 className="text-4xl font-black italic tracking-tighter uppercase leading-tight">Terminal <br />Operativa</h3>
                                <p className="text-indigo-200/40 text-[11px] font-black uppercase tracking-[0.6em] mt-3 italic">ESTACIÓN DE COMANDO CRM</p>
                            </div>

                            <div className="grid gap-6">
                                <Button asChild className="h-24 rounded-[2rem] bg-white text-slate-950 hover:bg-indigo-500 hover:text-white font-black italic uppercase tracking-tighter text-sm border-none shadow-active transition-all group/btn relative overflow-hidden active:scale-95">
                                    <Link href="/crm/leads/new" className="flex items-center gap-6 px-10">
                                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-950 group-hover/btn:bg-white/20 group-hover/btn:text-white transition-all shadow-inner relative z-10">
                                            <Plus className="h-6 w-6" />
                                        </div>
                                        <span className="relative z-10">REGISTRAR LEAD</span>
                                        <ArrowRight className="h-6 w-6 ml-auto group-hover/btn:translate-x-3 transition-transform relative z-10Opacity-40" />
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="h-24 rounded-[2rem] bg-white/5 border border-white/10 text-white hover:bg-white hover:text-slate-950 font-black italic uppercase tracking-tighter text-sm transition-all group/btn relative overflow-hidden active:scale-95">
                                    <Link href="/crm/pipeline" className="flex items-center gap-6 px-10">
                                        <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-indigo-400 group-hover/btn:bg-slate-950/20 group-hover/btn:text-slate-950 transition-all shadow-inner relative z-10 border border-white/5">
                                            <Target className="h-6 w-6" />
                                        </div>
                                        <span className="relative z-10">PIPELINE MASTER</span>
                                        <LayoutDashboard className="h-6 w-6 ml-auto opacity-20 group-hover/btn:opacity-100 transition-all relative z-10" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <Card className="border border-slate-100 bg-white shadow-premium rounded-[4rem] p-12 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                            <Activity className="h-24 w-24 text-indigo-600" />
                        </div>
                        <div className="flex flex-col gap-8 relative z-10">
                            <div className="flex items-center gap-6">
                                <div className="h-16 w-16 bg-slate-950 rounded-[1.2rem] flex items-center justify-center text-white shadow-active group-hover:rotate-12 transition-all duration-700">
                                    <Activity className="h-8 w-8 text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] italic mb-1 uppercase">Estado del Forecast</p>
                                    <h4 className="text-3xl font-black text-slate-950 italic tracking-tighter uppercase leading-none">DETERMINÍSTICO</h4>
                                </div>
                            </div>
                            <p className="text-[12px] text-slate-400 font-bold leading-relaxed italic pr-4">
                                Proyección de cierres basada en probabilidad ponderada vs <span className="text-indigo-500 font-black underline decoration-indigo-500/20">valor nominal</span> del pipeline activo en tiempo real.
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
