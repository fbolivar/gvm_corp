"use client"

import { useState } from "react"
import { useForm, FieldErrors } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Target, DollarSign, Sparkles, Building2, UserCircle, Calendar, ShieldCheck, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

const opportunitySchema = z.object({
    name: z.string().min(3, "Nombre requerido (min. 3 caracteres)"),
    value: z.number().min(0, "El valor debe ser positivo"),
    probability: z.number().min(0).max(100),
    expected_close_date: z.string().nullable().optional(),
    lead_id: z.string().nullable().optional(),
    party_id: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
})

type OpportunityFormValues = z.infer<typeof opportunitySchema>

interface Props {
    onSubmit: (data: OpportunityFormValues) => Promise<void>
    initialData?: Partial<OpportunityFormValues>
    leads?: Array<Record<string, unknown>>
    parties?: Array<Record<string, unknown>>
}

export function OpportunityForm({ onSubmit, initialData, leads = [], parties = [] }: Props) {
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<OpportunityFormValues>({
        resolver: zodResolver(opportunitySchema),
        defaultValues: {
            name: initialData?.name || "",
            value: initialData?.value || 0,
            probability: initialData?.probability ?? 10,
            expected_close_date: initialData?.expected_close_date ?? "",
            lead_id: initialData?.lead_id ?? null,
            party_id: initialData?.party_id ?? null,
            notes: initialData?.notes ?? "",
        },
    })

    const handleSubmit = async (values: OpportunityFormValues) => {
        setIsLoading(true)
        try {
            const payload = {
                ...values,
                lead_id: values.lead_id || null,
                party_id: values.party_id || null,
                expected_close_date: values.expected_close_date || null,
                notes: values.notes || null,
            }
            await onSubmit(payload)
            toast.success("Oportunidad creada exitosamente")
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : ""
            if (msg.includes("NEXT_REDIRECT") || msg.includes("redirect")) throw err
            toast.error(msg || "Error al guardar la oportunidad")
        } finally {
            setIsLoading(false)
        }
    }

    const handleInvalid = (errors: FieldErrors<OpportunityFormValues>) => {
        const messages: string[] = []
        if (errors.name) messages.push("Nombre de oportunidad requerido")
        if (errors.value) messages.push("Valor debe ser positivo")
        if (errors.probability) messages.push("Probabilidad invalida")
        toast.error(messages.join(". ") || "Revisa los campos del formulario")
    }

    return (
        <form onSubmit={form.handleSubmit(handleSubmit, handleInvalid)} className="space-y-8 animate-in fade-in duration-700">
            {/* SINGLE COLUMN LAYOUT — better for mobile */}
            <div className="max-w-2xl mx-auto space-y-6">

                {/* IDENTIFICACION */}
                <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                    <CardContent className="p-5 md:p-8 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-slate-950 rounded-xl flex items-center justify-center text-white shrink-0">
                                <Target className="h-5 w-5 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Datos de la Oportunidad</h3>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Identificacion del negocio</p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            {/* Nombre */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Nombre de la Oportunidad *</Label>
                                <div className="relative">
                                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                    <Input
                                        {...form.register("name")}
                                        className="h-12 pl-11 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                                        placeholder="Ej: Contrato Vacunas Clinica Norte"
                                    />
                                </div>
                                {form.formState.errors.name && (
                                    <p className="text-rose-500 text-[10px] font-bold ml-1">{form.formState.errors.name.message}</p>
                                )}
                            </div>

                            {/* Valor + Probabilidad */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Valor del Negocio (COP) *</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                        <Input
                                            type="number"
                                            {...form.register("value", { valueAsNumber: true })}
                                            className="h-12 pl-11 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                                            placeholder="10000000"
                                        />
                                    </div>
                                    {form.formState.errors.value && (
                                        <p className="text-rose-500 text-[10px] font-bold ml-1">{form.formState.errors.value.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Probabilidad: <span className="text-indigo-600">{form.watch("probability")}%</span>
                                    </Label>
                                    <div className="flex items-center gap-3 h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl">
                                        <Input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="5"
                                            {...form.register("probability", { valueAsNumber: true })}
                                            className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                        />
                                        <span className="text-lg font-black text-indigo-600 min-w-[50px] text-right tabular-nums">
                                            {form.watch("probability")}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Fecha de cierre */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fecha Estimada de Cierre</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                    <Input
                                        type="date"
                                        {...form.register("expected_close_date")}
                                        className="h-12 pl-11 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                                    />
                                </div>
                            </div>

                            {/* Lead + Party */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Prospecto Asociado</Label>
                                    <div className="relative">
                                        <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                        <select
                                            {...form.register("lead_id")}
                                            className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        >
                                            <option value="">-- Opcional --</option>
                                            {leads.map(l => (
                                                <option key={String(l.id)} value={String(l.id)}>
                                                    {String(l.name)} {l.company_name ? `(${String(l.company_name)})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cliente Existente</Label>
                                    <div className="relative">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                        <select
                                            {...form.register("party_id")}
                                            className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                        >
                                            <option value="">-- Opcional --</option>
                                            {parties.map(p => (
                                                <option key={String(p.id)} value={String(p.id)}>{String(p.legal_name)}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Notas */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notas Estrategicas</Label>
                                <textarea
                                    {...form.register("notes")}
                                    rows={3}
                                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                                    placeholder="Contexto adicional del negocio..."
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Validation errors summary */}
                {Object.keys(form.formState.errors).length > 0 && (
                    <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl p-4">
                        <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />
                        <p className="text-rose-600 text-xs font-semibold">
                            Completa los campos marcados con * antes de guardar
                        </p>
                    </div>
                )}

                {/* SUBMIT BUTTON — always visible */}
                <div className="sticky bottom-4 z-20">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-14 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg transition-all active:scale-[0.98] border-none disabled:opacity-50"
                    >
                        <div className="flex items-center justify-center gap-2">
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                            {isLoading ? "GUARDANDO..." : "GUARDAR OPORTUNIDAD"}
                        </div>
                    </Button>
                </div>
            </div>
        </form>
    )
}
