"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
    partySchema, Party, DocTypeEnum, PartyTypeEnum,
    PropertyTypeEnum, TaxpayerTypeEnum, PaymentMethodEnum,
    PROPERTY_TYPE_LABELS, TAXPAYER_TYPE_LABELS, PAYMENT_METHOD_LABELS
} from "../types"
import { calculateDV } from "@/shared/utils/nit"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { useEffect, useState } from "react"
import {
    User, Building2, Mail, Phone, Save, ChevronDown, Briefcase, IdCard,
    Zap, Cpu, Globe, CreditCard, MapPin, Landmark, DollarSign, CalendarDays,
    ShieldCheck, UserCheck, Tag, Receipt, CheckCircle2, Activity
} from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface PriceList {
    id: string
    name: string
}

interface Salesperson {
    id: string
    full_name: string
    email: string
}

interface PartyFormProps {
    initialData?: Party
    onSubmit: (data: Party) => Promise<void>
    isLoading?: boolean
    priceLists?: PriceList[]
    salespeople?: Salesperson[]
}

const COLOMBIAN_DEPARTMENTS = [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá',
    'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba',
    'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena',
    'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
    'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca',
    'Vaupés', 'Vichada', 'Bogotá D.C.'
]

// Reusable select styles
const selectCls = "w-full h-14 bg-white border border-slate-100 rounded-2xl px-5 text-slate-900 text-sm font-semibold appearance-none focus:ring-4 focus:ring-primary/10 outline-none transition-all cursor-pointer shadow-sm"
const inputCls = "h-14 bg-white border border-slate-100 rounded-2xl px-5 text-slate-900 placeholder:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all font-semibold shadow-sm text-sm"
const labelCls = "text-slate-900 font-bold uppercase text-[10px] tracking-[0.2em] pl-1 flex items-center gap-2"
const errorCls = "text-rose-500 text-[10px] font-bold uppercase tracking-tight pl-1"
const podCls = "space-y-6 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 shadow-inner"

function SelectField({ icon: Icon, label, children }: { icon: React.ElementType, label: string, children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <Label className={labelCls}><Icon className="h-3.5 w-3.5 text-primary" /> {label}</Label>
            <div className="relative">
                {children}
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
            </div>
        </div>
    )
}

export function PartyForm({ initialData, onSubmit, isLoading, priceLists = [], salespeople = [] }: PartyFormProps) {
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
            phone: '',
            address: '',
            city: '',
            department: '',
            country: 'CO',
            payment_term_days: 0,
            credit_limit: 0,
            property_type: 'CLIENTE',
            taxpayer_type: 'REGIMEN_SIMPLE',
            payment_method: 'TRANSFERENCIA',
            economic_activity: '',
            salesperson_id: null,
            price_list_id: null,
        }
    })

    const docType = form.watch('doc_type')
    const nit = form.watch('nit')
    const docNumber = form.watch('doc_number')

    useEffect(() => {
        if (docType === 'NIT' && docNumber && docNumber !== nit) {
            form.setValue('nit', docNumber)
        }
    }, [docNumber, docType, form, nit])

    useEffect(() => {
        if (docType === 'NIT' && nit) {
            form.setValue('dv', calculateDV(nit))
        } else {
            form.setValue('dv', '')
        }
    }, [nit, docType, form])

    return (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 max-w-5xl mx-auto pb-20">
            <div className="relative group overflow-hidden bg-white rounded-[2.5rem] shadow-premium border-none p-8 md:p-10">
                <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                    <Cpu className="h-24 w-24 text-slate-900" />
                </div>

                {/* Header */}
                <header className="relative z-10 space-y-2 mb-12">
                    <div className="flex items-center gap-5">
                        <div className="h-16 w-16 rounded-[2rem] bg-slate-900 text-white flex items-center justify-center shadow-active transform -rotate-3 hover:rotate-0 transition-all duration-500">
                            {initialData ? <Save className="h-8 w-8" /> : <User className="h-8 w-8" />}
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-tight">
                                {initialData ? 'Editar' : 'Nuevo'} <span className="text-primary">Tercero</span>
                            </h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] pl-1">Ficha completa de cliente / proveedor</p>
                        </div>
                    </div>
                </header>

                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-8 relative z-10">

                    {/* ═══ Pod 1: Identidad Legal ═══ */}
                    <section className={podCls}>
                        <div className="flex items-center gap-3">
                            <div className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">01</div>
                            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.25em]">Identidad Legal</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SelectField icon={Briefcase} label="Naturaleza Jurídica">
                                <select {...form.register('party_type')} className={selectCls}>
                                    {PartyTypeEnum.options.map(opt => (
                                        <option key={opt} value={opt}>{opt === 'PERSON' ? 'Persona Natural' : 'Persona Jurídica'}</option>
                                    ))}
                                </select>
                            </SelectField>

                            <div className="space-y-3">
                                <Label className={labelCls}><Building2 className="h-3.5 w-3.5 text-primary" /> Razón Social / Nombre</Label>
                                <Input {...form.register('legal_name')} placeholder="Nombre legal completo" className={inputCls} />
                                {form.formState.errors.legal_name && <p className={errorCls}>{form.formState.errors.legal_name.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-12 gap-6">
                            <div className="col-span-12 md:col-span-3">
                                <SelectField icon={IdCard} label="Tipo Doc">
                                    <select {...form.register('doc_type')} className={selectCls}>
                                        {DocTypeEnum.options.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </SelectField>
                            </div>
                            <div className="col-span-9 md:col-span-7 space-y-3">
                                <Label className={labelCls}><IdCard className="h-3.5 w-3.5 text-primary" /> Número de Documento</Label>
                                <Input {...form.register('doc_number')} placeholder="000.000.000" className={cn(inputCls, "font-mono tracking-widest")} />
                                {form.formState.errors.doc_number && <p className={errorCls}>{form.formState.errors.doc_number.message}</p>}
                            </div>
                            <div className="col-span-3 md:col-span-2 space-y-3 text-center">
                                <Label className="text-slate-900 font-bold uppercase text-[10px] tracking-[0.2em]">DV</Label>
                                <div className="h-14 flex items-center justify-center bg-slate-900 text-white rounded-2xl font-mono font-black text-lg shadow-active">
                                    {form.watch('dv') || '—'}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className={labelCls}><Building2 className="h-3.5 w-3.5 text-primary" /> Nombre Comercial</Label>
                                <Input {...form.register('trade_name')} placeholder="(Opcional)" className={inputCls} />
                            </div>
                            <div className="space-y-3">
                                <Label className={labelCls}><Activity className="h-3.5 w-3.5 text-primary" /> Actividad Económica (CIIU)</Label>
                                <Input {...form.register('economic_activity')} placeholder="Ej: 4773 - Comercio al por menor" className={inputCls} />
                            </div>
                        </div>
                    </section>

                    {/* ═══ Pod 2: Contacto y Ubicación ═══ */}
                    <section className={podCls}>
                        <div className="flex items-center gap-3">
                            <div className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">02</div>
                            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.25em]">Contacto y Ubicación</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className={labelCls}><Mail className="h-3.5 w-3.5 text-primary" /> Email</Label>
                                <Input type="email" {...form.register('email')} placeholder="correo@empresa.com" className={cn(inputCls, "lowercase")} />
                                {form.formState.errors.email && <p className={errorCls}>{form.formState.errors.email.message}</p>}
                            </div>
                            <div className="space-y-3">
                                <Label className={labelCls}><Phone className="h-3.5 w-3.5 text-primary" /> Teléfono</Label>
                                <Input {...form.register('phone')} placeholder="+57 300 000 0000" className={cn(inputCls, "font-mono tracking-wider")} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                            <div className="space-y-3">
                                <Label className={labelCls}><MapPin className="h-3.5 w-3.5 text-primary" /> Dirección</Label>
                                <Input {...form.register('address')} placeholder="Calle / Carrera / Transversal / Diagonal..." className={inputCls} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                                <Label className={labelCls}><MapPin className="h-3.5 w-3.5 text-primary" /> Ciudad</Label>
                                <Input {...form.register('city')} placeholder="Ej: Bogotá" className={inputCls} />
                            </div>
                            <SelectField icon={MapPin} label="Departamento">
                                <select {...form.register('department')} className={selectCls}>
                                    <option value="">Seleccionar...</option>
                                    {COLOMBIAN_DEPARTMENTS.map(dep => (
                                        <option key={dep} value={dep}>{dep}</option>
                                    ))}
                                </select>
                            </SelectField>
                            <div className="space-y-3">
                                <Label className={labelCls}><Globe className="h-3.5 w-3.5 text-primary" /> País</Label>
                                <Input {...form.register('country')} placeholder="CO" className={inputCls} />
                            </div>
                        </div>
                    </section>

                    {/* ═══ Pod 3: Propiedad y Roles ═══ */}
                    <section className={podCls}>
                        <div className="flex items-center gap-3">
                            <div className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">03</div>
                            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.25em]">Propiedad y Roles</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SelectField icon={Tag} label="Propiedad (Tipo de Tercero)">
                                <select {...form.register('property_type')} className={selectCls}>
                                    {PropertyTypeEnum.options.map(opt => (
                                        <option key={opt} value={opt}>{PROPERTY_TYPE_LABELS[opt]}</option>
                                    ))}
                                </select>
                            </SelectField>

                            <SelectField icon={ShieldCheck} label="Tipo de Contribuyente">
                                <select {...form.register('taxpayer_type')} className={selectCls}>
                                    {TaxpayerTypeEnum.options.map(opt => (
                                        <option key={opt} value={opt}>{TAXPAYER_TYPE_LABELS[opt]}</option>
                                    ))}
                                </select>
                            </SelectField>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6">
                            <Label
                                htmlFor="is_customer"
                                className={cn(
                                    "flex items-center justify-between p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex-1",
                                    form.watch('is_customer')
                                        ? "bg-indigo-50 border-indigo-200 shadow-sm"
                                        : "bg-white border-slate-100 hover:border-slate-200"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                                        form.watch('is_customer') ? "bg-indigo-500 text-white" : "bg-slate-50 text-slate-300"
                                    )}>
                                        <Globe className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-slate-900 block">Cliente</span>
                                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Habilitar ventas</span>
                                    </div>
                                </div>
                                <Checkbox
                                    id="is_customer"
                                    checked={form.watch('is_customer')}
                                    onCheckedChange={(checked) => form.setValue('is_customer', checked === true)}
                                    className="h-6 w-6 rounded-lg data-[state=checked]:bg-indigo-500"
                                />
                            </Label>

                            <Label
                                htmlFor="is_vendor"
                                className={cn(
                                    "flex items-center justify-between p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer flex-1",
                                    form.watch('is_vendor')
                                        ? "bg-emerald-50 border-emerald-200 shadow-sm"
                                        : "bg-white border-slate-100 hover:border-slate-200"
                                )}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
                                        form.watch('is_vendor') ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-300"
                                    )}>
                                        <CreditCard className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-slate-900 block">Proveedor</span>
                                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Habilitar compras</span>
                                    </div>
                                </div>
                                <Checkbox
                                    id="is_vendor"
                                    checked={form.watch('is_vendor')}
                                    onCheckedChange={(checked) => form.setValue('is_vendor', checked === true)}
                                    className="h-6 w-6 rounded-lg data-[state=checked]:bg-emerald-500"
                                />
                            </Label>
                        </div>
                    </section>

                    {/* ═══ Pod 4: Condiciones Comerciales ═══ */}
                    <section className={podCls}>
                        <div className="flex items-center gap-3">
                            <div className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">04</div>
                            <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.25em]">Condiciones Comerciales</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-3">
                                <Label className={labelCls}><CalendarDays className="h-3.5 w-3.5 text-primary" /> Plazo de Pago (días)</Label>
                                <Input
                                    type="number"
                                    {...form.register('payment_term_days')}
                                    placeholder="0"
                                    min={0}
                                    className={cn(inputCls, "font-mono")}
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className={labelCls}><DollarSign className="h-3.5 w-3.5 text-primary" /> Cupo de Crédito ($)</Label>
                                <Input
                                    type="number"
                                    {...form.register('credit_limit')}
                                    placeholder="0"
                                    min={0}
                                    className={cn(inputCls, "font-mono")}
                                />
                            </div>
                            <SelectField icon={Receipt} label="Forma de Pago">
                                <select {...form.register('payment_method')} className={selectCls}>
                                    {PaymentMethodEnum.options.map(opt => (
                                        <option key={opt} value={opt}>{PAYMENT_METHOD_LABELS[opt]}</option>
                                    ))}
                                </select>
                            </SelectField>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SelectField icon={UserCheck} label="Vendedor Asignado">
                                <select {...form.register('salesperson_id')} className={selectCls}>
                                    <option value="">Sin asignar</option>
                                    {salespeople.map(sp => (
                                        <option key={sp.id} value={sp.id}>{sp.full_name} ({sp.email})</option>
                                    ))}
                                </select>
                            </SelectField>

                            <SelectField icon={Landmark} label="Lista de Precios">
                                <select {...form.register('price_list_id')} className={selectCls}>
                                    <option value="">Lista por defecto</option>
                                    {priceLists.map(pl => (
                                        <option key={pl.id} value={pl.id}>{pl.name}</option>
                                    ))}
                                </select>
                            </SelectField>
                        </div>
                    </section>

                    {/* Submit */}
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-20 rounded-[2rem] bg-slate-900 hover:bg-primary text-white font-black shadow-active transition-all active:scale-[0.98] group/submit relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/submit:translate-x-full transition-transform duration-1000" />
                        {isLoading ? (
                            <div className="relative z-10 flex items-center gap-4">
                                <div className="h-6 w-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                <span className="text-lg uppercase tracking-[0.3em]">Procesando...</span>
                            </div>
                        ) : (
                            <div className="relative z-10 flex items-center justify-between w-full px-8">
                                <div className="flex items-center gap-4">
                                    <Zap className="h-6 w-6 text-primary group-hover/submit:rotate-12 transition-transform" />
                                    <span className="text-xl uppercase tracking-[0.15em]">
                                        {initialData ? 'Guardar Cambios' : 'Crear Tercero'}
                                    </span>
                                </div>
                                <CheckCircle2 className="h-6 w-6 opacity-20 group-hover/submit:opacity-100 transition-opacity" />
                            </div>
                        )}
                    </Button>
                </form>

                <footer className="mt-8 text-center">
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em]">
                        Datos auditados bajo estándares DIAN / NIIF
                    </p>
                </footer>
            </div>
        </div>
    )
}
