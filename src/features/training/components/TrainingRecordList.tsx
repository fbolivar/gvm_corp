'use client';

import { useState, useTransition } from 'react';
import { completeTrainingAction } from '../actions';
import { TrainingRecord, CATEGORY_CONFIG, TRAINING_STATUS } from '../types';
import {
    CheckCircle2,
    Clock,
    Award,
    User,
    CalendarDays,
    Loader2,
    AlertCircle,
    GraduationCap,
    ChevronDown,
} from 'lucide-react';

interface Props {
    records: TrainingRecord[];
}

interface CompleteFormState {
    score: string;
    certificate_number: string;
    notes: string;
}

function RecordRow({ record }: { record: TrainingRecord }) {
    const [isPending, startTransition] = useTransition();
    const [showComplete, setShowComplete] = useState(false);
    const [form, setForm] = useState<CompleteFormState>({ score: '', certificate_number: '', notes: '' });
    const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);
    const [done, setDone] = useState(false);

    const employeeName = record.employee?.party?.legal_name ?? 'Empleado';
    const programName = record.program?.name ?? 'Programa';
    const programCategory = record.program?.category ?? '';
    const categoryConfig = CATEGORY_CONFIG[programCategory];
    const statusConfig = TRAINING_STATUS[record.status] ?? { label: record.status, className: 'bg-slate-50 text-slate-500 border border-slate-100' };

    const displayStatus = done
        ? TRAINING_STATUS['COMPLETED']
        : statusConfig;

    function handleComplete() {
        const score = parseFloat(form.score);
        if (isNaN(score) || score < 0 || score > 100) {
            setResult({ error: 'Puntaje debe estar entre 0 y 100' });
            return;
        }

        startTransition(async () => {
            try {
                await completeTrainingAction(
                    record.id!,
                    score,
                    form.certificate_number || undefined,
                    form.notes || undefined
                );
                setDone(true);
                setShowComplete(false);
                setResult(null);
            } catch (err: unknown) {
                setResult({ error: err instanceof Error ? err.message : 'Error al completar' });
            }
        });
    }

    return (
        <div className="border-b border-slate-50 last:border-0">
            <div className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-4">
                    {/* Employee icon */}
                    <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <User className="h-4 w-4" />
                    </div>

                    {/* Employee + program info */}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-900 italic tracking-tight truncate">{employeeName}</p>
                        <p className="text-[9px] font-bold text-slate-400 truncate">{programName}</p>
                    </div>

                    {/* Category badge */}
                    {categoryConfig && (
                        <span className={`hidden md:inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0 ${categoryConfig.className}`}>
                            {categoryConfig.label}
                        </span>
                    )}

                    {/* Date */}
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                        <CalendarDays className="h-3 w-3 text-slate-400" />
                        <span className="text-[9px] font-bold text-slate-400">{record.scheduled_date}</span>
                    </div>

                    {/* Score */}
                    {record.score !== null && record.score !== undefined && (
                        <div className="flex items-center gap-1 shrink-0">
                            <Award className="h-3 w-3 text-amber-500" />
                            <span className="text-[10px] font-black text-amber-700">{record.score}pts</span>
                        </div>
                    )}

                    {/* Status badge */}
                    <span className={`inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0 ${displayStatus.className}`}>
                        {displayStatus.label}
                    </span>

                    {/* Complete button */}
                    {record.status === 'SCHEDULED' && !done && (
                        <button
                            onClick={() => setShowComplete(v => !v)}
                            className="h-8 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shrink-0"
                        >
                            <CheckCircle2 className="h-3 w-3" />
                            Completar
                            <ChevronDown className={`h-3 w-3 transition-transform ${showComplete ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                </div>

                {/* Inline complete form */}
                {showComplete && record.status === 'SCHEDULED' && !done && (
                    <div className="mt-4 ml-12 bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                            Registrar resultado de capacitacion
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                    Puntaje (0–100) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={form.score}
                                    onChange={e => setForm(f => ({ ...f, score: e.target.value }))}
                                    placeholder="85"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                    Numero de Certificado
                                </label>
                                <input
                                    type="text"
                                    value={form.certificate_number}
                                    onChange={e => setForm(f => ({ ...f, certificate_number: e.target.value }))}
                                    placeholder="CERT-2026-001"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                    Observaciones
                                </label>
                                <input
                                    type="text"
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    placeholder="Notas adicionales..."
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        {result?.error && (
                            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2">
                                <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                                <p className="text-[10px] font-bold text-rose-600">{result.error}</p>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { setShowComplete(false); setResult(null); }}
                                className="h-9 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest transition-all"
                                disabled={isPending}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleComplete}
                                disabled={isPending || !form.score}
                                className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                            >
                                {isPending ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Confirmar Completada
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const STATUS_ORDER: Record<string, number> = {
    SCHEDULED: 0,
    COMPLETED: 1,
    FAILED: 2,
    CANCELLED: 3,
};

export function TrainingRecordList({ records }: Props) {
    const [showAll, setShowAll] = useState(false);
    const PREVIEW_COUNT = 10;

    const sorted = [...records].sort((a, b) => {
        const orderDiff = (STATUS_ORDER[a.status] ?? 4) - (STATUS_ORDER[b.status] ?? 4);
        if (orderDiff !== 0) return orderDiff;
        return (b.scheduled_date ?? '').localeCompare(a.scheduled_date ?? '');
    });

    const displayed = showAll ? sorted : sorted.slice(0, PREVIEW_COUNT);

    if (records.length === 0) {
        return (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 py-20 flex flex-col items-center justify-center gap-4 text-center">
                <div className="h-16 w-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center">
                    <GraduationCap className="h-8 w-8 text-slate-300" />
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Sin registros de capacitacion
                    </p>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                        Programa la primera capacitacion usando el formulario
                    </p>
                </div>
            </div>
        );
    }

    const scheduledCount = records.filter(r => r.status === 'SCHEDULED').length;
    const completedCount = records.filter(r => r.status === 'COMPLETED').length;

    return (
        <div className="space-y-4">
            {/* Summary header */}
            <div className="flex items-center gap-4 flex-wrap">
                {scheduledCount > 0 && (
                    <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">
                            {scheduledCount} programadas
                        </span>
                    </div>
                )}
                {completedCount > 0 && (
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
                            {completedCount} completadas
                        </span>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden">
                {/* Table header */}
                <div className="border-b border-slate-100 grid grid-cols-[1fr_auto] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <GraduationCap className="h-4 w-4 text-slate-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Historial de Capacitaciones ({records.length})
                        </span>
                    </div>
                </div>

                {/* Rows */}
                <div className="divide-y divide-slate-50">
                    {displayed.map(record => (
                        <RecordRow key={record.id} record={record} />
                    ))}
                </div>

                {/* Show more */}
                {records.length > PREVIEW_COUNT && (
                    <div className="border-t border-slate-100 p-4 text-center">
                        <button
                            onClick={() => setShowAll(v => !v)}
                            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            {showAll ? 'Ver menos' : `Ver todos (${records.length})`}
                            <ChevronDown className={`h-3 w-3 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
