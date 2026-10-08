'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateSalespersonAliasAction } from '../forecastActions';
import { Button } from '@/shared/components/ui/button';
import { toast } from 'sonner';

export interface AliasRow {
    reportLabel: string;
    salespersonId: string | null;
    isSeparate: boolean;
}
export interface UserOption { id: string; name: string }

export function SalespersonMapping({ aliases, users }: { aliases: AliasRow[]; users: UserOption[] }) {
    const router = useRouter();
    const [state, setState] = useState(() => new Map(aliases.map(a => [a.reportLabel, { sp: a.salespersonId ?? '', sep: a.isSeparate }])));
    const [pending, start] = useTransition();
    const [savingKey, setSavingKey] = useState<string | null>(null);

    function save(label: string) {
        const cur = state.get(label)!;
        setSavingKey(label);
        start(async () => {
            const res = await updateSalespersonAliasAction({ reportLabel: label, salespersonId: cur.sp || null, isSeparate: cur.sep });
            setSavingKey(null);
            if (res.error) { toast.error(res.error); return; }
            toast.success('Vendedor enlazado');
            router.refresh();
        });
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                        <th className="text-left px-3 py-2">Vendedor en el informe</th>
                        <th className="text-left px-3 py-2">Usuario del sistema</th>
                        <th className="text-center px-3 py-2">Aparte</th>
                        <th className="px-3 py-2"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {aliases.map(a => {
                        const s = state.get(a.reportLabel)!;
                        const set = (patch: Partial<{ sp: string; sep: boolean }>) =>
                            setState(prev => { const n = new Map(prev); n.set(a.reportLabel, { ...n.get(a.reportLabel)!, ...patch }); return n; });
                        return (
                            <tr key={a.reportLabel} className="hover:bg-slate-50/50">
                                <td className="px-3 py-2 font-medium text-slate-800">
                                    {a.reportLabel}
                                    {!s.sp && <span className="ml-1 text-[9px] text-amber-600">(sin enlazar)</span>}
                                </td>
                                <td className="px-3 py-2">
                                    <select value={s.sp} onChange={e => set({ sp: e.target.value })}
                                        className="h-9 rounded-lg border border-slate-200 px-2 text-xs min-w-52">
                                        <option value="">— Sin enlazar (vacante) —</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                    </select>
                                </td>
                                <td className="text-center px-3 py-2">
                                    <input type="checkbox" checked={s.sep} onChange={e => set({ sep: e.target.checked })} className="h-4 w-4" title="Va aparte del consolidado general" />
                                </td>
                                <td className="px-3 py-2 text-right">
                                    <Button onClick={() => save(a.reportLabel)} disabled={pending} variant="outline" className="h-8 rounded-lg text-xs">
                                        {savingKey === a.reportLabel ? 'Guardando…' : 'Guardar'}
                                    </Button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
