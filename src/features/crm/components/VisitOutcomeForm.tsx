'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, ClipboardCheck } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';
import { recordVisitOutcomeAction } from '../actions/visitActions';
import { VISIT_RESULTS, VISIT_STATUSES, visitOutcomeSchema, type CrmVisit, type VisitOutcomeInput, type VisitStatus } from '../types/visits';

/**
 * Registro del resultado de la visita: qué pasó, compromisos y próximo
 * seguimiento. El mismo formulario sirve para reprogramar o marcar no realizada.
 */

const labelCls = 'text-[10px] font-semibold text-slate-400 uppercase tracking-wider';
const inputCls = 'h-11 rounded-xl border-slate-200 bg-slate-50/50 text-sm';
const selectCls = 'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none focus:border-indigo-300';

const STATUS_STYLE: Record<VisitStatus, string> = {
    PENDIENTE: 'border-slate-300 bg-slate-50 text-slate-700',
    AGENDADA: 'border-sky-400 bg-sky-50 text-sky-700',
    REALIZADA: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    REPROGRAMADA: 'border-amber-400 bg-amber-50 text-amber-700',
    NO_REALIZADA: 'border-rose-400 bg-rose-50 text-rose-700',
};

export function VisitOutcomeForm({ visit, today }: { visit: CrmVisit; today: string }) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);

    const { register, handleSubmit, control, watch, setError, formState: { errors } } = useForm<VisitOutcomeInput>({
        resolver: zodResolver(visitOutcomeSchema) as never,
        defaultValues: {
            status: visit.status === 'PENDIENTE' || visit.status === 'AGENDADA' ? 'REALIZADA' : visit.status,
            done_date: visit.done_date ?? today,
            planned_date: visit.planned_date,
            conclusions: visit.conclusions ?? '',
            commitments: visit.commitments ?? '',
            next_followup_date: visit.next_followup_date ?? '',
            result: visit.result ?? 'EN_PROCESO',
        },
    });
    const status = watch('status');

    const onSubmit = async (data: VisitOutcomeInput) => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setSubmitting(true);
        try {
            const clean: VisitOutcomeInput = {
                ...data,
                done_date: data.done_date || null,
                next_followup_date: data.next_followup_date || null,
                conclusions: data.conclusions || null,
                commitments: data.commitments || null,
            };
            const res = await recordVisitOutcomeAction(visit.id, clean);
            if ('error' in res) {
                if (res.field) setError(res.field as keyof VisitOutcomeInput, { message: res.error });
                toast.error(res.error);
                return;
            }
            toast.success('Resultado registrado');
            router.refresh();
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    const err = (name: keyof VisitOutcomeInput) => errors[name]?.message as string | undefined;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 md:p-6 space-y-5">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ClipboardCheck className="h-3.5 w-3.5" /> Registrar resultado
            </h3>

            <Controller control={control} name="status" render={({ field }) => (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {(Object.keys(VISIT_STATUSES) as VisitStatus[]).map(s => (
                        <button key={s} type="button" onClick={() => field.onChange(s)}
                            className={cn('h-11 rounded-xl border text-[11px] font-bold transition-all',
                                field.value === s ? STATUS_STYLE[s] : 'border-slate-200 bg-white text-slate-400')}>
                            {VISIT_STATUSES[s]}
                        </button>
                    ))}
                </div>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {status === 'REALIZADA' && (
                    <>
                        <div className="space-y-2">
                            <label className={labelCls}>Fecha realizada</label>
                            <Input type="date" {...register('done_date')} className={inputCls} />
                            {err('done_date') && <p className="text-xs text-rose-500 font-medium">{err('done_date')}</p>}
                        </div>
                        <div className="space-y-2">
                            <label className={labelCls}>Resultado</label>
                            <select {...register('result')} className={selectCls}>
                                {Object.entries(VISIT_RESULTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            {err('result') && <p className="text-xs text-rose-500 font-medium">{err('result')}</p>}
                        </div>
                    </>
                )}
                {status === 'REPROGRAMADA' && (
                    <div className="space-y-2">
                        <label className={labelCls}>Nueva fecha planeada</label>
                        <Input type="date" {...register('planned_date')} className={inputCls} />
                        {err('planned_date') && <p className="text-xs text-rose-500 font-medium">{err('planned_date')}</p>}
                    </div>
                )}
                <div className="space-y-2">
                    <label className={labelCls}>Próximo seguimiento</label>
                    <Input type="date" {...register('next_followup_date')} className={inputCls} />
                </div>
            </div>

            <div className="space-y-2">
                <label className={labelCls}>Conclusiones</label>
                <Textarea {...register('conclusions')} rows={3} placeholder="Qué se encontró en la visita, cómo está la cuenta..."
                    className="rounded-xl border-slate-200 bg-slate-50/50 text-sm" />
                {err('conclusions') && <p className="text-xs text-rose-500 font-medium">{err('conclusions')}</p>}
            </div>
            <div className="space-y-2">
                <label className={labelCls}>Compromisos</label>
                <Textarea {...register('commitments')} rows={2} placeholder="Enviar cotización, programar capacitación, visita de seguimiento..."
                    className="rounded-xl border-slate-200 bg-slate-50/50 text-sm" />
            </div>

            <div className="flex justify-end">
                <Button type="submit" disabled={submitting} className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Guardar resultado
                </Button>
            </div>
        </form>
    );
}
