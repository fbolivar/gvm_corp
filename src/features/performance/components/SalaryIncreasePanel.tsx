'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    requestSalaryIncreaseAction,
    decideSalaryIncreaseAction,
    applySalaryIncreaseAction,
} from '../annualActions';
import { Button } from '@/shared/components/ui/button';

export interface SalaryApproval {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED';
    previousSalary: number;
    newSalary: number;
    pct: number;
}

interface Props {
    evaluationId: string;
    recommendedPct: number | null;
    approval: SalaryApproval | null;
    canRequest: boolean;
    canDecide: boolean;
}

const STATUS_LABEL: Record<SalaryApproval['status'], string> = {
    PENDING: 'Pendiente de aprobación',
    APPROVED: 'Aprobado, falta aplicar',
    REJECTED: 'Rechazado',
    APPLIED: 'Aplicado al salario',
};

const money = (n: number) => n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function SalaryIncreasePanel({ evaluationId, recommendedPct, approval, canRequest, canDecide }: Props) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    function run(action: () => Promise<{ error?: string }>) {
        setError(null);
        startTransition(async () => {
            const res = await action();
            if (res.error) return setError(res.error);
            router.refresh();
        });
    }

    const showRequest = !approval && canRequest && recommendedPct !== null && recommendedPct > 0;
    if (!approval && !showRequest) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
            <div>
                <p className="text-sm font-bold text-slate-900">Incremento salarial</p>
                <p className="text-xs text-slate-500">Requiere aprobación de otra persona de nómina y se aplica por separado.</p>
            </div>

            {approval && (
                <div className="space-y-1 text-sm">
                    <p className="text-slate-800">{STATUS_LABEL[approval.status]}</p>
                    {canDecide && (
                        <p className="font-mono tabular-nums text-slate-700">
                            {money(approval.previousSalary)} → {money(approval.newSalary)} ({approval.pct}%)
                        </p>
                    )}
                </div>
            )}

            {showRequest && (
                <Button type="button" disabled={pending} onClick={() => run(() => requestSalaryIncreaseAction(evaluationId))} className="h-11 rounded-xl">
                    Solicitar incremento del {recommendedPct}%
                </Button>
            )}

            {approval?.status === 'PENDING' && canDecide && (
                <div className="flex gap-2">
                    <Button type="button" disabled={pending} onClick={() => run(() => decideSalaryIncreaseAction(approval.id, true))} className="h-11 rounded-xl flex-1">
                        Aprobar
                    </Button>
                    <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => decideSalaryIncreaseAction(approval.id, false))} className="h-11 rounded-xl flex-1">
                        Rechazar
                    </Button>
                </div>
            )}

            {approval?.status === 'APPROVED' && canDecide && (
                <Button type="button" disabled={pending} onClick={() => run(() => applySalaryIncreaseAction(approval.id))} className="h-11 rounded-xl w-full">
                    Aplicar al salario
                </Button>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
    );
}
