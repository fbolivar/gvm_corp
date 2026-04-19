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
import { Checkbox } from "@/shared/components/ui/checkbox"
import { FormLayout, FormSection, FormField } from "@/shared/components/ui/form-layout"
import { PageHeader } from "@/shared/components/ui/page-header"
import { useEffect } from "react"
import {
    User, Building2, Mail, Phone, Save, Briefcase, IdCard,
    Globe, CreditCard, MapPin, Landmark, DollarSign, CalendarDays,
    ShieldCheck, UserCheck, Tag, Receipt, Activity, Users
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { useRouter } from "next/navigation"

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

const selectCls = "w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-slate-900 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all cursor-pointer"

export function PartyForm({ initialData, onSubmit, isLoading, priceLists = [], salespeople = [] }: PartyFormProps) {
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

    const { register, watch, setValue, handleSubmit, formState: { errors } } = form

    const docType = watch('doc_type')
    const nit = watch('nit')
    const docNumber = watch('doc_number')

    useEffect(() => {
        if (docType === 'NIT' && docNumber && docNumber !== nit) {
            setValue('nit', docNumber)
        }
    }, [docNumber, docType, setValue, nit])

    useEffect(() => {
        if (docType === 'NIT' && nit) {
            setValue('dv', calculateDV(nit))
        } else {
            setValue('dv', '')
        }
    }, [nit, docType, setValue])

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

            <form onSubmit={handleSubmit(onSubmit as any)}>
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

                        <FormField
                            label="Razón Social / Nombre"
                            htmlFor="legal_name"
                            required
                            error={errors.legal_name?.message}
                        >
                            <Input
                                id="legal_name"
                                {...register('legal_name')}
                                placeholder="Nombre legal completo"
                            />
                        </FormField>

                        <FormField label="Tipo de Documento" htmlFor="doc_type" required>
                            <div className="relative">
                                <select id="doc_type" {...register('doc_type')} className={selectCls}>
                                    {DocTypeEnum.options.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
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
                                    <div
                                        className="h-10 min-w-[3.5rem] flex items-center justify-center bg-slate-900 text-white rounded-lg font-mono font-bold text-sm px-3 shrink-0"
                                        title="Dígito de Verificación"
                                        aria-label="Dígito de verificación"
                                    >
                                        {watch('dv') || '—'}
                                    </div>
                                )}
                            </div>
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
                                    {TaxpayerTypeEnum.options.map(opt => (
                                        <option key={opt} value={opt}>{TAXPAYER_TYPE_LABELS[opt]}</option>
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
