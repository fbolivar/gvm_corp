'use client';

import { useState, useTransition } from 'react';
import { createInspectionAction } from '../actions';
import { ClipboardCheck, Loader2 } from 'lucide-react';

const STAGES = [
    { value: 'INCOMING',   label: 'Entrada Materia Prima' },
    { value: 'IN_PROCESS', label: 'En Proceso' },
    { value: 'OUTGOING',   label: 'Salida Producto Terminado' },
];
const RESULTS = [
    { value: 'APPROVED',    label: 'Aprobado' },
    { value: 'CONDITIONAL', label: 'Condicional' },
    { value: 'REJECTED',    label: 'Rechazado' },
];

const today = new Date().toISOString().slice(0, 10);

export function InspectionForm() {
    const [pending, startTransition] = useTransition();
    const [error, setError]   = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
            try {
                await createInspectionAction(fd);
                setSuccess(true);
                (e.target as HTMLFormElement).reset();
                setTimeout(() => setSuccess(false), 4000);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Error al registrar');
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Etapa */}
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Etapa de Inspección</label>
                <select name="stage" required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option value="">Selecciona etapa…</option>
                    {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>

            {/* Lote y fecha */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lote / Ref.</label>
                    <input name="lot_number" placeholder="Ej: LOT-2026-001"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</label>
                    <input type="date" name="inspection_date" defaultValue={today} required
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
            </div>

            {/* Cantidades */}
            <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inspeccionado</label>
                    <input type="number" name="quantity_inspected" min="0.01" step="0.01" required placeholder="100"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-center font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Aprobado</label>
                    <input type="number" name="quantity_approved" min="0" step="0.01" required placeholder="95"
                        className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-center font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Rechazado</label>
                    <input type="number" name="quantity_rejected" min="0" step="0.01" required placeholder="5"
                        className="w-full rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-center font-bold text-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-400" />
                </div>
            </div>

            {/* Resultado */}
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultado</label>
                <div className="grid grid-cols-3 gap-2">
                    {RESULTS.map(r => (
                        <label key={r.value} className="cursor-pointer">
                            <input type="radio" name="result" value={r.value} required className="sr-only peer" />
                            <div className={`w-full py-3 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest border transition-all peer-checked:border-2 peer-checked:font-black cursor-pointer
                                ${r.value === 'APPROVED'    ? 'border-slate-200 text-slate-400 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-700' : ''}
                                ${r.value === 'CONDITIONAL' ? 'border-slate-200 text-slate-400 peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-checked:text-amber-700' : ''}
                                ${r.value === 'REJECTED'    ? 'border-slate-200 text-slate-400 peer-checked:border-rose-500 peer-checked:bg-rose-50 peer-checked:text-rose-700' : ''}
                            `}>
                                {r.label}
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas</label>
                <textarea name="notes" rows={2} placeholder="Observaciones del inspector…"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>

            {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 rounded-xl px-4 py-2">{error}</p>}
            {success && <p className="text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl px-4 py-2">✅ Inspección registrada exitosamente</p>}

            <button type="submit" disabled={pending}
                className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                {pending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Registrando…</>
                    : <><ClipboardCheck className="h-4 w-4" /> Registrar Inspección</>
                }
            </button>
        </form>
    );
}
