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
    const [weight, setWeight] = useState('1');
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function add() {
        setError(null);
        startTransition(async () => {
            const res = await addAnnualEvaluatorAction({ evaluationId, evaluatorId, weight: Number(weight) });
            if (res.error) return setError(res.error);
            setEvaluatorId('');
            setWeight('1');
            router.refresh();
        });
    }

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
                <select value={evaluatorId} onChange={e => setEvaluatorId(e.target.value)}
                    className="h-11 rounded-xl border border-slate-200 px-3 text-sm">
                    <option value="">Evaluador…</option>
                    {evaluators.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <input type="number" min={0.5} max={10} step={0.5} value={weight} onChange={e => setWeight(e.target.value)}
                    aria-label="Peso de relevancia" className="h-11 rounded-xl border border-slate-200 px-3 text-sm" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="button" variant="outline" onClick={add} disabled={pending || !evaluatorId} className="h-11 rounded-xl">
                {pending ? 'Asignando…' : 'Asignar evaluador (peso)'}
            </Button>
        </div>
    );
}
