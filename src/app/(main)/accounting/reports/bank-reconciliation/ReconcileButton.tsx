'use client';

import { useTransition } from 'react';
import { toggleReconciled } from './actions';
import { cn } from '@/shared/lib/utils';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface Props {
    transactionId: string;
    isReconciled: boolean;
}

export function ReconcileButton({ transactionId, isReconciled }: Props) {
    const [pending, startTransition] = useTransition();

    return (
        <button
            onClick={() => startTransition(() => toggleReconciled(transactionId, isReconciled))}
            disabled={pending}
            title={isReconciled ? 'Marcar como no conciliado' : 'Marcar como conciliado'}
            className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                isReconciled
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                    : "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100",
                pending && "opacity-50 cursor-not-allowed"
            )}
        >
            {pending
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : isReconciled
                    ? <CheckCircle2 className="h-3 w-3" />
                    : <Circle className="h-3 w-3" />
            }
            {isReconciled ? 'Conciliado' : 'Pendiente'}
        </button>
    );
}
