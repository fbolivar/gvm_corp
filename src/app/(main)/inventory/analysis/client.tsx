"use client";

import { useState, useMemo, useCallback } from "react";
import type { ABCProduct, ABCSummary } from "@/features/inventory/services/abcAnalysisService";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
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

const COP = (v: number) =>
    v.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function abcBadge(cls: 'A' | 'B' | 'C') {
    const map = {
        A: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        B: 'bg-amber-50 text-amber-600 border-amber-100',
        C: 'bg-slate-50 text-slate-400 border-slate-100',
    } as const;
    return (
        <span className={cn('inline-flex items-center justify-center h-6 w-6 rounded-lg text-[10px] font-bold border', map[cls])}>
            {cls}
        </span>
    );
}

function ClassCard({ cls, count, pctValue, pctItems }: { cls: 'A' | 'B' | 'C'; count: number; pctValue: number; pctItems: number }) {
    const styles = {
        A: { badge: 'bg-emerald-50 text-emerald-600 border-emerald-100', accent: 'text-emerald-600', bar: 'bg-emerald-500', desc: 'Productos críticos de alto valor.' },
        B: { badge: 'bg-amber-50 text-amber-600 border-amber-100', accent: 'text-amber-600', bar: 'bg-amber-500', desc: 'Productos intermedios.' },
        C: { badge: 'bg-slate-50 text-slate-400 border-slate-100', accent: 'text-slate-500', bar: 'bg-slate-300', desc: 'Productos de menor valor.' },
    } as const;
    const s = styles[cls];

    return (
        <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl">
            <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                    <Badge className={`${s.badge} border text-xs font-bold px-2.5 py-1 rounded-lg`}>Clase {cls}</Badge>
                    <span className="text-[10px] text-slate-400">{count} productos</span>
                </div>
                <div className="space-y-2.5">
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">% Valor</span>
                            <span className={cn('text-xs font-bold', s.accent)}>{pctValue}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full', s.bar)} style={{ width: `${pctValue}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">% Items</span>
                            <span className={cn('text-xs font-bold', s.accent)}>{pctItems}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full opacity-50', s.bar)} style={{ width: `${pctItems}%` }} />
                        </div>
                    </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">{s.desc}</p>
            </CardContent>
        </Card>
    );
}

function ParetoChart({ summary }: { summary: ABCSummary }) {
    const zones = [
        { label: 'Clase A', pct: summary.classA.pctItems, valuePct: summary.classA.pctValue, count: summary.classA.count, color: 'bg-emerald-500', textColor: 'text-emerald-700', lightBg: 'bg-emerald-50' },
        { label: 'Clase B', pct: summary.classB.pctItems, valuePct: summary.classB.pctValue, count: summary.classB.count, color: 'bg-amber-500', textColor: 'text-amber-700', lightBg: 'bg-amber-50' },
        { label: 'Clase C', pct: summary.classC.pctItems, valuePct: summary.classC.pctValue, count: summary.classC.count, color: 'bg-slate-300', textColor: 'text-slate-500', lightBg: 'bg-slate-50' },
    ];

    return (
        <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="p-5 pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-600" />
                    Curva de Pareto ABC
                </CardTitle>
                <p className="text-[10px] text-slate-400 mt-0.5">Distribución por % de Items vs % de Valor</p>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
                {/* Stacked bar */}
                <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Distribución de Items</p>
                    <div className="flex h-8 rounded-xl overflow-hidden gap-0.5">
                        {zones.map(z => (
                            <div key={z.label} className={cn('flex items-center justify-center', z.color)}
                                style={{ width: `${z.pct}%`, minWidth: z.pct > 0 ? '1.5rem' : 0 }}
                                title={`${z.label}: ${z.pct}% de items`}>
                                <span className="text-white text-[9px] font-semibold hidden sm:block">
                                    {z.pct > 8 ? `${z.pct}%` : ''}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Value bars */}
                <div className="space-y-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Valor de Ventas por Clase</p>
                    {zones.map(z => (
                        <div key={z.label} className="space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={cn('h-2 w-2 rounded-full', z.color)} />
                                    <span className="text-[10px] font-semibold text-slate-600">{z.label}</span>
                                    <span className="text-[10px] text-slate-400">({z.count})</span>
                                </div>
                                <span className={cn('text-xs font-bold', z.textColor)}>{z.valuePct}%</span>
                            </div>
                            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={cn('h-full rounded-full', z.color)} style={{ width: `${z.valuePct}%` }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Legend */}
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                    {zones.map(z => (
                        <div key={z.label} className={cn('rounded-xl p-3', z.lightBg)}>
                            <p className={cn('text-lg font-bold tracking-tight', z.textColor)}>{z.count}</p>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{z.label}</p>
                            <p className={cn('text-[10px] font-bold mt-0.5', z.textColor)}>{z.valuePct}% del valor</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

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
        if (classFilter !== 'ALL') list = list.filter(p => p.abc_class === classFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(p => p.product_name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
        }
        return [...list].sort((a, b) => {
            const va = a[sortKey] as number | string;
            const vb = b[sortKey] as number | string;
            if (typeof va === 'string' && typeof vb === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
            return sortDir === 'asc' ? Number(va) - Number(vb) : Number(vb) - Number(va);
        });
    }, [initialProducts, search, classFilter, sortKey, sortDir]);

    const s = initialSummary;

    const columns: { key: SortKey; label: string; align?: 'right' }[] = [
        { key: 'sku', label: 'SKU' },
        { key: 'product_name', label: 'Producto' },
        { key: 'abc_class', label: 'Clase' },
        { key: 'total_sales_value', label: 'Ventas $', align: 'right' },
        { key: 'total_sales_qty', label: 'Ventas Qty', align: 'right' },
        { key: 'current_stock', label: 'Stock', align: 'right' },
        { key: 'stock_value', label: 'Valor Stock', align: 'right' },
        { key: 'rotation_index', label: 'Rotación', align: 'right' },
        { key: 'days_of_stock', label: 'Días Stock', align: 'right' },
        { key: 'cumulative_pct', label: '% Acum.', align: 'right' },
    ];

    return (
        <div className="space-y-6">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Valor Total Stock', value: `$${COP(s.totalStockValue)}`, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50', badge: 'Valorización', badgeCls: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
                    { label: 'Rotación Promedio', value: `${s.avgRotation}x`, icon: RotateCcw, color: 'text-emerald-600', bg: 'bg-emerald-50', badge: 'Índice', badgeCls: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                    { label: 'Sin Ventas', value: String(s.slowMovers), icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', badge: 'Alerta', badgeCls: 'bg-amber-50 text-amber-600 border-amber-100' },
                    { label: 'Total Productos', value: String(s.totalProducts), icon: Package, color: 'text-slate-600', bg: 'bg-slate-50', badge: 'SKUs', badgeCls: 'bg-slate-50 text-slate-500 border-slate-100' },
                ].map(kpi => (
                    <Card key={kpi.label} className="border border-slate-100 bg-white shadow-sm rounded-2xl">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className={`h-10 w-10 rounded-xl ${kpi.bg} flex items-center justify-center ${kpi.color}`}>
                                    <kpi.icon className="h-5 w-5" />
                                </div>
                                <Badge className={`${kpi.badgeCls} border text-[10px] font-semibold px-2 py-0.5 rounded-full`}>{kpi.badge}</Badge>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</p>
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none truncate">{kpi.value}</h3>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Class Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ClassCard cls="A" count={s.classA.count} pctValue={s.classA.pctValue} pctItems={s.classA.pctItems} />
                <ClassCard cls="B" count={s.classB.count} pctValue={s.classB.pctValue} pctItems={s.classB.pctItems} />
                <ClassCard cls="C" count={s.classC.count} pctValue={s.classC.pctValue} pctItems={s.classC.pctItems} />
            </div>

            {/* Pareto */}
            <ParetoChart summary={s} />

            {/* Products Table */}
            <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-slate-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-indigo-600" />
                            <CardTitle className="text-sm font-bold text-slate-900">Detalle por Producto</CardTitle>
                            <span className="text-[10px] text-slate-400">{filtered.length} de {s.totalProducts}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Class filter */}
                            <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
                                {(['ALL', 'A', 'B', 'C'] as const).map(cls => (
                                    <button
                                        key={cls}
                                        onClick={() => setClassFilter(cls)}
                                        className={cn(
                                            'px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap',
                                            classFilter === cls
                                                ? 'bg-white text-slate-900 shadow-sm'
                                                : 'text-slate-400 hover:text-slate-600'
                                        )}
                                    >
                                        {cls === 'ALL' ? 'Todos' : `Clase ${cls}`}
                                    </button>
                                ))}
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <input
                                    placeholder="Buscar SKU o producto..."
                                    className="h-9 w-56 pl-9 bg-slate-50 border-none rounded-lg text-sm placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-200 outline-none"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full" role="table">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    {columns.map(col => {
                                        const active = sortKey === col.key;
                                        return (
                                            <th
                                                key={col.key}
                                                scope="col"
                                                onClick={() => handleSort(col.key)}
                                                className={cn(
                                                    'px-4 py-3 text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:text-slate-900',
                                                    col.align === 'right' ? 'text-right' : 'text-left',
                                                    active ? 'text-indigo-600' : 'text-slate-400'
                                                )}
                                            >
                                                <span className="inline-flex items-center gap-1">
                                                    {col.label}
                                                    {active
                                                        ? sortDir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
                                                        : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                                                </span>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-12 text-center">
                                            <Package className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                                            <p className="text-xs font-semibold text-slate-900">Sin productos</p>
                                            <p className="text-[10px] text-slate-400 mt-1">No coinciden con el filtro aplicado</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(p => {
                                        const daysWarning = p.days_of_stock > 180;
                                        const rotationWarning = p.rotation_index < 1 && p.current_stock > 0;
                                        return (
                                            <tr key={p.product_id} className="hover:bg-slate-50/50">
                                                <td className="px-4 py-3">
                                                    <span className="font-mono text-[10px] font-medium text-slate-400">{p.sku || '—'}</span>
                                                </td>
                                                <td className="px-4 py-3 max-w-[200px]">
                                                    <span className="text-xs font-semibold text-slate-900 line-clamp-2">{p.product_name}</span>
                                                </td>
                                                <td className="px-4 py-3">{abcBadge(p.abc_class)}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-xs font-bold text-slate-900 tabular-nums">${COP(p.total_sales_value)}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-xs text-slate-600 tabular-nums">{p.total_sales_qty.toLocaleString('es-CO')}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-xs font-medium text-slate-700 tabular-nums">{p.current_stock.toLocaleString('es-CO')}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-xs text-slate-600 tabular-nums">${COP(p.stock_value)}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={cn('inline-flex items-center gap-1 text-xs font-bold tabular-nums', rotationWarning ? 'text-amber-600' : 'text-slate-900')}>
                                                        {rotationWarning ? <TrendingDown className="h-3 w-3" /> : p.rotation_index >= 4 ? <TrendingUp className="h-3 w-3 text-emerald-600" /> : null}
                                                        {p.rotation_index}x
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={cn(
                                                        'inline-flex items-center gap-1 text-xs font-bold tabular-nums px-2 py-0.5 rounded-lg',
                                                        daysWarning ? 'bg-rose-50 text-rose-600' : p.days_of_stock <= 15 ? 'bg-amber-50 text-amber-700' : 'text-slate-700'
                                                    )}>
                                                        {p.days_of_stock >= 999 ? '∞' : p.days_of_stock}
                                                        {p.days_of_stock < 999 && <span className="text-[8px] opacity-60">d</span>}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                            <div className={cn('h-full rounded-full', p.abc_class === 'A' ? 'bg-emerald-500' : p.abc_class === 'B' ? 'bg-amber-500' : 'bg-slate-300')}
                                                                style={{ width: `${Math.min(p.cumulative_pct, 100)}%` }} />
                                                        </div>
                                                        <span className="text-[10px] font-medium text-slate-500 tabular-nums w-10 text-right">{p.cumulative_pct.toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {filtered.length > 0 && (
                        <div className="border-t border-slate-100 px-5 py-3 flex flex-wrap gap-4 items-center">
                            <span className="text-[10px] text-slate-400">{filtered.length} productos</span>
                            <div className="flex items-center gap-3 ml-auto">
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-rose-400" />
                                    <span className="text-[10px] text-slate-400">Sobrestock &gt;180d</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-amber-400" />
                                    <span className="text-[10px] text-slate-400">Rotación baja &lt;1x</span>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
