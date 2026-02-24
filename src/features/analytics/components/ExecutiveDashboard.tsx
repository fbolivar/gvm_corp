'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { analyticsService } from '../services/analyticsService'
import { ExecutiveSummary, CashFlowPoint, ProductProfitability } from '../types'
import { executiveReportService } from '../services/executiveReportService'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import Link from 'next/link'
import {
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts'
import {
    TrendingUp, TrendingDown, DollarSign, Calendar, Package,
    ArrowUpRight, ArrowDownRight, Clock, Target, Loader2, ArrowRight,
    Brain, ShieldCheck, Zap, Truck, MapPin, PackageCheck,
    FileText, Download, Share2
} from 'lucide-react'
import { format } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { useI18n } from '@/shared/stores/useLanguageStore'
import { cn } from "@/shared/lib/utils"

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];


export function ExecutiveDashboard() {
    const { t, language } = useI18n();
    const supabase = createClient();
    const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
    const [cashFlow, setCashFlow] = useState<CashFlowPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    const dateLocale = language === 'es' ? es : enUS;

    useEffect(() => {
        setIsMounted(true);
        async function loadData() {
            setLoading(true);
            try {
                const [sum, flow] = await Promise.all([
                    analyticsService.getExecutiveSummary(supabase),
                    analyticsService.getCashFlowProjection(supabase, 30)
                ]);
                setSummary(sum);
                setCashFlow(flow);
            } catch (error) {
                console.error("Error loading BI data:", error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-8">
                <div className="relative">
                    <div className="h-24 w-24 rounded-[2rem] bg-indigo-50 flex items-center justify-center border-4 border-white shadow-premium animate-bounce">
                        <TrendingUp className="h-10 w-10 text-indigo-600" />
                    </div>
                    <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white shadow-premium flex items-center justify-center">
                        <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <p className="text-slate-900 font-black italic uppercase tracking-tighter text-xl">
                        {language === 'es' ? 'Compilando Inteligencia Maestro' : 'Compiling Master Intelligence'}
                    </p>
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
                        {language === 'es' ? 'Sincronizando flujos de caja y rentabilidad...' : 'Syncing cash flows and profitability...'}
                    </p>
                </div>
            </div>
        )
    }

    const agingData = summary ? [
        { name: language === 'es' ? 'Corriente' : 'Current', value: summary.ar_aging.current },
        { name: '1-30', value: summary.ar_aging["1-30"] },
        { name: '31-60', value: summary.ar_aging["31-60"] },
        { name: '61-90', value: summary.ar_aging["61-90"] },
        { name: '90+', value: summary.ar_aging["90+"] },
    ].filter(d => d.value > 0) : [];

    const stats = [
        {
            title: language === 'es' ? 'Cartera Pendiente' : 'Outstanding Portfolio',
            value: summary?.total_ar || 0,
            icon: TrendingUp,
            desc: t.analytics.ar,
            trend: "+12.5%",
            color: "indigo"
        },
        {
            title: language === 'es' ? 'Obligaciones' : 'Obligations',
            value: summary?.total_ap || 0,
            icon: TrendingDown,
            desc: t.analytics.ap,
            trend: "-2.1%",
            color: "rose"
        },
        {
            title: language === 'es' ? 'Flujo Neto' : 'Net Flow',
            value: summary?.net_cash_flow || 0,
            icon: DollarSign,
            desc: t.analytics.net_cash_flow,
            trend: "Saneado",
            color: "emerald"
        },
        {
            title: language === 'es' ? 'Saldo 30D' : 'Balance 30D',
            value: cashFlow[cashFlow.length - 1]?.balance || 0,
            icon: Calendar,
            desc: t.analytics.projection_30d,
            trend: "Estimado",
            color: "amber"
        }
    ];

    const handleGenerateReport = () => {
        if (!summary) return;
        executiveReportService.generateBoardReport(summary, language);
    };

    return (
        <div className="space-y-12 pb-12">
            {/* 🏷️ EXECUTIVE HEADER & ACTIONS */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-2">
                    <h1 className="text-5xl font-black italic tracking-tighter text-slate-900 uppercase">
                        {language === 'es' ? 'Inteligencia de Negocio' : 'Business Intelligence'}
                    </h1>
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">
                        {language === 'es' ? 'Consolidación Maestra de Operaciones V3' : 'Master Consolidation of Operations V3'}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        onClick={handleGenerateReport}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-8 h-14 flex items-center gap-3 shadow-active transition-all group"
                    >
                        <FileText className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                        <span className="font-black italic uppercase tracking-tighter">
                            {language === 'es' ? 'Generar Reporte Mensual' : 'Generate Monthly Report'}
                        </span>
                        <Badge className="bg-white/20 text-white border-none text-[8px] h-5 px-2">PDF</Badge>
                    </Button>
                </div>
            </div>

            {/* 📊 INDUSTRIAL KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map((stat) => (
                    <Card key={stat.title} className="border-none bg-white shadow-premium rounded-[3rem] group hover:translate-y-[-8px] transition-all duration-700 overflow-hidden">
                        <CardContent className="p-10 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className={cn(
                                    "h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform duration-500",
                                    stat.color === 'indigo' ? "bg-indigo-50 text-indigo-600" :
                                        stat.color === 'rose' ? "bg-rose-50 text-rose-600" :
                                            stat.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                                                "bg-amber-50 text-amber-600"
                                )}>
                                    <stat.icon className="h-7 w-7" />
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{stat.desc}</span>
                                    <p className={cn(
                                        "text-xs font-black italic",
                                        stat.color === 'rose' ? "text-rose-500" : "text-emerald-500"
                                    )}>{stat.trend}</p>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic leading-none">
                                    ${stat.value.toLocaleString('es-CO')}
                                </h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] pt-1">{stat.title}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* 📈 MAIN CHART POD */}
            <Card className="border-none bg-slate-900 shadow-active rounded-[4rem] overflow-hidden group">
                <CardHeader className="p-12 md:p-16 border-b border-white/5 bg-white/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-8 bg-indigo-500 rounded-full" />
                                <CardTitle className="text-2xl md:text-4xl font-black italic tracking-tighter text-white uppercase leading-none">
                                    {language === 'es' ? 'Simulación de Liquidez' : 'Liquidity Simulation'}
                                </CardTitle>
                            </div>
                            <CardDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                {language === 'es'
                                    ? 'Proyección determinística de flujo de caja (Horizonte 30 días)'
                                    : 'Deterministic cash flow projection (30-day horizon)'}
                            </CardDescription>
                        </div>
                        <div className="flex gap-6 bg-black/20 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-10 bg-indigo-500 rounded-full" />
                                <div>
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Balance Final</p>
                                    <p className="text-lg font-black text-white font-mono italic">
                                        ${cashFlow[cashFlow.length - 1]?.balance.toLocaleString('es-CO')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-10 md:p-16">
                    <div className="h-[400px] w-full">
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={cashFlow}>
                                    <defs>
                                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                                        tickFormatter={(str) => format(new Date(str), 'dd MMM', { locale: dateLocale }).toUpperCase()}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }}
                                        tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '1.5rem',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            backgroundColor: '#0f172a',
                                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                                            padding: '1.5rem',
                                            color: '#fff'
                                        }}
                                        itemStyle={{ color: '#818cf8', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                                        labelStyle={{ color: '#fff', fontWeight: 900, marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}
                                        labelFormatter={(label) => format(new Date(label), 'PPPP', { locale: dateLocale }).toUpperCase()}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="balance"
                                        stroke="#6366f1"
                                        strokeWidth={6}
                                        fillOpacity={1}
                                        fill="url(#colorBalance)"
                                        animationDuration={2000}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 🏦 TREASURY PULSE & SURVIVAL */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Card Liquidez vs Pasivos */}
                <Card className="lg:col-span-7 border-none bg-white shadow-premium rounded-[4rem] overflow-hidden group">
                    <CardHeader className="p-12 pb-0">
                        <div className="flex items-center gap-5">
                            <div className="h-14 w-14 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 shadow-inner">
                                <DollarSign className="h-7 w-7 text-emerald-600" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">
                                    {language === 'es' ? 'Liquidez vs Pasivos' : 'Liquidity vs Liabilities'}
                                </CardTitle>
                                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 pt-1">
                                    {language === 'es' ? 'Cobertura de obligaciones inmediatas' : 'Coverage of immediate obligations'}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Liquidez Inmediata</p>
                                <p className="text-2xl font-black text-slate-900 italic tracking-tighter">${(summary?.liquidity_metrics?.immediate_liquidity || 0).toLocaleString('es-CO')}</p>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Pasivos Corto Plazo</p>
                                <p className="text-2xl font-black text-rose-600 italic tracking-tighter">${(summary?.liquidity_metrics?.short_term_liabilities || 0).toLocaleString('es-CO')}</p>
                            </div>
                        </div>
                        <div className="h-64">
                            {isMounted && (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[
                                        { name: language === 'es' ? 'Disponibilidad' : 'Availability', val: summary?.liquidity_metrics?.immediate_liquidity || 0 },
                                        { name: language === 'es' ? 'Pasivos (AP+Nómina)' : 'Liabilities (AP+Payroll)', val: summary?.liquidity_metrics?.short_term_liabilities || 0 }
                                    ]}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                                        <YAxis hide />
                                        <Bar dataKey="val" radius={[12, 12, 12, 12]} barSize={80}>
                                            {[0, 1].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f43f5e'} />
                                            ))}
                                        </Bar>
                                        <Tooltip
                                            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-slate-900 p-4 rounded-2xl shadow-premium border border-white/10">
                                                            <p className="text-[10px] font-black text-white uppercase italic tracking-tighter">${Number(payload[0].value).toLocaleString('es-CO')}</p>
                                                        </div>
                                                    )
                                                }
                                                return null;
                                            }}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Survival Days Card */}
                <Card className="lg:col-span-5 border-none bg-slate-950 shadow-active rounded-[4rem] text-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform">
                        <Zap className="h-64 w-64" />
                    </div>
                    <CardHeader className="p-12 relative z-10">
                        <div className="flex items-center gap-5">
                            <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-md">
                                <Clock className="h-7 w-7 text-indigo-400" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black italic tracking-tighter uppercase leading-none text-white">
                                    {language === 'es' ? 'Días de Supervivencia' : 'Survival Days'}
                                </CardTitle>
                                <CardDescription className="text-slate-500 text-[10px] font-black uppercase tracking-widest pt-1">
                                    {language === 'es' ? 'Resiliencia ante cero ventas' : 'Resilience with zero sales'}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-12 pt-0 flex flex-col items-center justify-center relative z-10 h-full">
                        <div className="relative mb-8">
                            <div className="h-48 w-48 rounded-full border-[12px] border-white/5 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.1)]">
                                <span className="text-6xl font-black italic tracking-tighter text-white">{summary?.liquidity_metrics?.survival_days || 0}</span>
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pt-2">Días</span>
                            </div>
                            <div className="absolute -top-4 -right-4 h-16 w-16 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-premium rotate-12">
                                <Zap className="h-8 w-8 text-white" />
                            </div>
                        </div>
                        <div className="w-full space-y-4">
                            <div className="flex justify-between items-center p-5 bg-white/5 rounded-3xl border border-white/5">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gasto Diario (Burn)</span>
                                <span className="text-sm font-black italic text-white tracking-tighter">${(summary?.liquidity_metrics?.burn_rate || 0).toLocaleString('es-CO')}</span>
                            </div>
                            <p className="text-[9px] text-slate-500 text-center uppercase tracking-widest leading-relaxed px-10">
                                {language === 'es'
                                    ? 'Capacidad de operación con saldo en bancos vs promedio de egresos'
                                    : 'Operational capacity with bank balance vs average expenses'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                {/* Product Profitability Core */}
                <Card className="lg:col-span-7 border-none bg-white shadow-premium rounded-[4rem] overflow-hidden group">
                    <CardHeader className="p-12 border-b border-slate-50">
                        <div className="flex items-center gap-6">
                            <div className="h-16 w-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white shadow-active group-hover:rotate-6 transition-transform">
                                <Package className="h-8 w-8" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase">
                                    {t.analytics.profitable_products}
                                </CardTitle>
                                <CardDescription className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 pt-1 underline decoration-slate-100 underline-offset-4">
                                    {language === 'es' ? 'Top 5 productos por margen de contribución real' : 'Top 5 products by real contribution margin'}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-12 space-y-10">
                        {summary?.top_profitable_products.map((product: ProductProfitability, idx) => (
                            <div key={product.product_id} className="group/item relative">
                                <div className="flex justify-between items-end mb-4 pr-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-slate-200">0{idx + 1}</span>
                                            <p className="text-lg font-black text-slate-900 uppercase tracking-tighter italic group-hover/item:text-indigo-600 transition-colors">
                                                {product.product_name}
                                            </p>
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 tracking-widest pl-7">SKU: {product.sku}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-emerald-500 italic leading-none">{product.margin.toFixed(1)}%</p>
                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest pt-1">
                                            {product.units_sold} {language === 'es' ? 'UNIDADES VENDIDAS' : 'UNITS SOLD'}
                                        </p>
                                    </div>
                                </div>
                                <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-1">
                                    <div
                                        className="h-full bg-slate-900 rounded-full transition-all duration-1000 ease-out shadow-sm"
                                        style={{ width: `${product.margin}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* AR Aging / Portfolio IQ */}
                <Card className="lg:col-span-5 border-none bg-indigo-600 shadow-active rounded-[4rem] text-white overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
                        <Clock className="h-48 w-48" />
                    </div>

                    <CardHeader className="p-12 relative z-10">
                        <div className="flex items-center gap-5">
                            <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                                <Clock className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-black italic tracking-tighter uppercase leading-none">
                                    Portfolio IQ
                                </CardTitle>
                                <div className="text-indigo-200 text-[10px] font-black uppercase tracking-widest pt-1 flex items-center gap-2">
                                    {language === 'es' ? 'Antigüedad de Cartera (AR Aging)' : 'Portfolio Age (AR Aging)'}
                                    {summary?.agent_metrics?.isActive && (
                                        <Badge className="bg-white/20 text-white border-none text-[8px] h-4 rounded-full px-2 animate-pulse flex gap-1">
                                            <Brain className="w-2 h-2" /> BOT ACTIVE
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-12 pt-0 flex flex-col items-center relative z-10 space-y-8">
                        {/* Métricas de Impacto del Bot */}
                        <div className="grid grid-cols-2 gap-4 w-full">
                            <div className="bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-md">
                                <p className="text-[8px] font-black text-indigo-200 uppercase tracking-widest leading-none mb-2">Acciones de Cobro</p>
                                <div className="flex items-center gap-3">
                                    <Zap className="h-4 w-4 text-amber-400" />
                                    <span className="text-xl font-black italic">{summary?.agent_metrics?.totalActions || 0}</span>
                                </div>
                            </div>
                            <div className="bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-md">
                                <p className="text-[8px] font-black text-indigo-200 uppercase tracking-widest leading-none mb-2">Recaudo por Bot</p>
                                <div className="flex items-center gap-3">
                                    <DollarSign className="h-4 w-4 text-emerald-400" />
                                    <span className="text-xl font-black italic">${(summary?.agent_metrics?.totalRecoveredAmount || 0).toLocaleString('es-CO')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-[250px] w-full">
                            {isMounted && (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={agingData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={110}
                                            paddingAngle={8}
                                            dataKey="value"
                                            animationDuration={1500}
                                        >
                                            {agingData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#fff', '#818cf8', '#6366f1', '#4f46e5', '#3730a3'][index % 5]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '1.5rem',
                                                border: 'none',
                                                backgroundColor: '#1e1b4b',
                                                color: '#fff',
                                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                                            }}
                                            itemStyle={{ color: '#fff', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase' }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            formatter={(val) => <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">{val}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        <div className="bg-white/10 p-8 rounded-[2.5rem] w-full border border-white/10 backdrop-blur-xl group-hover:scale-[1.02] transition-transform duration-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="h-16 w-16 bg-white rounded-3xl flex items-center justify-center shadow-premium rotate-3">
                                        <Target className="h-8 w-8 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">
                                            {language === 'es' ? 'Eficiencia del Agente' : 'Agent Efficiency'}
                                        </p>
                                        <p className="text-2xl font-black italic tracking-tighter">
                                            {summary?.agent_metrics?.recoveryRate || 0}% de Recuperación Total
                                        </p>
                                    </div>
                                </div>
                                <Link href="/accounting/cartera/ai" className="hover:scale-110 transition-transform">
                                    <ArrowRight className="h-8 w-8 text-white group-hover:translate-x-3 transition-all duration-500" />
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 🚚 LAST MILE & LOGISTICS */}
                <Card className="lg:col-span-12 border-none bg-white shadow-premium rounded-[4rem] overflow-hidden group">
                    <CardHeader className="p-12 pb-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className="h-14 w-14 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100 shadow-inner">
                                    <Truck className="h-7 w-7 text-amber-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">
                                        {language === 'es' ? 'Logística y Última Milla' : 'Logistics & Last Mile'}
                                    </CardTitle>
                                    <CardDescription className="text-[10px] font-black uppercase tracking-widest text-slate-400 pt-1">
                                        {language === 'es' ? 'Estado de despachos y eficiencia de entrega' : 'Shipment status and delivery efficiency'}
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 text-center">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Días Promedio Entrega</p>
                                    <p className="text-xl font-black text-slate-900 italic">{summary?.logistics_metrics?.avg_delivery_days || 0} d</p>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-12">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Pendientes de Despacho */}
                            <div className="relative p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 group/card hover:bg-slate-900 transition-colors duration-500">
                                <div className="absolute top-6 right-6 h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover/card:bg-slate-800 transition-colors">
                                    <Package className="h-5 w-5 text-amber-500" />
                                </div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 group-hover/card:text-slate-500 transition-colors">Pendiente Despacho</p>
                                <h4 className="text-5xl font-black text-slate-900 italic tracking-tighter leading-none group-hover/card:text-white transition-colors">
                                    {summary?.logistics_metrics?.pending_dispatch || 0}
                                </h4>
                                <p className="text-[10px] font-black text-slate-400 mt-4 group-hover/card:text-slate-600 transition-colors">ÓRDENES EN BODEGA / EMPAQUE</p>
                            </div>

                            {/* En Tránsito */}
                            <div className="relative p-8 bg-indigo-50 rounded-[2.5rem] border border-indigo-100 group/card hover:bg-indigo-600 transition-colors duration-500 shadow-sm">
                                <div className="absolute top-6 right-6 h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover/card:bg-indigo-500 transition-colors">
                                    <MapPin className="h-5 w-5 text-indigo-500 group-hover/card:text-white" />
                                </div>
                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 group-hover/card:text-indigo-200 transition-colors">En Tránsito</p>
                                <h4 className="text-5xl font-black text-indigo-900 italic tracking-tighter leading-none group-hover/card:text-white transition-colors">
                                    {summary?.logistics_metrics?.in_transit || 0}
                                </h4>
                                <p className="text-[10px] font-black text-indigo-300 mt-4 group-hover/card:text-indigo-200 transition-colors">VIAJANDO AL DESTINATARIO</p>
                            </div>

                            {/* Entregado Hoy */}
                            <div className="relative p-8 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 group/card hover:bg-emerald-600 transition-colors duration-500">
                                <div className="absolute top-6 right-6 h-10 w-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover/card:bg-emerald-500 transition-colors">
                                    <PackageCheck className="h-5 w-5 text-emerald-500 group-hover/card:text-white" />
                                </div>
                                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4 group-hover/card:text-emerald-200 transition-colors">Entregado Hoy</p>
                                <h4 className="text-5xl font-black text-emerald-900 italic tracking-tighter leading-none group-hover/card:text-white transition-colors">
                                    {summary?.logistics_metrics?.delivered_today || 0}
                                </h4>
                                <p className="text-[10px] font-black text-emerald-400 mt-4 group-hover/card:text-emerald-200 transition-colors">VENTAS FINALIZADAS (EXITO)</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
