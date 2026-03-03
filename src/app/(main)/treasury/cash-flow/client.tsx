'use client';

import { useState, useMemo } from 'react';
import type { CashFlowProjection, CashFlowInflow, CashFlowOutflow } from '@/features/treasury/services/cashFlowService';
import { cn } from '@/shared/lib/utils';
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    CalendarDays,
    ChevronRight,
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';

interface Props {
    projection: CashFlowProjection;
}

type ActiveTab = 'ingresos' | 'egresos' | 'todos';
type Period = 30 | 60 | 90;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCOP(value: number): string {
    return value.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(iso: string): string {
    try {
        const [y, m, d] = iso.split('-');
        return `${d}/${m}/${y}`;
    } catch {
        return iso;
    }
}

function addDays(base: Date, n: number): string {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
}

// Group daily projection into weekly buckets
interface WeekBucket {
    label: string;
    startDate: string;
    endDate: string;
    inflow: number;
    outflow: number;
    closingBalance: number;
}

function buildWeeklyBuckets(
    dailyProjection: CashFlowProjection['dailyProjection'],
    periodDays: number
): WeekBucket[] {
    const today = new Date().toISOString().split('T')[0];
    const cutoff = addDays(new Date(), periodDays);

    const filtered = dailyProjection.filter((d) => d.date >= today && d.date <= cutoff);

    const weeks: WeekBucket[] = [];
    let i = 0;
    while (i < filtered.length) {
        const chunk = filtered.slice(i, i + 7);
        const weekStart = chunk[0].date;
        const weekEnd = chunk[chunk.length - 1].date;
        const totalIn = chunk.reduce((s, d) => s + d.inflow, 0);
        const totalOut = chunk.reduce((s, d) => s + d.outflow, 0);
        const closing = chunk[chunk.length - 1].balance;

        const [, sm, sd] = weekStart.split('-');
        const [, em, ed] = weekEnd.split('-');
        weeks.push({
            label: `${sd}/${sm} – ${ed}/${em}`,
            startDate: weekStart,
            endDate: weekEnd,
            inflow: totalIn,
            outflow: totalOut,
            closingBalance: closing,
        });
        i += 7;
    }
    return weeks;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    accent: 'emerald' | 'rose' | 'indigo' | 'amber';
    prefix?: string;
}

function KpiCard({ label, value, icon, accent, prefix = '$' }: KpiCardProps) {
    const colorMap = {
        emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };
    const valueColor = {
        emerald: 'text-emerald-400',
        rose: 'text-rose-400',
        indigo: 'text-indigo-400',
        amber: 'text-amber-400',
    };

    return (
        <div className="bg-slate-950 rounded-[2rem] p-8 border border-white/5 shadow-active relative overflow-hidden group hover:border-white/10 transition-all duration-500">
            <div className="absolute top-0 right-0 p-8 opacity-[0.04] group-hover:opacity-[0.07] group-hover:scale-110 transition-all duration-700">
                {icon}
            </div>
            <div className="relative z-10 space-y-4">
                <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-[0.3em]', colorMap[accent])}>
                    {icon}
                    <span>{label}</span>
                </div>
                <div className="space-y-1">
                    <div className={cn('text-3xl font-black tracking-tighter leading-none', valueColor[accent])}>
                        <span className="text-lg text-slate-600 mr-1">{prefix}</span>
                        {formatCOP(Math.abs(value))}
                    </div>
                    {value < 0 && (
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Negativo</span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Category Badge ───────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; classes: string }> = {
    RECEIVABLE: { label: 'Cobrar', classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
    RECURRING_INCOME: { label: 'Ingreso Recurrente', classes: 'bg-teal-500/15 text-teal-400 border-teal-500/25' },
    PAYABLE: { label: 'Pagar', classes: 'bg-rose-500/15 text-rose-400 border-rose-500/25' },
    PURCHASE_ORDER: { label: 'Orden Compra', classes: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
    RECURRING_EXPENSE: { label: 'Egreso Recurrente', classes: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
};

function CategoryBadge({ category }: { category: string }) {
    const meta = CATEGORY_META[category] ?? { label: category, classes: 'bg-slate-500/15 text-slate-400 border-slate-500/25' };
    return (
        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border', meta.classes)}>
            {meta.label}
        </span>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CashFlowClient({ projection }: Props) {
    const [activeTab, setActiveTab] = useState<ActiveTab>('todos');
    const [period, setPeriod] = useState<Period>(90);

    const { currentBalance, projectedInflows, projectedOutflows, dailyProjection, summary } = projection;

    // Period cutoff
    const cutoffDate = useMemo(() => addDays(new Date(), period), [period]);
    const filteredInflows = useMemo(
        () => projectedInflows.filter((i) => i.date <= cutoffDate).sort((a, b) => a.date.localeCompare(b.date)),
        [projectedInflows, cutoffDate]
    );
    const filteredOutflows = useMemo(
        () => projectedOutflows.filter((o) => o.date <= cutoffDate).sort((a, b) => a.date.localeCompare(b.date)),
        [projectedOutflows, cutoffDate]
    );

    // Weekly chart data
    const weeklyBuckets = useMemo(
        () => buildWeeklyBuckets(dailyProjection, period),
        [dailyProjection, period]
    );

    // Chart scale: find max value for percentage height
    const maxBarValue = useMemo(() => {
        const maxIn = Math.max(...weeklyBuckets.map((w) => w.inflow), 1);
        const maxOut = Math.max(...weeklyBuckets.map((w) => w.outflow), 1);
        return Math.max(maxIn, maxOut);
    }, [weeklyBuckets]);

    // Balance line scale
    const balanceValues = weeklyBuckets.map((w) => w.closingBalance);
    const minBal = Math.min(...balanceValues, 0);
    const maxBal = Math.max(...balanceValues, 1);
    const balanceRange = maxBal - minBal || 1;

    // Filtered period summary
    const periodTotalIn = filteredInflows.reduce((s, i) => s + i.amount, 0);
    const periodTotalOut = filteredOutflows.reduce((s, o) => s + o.amount, 0);

    // Table rows
    type TableRow = (CashFlowInflow | CashFlowOutflow) & { direction: 'in' | 'out' };
    const tableRows = useMemo<TableRow[]>(() => {
        const rows: TableRow[] = [];
        if (activeTab !== 'egresos') {
            filteredInflows.forEach((i) => rows.push({ ...i, direction: 'in' }));
        }
        if (activeTab !== 'ingresos') {
            filteredOutflows.forEach((o) => rows.push({ ...o, direction: 'out' }));
        }
        return rows.sort((a, b) => a.date.localeCompare(b.date));
    }, [activeTab, filteredInflows, filteredOutflows]);

    const netFlow = periodTotalIn - periodTotalOut;
    const netAccent = netFlow >= 0 ? 'emerald' : 'rose';
    const balAccent = currentBalance >= 0 ? 'emerald' : 'rose';

    return (
        <div className="space-y-8">

            {/* ── Period Selector ───────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Ventana de proyección</span>
                {([30, 60, 90] as Period[]).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={cn(
                            'h-10 px-5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300',
                            period === p
                                ? 'bg-slate-950 text-white shadow-active border border-white/10'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        )}
                    >
                        {p}d
                    </button>
                ))}
            </div>

            {/* ── Alert Banner ─────────────────────────────────────────────── */}
            {summary.daysUntilNegative !== null && (
                <div className="flex items-start gap-4 bg-rose-950/60 border border-rose-500/30 rounded-[1.5rem] p-6 shadow-active">
                    <div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                        <AlertTriangle className="h-5 w-5 text-rose-400" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[11px] font-black text-rose-300 uppercase tracking-widest">
                            Alerta de Liquidez — Saldo Proyectado Negativo
                        </p>
                        <p className="text-slate-300 text-sm font-medium">
                            El saldo se proyecta negativo en{' '}
                            <span className="font-black text-rose-400">{summary.daysUntilNegative} días</span>
                            {' '}({formatDate(summary.lowestBalanceDate)}).
                            Saldo mínimo proyectado:{' '}
                            <span className="font-black text-rose-400">${formatCOP(summary.lowestBalance)}</span>
                        </p>
                    </div>
                </div>
            )}

            {/* ── KPI Cards ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                <KpiCard
                    label="Saldo Actual"
                    value={currentBalance}
                    icon={<Wallet className="h-3.5 w-3.5" />}
                    accent={balAccent}
                />
                <KpiCard
                    label="Ingresos Proyectados"
                    value={periodTotalIn}
                    icon={<ArrowUpRight className="h-3.5 w-3.5" />}
                    accent="emerald"
                />
                <KpiCard
                    label="Egresos Proyectados"
                    value={periodTotalOut}
                    icon={<ArrowDownRight className="h-3.5 w-3.5" />}
                    accent="rose"
                />
                <KpiCard
                    label="Flujo Neto"
                    value={netFlow}
                    icon={<Activity className="h-3.5 w-3.5" />}
                    accent={netAccent}
                />
            </div>

            {/* ── Cash Flow Chart ───────────────────────────────────────────── */}
            <div className="bg-slate-950 rounded-[2.5rem] p-8 border border-white/5 shadow-active space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="h-1.5 w-6 bg-indigo-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                Distribución Semanal
                            </span>
                        </div>
                        <h2 className="text-xl font-black text-white tracking-tight uppercase">
                            Gráfico de Flujo <span className="text-slate-600">{period} Días</span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-5 text-[9px] font-black uppercase tracking-widest">
                        <span className="flex items-center gap-2 text-emerald-400">
                            <span className="h-2 w-5 rounded-sm bg-emerald-500 inline-block" />
                            Ingresos
                        </span>
                        <span className="flex items-center gap-2 text-rose-400">
                            <span className="h-2 w-5 rounded-sm bg-rose-500 inline-block" />
                            Egresos
                        </span>
                        <span className="flex items-center gap-2 text-indigo-400">
                            <span className="h-2 w-5 rounded-sm bg-indigo-500 inline-block" />
                            Saldo
                        </span>
                    </div>
                </div>

                {weeklyBuckets.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-slate-600 text-[11px] font-black uppercase tracking-widest">
                        Sin movimientos proyectados en este período
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div
                            className="flex items-end gap-2 min-w-full"
                            style={{ minWidth: `${weeklyBuckets.length * 80}px` }}
                        >
                            {weeklyBuckets.map((week, idx) => {
                                const inflowPct = maxBarValue > 0 ? (week.inflow / maxBarValue) * 100 : 0;
                                const outflowPct = maxBarValue > 0 ? (week.outflow / maxBarValue) * 100 : 0;
                                // Balance line position: 0% = minBal, 100% = maxBal, mapped to chart height
                                const balancePct =
                                    balanceRange > 0
                                        ? ((week.closingBalance - minBal) / balanceRange) * 80 + 10
                                        : 50;
                                const isNegBal = week.closingBalance < 0;

                                return (
                                    <div
                                        key={idx}
                                        className="flex flex-col items-center gap-1 flex-1 group/col"
                                        style={{ minWidth: '72px' }}
                                    >
                                        {/* Chart area */}
                                        <div className="relative w-full" style={{ height: '140px' }}>
                                            {/* Balance dot + connecting line */}
                                            <div
                                                className="absolute left-1/2 -translate-x-1/2 z-20"
                                                style={{ bottom: `${balancePct}%` }}
                                            >
                                                <div
                                                    className={cn(
                                                        'h-3 w-3 rounded-full border-2 border-slate-950 shadow-lg transition-transform group-hover/col:scale-150 duration-300',
                                                        isNegBal ? 'bg-rose-500' : 'bg-indigo-400'
                                                    )}
                                                />
                                            </div>

                                            {/* Bar group */}
                                            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-1">
                                                {/* Inflow bar */}
                                                <div
                                                    className="w-[38%] bg-emerald-500/80 hover:bg-emerald-400 rounded-t-md transition-all duration-500 group-hover/col:opacity-100 opacity-80"
                                                    style={{ height: `${Math.max(inflowPct * 1.2, inflowPct > 0 ? 4 : 0)}px` }}
                                                    title={`Ingresos: $${formatCOP(week.inflow)}`}
                                                />
                                                {/* Outflow bar */}
                                                <div
                                                    className="w-[38%] bg-rose-500/80 hover:bg-rose-400 rounded-t-md transition-all duration-500 group-hover/col:opacity-100 opacity-80"
                                                    style={{ height: `${Math.max(outflowPct * 1.2, outflowPct > 0 ? 4 : 0)}px` }}
                                                    title={`Egresos: $${formatCOP(week.outflow)}`}
                                                />
                                            </div>
                                        </div>

                                        {/* Balance label */}
                                        <span
                                            className={cn(
                                                'text-[8px] font-black text-center leading-tight',
                                                isNegBal ? 'text-rose-400' : 'text-slate-400'
                                            )}
                                        >
                                            ${formatCOP(Math.abs(week.closingBalance) / 1_000_000)}M
                                        </span>

                                        {/* Week label */}
                                        <span className="text-[7px] font-bold text-slate-600 text-center leading-tight">
                                            {week.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Movements Table ───────────────────────────────────────────── */}
            <div className="bg-white rounded-[2.5rem] shadow-premium border border-slate-100 overflow-hidden">

                {/* Table Header */}
                <div className="bg-slate-950 px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <CalendarDays className="h-4 w-4 text-indigo-400" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                Movimientos Proyectados
                            </span>
                        </div>
                        <h2 className="text-lg font-black text-white uppercase tracking-tight">
                            Detalle de Flujo <span className="text-slate-600">{period}d</span>
                        </h2>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                        {(['todos', 'ingresos', 'egresos'] as ActiveTab[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    'h-8 px-4 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300',
                                    activeTab === tab
                                        ? tab === 'ingresos'
                                            ? 'bg-emerald-500 text-white shadow-sm'
                                            : tab === 'egresos'
                                            ? 'bg-rose-500 text-white shadow-sm'
                                            : 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-400 hover:text-white'
                                )}
                            >
                                {tab === 'todos' ? 'Todos' : tab === 'ingresos' ? 'Ingresos' : 'Egresos'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                                    Fecha
                                </th>
                                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                                    Fuente
                                </th>
                                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                                    Descripción
                                </th>
                                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                                    Categoría
                                </th>
                                <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                                    Monto (COP)
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {tableRows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Activity className="h-10 w-10 text-slate-200" />
                                            <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">
                                                Sin movimientos proyectados
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                tableRows.map((row, idx) => (
                                    <tr
                                        key={idx}
                                        className="hover:bg-slate-50 transition-colors duration-200 group/row"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    'h-1.5 w-1.5 rounded-full shrink-0',
                                                    row.direction === 'in' ? 'bg-emerald-400' : 'bg-rose-400'
                                                )} />
                                                <span className="text-[11px] font-bold text-slate-600 tabular-nums">
                                                    {formatDate(row.date)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-wide">
                                                {row.source}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[11px] font-medium text-slate-500 group-hover/row:text-slate-700 transition-colors">
                                                {row.description}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <CategoryBadge category={row.category} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={cn(
                                                'text-[12px] font-black tabular-nums',
                                                row.direction === 'in' ? 'text-emerald-600' : 'text-rose-600'
                                            )}>
                                                {row.direction === 'in' ? '+' : '-'}${formatCOP(row.amount)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        {/* Totals Footer */}
                        {tableRows.length > 0 && (
                            <tfoot>
                                <tr className="border-t-2 border-slate-200 bg-slate-50">
                                    <td colSpan={4} className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                                                Totales del período ({period}d)
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right space-y-1">
                                        {activeTab !== 'egresos' && (
                                            <div className="text-[11px] font-black text-emerald-600 tabular-nums">
                                                +${formatCOP(periodTotalIn)}
                                            </div>
                                        )}
                                        {activeTab !== 'ingresos' && (
                                            <div className="text-[11px] font-black text-rose-600 tabular-nums">
                                                -${formatCOP(periodTotalOut)}
                                            </div>
                                        )}
                                        {activeTab === 'todos' && (
                                            <div className={cn(
                                                'text-[12px] font-black tabular-nums border-t border-slate-200 pt-1',
                                                netFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'
                                            )}>
                                                {netFlow >= 0 ? '+' : '-'}${formatCOP(Math.abs(netFlow))}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* ── Lowest Balance Insight ────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-slate-950 rounded-[2rem] p-7 border border-white/5 space-y-3">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                        Saldo Más Bajo Proyectado
                    </span>
                    <div className={cn(
                        'text-2xl font-black tracking-tighter',
                        summary.lowestBalance < 0 ? 'text-rose-400' : 'text-emerald-400'
                    )}>
                        <span className="text-base text-slate-600 mr-1">$</span>
                        {formatCOP(Math.abs(summary.lowestBalance))}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-[9px] font-bold">
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(summary.lowestBalanceDate)}
                    </div>
                </div>

                <div className="bg-slate-950 rounded-[2rem] p-7 border border-white/5 space-y-3">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                        Total Ingresos (90d)
                    </span>
                    <div className="text-2xl font-black tracking-tighter text-emerald-400">
                        <span className="text-base text-slate-600 mr-1">$</span>
                        {formatCOP(summary.totalInflows)}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-[9px] font-bold">
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                        {projectedInflows.length} documentos por cobrar
                    </div>
                </div>

                <div className="bg-slate-950 rounded-[2rem] p-7 border border-white/5 space-y-3">
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                        Total Egresos (90d)
                    </span>
                    <div className="text-2xl font-black tracking-tighter text-rose-400">
                        <span className="text-base text-slate-600 mr-1">$</span>
                        {formatCOP(summary.totalOutflows)}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-[9px] font-bold">
                        <TrendingDown className="h-3 w-3 text-rose-500" />
                        {projectedOutflows.length} obligaciones pendientes
                    </div>
                </div>
            </div>

        </div>
    );
}
