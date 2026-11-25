'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { MoneyInput, formatCop } from '@/shared/components/ui/money-input';
import { updateOpportunityAction } from '@/features/crm/actions';

const fmt = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

/**
 * Edición rápida del "valor del negocio" desde la ficha de la oportunidad, sin
 * ir al formulario completo. Usa MoneyInput (formato COP, evita el bug de miles).
 */
export function OpportunityValueEditor({ id, initialValue }: { id: string; initialValue: number }) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState<number>(initialValue);
    const [pending, start] = useTransition();

    const save = () => start(async () => {
        const res = await updateOpportunityAction(id, { value });
        if (res.error) { toast.error(res.error); return; }
        toast.success('Valor actualizado');
        setEditing(false);
        router.refresh();
    });

    if (!editing) {
        return (
            <div className="flex flex-col items-end gap-2">
                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Valor del Negocio</span>
                <button type="button" onClick={() => { setValue(initialValue); setEditing(true); }}
                    className="group inline-flex items-center gap-2 text-4xl font-black italic tracking-tighter hover:text-white/80 transition-colors">
                    {fmt(initialValue || 0)}
                    <Pencil className="h-4 w-4 text-white/30 group-hover:text-white/70 transition-colors" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-end gap-2">
            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Valor del Negocio (COP)</span>
            <div className="flex items-center gap-2">
                <MoneyInput
                    value={value}
                    onChange={setValue}
                    autoFocus
                    className="h-11 w-44 bg-white/10 border-white/20 text-white text-right text-lg font-black placeholder:text-white/30"
                    placeholder="0"
                />
                <button type="button" onClick={save} disabled={pending}
                    className="h-11 w-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center disabled:opacity-50">
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-5 w-5" />}
                </button>
                <button type="button" onClick={() => setEditing(false)} disabled={pending}
                    className="h-11 w-11 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-50">
                    <X className="h-5 w-5" />
                </button>
            </div>
            <span className="text-[10px] text-white/40">{formatCop(value)} COP</span>
        </div>
    );
}
