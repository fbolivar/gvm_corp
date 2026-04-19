'use client';

import { useState } from 'react';
import {
    FixedAsset, CATEGORY_LABELS, categoryColor,
    netBookValue, depreciationPct, monthlyDepreciation,
} from '../services/fixedAssetService';
import { registerDepreciationAction, disposeFixedAssetAction } from '../fixedAssetActions';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { TrendingDown, Trash2, Loader2, Package } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/shared/lib/utils';
import { useConfirm } from '@/shared/hooks/useConfirm';

const STATUS_LABELS: Record<string, string> = {
    ACTIVE: 'Activo', DISPOSED: 'Dado de Baja', FULLY_DEPRECIATED: 'Depreciado Total',
};
const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-600',
    DISPOSED: 'bg-rose-50 text-rose-600',
    FULLY_DEPRECIATED: 'bg-slate-100 text-slate-500',
};

interface Props { initialAssets: FixedAsset[] }

export function FixedAssetList({ initialAssets }: Props) {
    const [assets, setAssets] = useState<FixedAsset[]>(initialAssets);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [ConfirmDialogEl, confirmFn] = useConfirm();

    const handleDepreciate = async (asset: FixedAsset) => {
        const monthly = monthlyDepreciation(asset);
        if (monthly === 0) { alert('Este activo no se deprecia (terreno o vida útil cero).'); return; }
        const ok = await confirmFn({ title: "Confirmar accion", description: `Registrar 1 mes de depreciación ($${monthly.toLocaleString('es-CO', { maximumFractionDigits: 0 })}) para "${asset.name}"?`, variant: "danger", confirmLabel: "Confirmar" })
        if (!ok) return;
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
        const ok = await confirmFn({ title: "Confirmar accion", description: `Dar de baja definitiva el activo "${asset.name}"?`, variant: "danger", confirmLabel: "Confirmar" })
        if (!ok) return;
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
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                    <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
                        <Package className="h-7 w-7" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 mb-1">Sin activos registrados</h3>
                    <p className="text-xs text-slate-400 mb-4">Registre su primer activo fijo para iniciar el control de depreciación</p>
                    <Button size="sm" asChild className="h-9 px-4 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700">
                        <Link href="/accounting/fixed-assets/new">Registrar Activo</Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (<>
        <div className="space-y-3">
            {assets.map(asset => {
                const nbv = netBookValue(asset);
                const pct = depreciationPct(asset);
                const monthly = monthlyDepreciation(asset);
                const isProcessing = processingId?.startsWith(asset.id);

                return (
                    <Card key={asset.id} className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                        <CardContent className="p-5">
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                                {/* Icon + Info */}
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                        <Package className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-1.5 min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Link href={`/accounting/fixed-assets/${asset.id}`} className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                                                {asset.name}
                                            </Link>
                                            {asset.code && <span className="text-[10px] font-mono text-slate-400">{asset.code}</span>}
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
                                        <p className="text-[10px] text-slate-400">
                                            Adquirido: {asset.acquisition_date}
                                            {asset.location && ` · ${asset.location}`}
                                            {asset.serial_number && ` · S/N: ${asset.serial_number}`}
                                        </p>

                                        {/* Depreciation bar */}
                                        {asset.category !== 'LAND' && (
                                            <div className="space-y-1 pt-0.5">
                                                <div className="flex justify-between text-[10px] text-slate-400">
                                                    <span>Depreciación {pct.toFixed(1)}%</span>
                                                    <span className="text-indigo-500 font-medium">-${monthly.toLocaleString('es-CO', { maximumFractionDigits: 0 })}/mes</span>
                                                </div>
                                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Values + Actions */}
                                <div className="flex flex-wrap items-center gap-4 shrink-0">
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400">Costo Orig.</p>
                                        <p className="text-xs font-medium text-slate-400 line-through font-mono">
                                            ${Number(asset.acquisition_cost).toLocaleString('es-CO')}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400">Valor Neto</p>
                                        <p className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                                            ${nbv.toLocaleString('es-CO')}
                                        </p>
                                    </div>

                                    {asset.status === 'ACTIVE' && (
                                        <Button
                                            onClick={() => handleDepreciate(asset)}
                                            disabled={!!isProcessing}
                                            size="sm"
                                            className="h-9 px-4 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs"
                                        >
                                            {processingId === asset.id + '-dep'
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <><TrendingDown className="h-3.5 w-3.5" />Depreciar</>}
                                        </Button>
                                    )}

                                    {asset.status !== 'DISPOSED' && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleDispose(asset)}
                                            disabled={!!isProcessing}
                                            className="h-9 w-9 rounded-xl text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                                            title="Dar de baja"
                                        >
                                            {processingId === asset.id + '-dispose'
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <Trash2 className="h-3.5 w-3.5" />}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
        {ConfirmDialogEl}
    </>);
}
