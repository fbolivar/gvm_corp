"use client";

import { useState, useMemo, useCallback } from "react";
import type { ABCProduct, ABCSummary } from "@/features/inventory/services/abcAnalysisService";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import {
    Search,
    TrendingUp,
    TrendingDown,
    Package,
    DollarSign,
    AlertTriangle,
    BarChart3,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    RotateCcw,
    Layers,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Props {
    initialProducts: ABCProduct[];
    initialSummary: ABCSummary;
}

type SortKey = keyof Pick<
    ABCProduct,
    | 'sku'
    | 'product_name'
    | 'abc_class'
    | 'total_sales_value'
    | 'total_sales_qty'
    | 'current_stock'
    | 'stock_value'
    | 'rotation_index'
    | 'days_of_stock'
    | 'cumulative_pct'
>;

type SortDir = 'asc' | 'desc';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const COP = (v: number) =>
    v.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function abcBadge(cls: 'A' | 'B' | 'C') {
    const map = {
        A: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        B: 'bg-amber-100 text-amber-700 border-amber-200',
        C: 'bg-slate-100 text-slate-500 border-slate-200',
    } as const;
    return (
        <span
            className={cn(
                'inline-flex items-center justify-center h-7 w-7 rounded-xl text-[11px] font-black border',
                map[cls]
            )}
        >
            {cls}
        </span>
    );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function PeriodButton({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'h-10 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-200',
                active
                    ? 'bg-slate-900 text-white shadow-active'
                    : 'bg-white text-slate-400 hover:text-slate-900 hover:bg-slate-50 border border-slate-100'
            )}
        >
            {label}
        </button>
    );
}

function KpiCard({
    label,
    value,
    icon: Icon,
    colorClass,
    bgClass,
}: {
    label: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
    bgClass: string;
}) {
    return (
        <div className="bg-white rounded-[2.5rem] p-7 shadow-premium flex items-center gap-5">
            <div className={cn('h-14 w-14 rounded-2xl flex items-center justify-center shrink-0', bgClass, colorClass)}>
                <Icon className="h-7 w-7" />
            </div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">
                    {label}
                </p>
                <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">{value}</p>
            </div>
        </div>
    );
}

function ClassCard({
    cls,
    count,
    pctValue,
    pctItems,
}: {
    cls: 'A' | 'B' | 'C';
    count: number;
    pctValue: number;
    pctItems: number;
}) {
    const styles = {
        A: {
            ring: 'ring-emerald-200',
            badge: 'bg-emerald-500 text-white',
            accent: 'text-emerald-600',
            bar: 'bg-emerald-500',
            desc: 'Productos críticos de alto valor. Máximo control y reposición ágil.',
        },
        B: {
            ring: 'ring-amber-200',
            badge: 'bg-amber-500 text-white',
            accent: 'text-amber-600',
            bar: 'bg-amber-500',
            desc: 'Productos intermedios. Control moderado y reposición periódica.',
        },
        C: {
            ring: 'ring-slate-200',
            badge: 'bg-slate-400 text-white',
            accent: 'text-slate-500',
            bar: 'bg-slate-300',
            desc: 'Productos de menor valor. Control simplificado, revisar obsoletos.',
        },
    } as const;

    const s = styles[cls];

    return (
        <div className={cn('bg-white rounded-[2.5rem] p-8 shadow-premium ring-1', s.ring)}>
            <div className="flex items-start justify-between mb-6">
                <span className={cn('h-10 w-10 rounded-2xl flex items-center justify-center text-lg font-black', s.badge)}>
                    {cls}
                </span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right leading-snug max-w-[6rem]">
                    Clase {cls}
                </span>
            </div>

            <p className="text-3xl font-black text-slate-900 tracking-tight mb-1">{count}</p>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-5">
                Productos
            </p>

            <div className="space-y-3">
                <div>
                    <div className="flex justify-between mb-1.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">% Valor</span>
                        <span className={cn('text-[11px] font-black', s.accent)}>{pctValue}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all duration-700', s.bar)} style={{ width: `${pctValue}%` }} />
                    </div>
                </div>
                <div>
                    <div className="flex justify-between mb-1.5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">% Items</span>
                        <span className={cn('text-[11px] font-black', s.accent)}>{pctItems}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full opacity-50 transition-all duration-700', s.bar)} style={{ width: `${pctItems}%` }} />
                    </div>
                </div>
            </div>

            <p className="text-[9px] text-slate-400 font-bold mt-5 leading-relaxed">{s.desc}</p>
        </div>
    );
}

// ─── Pareto Visualization (pure CSS) ──────────────────────────────────────────

function ParetoChart({ summary }: { summary: ABCSummary }) {
    const zones = [
        {
            label: 'Clase A',
            pct: summary.classA.pctItems,
            valuePct: summary.classA.pctValue,
            count: summary.classA.count,
            color: 'bg-emerald-500',
            textColor: 'text-emerald-700',
            lightBg: 'bg-emerald-50',
        },
        {
            label: 'Clase B',
            pct: summary.classB.pctItems,
            valuePct: summary.classB.pctValue,
            count: summary.classB.count,
            color: 'bg-amber-500',
            textColor: 'text-amber-700',
            lightBg: 'bg-amber-50',
        },
        {
            label: 'Clase C',
            pct: summary.classC.pctItems,
            valuePct: summary.classC.pctValue,
            count: summary.classC.count,
            color: 'bg-slate-300',
            textColor: 'text-slate-500',
            lightBg: 'bg-slate-50',
        },
    ];

    return (
        <div className="bg-white rounded-[2.5rem] p-8 shadow-premium space-y-8">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                    <Layers className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Curva de Pareto ABC</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                        Distribución por % de Items vs % de Valor
                    </p>
                </div>
            </div>

            {/* Main stacked bar — items axis */}
            <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Distribución de Items (eje horizontal)
                </p>
                <div className="flex h-12 rounded-2xl overflow-hidden gap-0.5">
                    {zones.map(z => (
                        <div
                            key={z.label}
                            className={cn('flex items-center justify-center transition-all duration-700', z.color)}
                            style={{ width: `${z.pct}%`, minWidth: z.pct > 0 ? '2rem' : 0 }}
                            title={`${z.label}: ${z.pct}% de items`}
                        >
                            <span className="text-white text-[10px] font-black hidden sm:block">
                                {z.pct > 8 ? `${z.pct}%` : ''}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="flex gap-0.5">
                    {zones.map(z => (
                        <div key={z.label} style={{ width: `${z.pct}%`, minWidth: z.pct > 0 ? '2rem' : 0 }}>
                            <span className={cn('text-[8px] font-black uppercase tracking-wider', z.textColor)}>
                                {z.pct > 5 ? z.label : ''}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Value bars per class */}
            <div className="space-y-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Valor de Ventas por Clase
                </p>
                {zones.map(z => (
                    <div key={z.label} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={cn('h-2 w-2 rounded-full', z.color)} />
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-wide">
                                    {z.label}
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold">
                                    ({z.count} productos)
                                </span>
                            </div>
                            <span className={cn('text-[12px] font-black', z.textColor)}>
                                {z.valuePct}%
                            </span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={cn('h-full rounded-full transition-all duration-700', z.color)}
                                style={{ width: `${z.valuePct}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                {zones.map(z => (
                    <div key={z.label} className={cn('rounded-2xl p-4', z.lightBg)}>
                        <p className={cn('text-xl font-black tracking-tight', z.textColor)}>{z.count}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{z.label}</p>
                        <p className={cn('text-[11px] font-black mt-1', z.textColor)}>{z.valuePct}% del valor</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Main Client Component ─────────────────────────────────────────────────────

export function ABCAnalysisClient({ initialProducts, initialSummary }: Props) {
    const [search, setSearch] = useState('');
    const [classFilter, setClassFilter] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
    const [sortKey, setSortKey] = useState<SortKey>('total_sales_value');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const handleSort = useCallback((key: SortKey) => {
        setSortKey(prev => {
            if (prev === key) {
                setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                return key;
            }
            setSortDir('desc');
            return key;
        });
    }, []);

    const filtered = useMemo(() => {
        let list = initialProducts;

        if (classFilter !== 'ALL') {
            list = list.filter(p => p.abc_class === classFilter);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                p =>
                    p.product_name.toLowerCase().includes(q) ||
                    p.sku.toLowerCase().includes(q)
            );
        }

        return [...list].sort((a, b) => {
            const va = a[sortKey] as number | string;
            const vb = b[sortKey] as number | string;
            if (typeof va === 'string' && typeof vb === 'string') {
                return sortDir === 'asc'
                    ? va.localeCompare(vb)
                    : vb.localeCompare(va);
            }
            const na = Number(va);
            const nb = Number(vb);
            return sortDir === 'asc' ? na - nb : nb - na;
        });
    }, [initialProducts, search, classFilter, sortKey, sortDir]);

    const s = initialSummary;

    // ── Header columns config
    const columns: { key: SortKey; label: string; align?: 'right' }[] = [
        { key: 'sku',               label: 'SKU' },
        { key: 'product_name',      label: 'Producto' },
        { key: 'abc_class',         label: 'Clase' },
        { key: 'total_sales_value', label: 'Ventas $', align: 'right' },
        { key: 'total_sales_qty',   label: 'Ventas Qty', align: 'right' },
        { key: 'current_stock',     label: 'Stock', align: 'right' },
        { key: 'stock_value',       label: 'Valor Stock', align: 'right' },
        { key: 'rotation_index',    label: 'Rotación', align: 'right' },
        { key: 'days_of_stock',     label: 'Días Stock', align: 'right' },
        { key: 'cumulative_pct',    label: '% Acum.', align: 'right' },
    ];

    return (
        <div className="space-y-10">

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <KpiCard
                    label="Valor Total de Stock"
                    value={`$${COP(s.totalStockValue)}`}
                    icon={DollarSign}
                    colorClass="text-indigo-600"
                    bgClass="bg-indigo-50"
                />
                <KpiCard
                    label="Rotación Promedio"
                    value={`${s.avgRotation}x`}
                    icon={RotateCcw}
                    colorClass="text-emerald-600"
                    bgClass="bg-emerald-50"
                />
                <KpiCard
                    label="Productos sin Ventas"
                    value={s.slowMovers}
                    icon={AlertTriangle}
                    colorClass="text-amber-600"
                    bgClass="bg-amber-50"
                />
                <KpiCard
                    label="Total Productos"
                    value={s.totalProducts}
                    icon={Package}
                    colorClass="text-slate-600"
                    bgClass="bg-slate-100"
                />
            </div>

            {/* ── Class Distribution Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ClassCard
                    cls="A"
                    count={s.classA.count}
                    pctValue={s.classA.pctValue}
                    pctItems={s.classA.pctItems}
                />
                <ClassCard
                    cls="B"
                    count={s.classB.count}
                    pctValue={s.classB.pctValue}
                    pctItems={s.classB.pctItems}
                />
                <ClassCard
                    cls="C"
                    count={s.classC.count}
                    pctValue={s.classC.pctValue}
                    pctItems={s.classC.pctItems}
                />
            </div>

            {/* ── Pareto Visualization ── */}
            <ParetoChart summary={s} />

            {/* ── Products Table ── */}
            <div className="space-y-6">
                {/* Table Toolbar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0">
                            <BarChart3 className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                Detalle por Producto
                            </h2>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                {filtered.length} de {s.totalProducts} productos
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Class filter */}
                        {(['ALL', 'A', 'B', 'C'] as const).map(cls => (
                            <button
                                key={cls}
                                onClick={() => setClassFilter(cls)}
                                className={cn(
                                    'h-9 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 border',
                                    classFilter === cls
                                        ? cls === 'ALL'
                                            ? 'bg-slate-900 text-white border-transparent'
                                            : cls === 'A'
                                            ? 'bg-emerald-500 text-white border-transparent'
                                            : cls === 'B'
                                            ? 'bg-amber-500 text-white border-transparent'
                                            : 'bg-slate-400 text-white border-transparent'
                                        : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
                                )}
                            >
                                {cls === 'ALL' ? 'Todos' : `Clase ${cls}`}
                            </button>
                        ))}

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                            <Input
                                placeholder="Buscar SKU o producto..."
                                className="h-10 w-64 pl-10 bg-white border-none rounded-2xl font-bold text-slate-900 placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-primary/10 shadow-premium text-sm"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Table Card */}
                <div className="bg-white rounded-[2.5rem] shadow-premium overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full" role="table">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                    {columns.map(col => {
                                        const active = sortKey === col.key;
                                        return (
                                            <th
                                                key={col.key}
                                                scope="col"
                                                onClick={() => handleSort(col.key)}
                                                className={cn(
                                                    'px-5 py-5 text-[9px] font-black uppercase tracking-widest cursor-pointer select-none whitespace-nowrap transition-colors hover:text-slate-900',
                                                    col.align === 'right' ? 'text-right' : 'text-left',
                                                    active ? 'text-indigo-600' : 'text-slate-400'
                                                )}
                                            >
                                                <span className="inline-flex items-center gap-1.5">
                                                    {col.label}
                                                    {active ? (
                                                        sortDir === 'desc'
                                                            ? <ArrowDown className="h-3 w-3" />
                                                            : <ArrowUp className="h-3 w-3" />
                                                    ) : (
                                                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                                                    )}
                                                </span>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-20 text-center">
                                            <Package className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                            <p className="text-slate-400 font-black text-sm">
                                                Sin productos que coincidan con el filtro
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map((p, idx) => {
                                        const daysWarning = p.days_of_stock > 180;
                                        const rotationWarning = p.rotation_index < 1 && p.current_stock > 0;

                                        return (
                                            <tr
                                                key={p.product_id}
                                                className={cn(
                                                    'group transition-colors',
                                                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30',
                                                    'hover:bg-slate-50'
                                                )}
                                            >
                                                {/* SKU */}
                                                <td className="px-5 py-4">
                                                    <span className="font-mono text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                                                        {p.sku || '—'}
                                                    </span>
                                                </td>

                                                {/* Producto */}
                                                <td className="px-5 py-4 max-w-[220px]">
                                                    <span className="text-sm font-black text-slate-900 leading-snug line-clamp-2">
                                                        {p.product_name}
                                                    </span>
                                                </td>

                                                {/* Clase ABC */}
                                                <td className="px-5 py-4">
                                                    {abcBadge(p.abc_class)}
                                                </td>

                                                {/* Ventas $ */}
                                                <td className="px-5 py-4 text-right">
                                                    <span className="text-sm font-black text-slate-900 tabular-nums">
                                                        ${COP(p.total_sales_value)}
                                                    </span>
                                                </td>

                                                {/* Ventas Qty */}
                                                <td className="px-5 py-4 text-right">
                                                    <span className="text-sm font-bold text-slate-600 tabular-nums">
                                                        {p.total_sales_qty.toLocaleString('es-CO')}
                                                    </span>
                                                </td>

                                                {/* Stock */}
                                                <td className="px-5 py-4 text-right">
                                                    <span className="text-sm font-bold text-slate-700 tabular-nums">
                                                        {p.current_stock.toLocaleString('es-CO')}
                                                    </span>
                                                </td>

                                                {/* Valor Stock */}
                                                <td className="px-5 py-4 text-right">
                                                    <span className="text-sm font-bold text-slate-600 tabular-nums">
                                                        ${COP(p.stock_value)}
                                                    </span>
                                                </td>

                                                {/* Rotación */}
                                                <td className="px-5 py-4 text-right">
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center gap-1 text-sm font-black tabular-nums',
                                                            rotationWarning ? 'text-amber-600' : 'text-slate-900'
                                                        )}
                                                    >
                                                        {rotationWarning
                                                            ? <TrendingDown className="h-3.5 w-3.5" />
                                                            : p.rotation_index >= 4
                                                            ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                                                            : null}
                                                        {p.rotation_index}x
                                                    </span>
                                                </td>

                                                {/* Días de Stock */}
                                                <td className="px-5 py-4 text-right">
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center justify-end gap-1.5 text-sm font-black tabular-nums px-2.5 py-1 rounded-xl',
                                                            daysWarning
                                                                ? 'bg-rose-50 text-rose-600'
                                                                : p.days_of_stock <= 15
                                                                ? 'bg-amber-50 text-amber-700'
                                                                : 'text-slate-700'
                                                        )}
                                                    >
                                                        {p.days_of_stock >= 999 ? '∞' : p.days_of_stock}
                                                        {p.days_of_stock < 999 && (
                                                            <span className="text-[8px] font-black opacity-60">d</span>
                                                        )}
                                                    </span>
                                                </td>

                                                {/* % Acumulado */}
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                            <div
                                                                className={cn(
                                                                    'h-full rounded-full',
                                                                    p.abc_class === 'A'
                                                                        ? 'bg-emerald-500'
                                                                        : p.abc_class === 'B'
                                                                        ? 'bg-amber-500'
                                                                        : 'bg-slate-300'
                                                                )}
                                                                style={{ width: `${Math.min(p.cumulative_pct, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] font-black text-slate-500 tabular-nums w-12 text-right">
                                                            {p.cumulative_pct.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Table Footer */}
                    {filtered.length > 0 && (
                        <div className="border-t border-slate-100 px-8 py-5 flex flex-wrap gap-6 items-center">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Mostrando {filtered.length} productos
                            </span>
                            <div className="flex items-center gap-4 ml-auto flex-wrap">
                                <div className="flex items-center gap-2">
                                    <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Sobrestock &gt; 180 días
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Rotación baja &lt; 1x
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
