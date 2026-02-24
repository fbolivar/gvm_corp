"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { partySchema, Party, DocTypeEnum, PartyTypeEnum } from "../types"
import { calculateDV } from "@/shared/utils/nit"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { useEffect } from "react"
import {
    User,
    Building2,
    Hash,
    Mail,
    Phone,
    ShieldCheck,
    CheckCircle2,
    Save,
    ChevronDown,
    Briefcase,
    IdCard,
    Zap,
    Cpu,
    Globe,
    CreditCard
} from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface PartyFormProps {
    initialData?: Party
    onSubmit: (data: Party) => Promise<void>
    isLoading?: boolean
}

export function PartyForm({ initialData, onSubmit, isLoading }: PartyFormProps) {
    const form = useForm<Party>({
        resolver: zodResolver(partySchema) as any,
        defaultValues: initialData || {
            party_type: 'COMPANY',
            doc_type: 'NIT',
            is_customer: true,
            is_vendor: false,
            legal_name: '',
            doc_number: '',
            email: '',
            phone: ''
        }
    })

    // Auto-calculate DV when NIT changes
    const docType = form.watch('doc_type')
    const nit = form.watch('nit')
    const docNumber = form.watch('doc_number')

    useEffect(() => {
        if (docType === 'NIT') {
            if (docNumber && docNumber !== nit) {
                form.setValue('nit', docNumber)
            }
        }
    }, [docNumber, docType, form, nit])

    useEffect(() => {
        if (docType === 'NIT' && nit) {
            const dv = calculateDV(nit)
            form.setValue('dv', dv)
        } else {
            form.setValue('dv', '')
        }
    }, [nit, docType, form])

    return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-5xl mx-auto pb-20">
            <div className="relative group overflow-hidden bg-white rounded-[4rem] shadow-premium border-none p-12 md:p-16">
                {/* Industrial Background Element */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-transform duration-1000">
                    <Cpu className="h-64 w-64 text-slate-900" />
                </div>

                {/* Header */}
                <header className="relative z-10 space-y-2 mb-16">
                    <div className="flex items-center gap-6">
                        <div className="h-20 w-20 rounded-[2.5rem] bg-slate-900 text-white flex items-center justify-center shadow-active transform -rotate-3 hover:rotate-0 transition-all duration-500">
                            {initialData ? <Save className="h-10 w-10" /> : <User className="h-10 w-10" />}
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
                                {initialData ? 'Sincronizar' : 'Alta de'} <span className="text-primary italic">Registro</span>
                            </h2>
                            <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.5em] pl-1">Identidad de Alianza Industrial v3.0</p>
                        </div>
                    </div>
                </header>

                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-12 relative z-10">

                    {/* Pod 1: Definición Legal */}
                    <section className="space-y-8 bg-slate-50/50 p-10 rounded-[3rem] border border-white shadow-inner relative group/pod">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-black italic">01</div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] italic">Matriz Legal de Identidad</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <Label className="text-slate-900 font-black uppercase text-[10px] tracking-[0.3em] pl-2 flex items-center gap-3 italic">
                                    <Briefcase className="h-4 w-4 text-primary" /> Naturaleza Jurídica
                                </Label>
                                <div className="relative">
                                    <select
                                        {...form.register('party_type')}
                                        className="w-full h-16 bg-white border-none rounded-2xl px-6 text-slate-900 text-sm font-black appearance-none focus:ring-4 focus:ring-primary/10 outline-none transition-all cursor-pointer shadow-premium italic uppercase tracking-wider"
                                    >
                                        {PartyTypeEnum.options.map(opt => (
                                            <option key={opt} value={opt} className="font-sans font-bold py-4">{opt === 'PERSON' ? 'Persona Natural' : 'Persona Jurídica'}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
                                </div>
                                {form.formState.errors.party_type && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tighter pl-2 italic">{form.formState.errors.party_type.message}</p>}
                            </div>

                            <div className="space-y-4">
                                <Label className="text-slate-900 font-black uppercase text-[10px] tracking-[0.3em] pl-2 flex items-center gap-3 italic">
                                    <Building2 className="h-4 w-4 text-primary" /> Identificador Nominal
                                </Label>
                                <Input
                                    {...form.register('legal_name')}
                                    placeholder="NOMBRE LEGAL COMPLETO"
                                    className="h-16 bg-white border-none rounded-2xl px-6 text-slate-900 placeholder:text-slate-200 focus:ring-4 focus:ring-primary/10 transition-all font-black shadow-premium italic uppercase tracking-wider text-sm"
                                />
                                {form.formState.errors.legal_name && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tighter pl-2 italic">{form.formState.errors.legal_name.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                            <div className="md:col-span-3 space-y-4">
                                <Label className="text-slate-900 font-black uppercase text-[10px] tracking-[0.3em] pl-2 italic">Tipo</Label>
                                <div className="relative">
                                    <select
                                        {...form.register('doc_type')}
                                        className="w-full h-16 bg-white border-none rounded-2xl px-6 text-slate-900 text-sm font-black appearance-none focus:ring-4 focus:ring-primary/10 outline-none transition-all cursor-pointer shadow-premium italic"
                                    >
                                        {DocTypeEnum.options.map(opt => (
                                            <option key={opt} value={opt} className="font-sans font-bold">{opt}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
                                </div>
                            </div>
                            <div className="md:col-span-7 space-y-4">
                                <Label className="text-slate-900 font-black uppercase text-[10px] tracking-[0.3em] pl-2 flex items-center gap-3 italic">
                                    <IdCard className="h-4 w-4 text-primary" /> Documento Técnico
                                </Label>
                                <Input
                                    {...form.register('doc_number')}
                                    placeholder="000.000.000"
                                    className="h-16 bg-white border-none rounded-2xl px-6 text-slate-900 placeholder:text-slate-200 focus:ring-4 focus:ring-primary/10 transition-all font-mono font-black tracking-[0.3em] shadow-premium text-sm uppercase"
                                />
                                {form.formState.errors.doc_number && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tighter pl-2 italic">{form.formState.errors.doc_number.message}</p>}
                            </div>
                            <div className="md:col-span-2 space-y-4 text-center">
                                <Label className="text-slate-900 font-black uppercase text-[10px] tracking-[0.3em] italic">V</Label>
                                <div className="h-16 flex items-center justify-center bg-slate-900 text-white rounded-2xl font-mono font-black text-xl shadow-active">
                                    {form.watch('dv') || '0'}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Pod 2: Canales de Enlace */}
                    <section className="space-y-8 bg-slate-50/50 p-10 rounded-[3rem] border border-white shadow-inner relative">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-black italic">02</div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] italic">Protocolos de Contacto</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <Label className="text-slate-900 font-black uppercase text-[10px] tracking-[0.3em] pl-2 flex items-center gap-3 italic">
                                    <Mail className="h-4 w-4 text-primary" /> Nodo Digital (Email)
                                </Label>
                                <Input
                                    type="email"
                                    {...form.register('email')}
                                    placeholder="CORPORATIVO@SERVER.COM"
                                    className="h-16 bg-white border-none rounded-2xl px-6 text-slate-900 placeholder:text-slate-200 focus:ring-4 focus:ring-primary/10 transition-all font-black shadow-premium italic lowercase tracking-tighter text-sm"
                                />
                                {form.formState.errors.email && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tighter pl-2 italic">{form.formState.errors.email.message}</p>}
                            </div>
                            <div className="space-y-4">
                                <Label className="text-slate-900 font-black uppercase text-[10px] tracking-[0.3em] pl-2 flex items-center gap-3 italic">
                                    <Phone className="h-4 w-4 text-primary" /> Frecuencia de Voz (Phone)
                                </Label>
                                <Input
                                    {...form.register('phone')}
                                    placeholder="+57 (000) 000 0000"
                                    className="h-16 bg-white border-none rounded-2xl px-6 text-slate-900 placeholder:text-slate-200 focus:ring-4 focus:ring-primary/10 transition-all font-mono font-black shadow-premium tracking-widest text-sm"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Pod 3: Vector Comercial */}
                    <section className="space-y-8 bg-slate-50/50 p-10 rounded-[3rem] border border-white shadow-inner relative">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-black italic">03</div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] italic">Configuración de Alianza</h3>
                        </div>

                        <div className="flex flex-col md:flex-row gap-8">
                            <Label
                                htmlFor="is_customer"
                                className={cn(
                                    "flex items-center justify-between p-8 rounded-3xl border-2 transition-all duration-500 cursor-pointer flex-1 group/check",
                                    form.watch('is_customer')
                                        ? "bg-indigo-50 border-indigo-200 shadow-premium"
                                        : "bg-white border-slate-100 hover:border-slate-200 shadow-sm"
                                )}
                            >
                                <div className="flex items-center gap-6">
                                    <div className={cn(
                                        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                                        form.watch('is_customer') ? "bg-indigo-500 text-white rotate-6" : "bg-slate-50 text-slate-200"
                                    )}>
                                        <Globe className="h-7 w-7" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-lg font-black text-slate-900 tracking-tighter italic uppercase block">Ecosistema Cliente</span>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Habilitar Flujo de Ventas</span>
                                    </div>
                                </div>
                                <Checkbox
                                    id="is_customer"
                                    checked={form.watch('is_customer')}
                                    onCheckedChange={(checked) => form.setValue('is_customer', checked === true)}
                                    className="h-8 w-8 rounded-xl border-none data-[state=checked]:bg-indigo-500 shadow-active"
                                />
                            </Label>

                            <Label
                                htmlFor="is_vendor"
                                className={cn(
                                    "flex items-center justify-between p-8 rounded-3xl border-2 transition-all duration-500 cursor-pointer flex-1 group/check",
                                    form.watch('is_vendor')
                                        ? "bg-emerald-50 border-emerald-200 shadow-premium"
                                        : "bg-white border-slate-100 hover:border-slate-200 shadow-sm"
                                )}
                            >
                                <div className="flex items-center gap-6">
                                    <div className={cn(
                                        "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                                        form.watch('is_vendor') ? "bg-emerald-500 text-white -rotate-6" : "bg-slate-50 text-slate-200"
                                    )}>
                                        <CreditCard className="h-7 w-7" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-lg font-black text-slate-900 tracking-tighter italic uppercase block">Ecosistema Proveedor</span>
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Habilitar Flujo de Compras</span>
                                    </div>
                                </div>
                                <Checkbox
                                    id="is_vendor"
                                    checked={form.watch('is_vendor')}
                                    onCheckedChange={(checked) => form.setValue('is_vendor', checked === true)}
                                    className="h-8 w-8 rounded-xl border-none data-[state=checked]:bg-emerald-500 shadow-active"
                                />
                            </Label>
                        </div>
                    </section>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-24 rounded-[2.5rem] bg-slate-900 hover:bg-primary text-white font-black shadow-active transition-all active:scale-95 group/submit relative overflow-hidden overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/submit:translate-x-full transition-transform duration-1000 ease-in-out" />

                        {isLoading ? (
                            <div className="relative z-10 flex items-center gap-6">
                                <div className="h-8 w-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                <span className="text-xl uppercase tracking-[0.4em] italic leading-none">Procesando Protocolo...</span>
                            </div>
                        ) : (
                            <div className="relative z-10 flex items-center justify-between w-full px-12">
                                <div className="flex items-center gap-6">
                                    <Zap className="h-8 w-8 text-primary group-hover:rotate-12 transition-transform duration-500" />
                                    <span className="text-2xl uppercase tracking-[0.2em] italic leading-none">
                                        {initialData ? 'Confirmar Actualización' : 'Inyectar Matriz de Tercero'}
                                    </span>
                                </div>
                                <CheckCircle2 className="h-8 w-8 opacity-20 group-hover:opacity-100 transition-opacity" />
                            </div>
                        )}
                    </Button>
                </form>

                {/* Footer Disclaimer */}
                <footer className="mt-12 text-center">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.5em] italic">
                        Los datos ingresados se auditan automáticamente bajo estándares DIAN / ISO-9001
                    </p>
                </footer>
            </div>
        </div>
    )
}
