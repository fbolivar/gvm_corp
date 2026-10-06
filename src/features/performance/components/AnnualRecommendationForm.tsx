'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setAnnualRecommendationAction } from '../annualActions';
import { Button } from '@/shared/components/ui/button';

interface Props {
    evaluationId: string;
    currentPct: number | null;
}

export function AnnualRecommendationForm({ evaluationId, currentPct }: Props) {
    const router = useRouter();
    const [pct, setPct] = useState(currentPct === null ? '' : String(currentPct));
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function save() {
        setError(null);
        startTransition(async () => {
            const res = await setAnnualRecommendationAction({ evaluationId, pct: Number(pct) });
            if (res.error) return setError(res.error);
            router.refresh();
        });
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
            <div>
                <p className="text-sm font-bold text-slate-900">Recomendación de incremento</p>
                <p className="text-xs text-slate-500">Solo registra la recomendación. El salario no cambia desde aquí; la aplicación es un proceso aparte con aprobación.</p>
            </div>
            <div className="flex items-center gap-3">
                <input type="number" min={0} max={100} step={0.5} value={pct} onChange={e => setPct(e.target.value)}
                    aria-label="Porcentaje de incremento recomendado"
                    className="h-11 w-32 rounded-xl border border-slate-200 px-3 text-sm font-mono" />
                <span className="text-sm text-slate-500">%</span>
                <Button type="button" onClick={save} disabled={pending || pct === ''} className="h-11 rounded-xl">
                    {pending ? 'Guardando…' : 'Registrar'}
                </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}
