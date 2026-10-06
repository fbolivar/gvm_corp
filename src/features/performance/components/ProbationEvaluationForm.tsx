'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitProbationEvaluationAction } from '../actions';
import { submitAnnualEvaluationAction } from '../annualActions';
import { Button } from '@/shared/components/ui/button';
import { OUTCOME_LABEL, PROBATION_MIN_AVERAGE } from '../types';

interface Criterion {
    id: string;
    kind: 'COMPETENCY' | 'JOB_CONDITION' | 'OBJECTIVE';
    criterion: string;
}

interface Props {
    evaluationId: string;
    criteria: Criterion[];
    evalKind?: 'PROBATION' | 'ANNUAL';
}

const KIND_LABEL: Record<Criterion['kind'], string> = {
    COMPETENCY: 'Competencia',
    JOB_CONDITION: 'Condición del cargo',
    OBJECTIVE: 'Objetivo',
};

export function ProbationEvaluationForm({ evaluationId, criteria, evalKind = 'PROBATION' }: Props) {
    const isAnnual = evalKind === 'ANNUAL';
    const router = useRouter();
    const [scores, setScores] = useState<Record<string, number>>({});
    const [comments, setComments] = useState<Record<string, string>>({});
    const [outcomeComments, setOutcomeComments] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    const complete = criteria.every(c => scores[c.id]);
    const average = complete
        ? criteria.reduce((sum, c) => sum + scores[c.id], 0) / criteria.length
        : null;
    const meets = average !== null && average >= PROBATION_MIN_AVERAGE;

    function submit() {
        setError(null);
        startTransition(async () => {
            const payloadScores = criteria.map(c => ({
                criterionId: c.id,
                score: scores[c.id],
                comment: comments[c.id] ?? null,
            }));
            const res = isAnnual
                ? await submitAnnualEvaluationAction({ evaluationId, scores: payloadScores })
                : await submitProbationEvaluationAction({ evaluationId, scores: payloadScores, outcomeComments });
            if (res.error) {
                setError(res.error);
                return;
            }
            router.push('/payroll/performance');
            router.refresh();
        });
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
                {criteria.map(c => (
                    <div key={c.id} className="p-4 space-y-3">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{KIND_LABEL[c.kind]}</p>
                            <p className="text-sm font-medium text-slate-900">{c.criterion}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5].map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setScores(s => ({ ...s, [c.id]: n }))}
                                    className={`h-11 w-11 rounded-xl border text-sm font-semibold ${
                                        scores[c.id] === n
                                            ? 'bg-slate-900 text-white border-slate-900'
                                            : 'bg-white text-slate-700 border-slate-200'
                                    }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                        <input
                            type="text"
                            maxLength={1000}
                            placeholder="Comentario (opcional)"
                            value={comments[c.id] ?? ''}
                            onChange={e => setComments(s => ({ ...s, [c.id]: e.target.value }))}
                            className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm"
                        />
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
                <p className="text-sm font-bold text-slate-900">
                    {isAnnual ? 'Tu calificación' : 'Resultado del período de prueba'}
                </p>
                <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                    average === null
                        ? 'bg-slate-50 text-slate-500'
                        : isAnnual || meets ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                    {average === null
                        ? isAnnual
                            ? 'Califica todos los criterios para ver tu promedio.'
                            : `Califica todos los criterios para ver el resultado (mínimo ${PROBATION_MIN_AVERAGE.toFixed(1)} de promedio).`
                        : isAnnual
                            ? `Promedio ${average.toFixed(2)} sobre 5`
                            : `Promedio ${average.toFixed(2)} → ${meets ? OUTCOME_LABEL.MEETS : OUTCOME_LABEL.DOES_NOT_MEET}`}
                </div>
                {!isAnnual && (
                    <textarea
                        maxLength={2000}
                        placeholder="Observaciones generales (opcional)"
                        value={outcomeComments}
                        onChange={e => setOutcomeComments(e.target.value)}
                        className="w-full min-h-24 rounded-xl border border-slate-200 p-3 text-sm"
                    />
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}
                <p className="text-xs text-slate-500">
                    {isAnnual
                        ? 'Al enviar, tu calificación queda registrada. La evaluación se cierra cuando todos los evaluadores terminen.'
                        : 'Al enviar, la evaluación queda cerrada y no se puede modificar.'}
                </p>
                <Button
                    type="button"
                    onClick={submit}
                    disabled={pending || !complete}
                    className="w-full h-11 rounded-xl"
                >
                    {pending ? 'Enviando…' : isAnnual ? 'Enviar mi calificación' : 'Cerrar evaluación'}
                </Button>
            </div>
        </div>
    );
}
