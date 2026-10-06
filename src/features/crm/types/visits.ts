import { z } from 'zod';

/**
 * Planeador de visitas comerciales — catálogos y esquemas.
 *
 * Los catálogos replican la hoja LISTAS del Excel "PLANEADOR VISITAS GVM.xlsx"
 * para que los comerciales encuentren las mismas opciones que ya usaban.
 * Se guardan como códigos (CHECK en la tabla `crm_visits`); las etiquetas en
 * español se resuelven aquí, en un único lugar.
 */

export const MANAGEMENT_TYPES = {
    REACTIVACION: 'Reactivación',
    RECUPERACION: 'Recuperación',
    FIDELIZACION: 'Fidelización',
    DESARROLLO: 'Desarrollo',
    CONSOLIDACION: 'Consolidación',
    PROSPECCION: 'Prospección',
    COBRANZA: 'Cobranza / cartera',
    CAPACITACION_TECNICA: 'Capacitación técnica',
    INTERNA: 'Actividad interna',
} as const;
export type ManagementType = keyof typeof MANAGEMENT_TYPES;

export const MEETING_TYPES = {
    OFICINA: 'Presencial en oficina',
    GRANJA: 'Presencial en granja',
    VIRTUAL: 'Virtual',
} as const;
export type MeetingType = keyof typeof MEETING_TYPES;

export const VISIT_STATUSES = {
    PENDIENTE: 'Pendiente',
    AGENDADA: 'Agendada',
    REALIZADA: 'Realizada',
    REPROGRAMADA: 'Reprogramada',
    NO_REALIZADA: 'No realizada',
} as const;
export type VisitStatus = keyof typeof VISIT_STATUSES;

export const VISIT_RESULTS = {
    CUENTA_RECUPERADA: 'Cuenta recuperada',
    PEDIDO_CERRADO: 'Nuevo pedido cerrado',
    EN_PROCESO: 'En proceso',
    SIN_AVANCE: 'Sin avance',
    CUENTA_PERDIDA: 'Cuenta perdida',
} as const;
export type VisitResult = keyof typeof VISIT_RESULTS;

export const PRIORITY_LABELS: Record<1 | 2 | 3, string> = {
    1: 'Prioridad 1 — crítica',
    2: 'Prioridad 2 — media',
    3: 'Prioridad 3 — baja',
};

const keys = <T extends Record<string, string>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

/** Fecha date-only 'YYYY-MM-DD' (Bogotá). */
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida');

/** Alta / edición de la planeación. */
export const visitPlanSchema = z.object({
    salesperson_id: z.string().uuid('Elige el comercial'),
    is_internal: z.boolean().default(false),
    party_id: z.string().uuid().nullable().optional(),
    title: z.string().trim().max(160).nullable().optional(),
    priority: z.coerce.number().int().min(1).max(3).default(2),
    management_type: z.enum(keys(MANAGEMENT_TYPES)),
    objective: z.string().trim().min(3, 'Escribe el objetivo de la visita').max(600),
    meeting_type: z.enum(keys(MEETING_TYPES)),
    planned_date: dateOnly,
    status: z.enum(keys(VISIT_STATUSES)).default('PENDIENTE'),
}).superRefine((v, ctx) => {
    if (v.is_internal && !v.title) {
        ctx.addIssue({ code: 'custom', path: ['title'], message: 'Escribe el nombre de la actividad' });
    }
    if (!v.is_internal && !v.party_id) {
        ctx.addIssue({ code: 'custom', path: ['party_id'], message: 'Elige el cliente' });
    }
});
export type VisitPlanInput = z.input<typeof visitPlanSchema>;

/** Registro del resultado (cierre o reprogramación). */
export const visitOutcomeSchema = z.object({
    status: z.enum(keys(VISIT_STATUSES)),
    done_date: dateOnly.nullable().optional(),
    planned_date: dateOnly.nullable().optional(),   // solo al reprogramar
    conclusions: z.string().trim().max(2000).nullable().optional(),
    commitments: z.string().trim().max(2000).nullable().optional(),
    next_followup_date: dateOnly.nullable().optional(),
    result: z.enum(keys(VISIT_RESULTS)).nullable().optional(),
}).superRefine((v, ctx) => {
    if (v.status === 'REALIZADA') {
        if (!v.done_date) ctx.addIssue({ code: 'custom', path: ['done_date'], message: 'Indica la fecha en que se realizó' });
        if (!v.conclusions) ctx.addIssue({ code: 'custom', path: ['conclusions'], message: 'Escribe las conclusiones' });
        if (!v.result) ctx.addIssue({ code: 'custom', path: ['result'], message: 'Elige el resultado' });
    }
    if (v.status === 'REPROGRAMADA' && !v.planned_date) {
        ctx.addIssue({ code: 'custom', path: ['planned_date'], message: 'Indica la nueva fecha' });
    }
});
export type VisitOutcomeInput = z.input<typeof visitOutcomeSchema>;

export interface CrmVisit {
    id: string;
    tenant_id: string;
    salesperson_id: string;
    party_id: string | null;
    is_internal: boolean;
    title: string | null;
    priority: 1 | 2 | 3;
    management_type: ManagementType;
    objective: string;
    meeting_type: MeetingType;
    planned_date: string;
    status: VisitStatus;
    done_date: string | null;
    conclusions: string | null;
    commitments: string | null;
    next_followup_date: string | null;
    result: VisitResult | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    /** Embeds */
    salesperson_name: string;
    party_name: string | null;
    party_city: string | null;
    party_phone: string | null;
    party_email: string | null;
    party_contact: string | null;
}

/** Ficha comercial calculada en vivo a partir de los pedidos reales. */
export interface PartyCommercialSnapshot {
    party_id: string;
    /** Ventas del año en curso (pedidos facturados) y mismo período del año anterior. */
    sales_ytd: number;
    sales_prev_ytd: number;
    /** Variación % YTD vs. año anterior; null si no hay base de comparación. */
    var_ytd_pct: number | null;
    /** Ventas del mes en curso y del mismo mes del año anterior. */
    sales_month: number;
    sales_prev_month: number;
    var_month_pct: number | null;
    last_purchase_date: string | null;
    orders_count_ytd: number;
    top_product: string | null;
    /** Producto cuya venta más cayó frente al año anterior. */
    biggest_drop_product: string | null;
    account_status: AccountStatus;
}

export const ACCOUNT_STATUSES = {
    ACTIVO_CRECIMIENTO: 'Activo en crecimiento',
    ACTIVO_CAIDA: 'Activo en caída',
    SIN_COMPRA_MES: 'Sin compra este mes',
    INACTIVO_ANIO: 'Inactivo este año',
    INACTIVO_LARGO: 'Inactivo hace más de 1 año',
    SIN_HISTORIAL: 'Sin historial de compras',
} as const;
export type AccountStatus = keyof typeof ACCOUNT_STATUSES;
