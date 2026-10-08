'use client';

import type { MissingProduct } from '../services/missingProductsService';
import { Button } from '@/shared/components/ui/button';
import { Download } from 'lucide-react';

function download(rows: MissingProduct[]) {
    const head = 'Codigo,Producto,UnidadesVendidas,MesesConVenta';
    const body = rows.map(r => [r.sku, `"${r.productLabel.replace(/"/g, '""')}"`, r.totalQty, r.months].join(','));
    const blob = new Blob(['﻿' + [head, ...body].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'productos-faltantes-catalogo.csv'; a.click();
    URL.revokeObjectURL(url);
}

export function MissingProductsPanel({ products }: { products: MissingProduct[] }) {
    if (products.length === 0) {
        return <p className="text-sm text-emerald-600">Todos los productos del informe están en el catálogo. 👍</p>;
    }
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-500">
                    {products.length} producto{products.length > 1 ? 's' : ''} del informe no está{products.length > 1 ? 'n' : ''} en el catálogo.
                    Su historial se guardó igual; créalos en Inventario para que queden completos.
                </p>
                <Button variant="outline" onClick={() => download(products)} className="h-9 rounded-xl text-xs gap-2 shrink-0">
                    <Download className="h-3.5 w-3.5" /> Exportar CSV
                </Button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 sticky top-0">
                        <tr>
                            <th className="text-left px-3 py-2">Código</th>
                            <th className="text-left px-3 py-2">Producto</th>
                            <th className="text-right px-3 py-2">Unidades</th>
                            <th className="text-right px-3 py-2">Meses</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {products.map(p => (
                            <tr key={p.sku} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2 font-mono text-slate-700">{p.sku}</td>
                                <td className="px-3 py-2 text-slate-700">{p.productLabel}</td>
                                <td className="text-right px-3 py-2 font-mono tabular-nums text-slate-600">{p.totalQty.toLocaleString('es-CO')}</td>
                                <td className="text-right px-3 py-2 font-mono tabular-nums text-slate-400">{p.months}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
