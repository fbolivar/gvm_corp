'use client';

import { useState } from 'react';
import type { SalespersonPortfolio } from '../services/forecastHistoryService';
import { cn } from '@/shared/lib/utils';

const ABC_STYLE: Record<string, string> = {
    A: 'bg-emerald-100 text-emerald-700',
    B: 'bg-amber-100 text-amber-700',
    C: 'bg-slate-100 text-slate-500',
};

const money = (n: number) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function PortfolioExplorer({ portfolios }: { portfolios: SalespersonPortfolio[] }) {
    const [selected, setSelected] = useState(portfolios[0]?.salespersonLabel ?? '');
    const current = portfolios.find(p => p.salespersonLabel === selected);

    if (portfolios.length === 0) {
        return <p className="text-sm text-slate-400">Aún no hay histórico importado. Sube el informe de ventas arriba.</p>;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <select
                    value={selected}
                    onChange={e => setSelected(e.target.value)}
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm min-w-64"
                >
                    {portfolios.map(p => (
                        <option key={p.salespersonLabel} value={p.salespersonLabel}>
                            {p.salespersonLabel}{p.salespersonId ? '' : ' (sin usuario)'}{p.isSeparate ? ' · aparte' : ''}
                        </option>
                    ))}
                </select>
                {current && (
                    <div className="flex gap-2 text-xs">
                        <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold">A: {current.counts.A}</span>
                        <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 font-semibold">B: {current.counts.B}</span>
                        <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 font-semibold">C: {current.counts.C}</span>
                        <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-semibold">{money(current.totalValue)}</span>
                    </div>
                )}
            </div>

            {current && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="text-left px-3 py-2">Producto</th>
                                {current.months.map(m => <th key={m} className="text-right px-2 py-2 font-mono">{m.slice(5)}</th>)}
                                <th className="text-right px-3 py-2">Prom.</th>
                                <th className="text-right px-3 py-2">Valor</th>
                                <th className="text-center px-2 py-2">ABC</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {current.products.map(p => (
                                <tr key={p.sku} className="hover:bg-slate-50/50">
                                    <td className="px-3 py-2">
                                        <span className="font-medium text-slate-800">{p.productLabel}</span>
                                        {!p.productId && <span className="ml-1 text-[9px] text-rose-500">(sin catálogo)</span>}
                                    </td>
                                    {current.months.map(m => (
                                        <td key={m} className="text-right px-2 py-2 font-mono tabular-nums text-slate-500">
                                            {p.monthly[m] ? p.monthly[m].toLocaleString('es-CO') : '·'}
                                        </td>
                                    ))}
                                    <td className="text-right px-3 py-2 font-mono tabular-nums font-semibold text-slate-900">{p.avgQty.toLocaleString('es-CO')}</td>
                                    <td className="text-right px-3 py-2 font-mono tabular-nums text-slate-500">{money(p.totalValue)}</td>
                                    <td className="text-center px-2 py-2">
                                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', ABC_STYLE[p.abc])}>{p.abc}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
