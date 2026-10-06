'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Copy, Save } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { saveTargetsAction } from '../actions/accountActions';
import type { SalesTarget } from '../services/accountService';
import type { Salesperson } from '../services/visitService';

/**
 * Metas mensuales por comercial. Buenas prácticas aplicadas:
 *  - meta en pesos + meta de visitas (actividad que sí controla el vendedor);
 *  - referencia visible: venta del mes anterior de su cartera, para no poner
 *    metas a ciegas;
 *  - "copiar mes anterior" para que definir metas tome un minuto.
 */

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

interface Props {
    period: string;
    team: Salesperson[];
    current: SalesTarget[];
    previous: SalesTarget[];
    /** Venta del mes anterior por comercial (referencia). */
    prevSales: Record<string, number>;
}

interface Row { salesperson_id: string; target_amount: string; target_visits: string }

export function TargetsEditor({ period, team, current, previous, prevSales }: Props) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [rows, setRows] = useState<Row[]>(() => team.map(s => {
        const t = current.find(c => c.salesperson_id === s.id);
        return { salesperson_id: s.id, target_amount: t ? String(t.target_amount) : '', target_visits: t ? String(t.target_visits) : '' };
    }));
    const nameOf = useMemo(() => new Map(team.map(s => [s.id, s])), [team]);

    const set = (id: string, key: keyof Omit<Row, 'salesperson_id'>, value: string) =>
        setRows(r => r.map(x => x.salesperson_id === id ? { ...x, [key]: value } : x));

    const copyPrevious = () => {
        if (previous.length === 0) { toast.info('El mes anterior no tiene metas'); return; }
        setRows(r => r.map(x => {
            const p = previous.find(t => t.salesperson_id === x.salesperson_id);
            return p ? { ...x, target_amount: String(p.target_amount), target_visits: String(p.target_visits) } : x;
        }));
    };

    const usePrevSales = (pct: number) =>
        setRows(r => r.map(x => ({ ...x, target_amount: String(Math.round(((prevSales[x.salesperson_id] ?? 0) * (1 + pct / 100)) / 1000) * 1000) })));

    async function save() {
        const targets = rows
            .filter(r => r.target_amount !== '' || r.target_visits !== '')
            .map(r => ({ salesperson_id: r.salesperson_id, target_amount: Number(r.target_amount || 0), target_visits: Number(r.target_visits || 0) }));
        if (targets.length === 0) { toast.error('Escribe al menos una meta'); return; }
        setSaving(true);
        const res = await saveTargetsAction({ period, targets });
        setSaving(false);
        if ('error' in res) { toast.error(res.error); return; }
        toast.success('Metas guardadas');
        router.push(`/crm?period=${period}`);
        router.refresh();
    }

    const total = rows.reduce((s, r) => s + Number(r.target_amount || 0), 0);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" onClick={copyPrevious} className="h-10 px-3 rounded-xl text-xs font-bold gap-2">
                    <Copy className="h-3.5 w-3.5" /> Copiar mes anterior
                </Button>
                <Button type="button" variant="outline" onClick={() => usePrevSales(10)} className="h-10 px-3 rounded-xl text-xs font-bold">
                    Venta mes anterior +10 %
                </Button>
                <Button type="button" variant="outline" onClick={() => usePrevSales(0)} className="h-10 px-3 rounded-xl text-xs font-bold">
                    Igual a venta mes anterior
                </Button>
                <span className="ml-auto text-xs text-slate-500 tabular-nums">Total meta: <b className="text-slate-900">{cop.format(total)}</b></span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                <th className="px-4 py-2.5 text-left">Comercial</th>
                                <th className="px-4 py-2.5 text-right">Venta mes anterior</th>
                                <th className="px-4 py-2.5 text-left w-56">Meta de venta ($)</th>
                                <th className="px-4 py-2.5 text-left w-36">Meta de visitas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(r => {
                                const s = nameOf.get(r.salesperson_id);
                                return (
                                    <tr key={r.salesperson_id} className="border-b border-slate-50 last:border-0">
                                        <td className="px-4 py-2.5">
                                            <p className="text-xs font-bold text-slate-900">{s?.name}</p>
                                            {s?.role && <p className="text-[10px] text-slate-400">{s.role}</p>}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-right tabular-nums text-slate-500">{cop.format(prevSales[r.salesperson_id] ?? 0)}</td>
                                        <td className="px-4 py-2.5">
                                            <input type="number" inputMode="numeric" min={0} step={100000} value={r.target_amount}
                                                onChange={e => set(r.salesperson_id, 'target_amount', e.target.value)}
                                                placeholder="0"
                                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm tabular-nums outline-none focus:border-indigo-300" />
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <input type="number" inputMode="numeric" min={0} value={r.target_visits}
                                                onChange={e => set(r.salesperson_id, 'target_visits', e.target.value)}
                                                placeholder="0"
                                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm tabular-nums outline-none focus:border-indigo-300" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end">
                <Button type="button" disabled={saving} onClick={save} className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar metas
                </Button>
            </div>
        </div>
    );
}
