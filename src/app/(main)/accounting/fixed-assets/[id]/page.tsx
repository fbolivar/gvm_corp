import { createClient } from '@/lib/supabase/server';
import {
    netBookValue,
    depreciationPct,
    annualDepreciation,
    CATEGORY_LABELS,
    categoryColor,
    type FixedAsset,
} from '@/features/accounting/services/fixedAssetService';
import { AuditTrail } from '@/shared/components/ui/audit-trail';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeft, Package, TrendingDown, DollarSign, Calendar, MapPin, Hash } from 'lucide-react';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { cn } from '@/shared/lib/utils';

interface Props { params: Promise<{ id: string }> }

const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Activo',
    DISPOSED: 'Dado de Baja',
    FULLY_DEPRECIATED: 'Depreciado Total',
};
const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-600',
    DISPOSED: 'bg-rose-50 text-rose-600',
    FULLY_DEPRECIATED: 'bg-slate-100 text-slate-500',
};

export default async function FixedAssetDetailPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Fetch del activo por ID con cast a FixedAsset
    const { data: raw, error } = await supabase
        .from('fixed_assets')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !raw) notFound();

    const asset = raw as unknown as FixedAsset;

    const nbv = netBookValue(asset);
    const pct = depreciationPct(asset);
    const annDep = annualDepreciation(asset);
    const fmt = (n: number) => `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl">
                    <Link href="/accounting/fixed-assets"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight truncate">{asset.name}</h1>
                        {asset.code && (
                            <span className="text-xs font-mono text-slate-400">{asset.code}</span>
                        )}
                        <Badge className={cn(
                            "border-none text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5",
                            STATUS_COLORS[asset.status]
                        )}>
                            {STATUS_LABELS[asset.status]}
                        </Badge>
                        <Badge className={cn(
                            "border-none text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5",
                            categoryColor(asset.category)
                        )}>
                            {CATEGORY_LABELS[asset.category]}
                        </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">Detalle y trazabilidad del activo</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Costo Adquisición', value: fmt(Number(asset.acquisition_cost)), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Valor Neto Libros', value: fmt(nbv), icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Dep. Acumulada', value: fmt(Number(asset.accumulated_depreciation)), icon: TrendingDown, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Dep. Anual', value: annDep > 0 ? fmt(annDep) : 'N/A', icon: Calendar, color: 'text-rose-500', bg: 'bg-rose-50' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${kpi.bg} ${kpi.color}`}>
                            <kpi.icon className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                            <p className="text-sm font-bold text-slate-900 font-mono tabular-nums">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Barra de depreciación */}
            {asset.category !== 'LAND' && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-3">
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                        <span>Depreciación acumulada</span>
                        <span className={cn(pct >= 100 ? 'text-rose-500' : 'text-indigo-500')}>{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={cn('h-full rounded-full transition-all duration-700', pct >= 100 ? 'bg-rose-500' : 'bg-indigo-500')}
                            style={{ width: `${Math.min(100, pct)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Valor residual: {fmt(asset.salvage_value)}</span>
                        <span>Vida útil: {asset.useful_life_years} años</span>
                    </div>
                </div>
            )}

            {/* Metadata */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 mb-4 uppercase tracking-wider">Información del Activo</h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                        <Calendar className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                        <div>
                            <dt className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fecha de Adquisición</dt>
                            <dd className="text-sm font-medium text-slate-900">{asset.acquisition_date}</dd>
                        </div>
                    </div>
                    {asset.location && (
                        <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                            <div>
                                <dt className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ubicación</dt>
                                <dd className="text-sm font-medium text-slate-900">{asset.location}</dd>
                            </div>
                        </div>
                    )}
                    {asset.serial_number && (
                        <div className="flex items-start gap-3">
                            <Hash className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                            <div>
                                <dt className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Serial / Placa</dt>
                                <dd className="text-sm font-mono text-slate-900">{asset.serial_number}</dd>
                            </div>
                        </div>
                    )}
                    {asset.notes && (
                        <div className="sm:col-span-2">
                            <dt className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Notas</dt>
                            <dd className="text-sm text-slate-600">{asset.notes}</dd>
                        </div>
                    )}
                </dl>
            </div>

            {/* Historial de auditoría */}
            <div className="mt-2">
                <AuditTrail
                    client={supabase}
                    entity="fixed_assets"
                    entityId={id}
                />
            </div>
        </div>
    );
}
