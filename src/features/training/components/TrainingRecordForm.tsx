'use client';

import { useTransition, useRef, useState } from 'react';
import { createTrainingRecordAction } from '../actions';
import { TrainingProgram, CATEGORY_CONFIG } from '../types';
import { CalendarDays, Users, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

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
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                    <h3 className="text-xs font-bold text-slate-900">Programar Capacitacion</h3>
                    <p className="text-[10px] text-slate-400">Asignar programa a empleado</p>
                </div>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Empleado <span className="text-rose-500">*</span>
                    </label>
                    {employees.length === 0 ? (
                        <div className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 flex items-center gap-2 text-slate-400">
                            <Users className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-xs">Sin empleados activos</span>
                        </div>
                    ) : (
                        <select
                            name="employee_id"
                            required
                            defaultValue=""
                            className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all appearance-none"
                        >
                            <option value="" disabled>Seleccionar empleado...</option>
                            {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Programa de Capacitacion <span className="text-rose-500">*</span>
                    </label>
                    {programs.length === 0 ? (
                        <div className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 flex items-center gap-2 text-slate-400">
                            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-xs">Sin programas registrados</span>
                        </div>
                    ) : (
                        <select
                            name="program_id"
                            required
                            defaultValue=""
                            className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all appearance-none"
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
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Fecha Programada <span className="text-rose-500">*</span>
                    </label>
                    <input
                        name="scheduled_date"
                        type="date"
                        required
                        className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                    />
                </div>

                {result?.error && (
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2.5">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        <p className="text-xs font-bold text-rose-600">{result.error}</p>
                    </div>
                )}

                {result?.success && (
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <p className="text-xs font-bold text-emerald-600">Capacitacion programada exitosamente</p>
                    </div>
                )}

                <Button
                    type="submit"
                    disabled={isPending || programs.length === 0 || employees.length === 0}
                    className="w-full h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold gap-2"
                >
                    {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <>
                            <CalendarDays className="h-3.5 w-3.5" />
                            Programar Capacitacion
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
