"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Building2, UserRound, Star, ClipboardList } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Textarea } from "@/shared/components/ui/textarea"
import { SearchableSelect } from "@/shared/components/ui/searchable-select"
import { cn } from "@/shared/lib/utils"

import {
    surveySchema,
    SurveyInput,
    SURVEY_SECTIONS,
    SURVEY_QUESTIONS,
    TENURE_OPTIONS,
    STRENGTH_OPTIONS,
    IMPROVEMENT_OPTIONS,
    ROLE_WEIGHT_OPTIONS,
} from "../types/survey"
import { createSurveyAction } from "../surveyActions"

interface Props {
    parties: Array<{ id: string; legal_name: string; doc_number?: string | null }>
    /** Equipo comercial a evaluar (nombre del asesor que atiende la cuenta). */
    salespeople?: Array<{ id: string; name: string; role?: string | null }>
    /** Cliente preseleccionado, al encuestar a otra persona de la misma empresa. */
    defaultPartyId?: string
}

/** Opciones de una pregunta como botones: una encuesta se llena más rápido así que con un desplegable. */
function OptionGroup({
    options,
    value,
    onChange,
    invalid,
}: {
    options: { value: string; label: string; score: number | null }[]
    value?: string
    onChange: (v: string) => void
    invalid?: boolean
}) {
    return (
        <div className={cn("flex flex-wrap gap-2", invalid && "rounded-xl ring-1 ring-rose-200 p-1.5")}>
            {options.map(opt => {
                const selected = value === opt.value
                const neutral = opt.score === null
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        aria-pressed={selected}
                        className={cn(
                            "h-11 px-4 rounded-xl border text-xs font-semibold transition-all",
                            selected
                                ? neutral
                                    ? "bg-slate-600 border-slate-600 text-white shadow-sm"
                                    : "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50",
                        )}
                    >
                        {opt.label}
                    </button>
                )
            })}
        </div>
    )
}

/** Escala numérica (CSAT 1–10, NPS 0–10). */
function NumberScale({
    from,
    to,
    value,
    onChange,
    lowLabel,
    highLabel,
}: {
    from: number
    to: number
    value?: number
    onChange: (v: number) => void
    lowLabel: string
    highLabel: string
}) {
    const numbers = useMemo(
        () => Array.from({ length: to - from + 1 }, (_, i) => from + i),
        [from, to],
    )
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {numbers.map(n => (
                    <button
                        key={n}
                        type="button"
                        onClick={() => onChange(n)}
                        aria-pressed={value === n}
                        className={cn(
                            "h-11 w-11 rounded-xl border text-sm font-bold tabular-nums transition-all",
                            value === n
                                ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50",
                        )}
                    >
                        {n}
                    </button>
                ))}
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 font-medium max-w-md">
                <span>{lowLabel}</span>
                <span>{highLabel}</span>
            </div>
        </div>
    )
}

function SectionCard({
    title,
    description,
    icon: Icon,
    children,
}: {
    title: string
    description?: string
    icon: typeof Star
    children: React.ReactNode
}) {
    return (
        <section className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <header className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                    <h2 className="text-sm font-bold text-slate-900">{title}</h2>
                    {description && <p className="text-xs text-slate-500">{description}</p>}
                </div>
            </header>
            <div className="p-6 space-y-7">{children}</div>
        </section>
    )
}

export function SurveyForm({ parties, salespeople = [], defaultPartyId }: Props) {
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)
    // El ref corta el segundo clic aunque llegue antes del re-render, igual que en
    // el formulario de documentos: una encuesta duplicada distorsiona el promedio
    // de la empresa.
    const submittingRef = useRef(false)

    const {
        register,
        handleSubmit,
        control,
        watch,
        formState: { errors },
    } = useForm<SurveyInput>({
        resolver: zodResolver(surveySchema) as never,
        defaultValues: {
            party_id: defaultPartyId ?? '',
            role_weight: 3,
            survey_date: new Date().toISOString().split('T')[0],
        } as Partial<SurveyInput> as SurveyInput,
    })

    const partyItems = useMemo(
        () => parties.map(p => ({
            value: p.id,
            label: p.legal_name,
            subLabel: p.doc_number ?? undefined,
            keywords: `${p.legal_name} ${p.doc_number ?? ''}`,
        })),
        [parties],
    )

    const strength = watch('main_strength')
    const improvement = watch('improvement_area')

    const salespersonItems = useMemo(
        () => salespeople.map(s => ({
            value: s.id,
            label: s.name,
            subLabel: s.role ?? undefined,
            keywords: `${s.name} ${s.role ?? ''}`,
        })),
        [salespeople],
    )

    const onSubmit = async (data: SurveyInput) => {
        if (submittingRef.current) return
        submittingRef.current = true
        setSubmitting(true)
        try {
            const result = await createSurveyAction(data)
            if (result.error) {
                toast.error(result.error)
                return
            }
            toast.success('Encuesta registrada', {
                description: 'Ya está incluida en el consolidado de la empresa.',
            })
            router.push('/support/surveys')
        } finally {
            submittingRef.current = false
            setSubmitting(false)
        }
    }

    const onInvalid = () => {
        toast.error('Faltan respuestas', {
            description: 'Todas las preguntas de calificación son obligatorias. Revisa las marcadas en rojo.',
        })
    }

    const err = (name: string) => (errors as Record<string, { message?: string } | undefined>)[name]

    return (
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="max-w-4xl mx-auto space-y-6">
            {/* — Datos básicos — */}
            <SectionCard title="Datos básicos" description="Empresa, persona que responde y su peso en la decisión." icon={Building2}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Empresa / cliente</label>
                        <Controller
                            control={control}
                            name="party_id"
                            render={({ field }) => (
                                <SearchableSelect
                                    items={partyItems}
                                    value={field.value ?? ''}
                                    onChange={v => field.onChange(v || '')}
                                    placeholder="Busca por nombre o NIT..."
                                    error={!!errors.party_id}
                                />
                            )}
                        />
                        {errors.party_id && <p className="text-xs text-rose-500 font-medium">{errors.party_id.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Persona que responde</label>
                        <Input {...register('respondent_name')} placeholder="Nombre y apellido"
                            className="h-11 rounded-xl border-slate-200 bg-slate-50/50 text-sm" />
                        {errors.respondent_name && <p className="text-xs text-rose-500 font-medium">{errors.respondent_name.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cargo</label>
                        <Input {...register('respondent_role')} placeholder="Ej: Jefe de compras"
                            className="h-11 rounded-xl border-slate-200 bg-slate-50/50 text-sm" />
                        {errors.respondent_role && <p className="text-xs text-rose-500 font-medium">{errors.respondent_role.message}</p>}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Peso del cargo en la decisión
                        </label>
                        <p className="text-xs text-slate-500">
                            Define cuánto pesa esta respuesta en la nota de la empresa. En una misma empresa pueden responder
                            varias personas: la del decisor principal debe pesar más que la de un contacto operativo.
                        </p>
                        <Controller
                            control={control}
                            name="role_weight"
                            render={({ field }) => (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {ROLE_WEIGHT_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => field.onChange(opt.value)}
                                            aria-pressed={Number(field.value) === opt.value}
                                            className={cn(
                                                "text-left p-3 rounded-xl border transition-all",
                                                Number(field.value) === opt.value
                                                    ? "bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200"
                                                    : "bg-white border-slate-200 hover:border-indigo-200",
                                            )}
                                        >
                                            <span className="block text-xs font-bold text-slate-800">{opt.label}</span>
                                            <span className="block text-[11px] text-slate-500 mt-0.5">{opt.hint}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            ¿Desde hace cuánto tiempo es cliente de GVM?
                        </label>
                        <Controller
                            control={control}
                            name="tenure"
                            render={({ field }) => (
                                <OptionGroup
                                    options={TENURE_OPTIONS.map(o => ({ ...o, score: null }))}
                                    value={field.value}
                                    onChange={field.onChange}
                                    invalid={!!errors.tenure}
                                />
                            )}
                        />
                        {errors.tenure && <p className="text-xs text-rose-500 font-medium">Selecciona una opción</p>}
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fecha de la encuesta</label>
                        <Input type="date" {...register('survey_date')}
                            className="h-11 rounded-xl border-slate-200 bg-slate-50/50 text-sm" />
                        {errors.survey_date && <p className="text-xs text-rose-500 font-medium">{errors.survey_date.message}</p>}
                    </div>
                </div>
            </SectionCard>

            {/* — Secciones de preguntas de escala — */}
            {SURVEY_SECTIONS.filter(s => s.id !== 'GENERAL').map(section => (
                <SectionCard key={section.id} title={section.title} description={section.description} icon={ClipboardList}>
                    {/* En la sección del comercial, primero se elige el asesor a evaluar. */}
                    {section.id === 'COMMERCIAL' && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                Comercial que atiende la cuenta
                            </label>
                            <Controller
                                control={control}
                                name="salesperson_id"
                                render={({ field }) => (
                                    <SearchableSelect
                                        items={salespersonItems}
                                        value={field.value ?? ''}
                                        onChange={v => field.onChange(v || '')}
                                        placeholder={salespersonItems.length ? 'Busca al comercial...' : 'No hay comerciales disponibles'}
                                        error={!!err('salesperson_id')}
                                    />
                                )}
                            />
                            {err('salesperson_id') && <p className="text-xs text-rose-500 font-medium">{err('salesperson_id')?.message}</p>}
                        </div>
                    )}
                    {SURVEY_QUESTIONS.filter(q => q.section === section.id).map(q => (
                        <div key={q.id} className="space-y-3">
                            <p className="text-sm font-semibold text-slate-800">{q.label}</p>
                            <Controller
                                control={control}
                                name={q.id as keyof SurveyInput as never}
                                render={({ field }) => (
                                    <OptionGroup
                                        options={q.options}
                                        value={field.value as string | undefined}
                                        onChange={field.onChange}
                                        invalid={!!err(q.id)}
                                    />
                                )}
                            />
                            {err(q.id) && <p className="text-xs text-rose-500 font-medium">Selecciona una opción</p>}
                        </div>
                    ))}
                </SectionCard>
            ))}

            {/* — Experiencia general — */}
            <SectionCard title="Experiencia general" description="Satisfacción global, recomendación y oportunidades de mejora." icon={Star}>
                <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-800">
                        En una escala de 1 a 10, ¿qué tan satisfecho está actualmente con el servicio de GVM?
                    </p>
                    <Controller
                        control={control}
                        name="csat"
                        render={({ field }) => (
                            <NumberScale from={1} to={10} value={field.value as number | undefined} onChange={field.onChange}
                                lowLabel="1 · Nada satisfecho" highLabel="10 · Totalmente satisfecho" />
                        )}
                    />
                    {errors.csat && <p className="text-xs text-rose-500 font-medium">Selecciona una calificación</p>}
                </div>

                <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-800">
                        En una escala de 0 a 10, ¿qué tan probable es que recomiende GVM a otra empresa?
                    </p>
                    <Controller
                        control={control}
                        name="nps"
                        render={({ field }) => (
                            <NumberScale from={0} to={10} value={field.value as number | undefined} onChange={field.onChange}
                                lowLabel="0 · Nada probable" highLabel="10 · Muy probable" />
                        )}
                    />
                    {errors.nps && <p className="text-xs text-rose-500 font-medium">Selecciona una calificación</p>}
                </div>

                <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-800">¿Cuál considera que es la principal fortaleza del servicio de GVM?</p>
                    <Controller
                        control={control}
                        name="main_strength"
                        render={({ field }) => (
                            <OptionGroup options={STRENGTH_OPTIONS.map(o => ({ ...o, score: null }))}
                                value={field.value} onChange={field.onChange} invalid={!!errors.main_strength} />
                        )}
                    />
                    {strength === 'OTRO' && (
                        <Input {...register('main_strength_other')} placeholder="¿Cuál?"
                            className="h-11 rounded-xl border-slate-200 bg-slate-50/50 text-sm max-w-md" />
                    )}
                    {errors.main_strength_other && <p className="text-xs text-rose-500 font-medium">{errors.main_strength_other.message}</p>}
                    {errors.main_strength && <p className="text-xs text-rose-500 font-medium">Selecciona una opción</p>}
                </div>

                <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-800">¿Cuál considera que es el principal aspecto que GVM debería mejorar?</p>
                    <Controller
                        control={control}
                        name="improvement_area"
                        render={({ field }) => (
                            <OptionGroup options={IMPROVEMENT_OPTIONS.map(o => ({ ...o, score: null }))}
                                value={field.value} onChange={field.onChange} invalid={!!errors.improvement_area} />
                        )}
                    />
                    {improvement === 'OTRO' && (
                        <Input {...register('improvement_other')} placeholder="¿Cuál?"
                            className="h-11 rounded-xl border-slate-200 bg-slate-50/50 text-sm max-w-md" />
                    )}
                    {errors.improvement_other && <p className="text-xs text-rose-500 font-medium">{errors.improvement_other.message}</p>}
                    {errors.improvement_area && <p className="text-xs text-rose-500 font-medium">Selecciona una opción</p>}
                </div>

                {SURVEY_QUESTIONS.filter(q => q.section === 'GENERAL').map(q => (
                    <div key={q.id} className="space-y-3">
                        <p className="text-sm font-semibold text-slate-800">{q.label}</p>
                        <Controller
                            control={control}
                            name={q.id as keyof SurveyInput as never}
                            render={({ field }) => (
                                <OptionGroup options={q.options} value={field.value as string | undefined}
                                    onChange={field.onChange} invalid={!!err(q.id)} />
                            )}
                        />
                        {err(q.id) && <p className="text-xs text-rose-500 font-medium">Selecciona una opción</p>}
                    </div>
                ))}

                <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-800">
                        ¿Qué recomendación nos daría para mejorar nuestro servicio?
                    </label>
                    <Textarea {...register('recommendation')} placeholder="Respuesta abierta (opcional)"
                        className="min-h-[120px] rounded-xl border-slate-200 bg-slate-50/50 text-sm" />
                </div>
            </SectionCard>

            <div className="flex flex-wrap items-center justify-end gap-3 pb-10">
                <Button type="button" variant="outline" onClick={() => router.back()}
                    className="h-11 px-4 rounded-xl text-xs font-semibold" disabled={submitting}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={submitting}
                    className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold gap-2">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />}
                    {submitting ? 'Guardando...' : 'Registrar encuesta'}
                </Button>
            </div>
        </form>
    )
}
