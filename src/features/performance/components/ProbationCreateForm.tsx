'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createProbationEvaluationAction } from '../actions';
import { Button } from '@/shared/components/ui/button';

interface Option { id: string; name: string }
interface EmployeeOption extends Option { startDate: string }

interface Props {
    employees: EmployeeOption[];
    evaluators: Option[];
}

export function ProbationCreateForm({ employees, evaluators }: Props) {
    const router = useRouter();
    const [employeeId, setEmployeeId] = useState('');
    const [evaluatorId, setEvaluatorId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const selected = employees.find(e => e.id === employeeId);

    function submit() {
        setError(null);
        startTransition(async () => {
            const res = await createProbationEvaluationAction({ employeeId, evaluatorId });
            if (res.error) {
                setError(res.error);
                return;
            }
            setEmployeeId('');
            setEvaluatorId('');
            router.refresh();
        });
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
            <div>
                <h3 className="text-sm font-bold text-slate-900">Nueva evaluación de período de prueba</h3>
                <p className="text-xs text-slate-500">Solo empleados activos sin evaluación de prueba abierta.</p>
            </div>

            <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Empleado</span>
                <select
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
                >
                    <option value="">Selecciona…</option>
                    {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                </select>
                {selected && (
                    <span className="text-xs text-slate-500">Ingreso: {selected.startDate}</span>
                )}
            </label>

            <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Evaluador responsable</span>
                <select
                    value={evaluatorId}
                    onChange={e => setEvaluatorId(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
                >
                    <option value="">Selecciona…</option>
                    {evaluators.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                </select>
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
                type="button"
                onClick={submit}
                disabled={pending || !employeeId || !evaluatorId}
                className="w-full h-11 rounded-xl"
            >
                {pending ? 'Creando…' : 'Crear evaluación'}
            </Button>
        </div>
    );
}
