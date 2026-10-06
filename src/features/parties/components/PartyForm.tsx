"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
    partySchema, Party, DocTypeEnum, PartyTypeEnum,
    PropertyTypeEnum, TAXPAYER_TYPE_CODES, PaymentMethodEnum,
    PROPERTY_TYPE_LABELS, TAXPAYER_TYPE_LABELS, PAYMENT_METHOD_LABELS,
    PARTY_EXTRA_PROPERTIES, DOC_TYPE_LABELS
} from "../types"
import { calculateDV } from "@/shared/utils/nit"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { FormLayout, FormSection, FormField } from "@/shared/components/ui/form-layout"
import { PageHeader } from "@/shared/components/ui/page-header"
import { useEffect, useState } from "react"
import {
    User, Building2, Mail, Phone, Save, Briefcase, IdCard,
    Globe, CreditCard, MapPin, Landmark, DollarSign, CalendarDays,
    ShieldCheck, UserCheck, Tag, Receipt, Activity, Users
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"

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
    employeeId?: string | null
}

const COLOMBIAN_DEPARTMENTS = [
    'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá',
    'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba',
    'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena',
    'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
    'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca',
    'Vaupés', 'Vichada', 'Bogotá D.C.'
]

const selectCls = "w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-slate-900 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all cursor-pointer"

/** Nombres legibles de los campos, para que el aviso no muestre jerga técnica. */
const FIELD_LABELS: Record<string, string> = {
    legal_name: 'Nombre o razón social',
    doc_number: 'Número de documento',
    doc_type: 'Tipo de documento',
    dv: 'Dígito de verificación',
    email: 'Correo electrónico',
    party_type: 'Tipo de tercero',
    taxpayer_type: 'Tipo de contribuyente',
    property_type: 'Propiedad (tipo de tercero)',
    payment_method: 'Forma de pago',
    payment_term_days: 'Plazo de pago',
    credit_limit: 'Cupo de crédito',
}

/** Si el formulario no valida, decir QUÉ campo falla en vez de no hacer nada. */
function reportInvalid(errs: Record<string, unknown>) {
    console.warn('[PartyForm] campos inválidos:', errs)
    const campos = Object.keys(errs).map(k => FIELD_LABELS[k] ?? k)
    toast.error(`No se pudo guardar. Revisa: ${campos.join(', ')}`)
}

export function PartyForm({ initialData, onSubmit, isLoading, priceLists = [], salespeople = [], employeeId = null }: PartyFormProps) {
    const router = useRouter()

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
            contact_name: '',
            address: '',
            city: '',
            department: '',
            country: 'CO',
            payment_term_days: 0,
            credit_limit: 0,
            property_type: 'CLIENTE',
            properties: [],
            taxpayer_type: 'REGIMEN_SIMPLE',
            payment_method: 'TRANSFERENCIA',
            economic_activity: '',
            salesperson_id: null,
            price_list_id: null,
        }
    })

    const { register, watch, setValue, handleSubmit, formState: { errors } } = form

    const docType = watch('doc_type')
    const nit = watch('nit')
    const docNumber = watch('doc_number')
    const partyType = watch('party_type')

    // Nombres separados (persona natural)
    const firstName = watch('first_name')
    const secondName = watch('second_name')
    const firstSurname = watch('first_surname')
    const secondSurname = watch('second_surname')

    // El DV se calcula solo, PERO el usuario manda: si lo escribe (o lo pega junto
    // al número), se respeta su valor y el cálculo automático deja de pisarlo.
    // Vaciar la casilla vuelve al modo automático.
    // Al editar, un DV guardado que no coincide con la fórmula ya es "manual":
    // no debe pisarse al abrir la ficha.
    const [dvManual, setDvManual] = useState(() => {
        const saved = initialData?.dv
        if (!saved) return false
        return saved !== calculateDV(initialData?.nit || initialData?.doc_number || '')
    })
    const dv = watch('dv')

    // Si el número viene con el DV pegado (ej. "70190497-5"), lo separa.
    useEffect(() => {
        if (docNumber && docNumber.includes('-')) {
            const idx = docNumber.lastIndexOf('-')
            const num = docNumber.slice(0, idx).trim()
            const ver = docNumber.slice(idx + 1).trim()
            setValue('doc_number', num)
            if (ver) {
                setValue('dv', ver.slice(0, 1))
                setDvManual(true)
            }
        }
    }, [docNumber, docType, setValue])

    useEffect(() => {
        if (docType === 'NIT' && docNumber && docNumber !== nit) {
            setValue('nit', docNumber)
        }
    }, [docNumber, docType, setValue, nit])

    useEffect(() => {
        if (dvManual) return
        if (docType === 'NIT' && nit) {
            setValue('dv', calculateDV(nit))
        } else if (docType === 'NIT') {
            setValue('dv', '')
        }
    }, [nit, docType, dvManual, setValue])

    // DV que sugiere la fórmula DIAN — sirve para avisar si el escrito no coincide.
    const suggestedDv = docType === 'NIT' && nit ? calculateDV(nit) : ''
    const dvMismatch = Boolean(dvManual && dv && suggestedDv && dv !== suggestedDv)

    // Para persona natural: compone el nombre completo desde las partes
    // (solo si hay al menos una parte, para no borrar el nombre de registros migrados).
    useEffect(() => {
        if (partyType !== 'PERSON') return
        const parts = [firstName, secondName, firstSurname, secondSurname]
            .map(x => (x || '').trim()).filter(Boolean)
        if (parts.length) setValue('legal_name', parts.join(' '))
    }, [partyType, firstName, secondName, firstSurname, secondSurname, setValue])

    // Descompone el nombre completo en partes (heurística; el usuario puede corregir).
    const separarNombre = () => {
        const t = (watch('legal_name') || '').trim().split(/\s+/).filter(Boolean)
        let fn = '', sn = '', fs = '', ss = ''
        if (t.length === 1) { fn = t[0] }
        else if (t.length === 2) { fn = t[0]; fs = t[1] }
        else if (t.length === 3) { fn = t[0]; fs = t[1]; ss = t[2] }
        else { fn = t[0]; sn = t[1]; fs = t[2]; ss = t.slice(3).join(' ') }
        setValue('first_name', fn); setValue('second_name', sn)
        setValue('first_surname', fs); setValue('second_surname', ss)
    }

    // Propiedades/roles adicionales (multi-selección)
    const properties = watch('properties') || []
    const toggleProperty = (v: string) => {
        const set = new Set(properties)
        set.has(v) ? set.delete(v) : set.add(v)
        setValue('properties', Array.from(set))
    }

    // Opciones del tipo de contribuyente: el catálogo actual más el código que
    // tenga el tercero, por si es uno heredado de la migración.
    const currentTaxpayer = watch('taxpayer_type')
    const taxpayerOptions = [...TAXPAYER_TYPE_CODES] as string[]
    if (currentTaxpayer && !taxpayerOptions.includes(currentTaxpayer)) taxpayerOptions.unshift(currentTaxpayer)

    const isEditing = Boolean(initialData)

    return (
        <div className="page-container">
            <PageHeader
                title={isEditing ? 'Editar Tercero' : 'Nuevo Tercero'}
                description="Ficha completa de cliente / proveedor registrado bajo estándares DIAN / NIIF"
                icon={isEditing ? Save : User}
                eyebrow="Terceros"
                breadcrumbs={[
                    { label: 'Inicio', href: '/' },
                    { label: 'Terceros', href: '/parties' },
                    { label: isEditing ? 'Editar' : 'Nuevo' },
                ]}
            />

            <form onSubmit={handleSubmit(onSubmit as any, reportInvalid)}>
                <FormLayout
                    footer={
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push('/parties')}
                                disabled={isLoading}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading
                                    ? 'Procesando...'
                                    : isEditing ? 'Guardar Cambios' : 'Crear Tercero'
                                }
                            </Button>
                        </>
                    }
                >
                    {/* ── Sección 1: Identidad Legal ── */}
                    <FormSection
                        title="Identidad Legal"
                        description="Datos de identificación legal del tercero"
                        columns={2}
                    >
                        <FormField label="Naturaleza Jurídica" htmlFor="party_type" required>
                            <div className="relative">
                                <select id="party_type" {...register('party_type')} className={selectCls}>
                                    {PartyTypeEnum.options.map(opt => (
                                        <option key={opt} value={opt}>
                                            {opt === 'PERSON' ? 'Persona Natural' : 'Persona Jurídica'}
                                        </option>
                                    ))}
                                </select>
                                <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                        </FormField>

                        {partyType === 'PERSON' ? (
                            <FormField
                                label="Nombres y Apellidos"
                                htmlFor="first_name"
                                required
                                colSpan={2}
                                error={errors.legal_name?.message}
                                hint="Se guardan separados para Información Exógena"
                            >
                                {/* legal_name se compone solo desde las partes */}
                                <input type="hidden" {...register('legal_name')} />
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                    <Input {...register('first_name')} placeholder="Primer nombre" />
                                    <Input {...register('second_name')} placeholder="Segundo nombre" />
                                    <Input {...register('first_surname')} placeholder="Primer apellido" />
                                    <Input {...register('second_surname')} placeholder="Segundo apellido" />
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
                                    <p className="text-xs text-slate-500">
                                        Nombre completo: <b className="text-slate-700">{watch('legal_name') || '—'}</b>
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={separarNombre}
                                        className="h-8 px-3 text-xs"
                                        title="Separar el nombre completo en las cuatro partes"
                                    >
                                        Separar del nombre
                                    </Button>
                                </div>
                            </FormField>
                        ) : (
                            <FormField
                                label="Razón Social"
                                htmlFor="legal_name"
                                required
                                error={errors.legal_name?.message}
                            >
                                <Input
                                    id="legal_name"
                                    {...register('legal_name')}
                                    placeholder="Razón social de la empresa"
                                />
                            </FormField>
                        )}

                        <FormField label="Tipo de Documento" htmlFor="doc_type" required>
                            <div className="relative">
                                <select id="doc_type" {...register('doc_type')} className={selectCls}>
                                    {DocTypeEnum.options.map(opt => (
                                        <option key={opt} value={opt}>{DOC_TYPE_LABELS[opt] ?? opt}</option>
                                    ))}
                                </select>
                                <IdCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                        </FormField>

                        <FormField
                            label="Número de Documento"
                            htmlFor="doc_number"
                            required
                            error={errors.doc_number?.message}
                        >
                            <div className="flex gap-2">
                                <Input
                                    id="doc_number"
                                    {...register('doc_number')}
                                    placeholder="000.000.000"
                                    className="font-mono tracking-widest flex-1"
                                />
                                {docType === 'NIT' && (
                                    <Input
                                        id="dv"
                                        value={dv ?? ''}
                                        onChange={(e) => {
                                            // Solo un dígito. Vacío = volver al cálculo automático.
                                            const digit = e.target.value.replace(/\D/g, '').slice(-1)
                                            setValue('dv', digit)
                                            setDvManual(digit !== '')
                                        }}
                                        inputMode="numeric"
                                        maxLength={1}
                                        placeholder="DV"
                                        title="Dígito de verificación — se calcula solo, pero puedes escribirlo"
                                        aria-label="Dígito de verificación"
                                        className="h-10 w-14 text-center font-mono font-bold text-sm shrink-0"
                                    />
                                )}
                            </div>
                            {docType === 'NIT' && dvMismatch && (
                                <p className="text-[11px] font-medium text-amber-600 mt-1.5">
                                    DV manual — la fórmula DIAN sugiere <span className="font-bold">{suggestedDv}</span>.
                                    Borra la casilla para recalcularlo.
                                </p>
                            )}
                        </FormField>

                        <FormField label="Nombre Comercial" htmlFor="trade_name" hint="Opcional">
                            <Input
                                id="trade_name"
                                {...register('trade_name')}
                                placeholder="Nombre con el que opera (opcional)"
                            />
                        </FormField>

                        <FormField
                            label="Actividad Económica (CIIU)"
                            htmlFor="economic_activity"
                            hint="Código y descripción de la actividad principal"
                        >
                            <div className="relative">
                                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <Input
                                    id="economic_activity"
                                    {...register('economic_activity')}
                                    placeholder="Ej: 4773 - Comercio al por menor"
                                    className="pl-9"
                                />
                            </div>
                        </FormField>
                    </FormSection>

                    {/* ── Sección 2: Contacto y Ubicación ── */}
                    <FormSection
                        title="Contacto y Ubicación"
                        description="Información de contacto y dirección principal"
                        columns={2}
                    >
                        <FormField
                            label="Email"
                            htmlFor="email"
                            error={errors.email?.message}
                        >
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <Input
                                    id="email"
                                    type="email"
                                    {...register('email')}
                                    placeholder="correo@empresa.com"
                                    className="pl-9 lowercase"
                                />
                            </div>
                        </FormField>

                        <FormField label="Teléfono" htmlFor="phone">
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <Input
                                    id="phone"
                                    {...register('phone')}
                                    placeholder="+57 300 000 0000"
                                    className="pl-9 font-mono tracking-wider"
                                />
                            </div>
                        </FormField>

                        <FormField label="Persona de contacto" htmlFor="contact_name" colSpan={2}>
                            <div className="relative">
                                <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <Input
                                    id="contact_name"
                                    {...register('contact_name')}
                                    placeholder="Ej: Julián Pérez — administrador de la granja"
                                    className="pl-9"
                                />
                            </div>
                        </FormField>

                        <FormField label="Dirección" htmlFor="address" colSpan={2}>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <Input
                                    id="address"
                                    {...register('address')}
                                    placeholder="Calle / Carrera / Transversal / Diagonal..."
                                    className="pl-9"
                                />
                            </div>
                        </FormField>

                        <FormField label="Ciudad" htmlFor="city">
                            <Input
                                id="city"
                                {...register('city')}
                                placeholder="Ej: Bogotá"
                            />
                        </FormField>

                        <FormField label="Departamento" htmlFor="department">
                            <div className="relative">
                                <select id="department" {...register('department')} className={selectCls}>
                                    <option value="">Seleccionar...</option>
                                    {COLOMBIAN_DEPARTMENTS.map(dep => (
                                        <option key={dep} value={dep}>{dep}</option>
                                    ))}
                                </select>
                                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                        </FormField>

                        <FormField label="País" htmlFor="country" hint="Código ISO 3166-1 alpha-2">
                            <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <Input
                                    id="country"
                                    {...register('country')}
                                    placeholder="CO"
                                    className="pl-9"
                                />
                            </div>
                        </FormField>
                    </FormSection>

                    {/* ── Sección 3: Propiedad y Roles ── */}
                    <FormSection
                        title="Propiedad y Roles Comerciales"
                        description="Tipo de contribuyente y roles que puede cumplir este tercero"
                        columns={2}
                    >
                        {employeeId && (
                            <FormField label="Vínculo con Nómina" colSpan={2}>
                                <Link
                                    href={`/payroll/employees/${employeeId}`}
                                    className="flex items-center justify-between p-4 rounded-xl border-2 border-teal-200 bg-teal-50 hover:bg-teal-100 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-teal-500 text-white flex items-center justify-center">
                                            <UserCheck className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-semibold text-teal-900 block">También es Empleado</span>
                                            <span className="text-xs text-teal-600">Este tercero está vinculado a la nómina · abrir su ficha</span>
                                        </div>
                                    </div>
                                    <span className="text-teal-600 text-xs font-bold uppercase tracking-widest">Ver →</span>
                                </Link>
                            </FormField>
                        )}

                        <FormField label="Propiedad (Tipo de Tercero)" htmlFor="property_type" required>
                            <div className="relative">
                                <select id="property_type" {...register('property_type')} className={selectCls}>
                                    {PropertyTypeEnum.options.map(opt => (
                                        <option key={opt} value={opt}>{PROPERTY_TYPE_LABELS[opt]}</option>
                                    ))}
                                </select>
                                <Tag className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                        </FormField>

                        <FormField label="Tipo de Contribuyente" htmlFor="taxpayer_type" required>
                            <div className="relative">
                                <select id="taxpayer_type" {...register('taxpayer_type')} className={selectCls}>
                                    {/* Si el tercero trae un código heredado que ya no está en el
                                        catálogo, se muestra igual para no cambiarlo sin querer. */}
                                    {taxpayerOptions.map(opt => (
                                        <option key={opt} value={opt}>{TAXPAYER_TYPE_LABELS[opt] ?? opt}</option>
                                    ))}
                                </select>
                                <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                        </FormField>

                        <FormField
                            label="Cliente"
                            htmlFor="is_customer"
                            hint="Habilita módulo de ventas para este tercero"
                            colSpan={1}
                        >
                            <label
                                htmlFor="is_customer"
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer",
                                    watch('is_customer')
                                        ? "bg-indigo-50 border-indigo-300"
                                        : "bg-white border-slate-200 hover:border-slate-300"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-9 w-9 rounded-lg flex items-center justify-center transition-all",
                                        watch('is_customer') ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-400"
                                    )}>
                                        <Globe className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-semibold text-slate-900 block">Habilitar como Cliente</span>
                                        <span className="text-xs text-slate-500">Permite crear facturas de venta</span>
                                    </div>
                                </div>
                                <Checkbox
                                    id="is_customer"
                                    checked={watch('is_customer')}
                                    onCheckedChange={(checked) => setValue('is_customer', checked === true)}
                                    className="h-5 w-5 rounded data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                                    aria-label="Habilitar como cliente"
                                />
                            </label>
                        </FormField>

                        <FormField
                            label="Proveedor"
                            htmlFor="is_vendor"
                            hint="Habilita módulo de compras para este tercero"
                            colSpan={1}
                        >
                            <label
                                htmlFor="is_vendor"
                                className={cn(
                                    "flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer",
                                    watch('is_vendor')
                                        ? "bg-emerald-50 border-emerald-300"
                                        : "bg-white border-slate-200 hover:border-slate-300"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-9 w-9 rounded-lg flex items-center justify-center transition-all",
                                        watch('is_vendor') ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"
                                    )}>
                                        <CreditCard className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-semibold text-slate-900 block">Habilitar como Proveedor</span>
                                        <span className="text-xs text-slate-500">Permite crear órdenes de compra</span>
                                    </div>
                                </div>
                                <Checkbox
                                    id="is_vendor"
                                    checked={watch('is_vendor')}
                                    onCheckedChange={(checked) => setValue('is_vendor', checked === true)}
                                    className="h-5 w-5 rounded data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                    aria-label="Habilitar como proveedor"
                                />
                            </label>
                        </FormField>

                        <FormField
                            label="Otras Propiedades"
                            hint="Selecciona todas las que apliquen (además de Cliente/Proveedor/Empleado)"
                            colSpan={2}
                        >
                            <div className="flex flex-wrap gap-2">
                                {PARTY_EXTRA_PROPERTIES.map((p) => {
                                    const active = properties.includes(p.value)
                                    return (
                                        <button
                                            key={p.value}
                                            type="button"
                                            onClick={() => toggleProperty(p.value)}
                                            aria-pressed={active}
                                            className={cn(
                                                "px-3.5 h-9 rounded-xl border-2 text-xs font-semibold transition-all",
                                                active
                                                    ? "bg-slate-900 border-slate-900 text-white"
                                                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                            )}
                                        >
                                            {p.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </FormField>
                    </FormSection>

                    {/* ── Sección 4: Condiciones Comerciales ── */}
                    <FormSection
                        title="Condiciones Comerciales"
                        description="Términos de pago, crédito y asignaciones comerciales"
                        columns={3}
                    >
                        <FormField label="Plazo de Pago (días)" htmlFor="payment_term_days">
                            <div className="relative">
                                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <Input
                                    id="payment_term_days"
                                    type="number"
                                    {...register('payment_term_days', { valueAsNumber: true })}
                                    placeholder="0"
                                    min={0}
                                    className="pl-9 font-mono"
                                />
                            </div>
                        </FormField>

                        <FormField label="Cupo de Crédito ($)" htmlFor="credit_limit">
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <Input
                                    id="credit_limit"
                                    type="number"
                                    {...register('credit_limit', { valueAsNumber: true })}
                                    placeholder="0"
                                    min={0}
                                    className="pl-9 font-mono"
                                />
                            </div>
                        </FormField>

                        <FormField label="Forma de Pago" htmlFor="payment_method" required>
                            <div className="relative">
                                <select id="payment_method" {...register('payment_method')} className={selectCls}>
                                    {PaymentMethodEnum.options.map(opt => (
                                        <option key={opt} value={opt}>{PAYMENT_METHOD_LABELS[opt]}</option>
                                    ))}
                                </select>
                                <Receipt className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                        </FormField>

                        <FormField
                            label="Vendedor Asignado"
                            htmlFor="salesperson_id"
                            hint="Opcional — responsable de la cuenta"
                            colSpan={2}
                        >
                            <div className="relative">
                                <select id="salesperson_id" {...register('salesperson_id')} className={selectCls}>
                                    <option value="">Sin asignar</option>
                                    {salespeople.map(sp => (
                                        <option key={sp.id} value={sp.id}>
                                            {sp.full_name} ({sp.email})
                                        </option>
                                    ))}
                                </select>
                                <UserCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                        </FormField>

                        <FormField
                            label="Lista de Precios"
                            htmlFor="price_list_id"
                            hint="Opcional — usa lista por defecto si no se selecciona"
                        >
                            <div className="relative">
                                <select id="price_list_id" {...register('price_list_id')} className={selectCls}>
                                    <option value="">Lista por defecto</option>
                                    {priceLists.map(pl => (
                                        <option key={pl.id} value={pl.id}>{pl.name}</option>
                                    ))}
                                </select>
                                <Landmark className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>
                        </FormField>
                    </FormSection>
                </FormLayout>
            </form>
        </div>
    )
}
