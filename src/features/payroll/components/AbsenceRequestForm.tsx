'use client';

import { useState, useTransition } from 'react';
import { submitAbsenceRequest } from '../actions';
import { CalendarDays, Loader2, Paperclip, X, FileText } from 'lucide-react';

const ABSENCE_TYPES = [
    { value: 'VACATION',   label: 'Vacaciones' },
    { value: 'SICK_LEAVE', label: 'Incapacidad Médica' },
    { value: 'PERSONAL',   label: 'Permiso Personal' },
    { value: 'UNPAID',     label: 'Licencia No Remunerada' },
    { value: 'MATERNITY',  label: 'Licencia Maternidad' },
    { value: 'PATERNITY',  label: 'Licencia Paternidad' },
];

const today = new Date().toISOString().slice(0, 10);

const MAX_FILE = 15 * 1024 * 1024; // 15 MB
const MAX_FILES = 5;

export function AbsenceRequestForm() {
    const [pending, startTransition] = useTransition();
    const [error, setError]   = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [absenceType, setAbsenceType] = useState('');
    const [files, setFiles] = useState<File[]>([]);

    function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
        const picked = Array.from(e.target.files ?? []);
        if (picked.length > MAX_FILES) { setError(`Máximo ${MAX_FILES} archivos`); e.target.value = ''; return; }
        const tooBig = picked.find(f => f.size > MAX_FILE);
        if (tooBig) { setError(`"${tooBig.name}" supera 15 MB`); e.target.value = ''; return; }
        setError(null);
        setFiles(picked);
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
            try {
                await submitAbsenceRequest(fd);
                setSuccess(true);
                (e.target as HTMLFormElement).reset();
                setFiles([]);
                setAbsenceType('');
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
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Tipo de Ausencia
                </label>
                <select
                    name="absence_type"
                    required
                    value={absenceType}
                    onChange={e => setAbsenceType(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                    <option value="">Selecciona un tipo…</option>
                    {ABSENCE_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
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
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
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
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Motivo (opcional)
                </label>
                <textarea
                    name="reason"
                    rows={3}
                    placeholder="Describe el motivo de la solicitud…"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
            </div>

            {/* Adjuntos (ej. soporte de incapacidad) */}
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" /> Soporte / Adjuntos
                    {absenceType === 'SICK_LEAVE'
                        ? <span className="text-amber-600 normal-case tracking-normal font-bold">· adjunta la incapacidad</span>
                        : <span className="text-slate-300 normal-case tracking-normal">(opcional)</span>}
                </label>
                <input
                    id="absence-files"
                    type="file"
                    name="attachments"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFiles}
                    className="hidden"
                />
                <label
                    htmlFor="absence-files"
                    className="flex items-center justify-center gap-2 w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 cursor-pointer hover:border-amber-400 hover:text-amber-600 transition-colors"
                >
                    <Paperclip className="h-4 w-4" />
                    Seleccionar archivos (PDF o imagen · máx. 15 MB c/u)
                </label>
                {files.length > 0 && (
                    <ul className="space-y-1.5 pt-1">
                        {files.map((f, i) => (
                            <li key={i} className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-xs">
                                <FileText className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                <span className="flex-1 min-w-0 truncate font-semibold text-slate-700">{f.name}</span>
                                <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const input = document.getElementById('absence-files') as HTMLInputElement | null;
                                        const next = files.filter((_, idx) => idx !== i);
                                        if (input) {
                                            const dt = new DataTransfer();
                                            next.forEach(file => dt.items.add(file));
                                            input.files = dt.files;
                                        }
                                        setFiles(next);
                                    }}
                                    className="text-slate-300 hover:text-rose-500 shrink-0"
                                    aria-label="Quitar archivo"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
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
                className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
                {pending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</>
                    : <><CalendarDays className="h-4 w-4" /> Solicitar Ausencia</>
                }
            </button>
        </form>
    );
}
