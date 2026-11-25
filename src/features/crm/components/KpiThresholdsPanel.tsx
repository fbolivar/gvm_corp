'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SlidersHorizontal, Loader2, Save } from 'lucide-react';
import { saveKpiSettingsAction } from '../actions/kpiActions';
import type { KpiSettings } from '../types/kpi';

const num = 'h-10 w-20 rounded-xl border border-slate-200 bg-slate-50/50 px-2 text-sm text-center outline-none focus:border-indigo-300 disabled:opacity-60';

export function KpiThresholdsPanel({ initial, canEdit }: { initial: KpiSettings; canEdit: boolean }) {
    const router = useRouter();
    const [pending, start] = useTransition();
    const [s, setS] = useState<KpiSettings>(initial);
    const set = (k: keyof KpiSettings, v: string) => setS({ ...s, [k]: Number(v) });

    const dirty = (Object.keys(initial) as (keyof KpiSettings)[]).some(k => initial[k] !== s[k]);

    const save = () => start(async () => {
        const res = await saveKpiSettingsAction(s);
        if (res.error) { toast.error(res.error); return; }
        toast.success('Umbrales actualizados');
        router.refresh();
    });

    return (
        <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 md:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-indigo-600" /> Umbrales configurables
                </h3>
                {canEdit && (
                    <button type="button" onClick={save} disabled={pending || !dirty}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50">
                        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2.5">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Cumplimiento de visitas (semáforo)</p>
                    <Row label="Verde si cumplimiento ≥" suffix="%">
                        <input type="number" className={num} disabled={!canEdit} value={s.visit_green_pct} onChange={e => set('visit_green_pct', e.target.value)} />
                    </Row>
                    <Row label="Amarillo si cumplimiento ≥" suffix="%">
                        <input type="number" className={num} disabled={!canEdit} value={s.visit_amber_pct} onChange={e => set('visit_amber_pct', e.target.value)} />
                    </Row>
                    <p className="text-[11px] text-slate-400">Cumplimiento = visitas realizadas ÷ planeadas. Por debajo del amarillo = rojo.</p>
                </div>

                <div className="space-y-2.5">
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Clasificación de clientes</p>
                    <Row label="Pasivo si no compra en más de" suffix="días">
                        <input type="number" className={num} disabled={!canEdit} value={s.client_passive_days} onChange={e => set('client_passive_days', e.target.value)} />
                    </Row>
                    <Row label="Inactivo si no compra en más de" suffix="días">
                        <input type="number" className={num} disabled={!canEdit} value={s.client_inactive_days} onChange={e => set('client_inactive_days', e.target.value)} />
                    </Row>
                    <Row label="En crecimiento si sube (30d) ≥" suffix="%">
                        <input type="number" className={num} disabled={!canEdit} value={s.growth_pct} onChange={e => set('growth_pct', e.target.value)} />
                    </Row>
                    <Row label="En caída si baja (30d) ≥" suffix="%">
                        <input type="number" className={num} disabled={!canEdit} value={s.drop_pct} onChange={e => set('drop_pct', e.target.value)} />
                    </Row>
                </div>
            </div>
            {!canEdit && <p className="text-[11px] text-slate-400">Solo gerencia puede cambiar estos umbrales.</p>}
        </section>
    );
}

function Row({ label, suffix, children }: { label: string; suffix: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600">{label}</span>
            <div className="flex items-center gap-1.5 shrink-0">
                {children}
                <span className="text-xs text-slate-400 w-8">{suffix}</span>
            </div>
        </div>
    );
}
