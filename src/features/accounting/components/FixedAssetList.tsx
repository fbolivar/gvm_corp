'use client';

import { useState } from 'react';
import {
    FixedAsset, CATEGORY_LABELS, categoryColor,
    netBookValue, depreciationPct, monthlyDepreciation,
} from '../services/fixedAssetService';
import { registerDepreciationAction, disposeFixedAssetAction } from '../fixedAssetActions';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { TrendingDown, Trash2, Loader2, Package } from 'lucide-react';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Activo', DISPOSED: 'Dado de Baja', FULLY_DEPRECIATED: 'Depreciado Total',
};
const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    DISPOSED: 'bg-rose-100 text-rose-700',
    FULLY_DEPRECIATED: 'bg-slate-100 text-slate-500',
};

interface Props { initialAssets: FixedAsset[] }

export function FixedAssetList({ initialAssets }: Props) {
    const [assets, setAssets] = useState<FixedAsset[]>(initialAssets);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleDepreciate = async (asset: FixedAsset) => {
        const monthly = monthlyDepreciation(asset);
        if (monthly === 0) { alert('Este activo no se deprecia (terreno o vida útil cero).'); return; }
        if (!confirm(`¿Registrar 1 mes de depreciación ($${monthly.toLocaleString('es-CO', { maximumFractionDigits: 0 })}) para "${asset.name}"?`)) return;
        setProcessingId(asset.id + '-dep');
        const result = await registerDepreciationAction(asset.id, 1);
        setProcessingId(null);
        if (result.error) {
            alert(result.error);
        } else {
            setAssets(prev => prev.map(a => {
                if (a.id !== asset.id) return a;
                const newAcc = result.newAccumulated!;
                const depreciable = a.acquisition_cost - a.salvage_value;
                return {
                    ...a,
                    accumulated_depreciation: newAcc,
                    status: newAcc >= depreciable ? 'FULLY_DEPRECIATED' : 'ACTIVE',
                };
            }));
        }
    };

    const handleDispose = async (asset: FixedAsset) => {
        if (!confirm(`¿Dar de baja definitiva el activo "${asset.name}"?`)) return;
        setProcessingId(asset.id + '-dispose');
        const result = await disposeFixedAssetAction(asset.id);
        setProcessingId(null);
        if (result.error) {
            alert(result.error);
        } else {
            setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, status: 'DISPOSED' } : a));
        }
    };

    if (assets.length === 0) {
        return (
            <div className="py-32 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center gap-6">
                <div className="h-20 w-20 rounded-[2rem] bg-white shadow-sm border border-slate-50 flex items-center justify-center">
                    <Package className="h-10 w-10 text-slate-200" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Sin Activos Registrados</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Registre su primer activo fijo para iniciar el control de depreciación</p>
                </div>
                <Button className="bg-slate-900 hover:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest h-14 px-10 rounded-2xl shadow-active" asChild>
                    <Link href="/accounting/fixed-assets/new">Registrar Activo</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {assets.map(asset => {
                const nbv = netBookValue(asset);
                const pct = depreciationPct(asset);
                const monthly = monthlyDepreciation(asset);
                const isProcessing = processingId?.startsWith(asset.id);

                return (
                    <div key={asset.id} className="group bg-white rounded-[2.5rem] p-8 shadow-premium border border-transparent hover:border-slate-100 hover:shadow-active transition-all duration-500">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                            {/* Icon + Info */}
                            <div className="flex items-start gap-6 flex-1 min-w-0">
                                <div className="h-16 w-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">
                                    <Package className="h-7 w-7" />
                                </div>
                                <div className="space-y-2 min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h3 className="text-lg font-black text-slate-900 italic tracking-tighter">{asset.name}</h3>
                                        {asset.code && <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{asset.code}</span>}
                                        <Badge className={`border-none text-[8px] font-black uppercase tracking-widest rounded-full px-3 ${STATUS_COLORS[asset.status]}`}>
                                            {STATUS_LABELS[asset.status]}
                                        </Badge>
                                        <Badge className={`border-none text-[8px] font-black uppercase tracking-widest rounded-full px-3 ${categoryColor(asset.category)}`}>
                                            {CATEGORY_LABELS[asset.category]}
                                        </Badge>
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Adquirido: {asset.acquisition_date}
                                        {asset.location && ` · ${asset.location}`}
                                        {asset.serial_number && ` · S/N: ${asset.serial_number}`}
                                    </p>

                                    {/* Depreciation bar */}
                                    {asset.category !== 'LAND' && (
                                        <div className="space-y-1.5 pt-1">
                                            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-400">
                                                <span>Depreciación acumulada {pct.toFixed(1)}%</span>
                                                <span className="text-indigo-500">−${monthly.toLocaleString('es-CO', { maximumFractionDigits: 0 })}/mes</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Values + Actions */}
                            <div className="flex flex-wrap items-center gap-4 shrink-0">
                                <div className="text-right space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Costo Orig.</p>
                                    <p className="text-base font-black text-slate-400 italic tracking-tighter line-through">${Number(asset.acquisition_cost).toLocaleString('es-CO')}</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Neto</p>
                                    <p className="text-2xl font-black text-slate-900 italic tracking-tighter">${nbv.toLocaleString('es-CO')}</p>
                                </div>

                                {asset.status === 'ACTIVE' && (
                                    <Button
                                        onClick={() => handleDepreciate(asset)}
                                        disabled={!!isProcessing}
                                        className="h-12 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest shadow-active transition-all"
                                    >
                                        {processingId === asset.id + '-dep'
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : <><TrendingDown className="h-4 w-4 mr-1.5" />Depreciar</>}
                                    </Button>
                                )}

                                {asset.status !== 'DISPOSED' && (
                                    <Button
                                        variant="outline"
                                        onClick={() => handleDispose(asset)}
                                        disabled={!!isProcessing}
                                        className="h-12 w-12 rounded-2xl border-slate-100 text-rose-400 hover:bg-rose-50 hover:border-rose-200 transition-all"
                                        title="Dar de baja"
                                    >
                                        {processingId === asset.id + '-dispose'
                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                            : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
