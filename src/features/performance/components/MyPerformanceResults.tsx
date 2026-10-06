'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acknowledgePerformanceResultAction } from '../employeeActions';
import { Button } from '@/shared/components/ui/button';

export interface PerformanceResult {
    id: string;
    eval_type: 'PROBATION' | 'ANNUAL';
    due_date: string;
    closed_at: string | null;
    probation_outcome: 'MEETS' | 'DOES_NOT_MEET' | null;
    final_score: number | null;
    acknowledged_at: string | null;
    observation: string | null;
}

function ResultCard({ result }: { result: PerformanceResult }) {
    const router = useRouter();
    const [observation, setObservation] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const isAnnual = result.eval_type === 'ANNUAL';

    function acknowledge() {
        setError(null);
        startTransition(async () => {
            const res = await acknowledgePerformanceResultAction({ evaluationId: result.id, observation });
            if (res.error) return setError(res.error);
            router.refresh();
        });
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        {isAnnual ? 'Evaluación anual' : 'Período de prueba'}
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                        {isAnnual
                            ? `Calificación final: ${result.final_score !== null ? `${Number(result.final_score).toFixed(2)} / 5` : '—'}`
                            : result.probation_outcome === 'MEETS'
                                ? 'Cumple las condiciones del cargo'
                                : 'No cumple las condiciones del cargo'}
                    </p>
                </div>
                <p className="text-xs text-slate-400">
                    Cerrada el {result.closed_at ? new Date(result.closed_at).toLocaleDateString('es-CO') : '—'}
                </p>
            </div>

            {result.acknowledged_at ? (
                <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                    Registraste que conociste este resultado el {new Date(result.acknowledged_at).toLocaleDateString('es-CO')}.
                    {result.observation && <p className="mt-2 text-slate-700 whitespace-pre-line">Tu observación: {result.observation}</p>}
                </div>
            ) : (
                <div className="space-y-3 border-t border-slate-100 pt-4">
                    <label className="block space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tu observación (opcional)</span>
                        <textarea
                            value={observation}
                            maxLength={2000}
                            onChange={e => setObservation(e.target.value)}
                            className="w-full min-h-20 rounded-xl border border-slate-200 p-3 text-sm"
                        />
                    </label>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <Button type="button" onClick={acknowledge} disabled={pending} className="w-full h-11 rounded-xl">
                        {pending ? 'Registrando…' : 'Conocí mi resultado'}
                    </Button>
                </div>
            )}
        </div>
    );
}

export function MyPerformanceResults({ results }: { results: PerformanceResult[] }) {
    return (
        <div className="space-y-4">
            {results.map(r => <ResultCard key={r.id} result={r} />)}
        </div>
    );
}
