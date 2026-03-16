'use client';

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
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ForecastMonthRow {
    month: string;
    opp_count: number;
    nominal: number;
    weighted: number;
    commit_val: number;
    best_case: number;
    pipeline_val: number;
}

export interface ActualMonthRow {
    month: string;
    total: number;
    count: number;
    year: number;
}

interface Props {
    forecastData: ForecastMonthRow[];
    actualData: ActualMonthRow[];
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

function monthLabel(dateStr: string): string {
    const d = new Date(dateStr);
    return `${MONTH_LABELS_ES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ─── Custom Tooltip ─────────────────────────────────────────────────────────

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

const LABEL_MAP: Record<string, string> = {
    commit_val: 'Commit (>=90%)',
    best_case: 'Best Case (50-89%)',
    pipeline_val: 'Pipeline (<50%)',
    actual: 'Facturado Real',
};

function ForecastTooltip({ active, payload, label }: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;
    return (
        <div className="bg-white border border-slate-100 rounded-xl p-3 shadow-md min-w-[180px]">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
            {payload.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-4 mb-0.5">
                    <span className="text-[10px] font-semibold" style={{ color: item.color }}>
                        {LABEL_MAP[item.name] ?? item.name}
                    </span>
                    <span className="text-xs font-bold text-slate-900 tabular-nums">
                        {formatCOPFull(item.value)}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── Chart Component ────────────────────────────────────────────────────────

export function ForecastChart({ forecastData, actualData }: Props) {
    const currentYear = new Date().getFullYear();

    // Build actual revenue map by month key (YYYY-MM)
    const actualMap = new Map<string, number>();
    for (const row of actualData) {
        if (row.year === currentYear) {
            const d = new Date(row.month);
            const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
            actualMap.set(key, row.total);
        }
    }

    // Merge forecast + actual into chart data
    const chartData = forecastData.map((row) => {
        const d = new Date(row.month);
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        return {
            label: monthLabel(row.month),
            commit_val: Number(row.commit_val) || 0,
            best_case: Number(row.best_case) || 0,
            pipeline_val: Number(row.pipeline_val) || 0,
            actual: actualMap.get(key) ?? 0,
        };
    });

    if (chartData.length === 0) {
        return (
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <CardContent className="py-16 text-center">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Sin datos de forecast — Agrega oportunidades con fecha de cierre esperada
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <CardHeader className="p-5 border-b border-slate-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-sm font-bold text-slate-900">
                            Forecast vs Facturado
                        </CardTitle>
                        <CardDescription className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                            Proyeccion ponderada por probabilidad vs ingresos reales
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-3 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                            <span className="text-[10px] font-semibold text-slate-500">Commit</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
                            <span className="text-[10px] font-semibold text-slate-500">Best Case</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rounded-sm bg-indigo-300" />
                            <span className="text-[10px] font-semibold text-slate-500">Pipeline</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="h-0.5 w-4 border-t-2 border-dashed border-slate-500" />
                            <span className="text-[10px] font-semibold text-slate-500">Facturado</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-5">
                <div className="h-[380px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
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
                            <Tooltip content={<ForecastTooltip />} />
                            <Legend
                                formatter={(val: string) => (
                                    <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 600 }}>
                                        {LABEL_MAP[val] ?? val}
                                    </span>
                                )}
                            />
                            <Bar
                                dataKey="commit_val"
                                name="commit_val"
                                stackId="forecast"
                                fill="#10b981"
                                radius={[0, 0, 0, 0]}
                                maxBarSize={40}
                            />
                            <Bar
                                dataKey="best_case"
                                name="best_case"
                                stackId="forecast"
                                fill="#fbbf24"
                                radius={[0, 0, 0, 0]}
                                maxBarSize={40}
                            />
                            <Bar
                                dataKey="pipeline_val"
                                name="pipeline_val"
                                stackId="forecast"
                                fill="#a5b4fc"
                                radius={[6, 6, 0, 0]}
                                maxBarSize={40}
                            />
                            <Line
                                type="monotone"
                                dataKey="actual"
                                name="actual"
                                stroke="#475569"
                                strokeWidth={2}
                                strokeDasharray="6 3"
                                dot={{ fill: '#475569', r: 3 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
