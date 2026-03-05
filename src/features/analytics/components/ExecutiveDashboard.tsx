'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { analyticsService } from '../services/analyticsService';
import { ExecutiveSummary, CashFlowPoint, ProductProfitability } from '../types';
import { executiveReportService } from '../services/executiveReportService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import Link from 'next/link';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    TrendingUp, TrendingDown, DollarSign, Calendar, Package,
    Clock, Target, Loader2, ArrowRight,
    Brain, Zap, Truck, MapPin, PackageCheck,
    FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useI18n } from '@/shared/stores/useLanguageStore';
import { cn } from '@/shared/lib/utils';

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
                    analyticsService.getCashFlowProjection(supabase, 30),
                ]);
                setSummary(sum);
                setCashFlow(flow);
            } catch (error: unknown) {
                const err = error as Error;
                console.error('Error loading BI data:', err.message ?? error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
                </div>
                <div className="text-center">
                    <p className="text-sm font-bold text-slate-900">
                        {language === 'es' ? 'Cargando Inteligencia de Negocio' : 'Loading Business Intelligence'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                        {language === 'es' ? 'Sincronizando flujos de caja y rentabilidad...' : 'Syncing cash flows and profitability...'}
                    </p>
                </div>
            </div>
        );
    }

    const agingData = summary
        ? [
            { name: language === 'es' ? 'Corriente' : 'Current', value: summary.ar_aging.current },
            { name: '1-30', value: summary.ar_aging['1-30'] },
            { name: '31-60', value: summary.ar_aging['31-60'] },
            { name: '61-90', value: summary.ar_aging['61-90'] },
            { name: '90+', value: summary.ar_aging['90+'] },
        ].filter(d => d.value > 0)
        : [];

    const stats = [
        {
            title: language === 'es' ? 'Cartera Pendiente' : 'Outstanding Portfolio',
            value: summary?.total_ar || 0,
            icon: TrendingUp,
            desc: t.analytics.ar,
            trend: '+12.5%',
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
        },
        {
            title: language === 'es' ? 'Obligaciones' : 'Obligations',
            value: summary?.total_ap || 0,
            icon: TrendingDown,
            desc: t.analytics.ap,
            trend: '-2.1%',
            color: 'text-rose-600',
            bg: 'bg-rose-50',
        },
        {
            title: language === 'es' ? 'Flujo Neto' : 'Net Flow',
            value: summary?.net_cash_flow || 0,
            icon: DollarSign,
            desc: t.analytics.net_cash_flow,
            trend: 'Saneado',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
        },
        {
            title: language === 'es' ? 'Saldo 30D' : 'Balance 30D',
            value: cashFlow[cashFlow.length - 1]?.balance || 0,
            icon: Calendar,
            desc: t.analytics.projection_30d,
            trend: 'Estimado',
            color: 'text-amber-600',
            bg: 'bg-amber-50',
        },
    ];

    const handleGenerateReport = () => {
        if (!summary) return;
        executiveReportService.generateBoardReport(summary, language);
    };

    return (
        <div className="space-y-6">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">
                        {language === 'es' ? 'Inteligencia de Negocio' : 'Business Intelligence'}
                    </h2>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        {language === 'es' ? 'Consolidación de Operaciones' : 'Operations Consolidation'}
                    </p>
                </div>
                <Button
                    onClick={handleGenerateReport}
                    className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold gap-2"
                >
                    <FileText className="h-3.5 w-3.5" />
                    {language === 'es' ? 'Reporte Mensual' : 'Monthly Report'}
                    <Badge className="bg-white/20 text-white border-none text-[9px] h-4 px-1.5">PDF</Badge>
                </Button>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Card key={stat.title} className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', stat.bg)}>
                                    <stat.icon className={cn('h-5 w-5', stat.color)} />
                                </div>
                                <Badge variant="secondary" className="text-[10px] font-semibold">{stat.trend}</Badge>
                            </div>
                            <div>
                                <p className="text-xl font-bold text-slate-900 tabular-nums">${stat.value.toLocaleString('es-CO')}</p>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">{stat.title}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Cash Flow Chart */}
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <CardHeader className="p-5 border-b border-slate-50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-sm font-bold text-slate-900">
                                {language === 'es' ? 'Simulación de Liquidez' : 'Liquidity Simulation'}
                            </CardTitle>
                            <CardDescription className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                                {language === 'es'
                                    ? 'Proyección de flujo de caja (Horizonte 30 días)'
                                    : 'Cash flow projection (30-day horizon)'}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                            <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                            <div>
                                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Balance Final</p>
                                <p className="text-sm font-bold text-slate-900 tabular-nums">
                                    ${cashFlow[cashFlow.length - 1]?.balance.toLocaleString('es-CO')}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-5">
                    <div className="h-[350px] w-full">
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={cashFlow}>
                                    <defs>
                                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                        tickFormatter={(str) => format(new Date(str), 'dd MMM', { locale: dateLocale })}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                        tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            borderRadius: '0.75rem',
                                            border: '1px solid #e2e8f0',
                                            backgroundColor: '#fff',
                                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                            padding: '0.75rem',
                                        }}
                                        itemStyle={{ color: '#6366f1', fontWeight: 600, fontSize: '11px' }}
                                        labelStyle={{ color: '#334155', fontWeight: 600, marginBottom: '0.25rem' }}
                                        labelFormatter={(label) => format(new Date(label), 'PPP', { locale: dateLocale })}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="balance"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorBalance)"
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Liquidity vs Liabilities + Survival Days */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Liquidez vs Pasivos */}
                <Card className="lg:col-span-7 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="p-5 pb-0">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                <DollarSign className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-bold text-slate-900">
                                    {language === 'es' ? 'Liquidez vs Pasivos' : 'Liquidity vs Liabilities'}
                                </CardTitle>
                                <CardDescription className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                                    {language === 'es' ? 'Cobertura de obligaciones inmediatas' : 'Coverage of immediate obligations'}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Liquidez Inmediata</p>
                                <p className="text-lg font-bold text-slate-900 tabular-nums">${(summary?.liquidity_metrics?.immediate_liquidity || 0).toLocaleString('es-CO')}</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Pasivos Corto Plazo</p>
                                <p className="text-lg font-bold text-rose-600 tabular-nums">${(summary?.liquidity_metrics?.short_term_liabilities || 0).toLocaleString('es-CO')}</p>
                            </div>
                        </div>
                        <div className="h-52">
                            {isMounted && (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={[
                                        { name: language === 'es' ? 'Disponibilidad' : 'Availability', val: summary?.liquidity_metrics?.immediate_liquidity || 0 },
                                        { name: language === 'es' ? 'Pasivos' : 'Liabilities', val: summary?.liquidity_metrics?.short_term_liabilities || 0 },
                                    ]}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#94a3b8' }} />
                                        <YAxis hide />
                                        <Bar dataKey="val" radius={[8, 8, 8, 8]} barSize={60}>
                                            {[0, 1].map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f43f5e'} />
                                            ))}
                                        </Bar>
                                        <Tooltip
                                            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-white p-3 rounded-xl shadow-md border border-slate-100">
                                                            <p className="text-xs font-bold text-slate-900 tabular-nums">${Number(payload[0].value).toLocaleString('es-CO')}</p>
                                                        </div>
                                                    );
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

                {/* Survival Days */}
                <Card className="lg:col-span-5 rounded-2xl border border-slate-100 bg-slate-900 shadow-sm text-white overflow-hidden">
                    <CardHeader className="p-5">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
                                <Clock className="h-5 w-5 text-indigo-400" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-bold text-white">
                                    {language === 'es' ? 'Días de Supervivencia' : 'Survival Days'}
                                </CardTitle>
                                <CardDescription className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                                    {language === 'es' ? 'Resiliencia ante cero ventas' : 'Resilience with zero sales'}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-0 flex flex-col items-center">
                        <div className="relative mb-6">
                            <div className="h-32 w-32 rounded-full border-8 border-white/5 flex flex-col items-center justify-center">
                                <span className="text-4xl font-bold text-white tabular-nums">{summary?.liquidity_metrics?.survival_days || 0}</span>
                                <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mt-1">Días</span>
                            </div>
                            <div className="absolute -top-2 -right-2 h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                                <Zap className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <div className="w-full space-y-3">
                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Gasto Diario (Burn)</span>
                                <span className="text-sm font-bold text-white tabular-nums">${(summary?.liquidity_metrics?.burn_rate || 0).toLocaleString('es-CO')}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 text-center leading-relaxed px-4">
                                {language === 'es'
                                    ? 'Capacidad de operación con saldo en bancos vs promedio de egresos'
                                    : 'Operational capacity with bank balance vs average expenses'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Product Profitability + AR Aging */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Product Profitability */}
                <Card className="lg:col-span-7 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="p-5 border-b border-slate-50">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                                <Package className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-bold text-slate-900">
                                    {t.analytics.profitable_products}
                                </CardTitle>
                                <CardDescription className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                                    {language === 'es' ? 'Top 5 productos por margen de contribución' : 'Top 5 products by contribution margin'}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-5">
                        {summary?.top_profitable_products.map((product: ProductProfitability, idx) => (
                            <div key={product.product_id}>
                                <div className="flex justify-between items-end mb-2">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-semibold text-slate-300 tabular-nums">0{idx + 1}</span>
                                            <p className="text-sm font-bold text-slate-900">{product.product_name}</p>
                                        </div>
                                        <p className="text-[10px] text-slate-400 pl-6">SKU: {product.sku}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-emerald-500 tabular-nums">{product.margin.toFixed(1)}%</p>
                                        <p className="text-[10px] text-slate-400">{product.units_sold} {language === 'es' ? 'uds vendidas' : 'units sold'}</p>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                    <div
                                        className="h-full bg-slate-900 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${product.margin}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* AR Aging / Portfolio IQ */}
                <Card className="lg:col-span-5 rounded-2xl border border-indigo-100 bg-indigo-600 shadow-sm text-white overflow-hidden">
                    <CardHeader className="p-5">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <Clock className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-bold text-white">Portfolio IQ</CardTitle>
                                <div className="text-[10px] font-semibold text-indigo-200 uppercase tracking-wider mt-0.5 flex items-center gap-2">
                                    {language === 'es' ? 'Antigüedad de Cartera' : 'Portfolio Age'}
                                    {summary?.agent_metrics?.isActive && (
                                        <Badge className="bg-white/20 text-white border-none text-[9px] h-4 rounded-full px-1.5 flex gap-1">
                                            <Brain className="w-2 h-2" /> BOT
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-0 space-y-4">
                        {/* Bot Metrics */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                                <p className="text-[9px] font-semibold text-indigo-200 uppercase tracking-wider mb-1">Acciones de Cobro</p>
                                <div className="flex items-center gap-2">
                                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                                    <span className="text-lg font-bold tabular-nums">{summary?.agent_metrics?.totalActions || 0}</span>
                                </div>
                            </div>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                                <p className="text-[9px] font-semibold text-indigo-200 uppercase tracking-wider mb-1">Recaudo Bot</p>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                                    <span className="text-lg font-bold tabular-nums">${(summary?.agent_metrics?.totalRecoveredAmount || 0).toLocaleString('es-CO')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Pie Chart */}
                        <div className="h-[220px] w-full">
                            {isMounted && (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={agingData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={90}
                                            paddingAngle={6}
                                            dataKey="value"
                                            animationDuration={1200}
                                        >
                                            {agingData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={['#fff', '#818cf8', '#6366f1', '#4f46e5', '#3730a3'][index % 5]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '0.75rem',
                                                border: 'none',
                                                backgroundColor: '#1e1b4b',
                                                color: '#fff',
                                            }}
                                            itemStyle={{ color: '#fff', fontWeight: 600, fontSize: '11px' }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            formatter={(val) => <span className="text-[10px] font-semibold text-indigo-200">{val}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Agent Efficiency */}
                        <div className="bg-white/10 p-4 rounded-xl w-full border border-white/10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center">
                                        <Target className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold text-indigo-200 uppercase tracking-wider">
                                            {language === 'es' ? 'Eficiencia del Agente' : 'Agent Efficiency'}
                                        </p>
                                        <p className="text-sm font-bold">
                                            {summary?.agent_metrics?.recoveryRate || 0}% de Recuperación
                                        </p>
                                    </div>
                                </div>
                                <Link href="/accounting/cartera/ai">
                                    <ArrowRight className="h-5 w-5 text-white/60 hover:text-white transition-colors" />
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Logistics */}
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <CardHeader className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center">
                                <Truck className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-bold text-slate-900">
                                    {language === 'es' ? 'Logística y Última Milla' : 'Logistics & Last Mile'}
                                </CardTitle>
                                <CardDescription className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                                    {language === 'es' ? 'Estado de despachos y eficiencia de entrega' : 'Shipment status and delivery efficiency'}
                                </CardDescription>
                            </div>
                        </div>
                        <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 text-center">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Días Promedio Entrega</p>
                            <p className="text-lg font-bold text-slate-900 tabular-nums">{summary?.logistics_metrics?.avg_delivery_days || 0} d</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            {
                                label: 'Pendiente Despacho',
                                value: summary?.logistics_metrics?.pending_dispatch || 0,
                                sub: 'Órdenes en bodega / empaque',
                                icon: Package,
                                bg: 'bg-slate-50',
                                border: 'border-slate-100',
                                iconColor: 'text-amber-500',
                                valueColor: 'text-slate-900',
                            },
                            {
                                label: 'En Tránsito',
                                value: summary?.logistics_metrics?.in_transit || 0,
                                sub: 'Viajando al destinatario',
                                icon: MapPin,
                                bg: 'bg-indigo-50',
                                border: 'border-indigo-100',
                                iconColor: 'text-indigo-500',
                                valueColor: 'text-indigo-900',
                            },
                            {
                                label: 'Entregado Hoy',
                                value: summary?.logistics_metrics?.delivered_today || 0,
                                sub: 'Ventas finalizadas',
                                icon: PackageCheck,
                                bg: 'bg-emerald-50',
                                border: 'border-emerald-100',
                                iconColor: 'text-emerald-500',
                                valueColor: 'text-emerald-900',
                            },
                        ].map((item) => (
                            <div key={item.label} className={cn('p-5 rounded-xl border', item.bg, item.border)}>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{item.label}</p>
                                    <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                                        <item.icon className={cn('h-4 w-4', item.iconColor)} />
                                    </div>
                                </div>
                                <p className={cn('text-2xl font-bold tabular-nums', item.valueColor)}>{item.value}</p>
                                <p className="text-[10px] text-slate-400 mt-1">{item.sub}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
