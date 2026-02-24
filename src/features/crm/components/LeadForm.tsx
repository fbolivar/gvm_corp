"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { leadSchema, Lead } from "../types"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Select } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import {
    User,
    Building2,
    Mail,
    Phone,
    Info,
    Globe,
    HelpCircle,
    CheckCircle2,
    X,
    Sparkles,
    ChevronDown,
    Loader2
} from "lucide-react"

interface LeadFormProps {
    initialData?: Lead
    onSubmit: (data: Lead) => Promise<void>
    isLoading?: boolean
}

export function LeadForm({ initialData, onSubmit, isLoading }: LeadFormProps) {
    const form = useForm<Lead>({
        resolver: zodResolver(leadSchema) as any,
        defaultValues: initialData || {
            status: 'NEW',
            source: 'Web',
            name: '',
            company_name: '',
            email: '',
            phone: '',
            notes: ''
        }
    })

    return (
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20 max-w-5xl mx-auto">

            {/* 1. INFORMACIÓN DEL PROSPECTO */}
            <Card className="rounded-[2.5rem] border-none bg-white shadow-premium overflow-hidden group">
                <CardHeader className="bg-slate-50/50 border-b border-slate-50 p-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm transition-transform group-hover:scale-110 duration-500">
                                <User className="h-7 w-7" />
                            </div>
                            <div className="space-y-1">
                                <CardTitle className="text-2xl font-black text-slate-900 tracking-tight italic">Información del Prospecto</CardTitle>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Datos de contacto y calificación</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50/50 rounded-full">
                            <Sparkles className="h-3 w-3 text-indigo-500 animate-pulse" />
                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">CRM</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Nombre Completo *</Label>
                            <div className="relative group/field">
                                <User className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Input
                                    {...form.register('name')}
                                    placeholder="Ej: Juan Pérez"
                                    className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all placeholder:text-slate-300"
                                />
                            </div>
                            {form.formState.errors.name && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tighter ml-5">{form.formState.errors.name.message}</p>}
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Empresa / Organización</Label>
                            <div className="relative group/field">
                                <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Input
                                    {...form.register('company_name')}
                                    placeholder="Ej: Empresa S.A.S"
                                    className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all placeholder:text-slate-300"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Correo Electrónico</Label>
                            <div className="relative group/field">
                                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Input
                                    type="email"
                                    {...form.register('email')}
                                    placeholder="juan@ejemplo.com"
                                    className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all placeholder:text-slate-300"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Teléfono / WhatsApp</Label>
                            <div className="relative group/field">
                                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Input
                                    {...form.register('phone')}
                                    placeholder="+57 300 ..."
                                    className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all placeholder:text-slate-300"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Estado del Lead</Label>
                            <div className="relative group/field">
                                <select
                                    {...form.register('status')}
                                    className="w-full h-14 pl-6 pr-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                                >
                                    <option value="NEW">Nuevo</option>
                                    <option value="CONTACTED">Contactado</option>
                                    <option value="QUALIFIED">Calificado</option>
                                    <option value="LOST">Perdido</option>
                                    <option value="CONVERTED">Convertido</option>
                                </select>
                                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Origen</Label>
                            <div className="relative group/field">
                                <Globe className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Input
                                    {...form.register('source')}
                                    placeholder="Facebook, Google, Feria..."
                                    className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all placeholder:text-slate-300"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Notas Adicionales</Label>
                        <Textarea
                            {...form.register('notes')}
                            placeholder="Detalles de interés, requerimientos específicos..."
                            className="min-h-[120px] bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all placeholder:text-slate-300 resize-none p-6"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex gap-6">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => window.history.back()}
                    className="h-16 px-8 rounded-[2rem] text-slate-400 hover:text-slate-900 hover:bg-slate-50 font-black text-xs uppercase tracking-widest transition-all"
                >
                    <X className="mr-3 h-5 w-5" /> Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 h-16 sm:h-20 rounded-[1.5rem] sm:rounded-[2rem] bg-slate-900 hover:bg-primary text-white font-black italic tracking-tight text-lg sm:text-2xl transition-all shadow-active active:scale-95 group overflow-hidden relative"
                >
                    {isLoading ? (
                        <div className="flex items-center gap-4">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span>PROCESANDO...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-8 w-8 group-hover:scale-110 transition-transform" />
                            <span>{initialData ? 'ACTUALIZAR PROSPECTO' : 'REGISTRAR PROSPECTO'}</span>
                            <Sparkles className="h-6 w-6 absolute -top-1 right-4 opacity-10 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}
                </Button>
            </div>
        </form>
    )
}
