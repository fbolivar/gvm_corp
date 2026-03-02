import { createClient } from '@/lib/supabase/server';
import { fixedAssetService, netBookValue, annualDepreciation, CATEGORY_LABELS } from '@/features/accounting/services/fixedAssetService';
import { FixedAssetList } from '@/features/accounting/components/FixedAssetList';
import { Button } from '@/shared/components/ui/button';
import { Plus, Package, TrendingDown, DollarSign, Layers } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function FixedAssetsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const assets = await fixedAssetService.getAll(supabase);

    const totalCost   = assets.reduce((s, a) => s + Number(a.acquisition_cost), 0);
    const totalNBV    = assets.reduce((s, a) => s + netBookValue(a), 0);
    const totalAnnDep = assets
        .filter(a => a.status === 'ACTIVE')
        .reduce((s, a) => s + annualDepreciation(a), 0);
    const activeCount = assets.filter(a => a.status === 'ACTIVE').length;

    // Category breakdown for display
    const byCategory = Object.entries(CATEGORY_LABELS).map(([cat, label]) => ({
        cat, label,
        count: assets.filter(a => a.category === cat).length,
        nbv: assets.filter(a => a.category === cat).reduce((s, a) => s + netBookValue(a), 0),
    })).filter(c => c.count > 0);

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* 🏭 HEADER */}
            <div className="relative overflow-hidden bg-slate-950 rounded-[4rem] p-16 text-white shadow-active group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <Package className="h-64 w-64 text-white" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-8 bg-indigo-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Control de Patrimonio</span>
                        </div>
                        <h1 className="text-6xl md:text-7xl font-black tracking-tighter italic uppercase leading-[0.85]">
                            Activos<br /><span className="text-slate-500">Fijos</span>
                        </h1>
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">
                            Registro, depreciación y control patrimonial — Línea recta NIC 16
                        </p>
                    </div>
                    <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest h-14 px-10 rounded-2xl shadow-active" asChild>
                        <Link href="/accounting/fixed-assets/new"><Plus className="h-4 w-4 mr-2" />Registrar Activo</Link>
                    </Button>
                </div>
            </div>

            {/* KPI STRIP */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                    { label: 'Activos Activos', value: activeCount, icon: Layers, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Costo Total', value: `$${(totalCost / 1e6).toFixed(1)}M`, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Valor Neto en Libros', value: `$${(totalNBV / 1e6).toFixed(1)}M`, icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Dep. Anual Total', value: `$${(totalAnnDep / 1e6).toFixed(1)}M`, icon: TrendingDown, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-[2.5rem] p-7 shadow-premium flex items-center gap-5">
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${kpi.bg} ${kpi.color}`}>
                            <kpi.icon className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                            <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Category breakdown */}
            {byCategory.length > 0 && (
                <div className="bg-white rounded-[3rem] p-10 shadow-premium">
                    <h3 className="text-sm font-black text-slate-900 uppercase italic tracking-tight mb-6">Distribución por Categoría</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {byCategory.map(c => (
                            <div key={c.cat} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{c.label}</p>
                                <p className="text-xl font-black text-slate-900 italic tracking-tighter">{c.count}</p>
                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">${c.nbv.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
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
