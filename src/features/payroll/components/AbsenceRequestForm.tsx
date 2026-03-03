'use client';

import { useState, useTransition } from 'react';
import { submitAbsenceRequest } from '../actions';
import { CalendarDays, Loader2 } from 'lucide-react';

const ABSENCE_TYPES = [
    { value: 'VACATION',   label: 'Vacaciones' },
    { value: 'SICK_LEAVE', label: 'Incapacidad Médica' },
    { value: 'PERSONAL',   label: 'Permiso Personal' },
    { value: 'UNPAID',     label: 'Licencia No Remunerada' },
    { value: 'MATERNITY',  label: 'Licencia Maternidad' },
    { value: 'PATERNITY',  label: 'Licencia Paternidad' },
];

const today = new Date().toISOString().slice(0, 10);

export function AbsenceRequestForm() {
    const [pending, startTransition] = useTransition();
    const [error, setError]   = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
            try {
                await submitAbsenceRequest(fd);
                setSuccess(true);
                (e.target as HTMLFormElement).reset();
                setTimeout(() => setSuccess(false), 4000);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Error al enviar');
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tipo de ausencia */}
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Tipo de Ausencia
                </label>
                <select
                    name="absence_type"
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                    <option value="">Selecciona un tipo…</option>
                    {ABSENCE_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Fecha Inicio
                    </label>
                    <input
                        type="date"
                        name="start_date"
                        min={today}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Fecha Fin
                    </label>
                    <input
                        type="date"
                        name="end_date"
                        min={today}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                </div>
            </div>

            {/* Motivo */}
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Motivo (opcional)
                </label>
                <textarea
                    name="reason"
                    rows={3}
                    placeholder="Describe el motivo de la solicitud…"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
            </div>

            {error && (
                <p className="text-xs font-bold text-rose-600 bg-rose-50 rounded-xl px-4 py-2">{error}</p>
            )}
            {success && (
                <p className="text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl px-4 py-2">
                    ✅ Solicitud enviada — RRHH la revisará pronto
                </p>
            )}

            <button
                type="submit"
                disabled={pending}
                className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
                {pending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</>
                    : <><CalendarDays className="h-4 w-4" /> Solicitar Ausencia</>
                }
            </button>
        </form>
    );
}
