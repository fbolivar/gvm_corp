import { z } from 'zod';

export const TrainingCategoryEnum = z.enum(['SAFETY', 'TECHNICAL', 'QUALITY', 'MANAGEMENT', 'COMPLIANCE', 'INDUCTION']);
export const TrainingStatusEnum = z.enum(['SCHEDULED', 'COMPLETED', 'FAILED', 'CANCELLED']);

export const trainingProgramSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    code: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    category: TrainingCategoryEnum,
    duration_hours: z.number().positive(),
    is_mandatory: z.boolean().default(false),
    created_at: z.string().optional(),
});

export type TrainingProgram = z.infer<typeof trainingProgramSchema>;

export const trainingRecordSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    employee_id: z.string().uuid(),
    program_id: z.string().uuid(),
    scheduled_date: z.string(),
    completion_date: z.string().optional().nullable(),
    score: z.number().min(0).max(100).optional().nullable(),
    status: TrainingStatusEnum.default('SCHEDULED'),
    certificate_number: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    created_at: z.string().optional(),
    program: trainingProgramSchema.optional(),
    employee: z.object({ id: z.string(), party: z.object({ legal_name: z.string() }).optional() }).optional(),
});

export type TrainingRecord = z.infer<typeof trainingRecordSchema>;

export const CATEGORY_CONFIG: Record<string, { label: string; className: string }> = {
    SAFETY:     { label: 'Seguridad',    className: 'bg-rose-50 text-rose-700 border border-rose-100' },
    TECHNICAL:  { label: 'Técnico',      className: 'bg-indigo-50 text-indigo-700 border border-indigo-100' },
    QUALITY:    { label: 'Calidad',      className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
    MANAGEMENT: { label: 'Gestión',      className: 'bg-purple-50 text-purple-700 border border-purple-100' },
    COMPLIANCE: { label: 'Cumplimiento', className: 'bg-amber-50 text-amber-700 border border-amber-100' },
    INDUCTION:  { label: 'Inducción',    className: 'bg-slate-50 text-slate-600 border border-slate-100' },
};

export const TRAINING_STATUS: Record<string, { label: string; className: string }> = {
    SCHEDULED:  { label: 'Programada',  className: 'bg-blue-50 text-blue-700 border border-blue-100' },
    COMPLETED:  { label: 'Completada',  className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
    FAILED:     { label: 'No Aprobada', className: 'bg-rose-50 text-rose-700 border border-rose-100' },
    CANCELLED:  { label: 'Cancelada',   className: 'bg-slate-50 text-slate-400 border border-slate-100' },
};
