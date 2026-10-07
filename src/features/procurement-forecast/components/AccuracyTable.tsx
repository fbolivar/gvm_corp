'use client';

import { useState } from 'react';
import type { SalespersonAccuracy } from '../services/forecastAccuracy';
import { cn } from '@/shared/lib/utils';

const num = (n: number) => n.toLocaleString('es-CO');

function pctColor(p: number): string {
    if (p >= 85) return 'text-emerald-600';
    if (p >= 65) return 'text-amber-600';
    return 'text-rose-600';
}

export function AccuracyTable({ rows, hasActuals }: { rows: SalespersonAccuracy[]; hasActuals: boolean }) {
    const [open, setOpen] = useState<string | null>(null);

    if (!hasActuals) {
        return <p className="text-sm text-slate-400">Aún no hay ventas reales importadas para este mes. La precisión aparece cuando se importe el informe del mes evaluado.</p>;
    }
    if (rows.length === 0) return <p className="text-sm text-slate-400">Sin datos para comparar.</p>;

    return (
        <div className="space-y-2">
            {rows.map(sp => (
                <div key={sp.salespersonLabel} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    <button
                        onClick={() => setOpen(open === sp.salespersonLabel ? null : sp.salespersonLabel)}
                        className="w-full flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50 text-left"
                    >
                        <span className="text-sm font-semibold text-slate-800 truncate">{sp.salespersonLabel}</span>
                        <span className="flex items-center gap-4 shrink-0 text-xs font-mono tabular-nums">
                            <span className="text-slate-400">Pron. {num(sp.forecastTotal)}</span>
                            <span className="text-slate-600">Vend. {num(sp.actualTotal)}</span>
                            <span className={cn('font-bold', pctColor(sp.accuracyPct))}>{sp.accuracyPct}%</span>
                        </span>
                    </button>
                    {open === sp.salespersonLabel && (
                        <div className="border-t border-slate-100 overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                                    <tr>
                                        <th className="text-left px-3 py-2">Producto</th>
                                        <th className="text-right px-3 py-2">Pronosticado</th>
                                        <th className="text-right px-3 py-2">Vendido</th>
                                        <th className="text-right px-3 py-2">Diferencia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {sp.products.map(p => (
                                        <tr key={p.sku}>
                                            <td className="px-3 py-2 text-slate-700">{p.productLabel}</td>
                                            <td className="text-right px-3 py-2 font-mono tabular-nums text-slate-400">{num(p.forecast)}</td>
                                            <td className="text-right px-3 py-2 font-mono tabular-nums text-slate-700">{num(p.actual)}</td>
                                            <td className={cn('text-right px-3 py-2 font-mono tabular-nums font-semibold', p.diff === 0 ? 'text-slate-400' : p.diff > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                                                {p.diff > 0 ? '+' : ''}{num(p.diff)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
