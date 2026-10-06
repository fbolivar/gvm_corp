'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, CalendarCheck, Building2, Briefcase } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { SearchableSelect } from '@/shared/components/ui/searchable-select';
import { cn } from '@/shared/lib/utils';
import { createVisitAction, updateVisitPlanAction } from '../actions/visitActions';
import { PartySnapshotCard } from './PartySnapshotCard';
import {
    MANAGEMENT_TYPES, MEETING_TYPES, PRIORITY_LABELS, VISIT_STATUSES,
    visitPlanSchema, type CrmVisit, type VisitPlanInput,
} from '../types/visits';
import type { Salesperson } from '../services/visitService';

/**
 * Formulario de planeación de una visita (alta y edición).
 * Pensado para llenarse desde el celular: campos grandes, una columna en móvil.
 */

interface Props {
    parties: Array<{ id: string; legal_name: string; doc_number?: string | null }>;
    salespeople: Salesperson[];
    currentUserId: string;
    isManager: boolean;
    today: string;
    visit?: CrmVisit;
    /** Valores precargados desde una alerta o desde la cartera. */
    defaults?: Partial<Pick<VisitPlanInput, 'party_id' | 'management_type' | 'priority'>>;
}

const selectCls = 'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm outline-none focus:border-indigo-300';
const labelCls = 'text-[10px] font-semibold text-slate-400 uppercase tracking-wider';

export function VisitForm({ parties, salespeople, currentUserId, isManager, today, visit, defaults }: Props) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const submittingRef = useRef(false);

    const { register, handleSubmit, control, watch, setError, formState: { errors } } = useForm<VisitPlanInput>({
        resolver: zodResolver(visitPlanSchema) as never,
        defaultValues: visit ? {
            salesperson_id: visit.salesperson_id,
            is_internal: visit.is_internal,
            party_id: visit.party_id,
            title: visit.title,
            priority: visit.priority,
            management_type: visit.management_type,
            objective: visit.objective,
            meeting_type: visit.meeting_type,
            planned_date: visit.planned_date,
            status: visit.status,
        } : {
            salesperson_id: currentUserId,
            is_internal: false,
            party_id: defaults?.party_id ?? null,
            priority: defaults?.priority ?? 2,
            management_type: defaults?.management_type ?? 'FIDELIZACION',
            meeting_type: 'GRANJA',
            planned_date: today,
            status: 'PENDIENTE',
        },
    });

    const isInternal = watch('is_internal');
    const partyId = watch('party_id') ?? null;

    const salespersonItems = useMemo(() => salespeople.map(s => ({
        value: s.id, label: s.name, subLabel: s.role ?? undefined, keywords: `${s.name} ${s.role ?? ''}`,
    })), [salespeople]);

    const partyItems = useMemo(() => parties.map(p => ({
        value: p.id, label: p.legal_name, subLabel: p.doc_number ?? undefined,
        keywords: `${p.legal_name} ${p.doc_number ?? ''}`,
    })), [parties]);

    const onSubmit = async (data: VisitPlanInput) => {
        if (submittingRef.current) return;
        submittingRef.current = true;
        setSubmitting(true);
        try {
            let targetId = visit?.id ?? null;
            const res = visit ? await updateVisitPlanAction(visit.id, data) : await createVisitAction(data);
            if ('error' in res) {
                if (res.field) setError(res.field as keyof VisitPlanInput, { message: res.error });
                toast.error(res.error);
                return;
            }
            if ('id' in res && typeof res.id === 'string') targetId = res.id;
            toast.success(visit ? 'Visita actualizada' : 'Visita planeada');
            router.push(targetId ? `/crm/visits/${targetId}` : '/crm/visits');
            router.refresh();
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    const err = (name: keyof VisitPlanInput) => errors[name]?.message as string | undefined;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto space-y-5">
            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 md:p-6 space-y-5">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" /> ¿A quién se visita?
                </h3>

                {/* Cliente vs. actividad interna */}
                <Controller control={control} name="is_internal" render={({ field }) => (
                    <div className="grid grid-cols-2 gap-2">
                        {[{ v: false, t: 'Visita a cliente', i: Building2 }, { v: true, t: 'Actividad interna', i: Briefcase }].map(o => (
                            <button key={String(o.v)} type="button" onClick={() => field.onChange(o.v)}
                                className={cn('h-11 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all',
                                    field.value === o.v ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-slate-50/50 text-slate-500')}>
                                <o.i className="h-3.5 w-3.5" /> {o.t}
                            </button>
                        ))}
                    </div>
                )} />

                {isInternal ? (
                    <div className="space-y-2">
                        <label className={labelCls}>Nombre de la actividad</label>
                        <Input {...register('title')} placeholder="Ej: Oficina — pedidos y seguimiento telefónico" className="h-11 rounded-xl border-slate-200 bg-slate-50/50 text-sm" />
                        {err('title') && <p className="text-xs text-rose-500 font-medium">{err('title')}</p>}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <label className={labelCls}>Cliente</label>
                        <Controller control={control} name="party_id" render={({ field }) => (
                            <SearchableSelect
                                items={partyItems}
                                value={field.value ?? ''}
                                onChange={v => field.onChange(v || null)}
                                placeholder="Busca por nombre o NIT..."
                                error={!!errors.party_id}
                            />
                        )} />
                        {err('party_id') && <p className="text-xs text-rose-500 font-medium">{err('party_id')}</p>}
                        <PartySnapshotCard partyId={partyId} />
                    </div>
                )}

                {isManager && (
                    <div className="space-y-2">
                        <label className={labelCls}>Comercial responsable</label>
                        <Controller control={control} name="salesperson_id" render={({ field }) => (
                            <SearchableSelect
                                items={salespersonItems}
                                value={field.value ?? ''}
                                onChange={v => field.onChange(v || '')}
                                placeholder="Busca al comercial por nombre..."
                                error={!!errors.salesperson_id}
                            />
                        )} />
                        {err('salesperson_id') && <p className="text-xs text-rose-500 font-medium">{err('salesperson_id')}</p>}
                    </div>
                )}
            </section>

            <section className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 md:p-6 space-y-5">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CalendarCheck className="h-3.5 w-3.5" /> Planeación
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className={labelCls}>Fecha planeada</label>
                        <Input type="date" {...register('planned_date')} className="h-11 rounded-xl border-slate-200 bg-slate-50/50 text-sm" />
                        {err('planned_date') && <p className="text-xs text-rose-500 font-medium">{err('planned_date')}</p>}
                    </div>
                    <div className="space-y-2">
                        <label className={labelCls}>Prioridad</label>
                        <select {...register('priority')} className={selectCls}>
                            {([1, 2, 3] as const).map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className={labelCls}>Tipo de gestión</label>
                        <select {...register('management_type')} className={selectCls}>
                            {Object.entries(MANAGEMENT_TYPES)
                                .filter(([k]) => isInternal || k !== 'INTERNA')
                                .map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className={labelCls}>Tipo de reunión</label>
                        <select {...register('meeting_type')} className={selectCls}>
                            {Object.entries(MEETING_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </div>
                    {visit && (
                        <div className="space-y-2">
                            <label className={labelCls}>Estado</label>
                            <select {...register('status')} className={selectCls}>
                                {Object.entries(VISIT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <label className={labelCls}>Objetivo de la visita</label>
                    <Textarea {...register('objective')} rows={3} placeholder="Qué se quiere lograr: reactivar la cuenta, presentar la línea de porcicultura, cobrar cartera..."
                        className="rounded-xl border-slate-200 bg-slate-50/50 text-sm" />
                    {err('objective') && <p className="text-xs text-rose-500 font-medium">{err('objective')}</p>}
                </div>
            </section>

            <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()} className="h-11 px-4 rounded-xl text-xs font-bold">
                    Cancelar
                </Button>
                <Button type="submit" disabled={submitting} className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {visit ? 'Guardar cambios' : 'Planear visita'}
                </Button>
            </div>
        </form>
    );
}
