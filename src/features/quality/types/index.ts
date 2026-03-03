import { z } from 'zod';

export const InspectionStageEnum = z.enum(['INCOMING', 'IN_PROCESS', 'OUTGOING']);
export const InspectionResultEnum = z.enum(['APPROVED', 'REJECTED', 'CONDITIONAL']);
export const NcrSeverityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const NcrStatusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED']);

export const inspectionSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    stage: InspectionStageEnum,
    ref_type: z.string().optional().nullable(),
    ref_id: z.string().uuid().optional().nullable(),
    product_id: z.string().uuid().optional().nullable(),
    lot_number: z.string().optional().nullable(),
    quantity_inspected: z.number().positive(),
    quantity_approved: z.number().min(0),
    quantity_rejected: z.number().min(0),
    result: InspectionResultEnum,
    inspector_id: z.string().uuid().optional().nullable(),
    inspection_date: z.string(),
    notes: z.string().optional().nullable(),
    created_at: z.string().optional(),
    product: z.object({ name: z.string(), sku: z.string() }).optional(),
});

export type Inspection = z.infer<typeof inspectionSchema>;
export type InspectionStage = z.infer<typeof InspectionStageEnum>;
export type InspectionResult = z.infer<typeof InspectionResultEnum>;

export const ncrSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    inspection_id: z.string().uuid().optional().nullable(),
    ncr_number: z.string(),
    description: z.string().min(10),
    severity: NcrSeverityEnum,
    root_cause: z.string().optional().nullable(),
    corrective_action: z.string().optional().nullable(),
    status: NcrStatusEnum.default('OPEN'),
    created_at: z.string().optional(),
    closed_at: z.string().optional().nullable(),
});

export type Ncr = z.infer<typeof ncrSchema>;

export const STAGE_LABELS: Record<string, string> = {
    INCOMING:   'Entrada MP',
    IN_PROCESS: 'En Proceso',
    OUTGOING:   'Salida PT',
};

export const RESULT_LABELS: Record<string, { label: string; className: string }> = {
    APPROVED:    { label: 'Aprobado',    className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
    REJECTED:    { label: 'Rechazado',   className: 'bg-rose-50 text-rose-700 border border-rose-100' },
    CONDITIONAL: { label: 'Condicional', className: 'bg-amber-50 text-amber-700 border border-amber-100' },
};

export const SEVERITY_LABELS: Record<string, { label: string; className: string }> = {
    LOW:      { label: 'Baja',     className: 'bg-slate-50 text-slate-500 border border-slate-100' },
    MEDIUM:   { label: 'Media',    className: 'bg-amber-50 text-amber-700 border border-amber-100' },
    HIGH:     { label: 'Alta',     className: 'bg-orange-50 text-orange-700 border border-orange-100' },
    CRITICAL: { label: 'Crítica',  className: 'bg-rose-50 text-rose-700 border border-rose-100' },
};
