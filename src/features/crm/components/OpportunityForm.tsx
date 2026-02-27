"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Target, DollarSign, Sparkles, Building2, UserCircle, Calendar, ShieldCheck, Loader2 } from "lucide-react"

const opportunitySchema = z.object({
    name: z.string().min(3, "El nombre de la oportunidad es requerido"),
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
    leads?: any[]
    parties?: any[]
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

    const handleSubmit = (values: OpportunityFormValues) => {
        setIsLoading(true)
        onSubmit(values).finally(() => setIsLoading(false))
    }

    return (
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-12 animate-in fade-in duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* CONFIGURACIÓN PRINCIPAL */}
                <div className="lg:col-span-2 space-y-10">
                    <Card className="border-none shadow-premium bg-white rounded-[3.5rem] overflow-hidden p-3 relative group/card">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.01] pointer-events-none group-hover/card:scale-110 transition-transform duration-1000">
                            <Target className="h-64 w-64 text-slate-900" />
                        </div>

                        <CardContent className="p-12 space-y-12 relative z-10">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-active rotate-3">
                                    <Target className="h-7 w-7 text-indigo-400" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-3xl font-black text-slate-950 tracking-tighter italic uppercase leading-none">Mesa de Comando</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] italic">IDENTIFICACIÓN DE LA OPORTUNIDAD</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4 md:col-span-2">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 ml-6 italic">NOMBRE DE LA OPORTUNIDAD</Label>
                                    <div className="relative group/field">
                                        <Sparkles className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-indigo-500 transition-colors" />
                                        <Input
                                            {...form.register("name")}
                                            className="h-16 pl-14 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black italic uppercase text-slate-950 placeholder:text-slate-200 focus-visible:ring-4 focus-visible:ring-indigo-500/10 focus-visible:bg-white transition-all shadow-inner outline-none"
                                            placeholder="DESCRIPCION DEL NEGOCIO..."
                                        />
                                        {form.formState.errors.name && <p className="text-rose-500 text-[9px] font-black mt-2 ml-6 uppercase">{form.formState.errors.name.message}</p>}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 ml-6 italic">PROSPECTO ASOCIADO</Label>
                                    <div className="relative group/field">
                                        <UserCircle className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-indigo-500 transition-colors" />
                                        <select
                                            {...form.register("lead_id")}
                                            className="w-full h-16 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black italic uppercase text-slate-950 text-xs appearance-none cursor-pointer focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all shadow-inner outline-none"
                                        >
                                            <option value="">-- SELECCIONAR LEAD --</option>
                                            {leads.map(l => (
                                                <option key={l.id} value={l.id}>{l.name} {l.company_name ? `(${l.company_name})` : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 ml-6 italic">CLIENTE EXISTENTE</Label>
                                    <div className="relative group/field">
                                        <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-indigo-500 transition-colors" />
                                        <select
                                            {...form.register("party_id")}
                                            className="w-full h-16 pl-14 pr-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black italic uppercase text-slate-950 text-xs appearance-none cursor-pointer focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all shadow-inner outline-none"
                                        >
                                            <option value="">-- SELECCIONAR CLIENTE --</option>
                                            {parties.map(p => (
                                                <option key={p.id} value={p.id}>{p.legal_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-premium bg-white rounded-[3.5rem] overflow-hidden p-12 space-y-8 relative overflow-hidden group/notes">
                        <div className="h-px w-full bg-slate-100 mb-4" />
                        <Label className="text-[10px] font-black uppercase tracking-[0.6em] text-slate-400 ml-6 italic">ANNOTACIONES ESTRATEGICAS</Label>
                        <textarea
                            {...form.register("notes")}
                            rows={4}
                            className="w-full p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] font-black italic uppercase text-slate-950 placeholder:text-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all shadow-inner outline-none text-xs"
                            placeholder="DETALLES TÉCNICOS O COMERCIALES..."
                        />
                    </Card>
                </div>

                {/* MÉTRICAS FINANCIERAS */}
                <div className="space-y-10">
                    <Card className="border-none bg-slate-950 shadow-active rounded-[4rem] overflow-hidden text-white p-12 relative group/finance">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,#4f46e5,transparent)] opacity-20 pointer-events-none group-hover/finance:opacity-40 transition-opacity duration-[2000ms]" />

                        <div className="relative z-10 space-y-12">
                            <div className="flex items-center justify-between">
                                <div className="h-14 w-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 shadow-active">
                                    <DollarSign className="h-7 w-7" />
                                </div>
                                <ShieldCheck className="h-7 w-7 text-emerald-500" />
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.6em] text-white/30 ml-4 italic">VALOR NOMINAL DEL NEGOCIO</Label>
                                    <div className="relative group/field">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-indigo-400 italic text-xl">$</span>
                                        <Input
                                            type="number"
                                            {...form.register("value", { valueAsNumber: true })}
                                            className="h-20 pl-12 bg-white/5 border border-white/10 rounded-[2rem] font-black italic uppercase text-white placeholder:text-white/10 focus-visible:ring-4 focus-visible:ring-indigo-500/20 focus-visible:bg-white/10 transition-all outline-none text-2xl tracking-tighter"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.6em] text-white/30 ml-4 italic">PROBABILIDAD DE CIERRE (%)</Label>
                                    <div className="flex items-center gap-6">
                                        <Input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="5"
                                            {...form.register("probability", { valueAsNumber: true })}
                                            className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
                                        />
                                        <span className="text-3xl font-black italic text-indigo-400">{form.watch("probability")}%</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.6em] text-white/30 ml-4 italic">FECHA ESTIMADA DE CIERRE</Label>
                                    <div className="relative group/field">
                                        <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within/field:text-indigo-400 transition-colors" />
                                        <Input
                                            type="date"
                                            {...form.register("expected_close_date")}
                                            className="h-16 pl-14 bg-white/5 border border-white/10 rounded-[1.5rem] font-black italic uppercase text-white focus-visible:ring-4 focus-visible:ring-indigo-500/20 focus-visible:bg-white/10 transition-all outline-none text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 w-full">
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-24 rounded-[2.5rem] bg-indigo-600 hover:bg-white hover:text-slate-950 text-white font-black italic uppercase tracking-[0.4em] text-sm shadow-active transition-all hover:scale-105 active:scale-95 border-none group/action overflow-hidden disabled:opacity-50"
                                >
                                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/action:translate-y-0 transition-transform duration-500" />
                                    <div className="relative z-10 flex items-center justify-center gap-6">
                                        {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />}
                                        GUARDAR OPORTUNIDAD
                                    </div>
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </form>
    )
}
