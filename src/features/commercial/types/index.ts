import { z } from 'zod'

export type CommercialStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'LIQUIDATED'

export type CommercialItemType =
    | 'VUELO' | 'HOSPEDAJE' | 'TRANSPORTE' | 'EVENTO' | 'VIATICOS' | 'OTRO'

export const ITEM_TYPES: { value: CommercialItemType; label: string }[] = [
    { value: 'VUELO', label: 'Vuelo / Viaje' },
    { value: 'HOSPEDAJE', label: 'Hospedaje' },
    { value: 'TRANSPORTE', label: 'Transporte' },
    { value: 'EVENTO', label: 'Evento' },
    { value: 'VIATICOS', label: 'Viáticos' },
    { value: 'OTRO', label: 'Otro' },
]

export const ITEM_TYPE_LABELS: Record<string, string> = Object.fromEntries(
    ITEM_TYPES.map((t) => [t.value, t.label]),
)

export const STATUS_META: Record<CommercialStatus, { label: string; cls: string }> = {
    DRAFT: { label: 'Borrador', cls: 'bg-slate-100 text-slate-600' },
    SUBMITTED: { label: 'Pendiente aprobación', cls: 'bg-amber-50 text-amber-600' },
    APPROVED: { label: 'Aprobada', cls: 'bg-emerald-50 text-emerald-600' },
    REJECTED: { label: 'Rechazada', cls: 'bg-rose-50 text-rose-600' },
    LIQUIDATED: { label: 'Liquidada', cls: 'bg-indigo-50 text-indigo-600' },
}

// ─── Schemas ────────────────────────────────────────────────────────────────

export const commercialItemSchema = z.object({
    id: z.string().uuid().optional(),
    type: z.enum(['VUELO', 'HOSPEDAJE', 'TRANSPORTE', 'EVENTO', 'VIATICOS', 'OTRO']),
    description: z.string().min(1, 'Describe el concepto'),
    schedule: z.string().optional().nullable(),
    quantity: z.coerce.number().min(0.01, 'Cantidad inválida').default(1),
    unit_cost: z.coerce.number().min(0, 'Costo inválido').default(0),
    notes: z.string().optional().nullable(),
})

/** Tipos de concepto con horario (vuelos/transporte). */
export const SCHEDULED_ITEM_TYPES: CommercialItemType[] = ['VUELO', 'TRANSPORTE']

export const commercialRequestSchema = z.object({
    title: z.string().min(3, 'El título es obligatorio'),
    purpose: z.string().optional().nullable(),
    destination: z.string().optional().nullable(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    party_id: z.preprocess((v) => (v === '' ? null : v), z.string().uuid().nullable().optional()),
    opportunity_id: z.preprocess((v) => (v === '' ? null : v), z.string().uuid().nullable().optional()),
    items: z.array(commercialItemSchema).min(1, 'Agrega al menos un concepto'),
})

export type CommercialItemInput = z.infer<typeof commercialItemSchema>
export type CommercialRequestInput = z.infer<typeof commercialRequestSchema>

// ─── Row types ──────────────────────────────────────────────────────────────

export interface CommercialRequestRow {
    id: string
    number: string | null
    title: string
    purpose: string | null
    destination: string | null
    start_date: string | null
    end_date: string | null
    currency: string
    status: CommercialStatus
    total_estimated: number
    total_actual: number | null
    requester_id: string
    approver_id: string | null
    party_id: string | null
    opportunity_id: string | null
    attachments: { name: string; url: string; kind?: string }[]
    decision_notes: string | null
    submitted_at: string | null
    decided_at: string | null
    liquidated_at: string | null
    created_at: string
    requester?: { full_name: string | null; email: string | null } | null
    approver?: { full_name: string | null; email: string | null } | null
    party?: { legal_name: string | null } | null
}

export interface CommercialItemRow {
    id: string
    request_id: string
    type: CommercialItemType
    description: string | null
    schedule: string | null
    quantity: number
    unit_cost: number
    subtotal: number
    actual_cost: number | null
    notes: string | null
}

export interface CommercialEventRow {
    id: string
    action: string
    from_status: string | null
    to_status: string | null
    notes: string | null
    created_at: string
    actor?: { full_name: string | null } | null
}
