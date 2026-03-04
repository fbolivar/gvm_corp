import { createClient } from '@/lib/supabase/server';
import { fixedAssetService, netBookValue, annualDepreciation, CATEGORY_LABELS } from '@/features/accounting/services/fixedAssetService';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { FixedAssetList } from '@/features/accounting/components/FixedAssetList';
import { Button } from '@/shared/components/ui/button';
import { Plus, Package, TrendingDown, DollarSign, Layers } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function FixedAssetsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [assets, tenant] = await Promise.all([
        fixedAssetService.getAll(supabase),
        settingsService.getTenantInfo(supabase),
    ]);

    const totalCost = assets.reduce((s, a) => s + Number(a.acquisition_cost), 0);
    const totalNBV = assets.reduce((s, a) => s + netBookValue(a), 0);
    const totalAnnDep = assets
        .filter(a => a.status === 'ACTIVE')
        .reduce((s, a) => s + annualDepreciation(a), 0);
    const activeCount = assets.filter(a => a.status === 'ACTIVE').length;

    const byCategory = Object.entries(CATEGORY_LABELS).map(([cat, label]) => ({
        cat, label,
        count: assets.filter(a => a.category === cat).length,
        nbv: assets.filter(a => a.category === cat).reduce((s, a) => s + netBookValue(a), 0),
    })).filter(c => c.count > 0);

    const fmt = (n: number) => `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;

    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in duration-500">

            <VisualReportHeader
                title="Activos Fijos"
                subtitle="Registro, depreciación y control patrimonial — Línea Recta NIC 16"
                tenant={tenant}
            />

            {/* KPIs + Action */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Activos Activos', value: String(activeCount), icon: Layers, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Costo Total', value: fmt(totalCost), icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: 'Valor Neto Libros', value: fmt(totalNBV), icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        { label: 'Dep. Anual', value: fmt(totalAnnDep), icon: TrendingDown, color: 'text-amber-600', bg: 'bg-amber-50' },
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
                <Button size="sm" asChild className="h-9 px-4 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <Link href="/accounting/fixed-assets/new">
                        <Plus className="h-3.5 w-3.5" />
                        <span className="text-xs">Registrar Activo</span>
                    </Link>
                </Button>
            </div>

            {/* Category breakdown */}
            {byCategory.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-900 mb-4">Distribución por Categoría</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {byCategory.map(c => (
                            <div key={c.cat} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{c.label}</p>
                                <p className="text-lg font-bold text-slate-900">{c.count}</p>
                                <p className="text-[10px] font-medium text-indigo-500 font-mono">{fmt(c.nbv)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Asset list */}
            <FixedAssetList initialAssets={assets} />
        </div>
    );
}
