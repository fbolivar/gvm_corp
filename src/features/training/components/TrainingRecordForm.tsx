'use client';

import { useTransition, useRef, useState } from 'react';
import { createTrainingRecordAction } from '../actions';
import { TrainingProgram, CATEGORY_CONFIG } from '../types';
import { CalendarDays, Users, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface Employee {
    id: string;
    name: string;
}

interface Props {
    programs: TrainingProgram[];
    employees: Employee[];
}

export function TrainingRecordForm({ programs, employees }: Props) {
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            try {
                await createTrainingRecordAction(formData);
                setResult({ success: true });
                formRef.current?.reset();
                setTimeout(() => setResult(null), 3000);
            } catch (err: unknown) {
                setResult({ error: err instanceof Error ? err.message : 'Error al programar capacitacion' });
            }
        });
    }

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-6 space-y-5">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Programar Capacitacion</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Asignar programa a empleado</p>
                </div>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                        Empleado <span className="text-rose-500">*</span>
                    </label>
                    {employees.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-2 text-slate-400">
                            <Users className="h-4 w-4 shrink-0" />
                            <span className="text-xs font-medium">Sin empleados activos</span>
                        </div>
                    ) : (
                        <select
                            name="employee_id"
                            required
                            defaultValue=""
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all appearance-none"
                        >
                            <option value="" disabled>Seleccionar empleado...</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                        Programa de Capacitacion <span className="text-rose-500">*</span>
                    </label>
                    {programs.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-2 text-slate-400">
                            <CalendarDays className="h-4 w-4 shrink-0" />
                            <span className="text-xs font-medium">Sin programas registrados</span>
                        </div>
                    ) : (
                        <select
                            name="program_id"
                            required
                            defaultValue=""
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all appearance-none"
                        >
                            <option value="" disabled>Seleccionar programa...</option>
                            {programs.map(prog => {
                                const cat = CATEGORY_CONFIG[prog.category];
                                return (
                                    <option key={prog.id} value={prog.id}>
                                        [{cat?.label ?? prog.category}] {prog.name} — {prog.duration_hours}h
                                    </option>
                                );
                            })}
                        </select>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                        Fecha Programada <span className="text-rose-500">*</span>
                    </label>
                    <input
                        name="scheduled_date"
                        type="date"
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    />
                </div>

                {result?.error && (
                    <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3">
                        <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                        <p className="text-xs font-bold text-rose-600">{result.error}</p>
                    </div>
                )}

                {result?.success && (
                    <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <p className="text-xs font-bold text-emerald-600">Capacitacion programada exitosamente</p>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isPending || programs.length === 0 || employees.length === 0}
                    className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                    {isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            <CalendarDays className="h-4 w-4" />
                            Programar Capacitacion
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
