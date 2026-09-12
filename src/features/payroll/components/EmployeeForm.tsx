"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { employeeSchema, Employee, ContractTypeEnum } from "../types"
import { DocTypeEnum } from "@/features/parties/types"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { calculateDV } from "@/shared/utils/nit"
import { useEffect } from "react"
import { Checkbox } from "@/shared/components/ui/checkbox"
import {
    User,
    Briefcase,
    CreditCard,
    Calendar,
    DollarSign,
    ShieldCheck,
    Mail,
    Hash,
    ChevronDown,
    CheckCircle2,
    Building2,
    Sparkles,
    Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { toast } from "sonner"

// Sugerencias (datalist): el campo admite cualquier texto, no limita la captura.
const EPS_OPTIONS = [
    'SURA', 'NUEVA EPS', 'SANITAS', 'SALUD TOTAL', 'COMPENSAR', 'FAMISANAR',
    'COOMEVA', 'MUTUAL SER', 'ALIANSALUD', 'CAPITAL SALUD', 'SAVIA SALUD', 'ASMET SALUD',
]
const ARL_OPTIONS = [
    'POSITIVA', 'SURA', 'COLMENA SEGUROS', 'BOLÍVAR', 'LIBERTY', 'AXA COLPATRIA',
    'EQUIDAD SEGUROS', 'MAPFRE', 'ALFA',
]

interface EmployeeFormProps {
    initialData?: Employee
    onSubmit: (data: Employee) => Promise<void>
    isLoading?: boolean
    linkedUserEmail?: string
}

/**
 * Si la validación falla en un campo que no está en pantalla (por ejemplo un dato
 * del tercero), el formulario se quedaba mudo al pulsar Guardar. Ahora se dice qué
 * campo lo impide.
 */
function reportInvalid(errs: Record<string, unknown>) {
    console.warn('[EmployeeForm] campos inválidos:', errs)
    const campos = Object.entries(errs).flatMap(([k, v]) =>
        v && typeof v === 'object' && !('message' in (v as object))
            ? Object.keys(v as object).map(sub => `${k}.${sub}`)
            : [k])
    toast.error(`No se pudo guardar. Revisa: ${campos.join(', ')}`)
}

export function EmployeeForm({ initialData, onSubmit, isLoading, linkedUserEmail }: EmployeeFormProps) {
    const form = useForm<Employee>({
        resolver: zodResolver(employeeSchema) as any,
        defaultValues: initialData || {
            party: {
                party_type: 'PERSON',
                doc_type: 'CC',
                is_customer: false,
                is_vendor: false,
                legal_name: '',
                doc_number: '',
                email: '',
                phone: ''
            },
            contract_type: 'INDEFINIDO',
            start_date: new Date().toISOString().split('T')[0],
            salary: 0,
            transport_allowance: true,
            risk_level: '1',
            commissions: 0,
            collection_commissions: 0,
            additional_allowances: 0,
            mobility_allowance: 0,
            non_salary_bonus: 0,
            salary_bonus: 0,
            payment_method: 'CASH',
            status: 'ACTIVE'
        }
    })

    const docType = form.watch('party.doc_type')
    const docNumber = form.watch('party.doc_number')

    useEffect(() => {
        if (docType === 'NIT' && docNumber) {
            const dv = calculateDV(docNumber)
            form.setValue('party.dv', dv)
        }
    }, [docNumber, docType, form])

    return (
        <form onSubmit={form.handleSubmit(onSubmit, reportInvalid)} className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20 max-w-5xl mx-auto">

            {linkedUserEmail && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                    <div className="h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-indigo-800">Vinculando cuenta de usuario</p>
                        <p className="text-[10px] text-indigo-600 truncate">{linkedUserEmail} — Tendra acceso a Mi Nomina al completar el registro</p>
                    </div>
                </div>
            )}

            {/* 1. INFORMACIÓN PERSONAL */}
            <Card className="rounded-[2.5rem] border-none bg-white shadow-premium overflow-hidden group">
                <CardHeader className="bg-slate-50/50 border-b border-slate-50 p-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm transition-transform group-hover:scale-110 duration-500">
                                <User className="h-7 w-7" />
                            </div>
                            <div className="space-y-1">
                                <CardTitle className="text-2xl font-black text-slate-900 tracking-tight italic">Información Personal</CardTitle>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Datos básicos e identidad</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50/50 rounded-full">
                            <Sparkles className="h-3 w-3 text-indigo-500 animate-pulse" />
                            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Paso 01</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Nombre Completo</Label>
                            <div className="relative group/field">
                                <User className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Input
                                    {...form.register('party.legal_name')}
                                    placeholder="Ej. Juan Pérez"
                                    className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all placeholder:text-slate-300"
                                />
                            </div>
                            {form.formState.errors.party?.legal_name && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tighter ml-5">{form.formState.errors.party?.legal_name?.message}</p>}
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Correo Electrónico</Label>
                            <div className="relative group/field">
                                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Input
                                    type="email"
                                    {...form.register('party.email')}
                                    placeholder="usuario@empresa.com"
                                    className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all placeholder:text-slate-300"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        <div className="md:col-span-4 space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Identificación</Label>
                            <div className="relative group/field">
                                <select
                                    {...form.register('party.doc_type')}
                                    className="w-full h-14 pl-6 pr-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                                >
                                    {DocTypeEnum.options.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
                            </div>
                        </div>
                        <div className="md:col-span-8 space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Número de Documento</Label>
                            <div className="relative group/field">
                                <Hash className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Input
                                    {...form.register('party.doc_number')}
                                    placeholder="123456789"
                                    className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-black text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all placeholder:text-slate-300 tracking-tight"
                                />
                            </div>
                            {form.formState.errors.party?.doc_number && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tighter ml-5">{form.formState.errors.party?.doc_number?.message}</p>}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. INFORMACIÓN CONTRACTUAL */}
            <Card className="rounded-[2.5rem] border-none bg-white shadow-premium overflow-hidden group">
                <CardHeader className="bg-slate-50/50 border-b border-slate-50 p-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm transition-transform group-hover:scale-110 duration-500">
                                <Briefcase className="h-7 w-7" />
                            </div>
                            <div className="space-y-1">
                                <CardTitle className="text-2xl font-black text-slate-900 tracking-tight italic">Contrato & Salario</CardTitle>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Esquema de remuneración y carga legal</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50/50 rounded-full">
                            <ShieldCheck className="h-3 w-3 text-emerald-500" />
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Paso 02</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Tipo de Contrato</Label>
                            <div className="relative group/field">
                                <select
                                    {...form.register('contract_type')}
                                    className="w-full h-14 pl-6 pr-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                                >
                                    {ContractTypeEnum.options.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Fecha de Ingreso</Label>
                            <div className="relative group/field">
                                <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Input
                                    type="date"
                                    {...form.register('start_date')}
                                    className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
                                />
                            </div>
                            {form.formState.errors.start_date && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tighter ml-5">{form.formState.errors.start_date.message}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Salario Base</Label>
                            <div className="relative group/field">
                                <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                <Input
                                    type="number"
                                    {...form.register('salary', { valueAsNumber: true })}
                                    className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-black text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all text-lg tracking-tighter"
                                />
                            </div>
                            {form.formState.errors.salary && <p className="text-rose-500 text-[10px] font-black uppercase tracking-tighter ml-5">{form.formState.errors.salary.message}</p>}
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Nivel de Riesgo (ARL)</Label>
                            <div className="relative group/field">
                                <select
                                    {...form.register('risk_level')}
                                    className="w-full h-14 pl-6 pr-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                                >
                                    <option value="1">I - Riesgo Mínimo</option>
                                    <option value="2">II - Riesgo Bajo</option>
                                    <option value="3">III - Riesgo Medio</option>
                                    <option value="4">IV - Riesgo Alto</option>
                                    <option value="5">V - Riesgo Máximo</option>
                                </select>
                                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">EPS</Label>
                            <div className="relative group/field">
                                <Input
                                    list="eps-options"
                                    placeholder="Ej: SURA"
                                    {...form.register('eps_name')}
                                    className="h-14 pl-6 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
                                />
                                <datalist id="eps-options">
                                    {EPS_OPTIONS.map(o => <option key={o} value={o} />)}
                                </datalist>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">ARL</Label>
                            <div className="relative group/field">
                                <Input
                                    list="arl-options"
                                    placeholder="Ej: POSITIVA"
                                    {...form.register('arl_name')}
                                    className="h-14 pl-6 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
                                />
                                <datalist id="arl-options">
                                    {ARL_OPTIONS.map(o => <option key={o} value={o} />)}
                                </datalist>
                            </div>
                        </div>

                        <div className="flex items-center pt-8">
                            <div className="flex items-center space-x-4 bg-slate-50 p-5 rounded-2xl border-none w-full shadow-inner">
                                <Checkbox
                                    id="transport_allowance"
                                    onCheckedChange={(checked) => form.setValue('transport_allowance', checked as boolean)}
                                    checked={form.watch('transport_allowance')}
                                    className="border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-6 w-6 rounded-lg transition-colors"
                                />
                                <Label htmlFor="transport_allowance" className="text-sm font-black text-slate-900 italic cursor-pointer selection:bg-none">Habilitar Auxilio de Transporte</Label>
                            </div>
                        </div>
                    </div>

                    {/* ── NOVEDADES DE NÓMINA ─────────────────────────────────── */}
                    <div className="pt-6 border-t border-slate-100 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-1 w-6 bg-emerald-400 rounded-full" />
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                                Novedades de Nómina
                                <span className="text-slate-300 normal-case font-bold ml-2">valores mensuales</span>
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Comisiones de ventas */}
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Comisiones de ventas</Label>
                                <div className="relative group/field">
                                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                    <Input type="number" min="0" step="1" {...form.register('commissions')} className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-black text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all tracking-tighter" />
                                </div>
                            </div>

                            {/* Comisiones de recaudo */}
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Comisiones de recaudo</Label>
                                <div className="relative group/field">
                                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                    <Input type="number" min="0" step="1" {...form.register('collection_commissions')} className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-black text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all tracking-tighter" />
                                </div>
                            </div>

                            {/* Auxilios adicionales */}
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Auxilios adicionales</Label>
                                <div className="relative group/field">
                                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                    <Input type="number" min="0" step="1" {...form.register('additional_allowances')} className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-black text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all tracking-tighter" />
                                </div>
                            </div>

                            {/* Auxilio de rodamiento */}
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Auxilio de rodamiento</Label>
                                <div className="relative group/field">
                                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                    <Input type="number" min="0" step="1" {...form.register('mobility_allowance')} className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-black text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all tracking-tighter" />
                                </div>
                            </div>

                            {/* Bonos salariales */}
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Bonos salariales</Label>
                                <div className="relative group/field">
                                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                    <Input type="number" min="0" step="1" {...form.register('salary_bonus')} className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-black text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all tracking-tighter" />
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold ml-5">Constituye salario (afecta aportes y prestaciones)</p>
                            </div>

                            {/* Bonos NO salariales */}
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Bonos NO salariales</Label>
                                <div className="relative group/field">
                                    <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                    <Input type="number" min="0" step="1" {...form.register('non_salary_bonus')} className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-black text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all tracking-tighter" />
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold ml-5">No constituye salario</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 3. INFORMACIÓN DE PAGO */}
            <Card className="rounded-[2.5rem] border-none bg-white shadow-premium overflow-hidden group">
                <CardHeader className="bg-slate-50/50 border-b border-slate-50 p-10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm transition-transform group-hover:scale-110 duration-500">
                                <CreditCard className="h-7 w-7" />
                            </div>
                            <div className="space-y-1">
                                <CardTitle className="text-2xl font-black text-slate-900 tracking-tight italic">Método de Pago</CardTitle>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dispersión de fondos y datos bancarios</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50/50 rounded-full">
                            <Building2 className="h-3 w-3 text-amber-500" />
                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Paso 03</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Medio de Pago</Label>
                            <div className="relative group/field">
                                <select
                                    {...form.register('payment_method')}
                                    className="w-full h-14 pl-6 pr-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                                >
                                    <option value="CASH">Efectivo / Caja Menor</option>
                                    <option value="BANK_TRANSFER">Transferencia Bancaria (ACH)</option>
                                </select>
                                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
                            </div>
                        </div>

                        {form.watch('payment_method') === 'BANK_TRANSFER' && (
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Entidad Bancaria</Label>
                                <div className="relative group/field">
                                    <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                    <Input
                                        {...form.register('bank_name')}
                                        placeholder="Ej. Bancolombia, Nu, Davivienda..."
                                        className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {form.watch('payment_method') === 'BANK_TRANSFER' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2 duration-500">
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Tipo de Cuenta</Label>
                                <div className="relative group/field">
                                    <select
                                        {...form.register('bank_account_type')}
                                        className="w-full h-14 pl-6 pr-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                                    >
                                        <option value="SAVINGS">Cuenta de Ahorros</option>
                                        <option value="CHECKING">Cuenta Corriente</option>
                                    </select>
                                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-5 block">Número de Cuenta</Label>
                                <div className="relative group/field">
                                    <Hash className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                    <Input
                                        {...form.register('bank_account_number')}
                                        placeholder="000-000000-00"
                                        className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-black text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all font-mono tracking-widest"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex gap-6">
                <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 h-20 rounded-[2rem] bg-slate-900 hover:bg-primary text-white font-black italic tracking-tight text-2xl transition-all shadow-active active:scale-95 group overflow-hidden relative"
                >
                    {isLoading ? (
                        <div className="flex items-center gap-4">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span>SINCRONIZANDO...</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-8 w-8 group-hover:scale-110 transition-transform" />
                            <span>{initialData ? "ACTUALIZAR DATOS" : "VINCULAR COLABORADOR"}</span>
                            <Sparkles className="h-6 w-6 absolute -top-1 right-4 opacity-10 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}
                </Button>
            </div>
        </form>
    )
}


