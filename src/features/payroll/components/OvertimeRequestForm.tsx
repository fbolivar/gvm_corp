'use client';

import { useState, useTransition } from 'react';
import { submitOvertimeRequest } from '../actions';
import { Clock, Calendar, AlignLeft, Plus, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface Props {
    employeeId: string;
    salary: number;
}

export function OvertimeRequestForm({ employeeId, salary }: Props) {
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);
    const [showForm, setShowForm] = useState(false);

    // Previsualización del valor calculado
    const [hours, setHours] = useState('');
    const hourlyRate = salary / 240;
    const estimatedValue = hours ? Math.round(hourlyRate * 1.25 * parseFloat(hours)) : 0;

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setResult(null);
        const form = e.currentTarget;
        const data = new FormData(form);

        startTransition(async () => {
            try {
                await submitOvertimeRequest(data);
                setResult({ success: true });
                form.reset();
                setHours('');
                setShowForm(false);
            } catch (err: unknown) {
                setResult({ error: err instanceof Error ? err.message : 'Error al enviar la solicitud' });
            }
        });
    }

    if (!showForm) {
        return (
            <div className="space-y-3">
                {result?.success && (
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <p className="text-xs font-semibold text-emerald-700">Solicitud enviada. El jefe de logística recibirá una notificación para aprobarla.</p>
                    </div>
                )}
                <Button
                    onClick={() => setShowForm(true)}
                    className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold tracking-tight text-sm transition-all flex items-center justify-between px-5 border-none"
                >
                    <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Registrar Hora Extra
                    </span>
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Nueva Solicitud</h3>
                <button type="button" onClick={() => { setShowForm(false); setResult(null); }} className="text-xs font-semibold text-slate-400 uppercase tracking-wide hover:text-slate-600 transition-colors">
                    Cancelar
                </button>
            </div>

            {/* Fecha */}
            <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Calendar className="h-3.5 w-3.5" /> Fecha de la actividad
                </label>
                <input
                    name="date"
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full h-10 px-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                />
            </div>

            {/* Horario */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hora inicio</label>
                    <input
                        name="start_time"
                        type="time"
                        className="w-full h-10 px-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hora fin</label>
                    <input
                        name="end_time"
                        type="time"
                        className="w-full h-10 px-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                    />
                </div>
            </div>

            {/* Horas + preview valor */}
            <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <Clock className="h-3.5 w-3.5" /> Horas extra trabajadas
                </label>
                <div className="flex gap-3 items-center">
                    <input
                        name="hours"
                        type="number"
                        min="0.5"
                        max="24"
                        step="0.5"
                        required
                        value={hours}
                        onChange={e => setHours(e.target.value)}
                        placeholder="ej: 2.5"
                        className="flex-1 h-10 px-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                    />
                    {estimatedValue > 0 && (
                        <div className="h-10 px-4 bg-amber-50 rounded-xl border border-amber-100 flex flex-col justify-center shrink-0">
                            <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide leading-none">Est. valor</span>
                            <span className="text-sm font-bold text-amber-700 leading-none">${estimatedValue.toLocaleString('es-CO')}</span>
                        </div>
                    )}
                </div>
                <p className="text-xs text-slate-400 font-medium pl-1">Cálculo: HE diurna × 1.25. Tarifa base: ${Math.round(hourlyRate).toLocaleString('es-CO')}/hora</p>
            </div>

            {/* Motivo */}
            <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <AlignLeft className="h-3.5 w-3.5" /> Actividad / Motivo
                </label>
                <textarea
                    name="reason"
                    required
                    minLength={10}
                    rows={3}
                    placeholder="Describe la actividad realizada fuera del horario laboral…"
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 font-medium text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                />
            </div>

            {result?.error && (
                <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <p className="text-xs font-bold text-rose-700">{result.error}</p>
                </div>
            )}

            <Button
                type="submit"
                disabled={isPending}
                className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold tracking-tight text-sm transition-all border-none disabled:opacity-60"
            >
                {isPending ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</span>
                ) : (
                    'Enviar Solicitud para Aprobación'
                )}
            </Button>

            <p className="text-xs text-slate-400 font-medium text-center leading-relaxed">
                Tu solicitud será enviada al jefe de logística para aprobación.<br />
                <strong>Sin aprobación, las horas extra no se procesarán en nómina.</strong>
            </p>
        </form>
    );
}
