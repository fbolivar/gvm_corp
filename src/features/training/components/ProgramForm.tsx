'use client';

import { useTransition, useRef, useState } from 'react';
import { createProgramAction } from '../actions';
import { CATEGORY_CONFIG } from '../types';
import { BookOpen, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

export function ProgramForm() {
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const [isMandatory, setIsMandatory] = useState(false);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        formData.set('is_mandatory', isMandatory ? 'true' : 'false');

        startTransition(async () => {
            try {
                await createProgramAction(formData);
                setResult({ success: true });
                formRef.current?.reset();
                setIsMandatory(false);
                setTimeout(() => setResult(null), 3000);
            } catch (err: unknown) {
                setResult({ error: err instanceof Error ? err.message : 'Error al crear programa' });
            }
        });
    }

    const categoryOptions = Object.entries(CATEGORY_CONFIG).map(([value, cfg]) => ({
        value,
        label: cfg.label,
    }));

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                    <BookOpen className="h-4 w-4" />
                </div>
                <div>
                    <h3 className="text-xs font-bold text-slate-900">Nuevo Programa</h3>
                    <p className="text-[10px] text-slate-400">Definir plan de formacion</p>
                </div>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Codigo <span className="text-rose-500">*</span>
                        </label>
                        <input
                            name="code"
                            required
                            placeholder="CAP-001"
                            className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Duracion (horas) <span className="text-rose-500">*</span>
                        </label>
                        <input
                            name="duration_hours"
                            type="number"
                            min="0.5"
                            step="0.5"
                            required
                            placeholder="8"
                            className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Nombre del Programa <span className="text-rose-500">*</span>
                    </label>
                    <input
                        name="name"
                        required
                        placeholder="Ej: Manejo seguro de maquinaria"
                        className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Categoria <span className="text-rose-500">*</span>
                    </label>
                    <select
                        name="category"
                        required
                        defaultValue=""
                        className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all appearance-none"
                    >
                        <option value="" disabled>Seleccionar categoria...</option>
                        {categoryOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Descripcion
                    </label>
                    <textarea
                        name="description"
                        placeholder="Objetivo y contenido del programa..."
                        rows={2}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all resize-none"
                    />
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer group">
                    <div
                        role="checkbox"
                        aria-checked={isMandatory}
                        tabIndex={0}
                        onClick={() => setIsMandatory(v => !v)}
                        onKeyDown={e => e.key === ' ' && setIsMandatory(v => !v)}
                        className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                            isMandatory
                                ? 'bg-indigo-600 border-indigo-600'
                                : 'bg-white border-slate-300 group-hover:border-indigo-400'
                        }`}
                    >
                        {isMandatory && (
                            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600">
                        Capacitacion obligatoria
                    </span>
                </label>

                {result?.error && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2.5">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <p className="text-xs font-bold text-rose-600">{result.error}</p>
                    </div>
                )}

                {result?.success && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <p className="text-xs font-bold text-emerald-600">Programa creado exitosamente</p>
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold gap-2"
                >
                    {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <>
                            <BookOpen className="h-3.5 w-3.5" />
                            Crear Programa
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
