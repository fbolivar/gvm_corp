import { z } from 'zod';

export const DifficultyEnum = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
export type Difficulty = z.infer<typeof DifficultyEnum>;

export const courseSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    title: z.string().min(3, 'Titulo requerido'),
    description: z.string().optional().nullable(),
    module_key: z.string().optional().nullable(),
    slug: z.string().min(1),
    difficulty: DifficultyEnum.default('BEGINNER'),
    estimated_minutes: z.number().min(1).default(15),
    is_published: z.boolean().default(false),
    sort_order: z.number().default(0),
    created_by: z.string().uuid().optional().nullable(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});

export type Course = z.infer<typeof courseSchema>;

export const lessonSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    course_id: z.string().uuid(),
    title: z.string().min(1, 'Titulo requerido'),
    content: z.string().default(''),
    sort_order: z.number().default(0),
    estimated_minutes: z.number().min(1).default(5),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});

export type Lesson = z.infer<typeof lessonSchema>;

export const progressSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    user_id: z.string().uuid(),
    lesson_id: z.string().uuid(),
    course_id: z.string().uuid(),
    completed_at: z.string().optional(),
});

export type Progress = z.infer<typeof progressSchema>;

export interface CourseWithMeta extends Course {
    lesson_count: number;
    completed_count: number;
}

export interface LessonWithProgress extends Lesson {
    is_completed: boolean;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; className: string }> = {
    BEGINNER:     { label: 'Principiante', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
    INTERMEDIATE: { label: 'Intermedio',   className: 'bg-amber-50 text-amber-700 border border-amber-100' },
    ADVANCED:     { label: 'Avanzado',     className: 'bg-rose-50 text-rose-700 border border-rose-100' },
};

export const MODULE_LABELS: Record<string, string> = {
    dashboard:    'Dashboard',
    analytics:    'Analytics',
    sales:        'Ventas',
    inventory:    'Inventario',
    crm:          'CRM',
    purchasing:   'Compras',
    documents:    'Documentos',
    production:   'Produccion',
    payroll:      'Nomina',
    accounting:   'Contabilidad',
    logistics:    'Logistica',
    settings:     'Configuracion',
};
