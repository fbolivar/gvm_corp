'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitForecastLineAction } from '../forecastActions';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';

export interface EditorLine {
    id: string;
    product_label: string;
    abc_class: 'A' | 'B' | 'C' | null;
    suggested_qty: number;
    forecast_qty: number | null;
    is_one_off: boolean;
    submitted_at: string | null;
}

const ABC_STYLE: Record<string, string> = { A: 'bg-emerald-100 text-emerald-700', B: 'bg-amber-100 text-amber-700', C: 'bg-slate-100 text-slate-500' };

export function MyForecastEditor({ lines, readOnly }: { lines: EditorLine[]; readOnly: boolean }) {
    const router = useRouter();
    const [state, setState] = useState(() => new Map(lines.map(l => [l.id, { qty: l.forecast_qty ?? l.suggested_qty, oneOff: l.is_one_off, dirty: false }])));
    const [pending, start] = useTransition();

    if (lines.length === 0) {
        return <p className="text-sm text-slate-400">No tienes productos en el período abierto.</p>;
    }

    const update = (id: string, patch: Partial<{ qty: number; oneOff: boolean }>) => {
        setState(prev => {
            const next = new Map(prev);
            const cur = next.get(id)!;
            next.set(id, { ...cur, ...patch, dirty: true });
            return next;
        });
    };

    const dirtyCount = [...state.values()].filter(v => v.dirty).length;

    function saveAll() {
        start(async () => {
            let ok = 0, fail = 0;
            for (const [id, v] of state) {
                if (!v.dirty) continue;
                const r = await submitForecastLineAction({ lineId: id, qty: v.qty, isOneOff: v.oneOff, note: null });
                if (r.error) fail++; else ok++;
            }
            if (fail === 0) toast.success(`Pronóstico guardado (${ok} líneas)`);
            else toast.warning(`${ok} guardadas, ${fail} con error`);
            router.refresh();
        });
    }

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                        <tr>
                            <th className="text-left px-3 py-2">Producto</th>
                            <th className="text-center px-2 py-2">ABC</th>
                            <th className="text-right px-3 py-2">Sugerido</th>
                            <th className="text-right px-3 py-2">Tu pronóstico</th>
                            <th className="text-center px-2 py-2">Puntual</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {lines.map(l => {
                            const s = state.get(l.id)!;
                            return (
                                <tr key={l.id} className="hover:bg-slate-50/50">
                                    <td className="px-3 py-2 font-medium text-slate-800">{l.product_label}</td>
                                    <td className="text-center px-2 py-2">
                                        {l.abc_class && <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', ABC_STYLE[l.abc_class])}>{l.abc_class}</span>}
                                    </td>
                                    <td className="text-right px-3 py-2 font-mono tabular-nums text-slate-400">{l.suggested_qty.toLocaleString('es-CO')}</td>
                                    <td className="text-right px-3 py-2">
                                        <input
                                            type="number" min={0} disabled={readOnly || s.oneOff}
                                            value={s.oneOff ? 0 : s.qty}
                                            onChange={e => update(l.id, { qty: Number(e.target.value) })}
                                            className="h-8 w-24 rounded-lg border border-slate-200 px-2 text-right text-xs font-mono disabled:bg-slate-50 disabled:text-slate-300"
                                        />
                                    </td>
                                    <td className="text-center px-2 py-2">
                                        <input type="checkbox" disabled={readOnly} checked={s.oneOff}
                                            onChange={e => update(l.id, { oneOff: e.target.checked })} className="h-4 w-4" />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {!readOnly && (
                <Button onClick={saveAll} disabled={pending || dirtyCount === 0} className="h-11 rounded-xl">
                    {pending ? 'Guardando…' : dirtyCount === 0 ? 'Sin cambios' : `Guardar ${dirtyCount} cambio${dirtyCount > 1 ? 's' : ''}`}
                </Button>
            )}
            {readOnly && <p className="text-xs text-slate-400">El período está cerrado; no se puede editar.</p>}
        </div>
    );
}
