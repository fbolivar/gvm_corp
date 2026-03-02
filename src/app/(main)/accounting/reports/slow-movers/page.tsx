import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    Activity,
    Package,
    AlertTriangle,
    TrendingDown,
    Banknote,
    ArrowRight,
    Barcode,
    Clock,
    CheckCircle2,
    XCircle,
} from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import Link from 'next/link';
import { TableExportClient } from '@/features/accounting/components/TableExportClient'

const DAYS_OPTIONS = [30, 60, 90, 180];

type RotationLevel = 'NONE' | 'LOW' | 'NORMAL';

const ROTATION_CONFIG: Record<RotationLevel, { label: string; cls: string; icon: React.ReactNode }> = {
    NONE:   { label: 'Sin Movimiento', cls: 'bg-rose-50 text-rose-600',   icon: <XCircle className="h-3 w-3" /> },
    LOW:    { label: 'Baja Rotación',  cls: 'bg-amber-50 text-amber-600', icon: <AlertTriangle className="h-3 w-3" /> },
    NORMAL: { label: 'Rotación OK',    cls: 'bg-emerald-50 text-emerald-700', icon: <CheckCircle2 className="h-3 w-3" /> },
};

function getRotationLevel(outQty: number, days: number): RotationLevel {
    if (outQty === 0) return 'NONE';
    // Rule: < 1 exit per 30 days = LOW
    if (outQty / (days / 30) < 1) return 'LOW';
    return 'NORMAL';
}

export default async function SlowMoversPage({
    searchParams
}: {
    searchParams: Promise<{ days?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const days = Math.min(Math.max(parseInt(params.days ?? '90', 10) || 90, 30), 180);
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const since = sinceDate.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const tenant = await settingsService.getTenantInfo(supabase);

    // 1. All physical products (only base columns that always exist)
    const { data: products, error: prodErr } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('type', 'GOOD')
        .order('name');
    if (prodErr) throw prodErr;

    // 2. All inventory movements — compute stock, avg_cost, last move in memory
    //    inventory_movements columns: product_id, type, qty, cost, occurred_at (all in base schema)
    const { data: allMoves } = await supabase
        .from('inventory_movements')
        .select('product_id, type, qty, cost, occurred_at')
        .order('occurred_at', { ascending: false });

    // Build per-product aggregates in a single pass
    type ProductStats = {
        stock: number;
        inCostTotal: number;
        inQtyTotal: number;
        outInPeriod: number;
        lastDate: string | null;
    };
    const stats: Record<string, ProductStats> = {};

    for (const m of (allMoves ?? [])) {
        const pid = m.product_id as string;
        if (!stats[pid]) stats[pid] = { stock: 0, inCostTotal: 0, inQtyTotal: 0, outInPeriod: 0, lastDate: null };
        const qty  = Number(m.qty);
        const cost = Number(m.cost) || 0;
        const date = (m.occurred_at as string).split('T')[0];

        if (!stats[pid].lastDate) stats[pid].lastDate = date; // desc order → first = latest

        if (m.type === 'IN') {
            stats[pid].stock      += qty;
            stats[pid].inQtyTotal += qty;
            stats[pid].inCostTotal += qty * cost;
        } else if (m.type === 'OUT') {
            stats[pid].stock -= qty;
            if (date >= since) stats[pid].outInPeriod += qty;
        } else if (m.type === 'TRANSFER') {
            // net neutral for stock; count as OUT in period for rotation
            if (date >= since) stats[pid].outInPeriod += qty * 0.5;
        }
    }

    // Build enriched product list
    const enriched = (products ?? []).map(p => {
        const s        = stats[p.id] ?? { stock: 0, inCostTotal: 0, inQtyTotal: 0, outInPeriod: 0, lastDate: null };
        const stock    = Math.max(0, s.stock);
        const avgCost  = s.inQtyTotal > 0 ? s.inCostTotal / s.inQtyTotal : 0;
        const outQty   = Math.round(s.outInPeriod);
        const value    = stock * avgCost;
        const level    = getRotationLevel(outQty, days);
        return { ...p, outQty, stock, lastDate: s.lastDate, value, level };
    });

    // Sort: NONE first, then LOW, then NORMAL; within same level by value desc
    const levelOrder: Record<RotationLevel, number> = { NONE: 0, LOW: 1, NORMAL: 2 };
    enriched.sort((a, b) =>
        levelOrder[a.level] - levelOrder[b.level] || b.value - a.value
    );

    // KPIs
    const noneCount   = enriched.filter(p => p.level === 'NONE').length;
    const lowCount    = enriched.filter(p => p.level === 'LOW').length;
    const frozenValue = enriched.filter(p => p.level !== 'NORMAL').reduce((s, p) => s + p.value, 0);
    const totalValue  = enriched.reduce((s, p) => s + p.value, 0);
    const frozenPct   = totalValue > 0 ? ((frozenValue / totalValue) * 100).toFixed(1) : '0';

    const fmt = (n: number) =>
        `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    const exportRows = enriched.map(p => ({
        'Producto':          p.name,
        'SKU':               p.sku ?? '',
        'Stock (Und)':       p.stock,
        'Salidas (período)': p.outQty,
        'Último Movimiento': p.lastDate ?? '',
        'Valor Inmovilizado': p.value,
        'Estado':            ROTATION_CONFIG[p.level].label,
    }));

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            <VisualReportHeader
                title="Baja Rotación"
                subtitle={`SKUs sin movimiento — últimos ${days} días`}
                tenant={tenant}
            />

            {/* Period Selector */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">
                        Capital Inmovilizado
                    </span>
                    <div className="flex items-baseline gap-4">
                        <h2 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none">
                            {fmt(frozenValue)}
                        </h2>
                        <span className="text-xl font-black text-rose-400 uppercase italic tracking-widest">
                            {frozenPct}% del stock
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Period tabs */}
                    <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
                        {DAYS_OPTIONS.map(d => (
                            <Link
                                key={d}
                                href={`?days=${d}`}
                                className={cn(
                                    "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    days === d
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                {d}d
                            </Link>
                        ))}
                    </div>
                    <TableExportClient
                        rows={exportRows}
                        fileName={`baja-rotacion-${today}-${days}d`}
                        sheetName="Baja Rotación"
                    />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                            <XCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sin Movimiento</p>
                            <p className="text-2xl font-black text-rose-500 italic tracking-tighter">{noneCount} SKUs</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Baja Rotación</p>
                            <p className="text-2xl font-black text-amber-600 italic tracking-tighter">{lowCount} SKUs</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-600">
                            <TrendingDown className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">% Inventario Estancado</p>
                            <p className="text-2xl font-black text-fuchsia-600 italic tracking-tighter">{frozenPct}%</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-active bg-slate-900 rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all text-white">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
                            <Banknote className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Capital Inmovilizado</p>
                            <p className="text-2xl font-black text-white italic tracking-tighter">{fmt(frozenValue)}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Products Table */}
            <Card className="border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">
                            Análisis de Rotación por SKU
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            Salidas en los últimos {days} días · Ordenado por urgencia
                        </p>
                    </div>
                    <Activity className="h-5 w-5 text-fuchsia-400" />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Producto / SKU</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Stock</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Salidas ({days}d)</th>
                                <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Último Mov.</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Inmovilizado</th>
                                <th className="px-8 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {enriched.map((p) => {
                                const cfg = ROTATION_CONFIG[p.level];
                                const daysSinceLast = p.lastDate
                                    ? Math.floor((new Date(today).getTime() - new Date(p.lastDate).getTime()) / 86_400_000)
                                    : null;

                                return (
                                    <tr key={p.id} className={cn(
                                        "hover:bg-slate-50/50 transition-colors group",
                                        p.level === 'NONE' && "bg-rose-50/20",
                                        p.level === 'LOW'  && "bg-amber-50/20",
                                    )}>
                                        {/* Product */}
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-9 w-9 rounded-xl flex items-center justify-center shadow-sm shrink-0 transition-transform group-hover:scale-110",
                                                    p.level === 'NONE' ? "bg-rose-100 text-rose-500"
                                                        : p.level === 'LOW' ? "bg-amber-100 text-amber-600"
                                                            : "bg-slate-900 text-white"
                                                )}>
                                                    <Barcode className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900 italic tracking-tight leading-none">{p.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{p.sku || 'S/N'}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Stock */}
                                        <td className="px-8 py-5 text-right">
                                            <span className={cn(
                                                "text-sm font-black tabular-nums italic",
                                                p.stock === 0 ? "text-slate-300" : "text-slate-800"
                                            )}>
                                                {p.stock} Und
                                            </span>
                                        </td>

                                        {/* Exits in period */}
                                        <td className="px-8 py-5 text-right">
                                            <span className={cn(
                                                "text-sm font-black tabular-nums italic",
                                                p.outQty === 0 ? "text-rose-400" : "text-slate-600"
                                            )}>
                                                {p.outQty === 0 ? '—' : `-${p.outQty}`}
                                            </span>
                                        </td>

                                        {/* Last movement */}
                                        <td className="px-8 py-5">
                                            {p.lastDate ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="h-3 w-3 text-slate-300 shrink-0" />
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-600">{p.lastDate}</span>
                                                        {daysSinceLast !== null && (
                                                            <span className="text-[9px] text-slate-400 font-medium block">
                                                                hace {daysSinceLast}d
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] text-slate-300 italic">Sin historial</span>
                                            )}
                                        </td>

                                        {/* Frozen value */}
                                        <td className="px-8 py-5 text-right">
                                            <span className={cn(
                                                "text-sm font-black tabular-nums italic",
                                                p.value === 0 ? "text-slate-300" : "text-slate-900"
                                            )}>
                                                {p.value > 0 ? fmt(p.value) : '—'}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="px-8 py-5 text-center">
                                            <Badge className={cn(
                                                "border-none text-[8px] font-black uppercase tracking-[0.15em] px-2.5 py-0.5 rounded-md inline-flex items-center gap-1",
                                                cfg.cls
                                            )}>
                                                {cfg.icon}
                                                {cfg.label}
                                            </Badge>
                                        </td>
                                    </tr>
                                );
                            })}

                            {enriched.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-10 py-20 text-center">
                                        <Package className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                                            No hay productos físicos registrados
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                {enriched.length > 0 && (
                    <div className="px-10 py-5 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {enriched.length} SKUs analizados · Período {since} — {today}
                        </span>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-rose-400" />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{noneCount} sin movimiento</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-amber-400" />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{lowCount} baja rotación</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{enriched.length - noneCount - lowCount} en rotación</span>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Advisory */}
            <div className="bg-slate-100 p-12 rounded-[4rem] flex flex-col lg:flex-row items-center justify-between gap-10 border border-slate-200">
                <div className="flex items-center gap-8">
                    <div className="h-20 w-20 bg-white rounded-[2rem] flex items-center justify-center text-fuchsia-600 shadow-premium border border-white">
                        <TrendingDown className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                            Optimización de Capital de Trabajo
                        </h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-xl">
                            Los productos de baja rotación representan capital inmovilizado que genera costos de almacenamiento sin retorno.{' '}
                            <span className="text-fuchsia-600 font-bold">{tenant?.name}</span> puede liberar{' '}
                            <span className="font-black text-slate-900">{fmt(frozenValue)}</span> optimizando estos SKUs.
                        </p>
                    </div>
                </div>
                <Button variant="outline" className="h-16 rounded-[2rem] border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest px-12 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-premium group shrink-0">
                    Plan de Liquidación <ArrowRight className="ml-4 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
}
