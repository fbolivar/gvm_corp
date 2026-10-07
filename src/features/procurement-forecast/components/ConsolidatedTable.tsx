'use client';

import { useState } from 'react';
import type { Consolidated, ConsolidatedRow } from '../services/consolidatedService';
import { Button } from '@/shared/components/ui/button';
import { Download } from 'lucide-react';

function toCsv(rows: ConsolidatedRow[]): string {
    const head = 'SKU,Producto,Cantidad,Comerciales,EnCatalogo';
    const body = rows.map(r =>
        [r.sku, `"${r.productLabel.replace(/"/g, '""')}"`, r.totalQty, r.salespeople, r.inCatalog ? 'Si' : 'No'].join(',')
    );
    return [head, ...body].join('\n');
}

function download(name: string, rows: ConsolidatedRow[]) {
    const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
}

function Table({ rows }: { rows: ConsolidatedRow[] }) {
    if (rows.length === 0) return <p className="text-sm text-slate-400">Sin pronósticos cargados aún.</p>;
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                        <th className="text-left px-3 py-2">Producto</th>
                        <th className="text-right px-3 py-2">Cantidad a comprar</th>
                        <th className="text-right px-3 py-2">Comerciales</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {rows.map(r => (
                        <tr key={r.sku} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2">
                                <span className="font-medium text-slate-800">{r.productLabel}</span>
                                {!r.inCatalog && <span className="ml-1 text-[9px] text-rose-500">(sin catálogo)</span>}
                            </td>
                            <td className="text-right px-3 py-2 font-mono tabular-nums font-semibold text-slate-900">{r.totalQty.toLocaleString('es-CO')}</td>
                            <td className="text-right px-3 py-2 font-mono tabular-nums text-slate-400">{r.salespeople}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export function ConsolidatedTable({ data }: { data: Consolidated }) {
    const [tab, setTab] = useState<'general' | 'separate'>('general');
    const rows = tab === 'general' ? data.general : data.separate;

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                    <button onClick={() => setTab('general')} className={`h-9 px-4 rounded-xl text-xs font-semibold ${tab === 'general' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                        General ({data.general.length})
                    </button>
                    <button onClick={() => setTab('separate')} className={`h-9 px-4 rounded-xl text-xs font-semibold ${tab === 'separate' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                        Aparte · Víctor y Miguel ({data.separate.length})
                    </button>
                </div>
                <Button variant="outline" onClick={() => download(`consolidado-${tab}.csv`, rows)} disabled={rows.length === 0} className="h-9 rounded-xl text-xs gap-2">
                    <Download className="h-3.5 w-3.5" /> Exportar CSV
                </Button>
            </div>
            <Table rows={rows} />
        </div>
    );
}
