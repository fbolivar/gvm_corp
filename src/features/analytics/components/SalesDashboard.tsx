'use client';

import { useMemo } from 'react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { TrendingUp, TrendingDown, Users, Star, AlertTriangle, Activity } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { MonthlySalesRow, TopClientRow } from '@/app/(main)/analytics/sales/page';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    monthlySales: MonthlySalesRow[];
    topClients: TopClientRow[];
}

interface MonthlyChartPoint {
    month: string;
    label: string;
    currentYear: number;
    prevYear: number;
    currentCount: number;
}

interface KpiSemaphore {
    label: string;
    value: string;
    detail: string;
    color: 'green' | 'yellow' | 'red' | 'blue';
    icon: React.ComponentType<{ className?: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_LABELS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatCOP(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toLocaleString('es-CO')}`;
}

function formatCOPFull(value: number): string {
    return `$${value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function truncate(text: string, max: number): string {
    return text.length > max ? `${text.substring(0, max)}…` : text;
}

const CLIENT_GRADIENT = [
    '#6366f1', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd',
    '#818cf8', '#6d28d9', '#7c3aed', '#5b21b6', '#4c1d95',
];

const SEMAPHORE_BG: Record<KpiSemaphore['color'], string> = {
    green: 'bg-emerald-50',
    yellow: 'bg-amber-50',
    red: 'bg-rose-50',
    blue: 'bg-indigo-50',
};

const SEMAPHORE_TEXT: Record<KpiSemaphore['color'], string> = {
    green: 'text-emerald-600',
    yellow: 'text-amber-600',
    red: 'text-rose-600',
    blue: 'text-indigo-600',
};

// ─── Custom Tooltips ─────────────────────────────────────────────────────────

interface TooltipPayloadItem {
    name: string;
    value: number;
    color: string;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string;
}

function ComposedTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;
    return (
        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-md min-w-[160px]">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
            {payload.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-4 mb-0.5">
                    <span className="text-[10px] font-semibold" style={{ color: item.color }}>
                        {item.name}
                    </span>
                    <span className="text-xs font-bold text-slate-900 tabular-nums">
                        {formatCOPFull(item.value)}
                    </span>
                </div>
            ))}
        </div>
    );
}

function ClientTooltip({ active, payload }: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;
    return (
        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-md">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Facturación</p>
            <p className="text-sm font-bold text-slate-900 tabular-nums">{formatCOPFull(payload[0].value)}</p>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SalesDashboard({ monthlySales, topClients }: Props) {
    const currentYear = new Date().getFullYear();
    const prevYear = currentYear - 1;

    // ── Build 12-month comparativo chart data ──
    const monthlyChartData = useMemo<MonthlyChartPoint[]>(() => {
        const map = new Map<number, { current: number; prev: number; count: number }>();
        for (let i = 1; i <= 12; i++) {
            map.set(i, { current: 0, prev: 0, count: 0 });
        }
        for (const row of monthlySales) {
            const m = new Date(row.month).getUTCMonth() + 1;
            const entry = map.get(m)!;
            if (row.year === currentYear) {
                entry.current = row.total;
                entry.count = row.count;
            } else {
                entry.prev = row.total;
            }
        }
        return Array.from(map.entries()).map(([monthNum, vals]) => ({
            month: String(monthNum),
            label: MONTH_LABELS_ES[monthNum - 1],
            currentYear: vals.current,
            prevYear: vals.prev,
            currentCount: vals.count,
        }));
    }, [monthlySales, currentYear]);

    // ── Build top clients bar data ──
    const topClientsData = useMemo(() =>
        topClients.map((c) => ({
            name: truncate(c.legal_name, 22),
            fullName: c.legal_name,
            total: c.total,
        })),
        [topClients],
    );

    // ── KPI Calculations ──
    const kpis = useMemo<KpiSemaphore[]>(() => {
        const currentMonthIdx = new Date().getMonth();
        const currentData = monthlyChartData[currentMonthIdx];
        const prevMonthData = currentMonthIdx > 0 ? monthlyChartData[currentMonthIdx - 1] : null;

        const momGrowth = prevMonthData && prevMonthData.currentYear > 0
            ? ((currentData.currentYear - prevMonthData.currentYear) / prevMonthData.currentYear) * 100
            : 0;
        const momColor: KpiSemaphore['color'] = momGrowth > 5 ? 'green' : momGrowth >= 0 ? 'yellow' : 'red';

        const currentTotal = monthlyChartData.reduce((s, r) => s + r.currentYear, 0);
        const currentCount = monthlyChartData.reduce((s, r) => s + r.currentCount, 0);
        const prevTotal = monthlyChartData.reduce((s, r) => s + r.prevYear, 0);
        const prevCountApprox = monthlySales.filter(r => r.year === prevYear).reduce((s, r) => s + r.count, 0);
        const avgTicketCurrent = currentCount > 0 ? currentTotal / currentCount : 0;
        const avgTicketPrev = prevCountApprox > 0 ? prevTotal / prevCountApprox : 0;
        const ticketDiff = avgTicketPrev > 0
            ? ((avgTicketCurrent - avgTicketPrev) / avgTicketPrev) * 100
            : 0;

        const top3Total = topClients.slice(0, 3).reduce((s, c) => s + c.total, 0);
        const totalYear = topClients.reduce((s, c) => s + c.total, 0);
        const concentration = totalYear > 0 ? (top3Total / totalYear) * 100 : 0;
        const concentrationColor: KpiSemaphore['color'] = concentration > 70 ? 'red' : concentration > 50 ? 'yellow' : 'green';

        const peakMonth = monthlyChartData.reduce((best, cur) =>
            cur.currentYear > best.currentYear ? cur : best,
            monthlyChartData[0],
        );

        return [
            {
                label: 'Crecimiento MoM',
                value: `${momGrowth >= 0 ? '+' : ''}${momGrowth.toFixed(1)}%`,
                detail: prevMonthData
                    ? `vs ${MONTH_LABELS_ES[currentMonthIdx - 1] ?? 'mes anterior'}`
                    : 'Sin mes anterior',
                color: momColor,
                icon: momGrowth >= 0 ? TrendingUp : TrendingDown,
            },
            {
                label: 'Ticket Promedio',
                value: formatCOP(avgTicketCurrent),
                detail: `${ticketDiff >= 0 ? '+' : ''}${ticketDiff.toFixed(1)}% vs ${prevYear}`,
                color: ticketDiff >= 0 ? 'green' : 'red',
                icon: Activity,
            },
            {
                label: 'Concentración Top 3',
                value: `${concentration.toFixed(1)}%`,
                detail: topClients[0]?.legal_name ? truncate(topClients[0].legal_name, 18) : 'Sin datos',
                color: concentrationColor,
                icon: concentrationColor === 'red' ? AlertTriangle : Users,
            },
            {
                label: 'Mes Pico',
                value: MONTH_LABELS_ES[parseInt(peakMonth.month) - 1] ?? '-',
                detail: formatCOP(peakMonth.currentYear),
                color: 'blue',
                icon: Star,
            },
        ];
    }, [monthlyChartData, topClients, monthlySales, currentYear, prevYear]);

    return (
        <div className="space-y-6">
            {/* KPI Semaphore Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi) => (
                    <Card key={kpi.label} className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className={cn(
                                    'h-10 w-10 rounded-xl flex items-center justify-center',
                                    SEMAPHORE_BG[kpi.color],
                                )}>
                                    <kpi.icon className={cn('h-5 w-5', SEMAPHORE_TEXT[kpi.color])} />
                                </div>
                                <Badge variant="secondary" className="text-[10px] font-semibold">{kpi.label}</Badge>
                            </div>
                            <div>
                                <p className={cn('text-xl font-bold tabular-nums', SEMAPHORE_TEXT[kpi.color])}>{kpi.value}</p>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">{kpi.detail}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Comparativo Mensual */}
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <CardHeader className="p-5 border-b border-slate-50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-sm font-bold text-slate-900">
                                Comparativo Mensual
                            </CardTitle>
                            <CardDescription className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                                Facturación {currentYear} vs {prevYear} por mes
                            </CardDescription>
                        </div>
                        <div className="flex gap-4 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-1.5">
                                <div className="h-2.5 w-2.5 rounded-sm bg-indigo-600" />
                                <span className="text-[10px] font-semibold text-slate-500">{currentYear}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="h-0.5 w-4 border-t-2 border-dashed border-slate-400" />
                                <span className="text-[10px] font-semibold text-slate-500">{prevYear}</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-5">
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={monthlyChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="label"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                    tickFormatter={formatCOP}
                                    width={60}
                                />
                                <Tooltip content={<ComposedTooltip />} />
                                <Legend
                                    formatter={(val) => (
                                        <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 600 }}>
                                            {val === 'currentYear' ? String(currentYear) : String(prevYear)}
                                        </span>
                                    )}
                                />
                                <Bar
                                    dataKey="currentYear"
                                    name="currentYear"
                                    fill="#6366f1"
                                    radius={[6, 6, 0, 0]}
                                    maxBarSize={40}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="prevYear"
                                    name="prevYear"
                                    stroke="#94a3b8"
                                    strokeWidth={2}
                                    strokeDasharray="6 3"
                                    dot={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Top 10 Clientes */}
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <CardHeader className="p-5 border-b border-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                            <Users className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-bold text-slate-900">
                                Top 10 Clientes
                            </CardTitle>
                            <CardDescription className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                                Concentración de facturación · Año {currentYear}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-5">
                    {topClientsData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Users className="h-8 w-8 text-slate-200" />
                            <p className="text-[10px] font-semibold text-slate-400">Sin datos de clientes</p>
                        </div>
                    ) : (
                        <div className="h-[380px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={topClientsData}
                                    margin={{ top: 0, right: 16, left: 8, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis
                                        type="number"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                                        tickFormatter={formatCOP}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                                        width={130}
                                    />
                                    <Tooltip content={<ClientTooltip />} />
                                    <Bar dataKey="total" radius={[0, 8, 8, 0]} maxBarSize={28}>
                                        {topClientsData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={CLIENT_GRADIENT[index % CLIENT_GRADIENT.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
