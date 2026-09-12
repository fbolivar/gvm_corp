'use client'

import { useState } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, Save, Send, MapPin, Calendar, Briefcase, Clock } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { cn } from '@/shared/lib/utils'
import { commercialRequestSchema, ITEM_TYPES, SCHEDULED_ITEM_TYPES, type CommercialRequestInput } from '../types'
import { createCommercialRequestAction, updateCommercialRequestAction } from '../actions'

interface Props {
    parties: { id: string; legal_name: string }[]
    opportunities: { id: string; name: string }[]
    requestId?: string
    initialData?: Partial<CommercialRequestInput>
}

const labelCls = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block'
const inputCls = 'h-11 rounded-xl border-slate-200 bg-slate-50/60 text-sm'

function fmt(n: number) {
    return `$${Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`
}

export function CommercialRequestForm({ parties, opportunities, requestId, initialData }: Props) {
    const router = useRouter()
    const isEdit = !!requestId
    const [loading, setLoading] = useState<'draft' | 'send' | null>(null)

    const form = useForm<CommercialRequestInput>({
        resolver: zodResolver(commercialRequestSchema) as any,
        defaultValues: {
            title: initialData?.title ?? '',
            purpose: initialData?.purpose ?? '',
            destination: initialData?.destination ?? '',
            start_date: initialData?.start_date ?? '',
            end_date: initialData?.end_date ?? '',
            party_id: initialData?.party_id ?? '',
            opportunity_id: initialData?.opportunity_id ?? '',
            items: initialData?.items ?? [{ type: 'VUELO', description: '', quantity: 1, unit_cost: 0, notes: '' }],
        },
    })
    const { register, control, handleSubmit, formState: { errors } } = form
    const { fields, append, remove } = useFieldArray({ control, name: 'items' })
    const items = useWatch({ control, name: 'items' }) ?? []
    const total = items.reduce((s, i) => s + (Number(i?.quantity) || 0) * (Number(i?.unit_cost) || 0), 0)

    async function onSubmit(data: CommercialRequestInput, submit: boolean) {
        setLoading(submit ? 'send' : 'draft')
        const res = isEdit
            ? await updateCommercialRequestAction(requestId!, data, submit)
            : await createCommercialRequestAction(data, submit)
        setLoading(null)
        if (res.error) { toast.error(res.error); return }
        toast.success(submit ? 'Solicitud enviada a aprobación' : 'Cambios guardados')
        router.push(`/commercial/${isEdit ? requestId : (res as { id: string }).id}`)
        router.refresh()
    }

    return (
        <form className="space-y-6 max-w-4xl">
            {/* Datos generales */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-indigo-500" /> Datos de la solicitud
                </h3>

                <div>
                    <label className={labelCls}>Título *</label>
                    <Input {...register('title')} placeholder="Ej. Visita comercial cliente X — Medellín" className={inputCls} />
                    {errors.title && <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.title.message}</p>}
                </div>

                <div>
                    <label className={labelCls}>Motivo / justificación comercial</label>
                    <Textarea {...register('purpose')} rows={3} placeholder="Objetivo del viaje, gestión comercial, resultado esperado…" className="rounded-xl border-slate-200 bg-slate-50/60 text-sm" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className={labelCls}><MapPin className="h-3 w-3 inline mr-1" />Destino</label>
                        <Input {...register('destination')} placeholder="Ciudad / lugar" className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}><Calendar className="h-3 w-3 inline mr-1" />Desde</label>
                        <Input type="date" {...register('start_date')} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}><Calendar className="h-3 w-3 inline mr-1" />Hasta</label>
                        <Input type="date" {...register('end_date')} className={inputCls} />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Cliente (opcional)</label>
                        <select {...register('party_id')} className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/60 text-sm px-3 outline-none">
                            <option value="">— Sin vincular —</option>
                            {parties.map((p) => <option key={p.id} value={p.id}>{p.legal_name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Oportunidad CRM (opcional)</label>
                        <select {...register('opportunity_id')} className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/60 text-sm px-3 outline-none">
                            <option value="">— Sin vincular —</option>
                            {opportunities.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Conceptos */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Conceptos a solicitar</h3>
                    <Button type="button" onClick={() => append({ type: 'OTRO', description: '', schedule: '', quantity: 1, unit_cost: 0, notes: '' })}
                        className="h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Agregar concepto
                    </Button>
                </div>

                {typeof errors.items?.message === 'string' && (
                    <p className="text-[11px] text-rose-500 font-semibold">{errors.items.message}</p>
                )}

                <div className="space-y-3">
                    {fields.map((f, idx) => {
                        const row = items[idx]
                        const subtotal = (Number(row?.quantity) || 0) * (Number(row?.unit_cost) || 0)
                        return (
                            <div key={f.id} className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-[10rem_1fr_6rem_9rem_2.5rem] gap-3 items-start">
                                    <select {...register(`items.${idx}.type`)} className="h-11 rounded-xl border border-slate-200 bg-white text-xs font-bold px-2 outline-none">
                                        {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                    <div>
                                        <Input {...register(`items.${idx}.description`)} placeholder="Descripción del concepto" className="h-11 rounded-xl border-slate-200 bg-white text-sm" />
                                        {errors.items?.[idx]?.description && (
                                            <p className="text-[10px] text-rose-500 font-semibold mt-1">{errors.items[idx]?.description?.message as string}</p>
                                        )}
                                    </div>
                                    <Input type="number" step="any" min="0" {...register(`items.${idx}.quantity`)} placeholder="Cant." className="h-11 rounded-xl border-slate-200 bg-white text-sm text-right tabular-nums" />
                                    <Input type="number" step="1" min="0" {...register(`items.${idx}.unit_cost`)} placeholder="Costo unit." className="h-11 rounded-xl border-slate-200 bg-white text-sm text-right tabular-nums" />
                                    <button type="button" onClick={() => fields.length > 1 && remove(idx)} aria-label="Quitar"
                                        className="h-11 w-full rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-600 flex items-center justify-center transition-all disabled:opacity-30"
                                        disabled={fields.length <= 1}>
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Horario — solo para vuelos/transporte */}
                                {row?.type && SCHEDULED_ITEM_TYPES.includes(row.type) && (
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                        <Input
                                            {...register(`items.${idx}.schedule`)}
                                            placeholder="Horario — ej: Salida 08:30 a. m. · Regreso 06:00 p. m."
                                            className="h-10 rounded-xl border-slate-200 bg-white text-sm"
                                        />
                                    </div>
                                )}

                                <div className="text-right text-[11px] font-bold text-slate-500">
                                    Subtotal: <span className="text-slate-900 tabular-nums">{fmt(subtotal)}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total estimado</span>
                    <span className="text-2xl font-black text-slate-900 tabular-nums">{fmt(total)}</span>
                </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Button type="button" disabled={loading !== null} onClick={handleSubmit((d) => onSubmit(d, false))}
                    className="flex-1 h-12 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 font-black text-[11px] uppercase tracking-widest gap-2">
                    {loading === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {isEdit ? 'Guardar cambios' : 'Guardar borrador'}
                </Button>
                <Button type="button" disabled={loading !== null} onClick={handleSubmit((d) => onSubmit(d, true))}
                    className="flex-1 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-widest gap-2">
                    {loading === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar a aprobación
                </Button>
            </div>
        </form>
    )
}
