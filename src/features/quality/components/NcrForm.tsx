'use client';

import { useState, useTransition } from 'react';
import { createNcrAction, closeNcrAction } from '../actions';
import { AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import type { Ncr } from '../types';
import { SEVERITY_LABELS } from '../types';

const SEVERITIES = [
    { value: 'LOW',      label: 'Baja' },
    { value: 'MEDIUM',   label: 'Media' },
    { value: 'HIGH',     label: 'Alta' },
    { value: 'CRITICAL', label: 'Crítica' },
];

export function NcrForm() {
    const [pending, startTransition] = useTransition();
    const [error, setError]   = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
            try {
                await createNcrAction(fd);
                setSuccess(true);
                (e.target as HTMLFormElement).reset();
                setTimeout(() => setSuccess(false), 4000);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Error al registrar NCR');
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</label>
                <textarea name="description" required rows={3} minLength={10}
                    placeholder="Describe el defecto o no conformidad…"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Severidad</label>
                <select name="severity" required
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400">
                    <option value="">Selecciona…</option>
                    {SEVERITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Causa Raíz (opcional)</label>
                <textarea name="root_cause" rows={2} placeholder="Ej: Material fuera de especificación del proveedor…"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>

            {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 rounded-xl px-4 py-2">{error}</p>}
            {success && <p className="text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl px-4 py-2">✅ NCR abierta exitosamente</p>}

            <button type="submit" disabled={pending}
                className="w-full h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                {pending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Registrando…</>
                    : <><AlertTriangle className="h-4 w-4" /> Abrir NCR</>
                }
            </button>
        </form>
    );
}

export function NcrCard({ ncr }: { ncr: Ncr }) {
    const [closing, startClose] = useTransition();
    const [note, setNote] = useState('');
    const [closed, setClosed] = useState(ncr.status === 'CLOSED');
    const sev = SEVERITY_LABELS[ncr.severity] ?? { label: ncr.severity, className: '' };

    function handleClose() {
        startClose(async () => {
            await closeNcrAction(ncr.id!, note);
            setClosed(true);
        });
    }

    return (
        <div className={`bg-white rounded-[2rem] border shadow-sm p-6 space-y-4 ${closed ? 'opacity-60' : 'border-slate-100'}`}>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">NCR-{ncr.ncr_number}</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{ncr.description}</p>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${sev.className}`}>
                    {sev.label}
                </span>
            </div>
            {ncr.root_cause && (
                <p className="text-xs text-slate-500 italic bg-slate-50 rounded-xl px-3 py-2">{ncr.root_cause}</p>
            )}
            {!closed && (
                <div className="flex gap-2">
                    <input value={note} onChange={e => setNote(e.target.value)}
                        placeholder="Acción correctiva…"
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    <button onClick={handleClose} disabled={closing}
                        className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5 transition-colors disabled:opacity-50">
                        {closing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        Cerrar
                    </button>
                </div>
            )}
            {closed && (
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">✅ Cerrada</p>
            )}
        </div>
    );
}
