'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addAnnualEvaluatorAction } from '../annualActions';
import { Button } from '@/shared/components/ui/button';

interface Option { id: string; name: string }

interface Props {
    evaluationId: string;
    evaluators: Option[];
}

export function AnnualEvaluatorsForm({ evaluationId, evaluators }: Props) {
    const router = useRouter();
    const [evaluatorId, setEvaluatorId] = useState('');
    const [weight, setWeight] = useState('3');
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function add() {
        setError(null);
        startTransition(async () => {
            const res = await addAnnualEvaluatorAction({ evaluationId, evaluatorId, weight: Number(weight) });
            if (res.error) return setError(res.error);
            setEvaluatorId('');
            setWeight('3');
            router.refresh();
        });
    }

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-3">
                <label className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Evaluador</span>
                    <select value={evaluatorId} onChange={e => setEvaluatorId(e.target.value)}
                        className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm">
                        <option value="">Selecciona…</option>
                        {evaluators.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                </label>
                <label className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Importancia (1–5)</span>
                    <select value={weight} onChange={e => setWeight(e.target.value)}
                        aria-label="Puntaje de importancia del evaluador"
                        className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm">
                        <option value="1">1 · Baja</option>
                        <option value="2">2</option>
                        <option value="3">3 · Media</option>
                        <option value="4">4</option>
                        <option value="5">5 · Alta</option>
                    </select>
                </label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="button" variant="outline" onClick={add} disabled={pending || !evaluatorId} className="h-11 rounded-xl">
                {pending ? 'Asignando…' : 'Asignar evaluador'}
            </Button>
            <p className="text-xs text-slate-400">La nota final es el promedio de cada evaluador ponderado por su importancia.</p>
        </div>
    );
}
