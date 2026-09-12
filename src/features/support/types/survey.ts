import { z } from 'zod';

/**
 * Encuesta de satisfacción y servicio.
 *
 * Una fila = una persona que responde. Una empresa puede tener varias respuestas
 * (gerente, jefe de compras, veterinario...), cada una con un peso de 1 a 5 según
 * cuánto pesa ese cargo en la decisión. El consolidado de la empresa promedia las
 * respuestas usando ese peso.
 *
 * Este archivo es la FUENTE ÚNICA del cuestionario: la migración, el formulario,
 * el cálculo de puntajes y los reportes salen todos de estas constantes. Agregar
 * una pregunta aquí (más su columna en la BD) la propaga a toda la aplicación.
 */

/** Una opción de respuesta. `score` en escala 1–5 (5 = mejor). */
export interface ScaleOption {
    value: string;
    label: string;
    /** null = no puntúa (p. ej. "No aplica"): se excluye del promedio, no cuenta como mala. */
    score: number | null;
}

export type SurveySectionId = 'SERVICE' | 'ORDERS' | 'PRODUCT' | 'GENERAL';

export interface SurveyQuestion {
    /** Coincide con el nombre de la columna en `satisfaction_surveys`. */
    id: string;
    section: SurveySectionId;
    label: string;
    options: ScaleOption[];
}

export const SURVEY_SECTIONS: { id: SurveySectionId; title: string; description: string }[] = [
    { id: 'SERVICE', title: 'Atención y servicio', description: 'Trato, comunicación y respuesta del equipo.' },
    { id: 'ORDERS', title: 'Pedidos y entregas', description: 'Toma del pedido, cumplimiento y estado de la mercancía.' },
    { id: 'PRODUCT', title: 'Producto y solución de necesidades', description: 'Disponibilidad, calidad y ajuste a lo que necesita el cliente.' },
    { id: 'GENERAL', title: 'Experiencia general', description: 'Satisfacción global, recomendación y oportunidades de mejora.' },
];

// Escalas reutilizadas. Todas van de mejor (5) a peor (1).
const QUALITY_F: ScaleOption[] = [
    { value: 'EXCELENTE', label: 'Excelente', score: 5 },
    { value: 'BUENA', label: 'Buena', score: 4 },
    { value: 'REGULAR', label: 'Regular', score: 3 },
    { value: 'MALA', label: 'Mala', score: 2 },
    { value: 'MUY_MALA', label: 'Muy mala', score: 1 },
];

const QUALITY_M: ScaleOption[] = [
    { value: 'EXCELENTE', label: 'Excelente', score: 5 },
    { value: 'BUENO', label: 'Bueno', score: 4 },
    { value: 'REGULAR', label: 'Regular', score: 3 },
    { value: 'MALO', label: 'Malo', score: 2 },
    { value: 'MUY_MALO', label: 'Muy malo', score: 1 },
];

const NOT_APPLICABLE: ScaleOption = { value: 'NO_APLICA', label: 'No aplica', score: null };

/** Preguntas de escala, en el orden en que se muestran. */
export const SURVEY_QUESTIONS: SurveyQuestion[] = [
    // — Atención y servicio —
    {
        id: 'service_attention',
        section: 'SERVICE',
        label: '¿Cómo califica la atención recibida por parte de GVM?',
        options: QUALITY_F,
    },
    {
        id: 'contact_ease',
        section: 'SERVICE',
        label: '¿Qué tan fácil es comunicarse con nuestro equipo cuando necesita realizar una solicitud?',
        options: [
            { value: 'MUY_FACIL', label: 'Muy fácil', score: 5 },
            { value: 'FACIL', label: 'Fácil', score: 4 },
            { value: 'REGULAR', label: 'Regular', score: 3 },
            { value: 'DIFICIL', label: 'Difícil', score: 2 },
            { value: 'MUY_DIFICIL', label: 'Muy difícil', score: 1 },
        ],
    },
    {
        id: 'response_time',
        section: 'SERVICE',
        label: '¿Cómo califica el tiempo de respuesta de GVM a sus solicitudes?',
        options: QUALITY_M,
    },
    {
        id: 'info_clarity',
        section: 'SERVICE',
        label: '¿Cómo califica la claridad de la información que recibe por parte de GVM?',
        options: QUALITY_F,
    },
    {
        id: 'timely_resolution',
        section: 'SERVICE',
        label: '¿Considera que sus solicitudes son atendidas y solucionadas oportunamente?',
        options: [
            { value: 'SIEMPRE', label: 'Siempre', score: 5 },
            { value: 'CASI_SIEMPRE', label: 'Casi siempre', score: 4 },
            { value: 'ALGUNAS_VECES', label: 'Algunas veces', score: 3 },
            { value: 'RARA_VEZ', label: 'Rara vez', score: 2 },
            { value: 'NUNCA', label: 'Nunca', score: 1 },
        ],
    },

    // — Pedidos y entregas —
    {
        id: 'order_process',
        section: 'ORDERS',
        label: '¿Cómo califica el proceso de toma y gestión de sus pedidos?',
        options: QUALITY_M,
    },
    {
        id: 'delivery_time',
        section: 'ORDERS',
        label: '¿Cómo califica el cumplimiento de los tiempos de entrega acordados?',
        options: [...QUALITY_M, NOT_APPLICABLE],
    },
    {
        id: 'product_condition',
        section: 'ORDERS',
        label: '¿Cómo califica el estado en que recibe los productos?',
        options: [...QUALITY_M, NOT_APPLICABLE],
    },
    {
        id: 'issue_frequency',
        section: 'ORDERS',
        label: '¿Con qué frecuencia ha presentado inconvenientes relacionados con sus pedidos o entregas?',
        // Escala invertida por naturaleza: menos inconvenientes = mejor puntaje.
        options: [
            { value: 'NUNCA', label: 'Nunca', score: 5 },
            { value: 'RARA_VEZ', label: 'Rara vez', score: 4 },
            { value: 'ALGUNAS_VECES', label: 'Algunas veces', score: 3 },
            { value: 'FRECUENTEMENTE', label: 'Frecuentemente', score: 2 },
            { value: 'MUY_FRECUENTEMENTE', label: 'Muy frecuentemente', score: 1 },
        ],
    },

    // — Producto y solución de necesidades —
    {
        id: 'product_availability',
        section: 'PRODUCT',
        label: '¿Cómo califica la disponibilidad de los productos que solicita a GVM?',
        options: QUALITY_F,
    },
    {
        id: 'product_quality',
        section: 'PRODUCT',
        label: '¿Qué tan satisfecho está con la calidad de los productos adquiridos a GVM?',
        options: [
            { value: 'MUY_SATISFECHO', label: 'Muy satisfecho', score: 5 },
            { value: 'SATISFECHO', label: 'Satisfecho', score: 4 },
            { value: 'NEUTRAL', label: 'Neutral', score: 3 },
            { value: 'INSATISFECHO', label: 'Insatisfecho', score: 2 },
            { value: 'MUY_INSATISFECHO', label: 'Muy insatisfecho', score: 1 },
        ],
    },
    {
        id: 'needs_understanding',
        section: 'PRODUCT',
        label: '¿Considera que GVM comprende adecuadamente las necesidades de su empresa?',
        options: [
            { value: 'TOTALMENTE', label: 'Totalmente', score: 5 },
            { value: 'EN_GRAN_MEDIDA', label: 'En gran medida', score: 4 },
            { value: 'PARCIALMENTE', label: 'Parcialmente', score: 3 },
            { value: 'POCO', label: 'Poco', score: 2 },
            { value: 'NADA', label: 'Nada', score: 1 },
        ],
    },

    // — Experiencia general —
    {
        id: 'issue_handling',
        section: 'GENERAL',
        label: 'Cuando ha presentado un inconveniente con GVM, ¿cómo califica la gestión realizada para solucionarlo?',
        options: [
            ...QUALITY_F,
            { value: 'SIN_INCONVENIENTES', label: 'No he presentado inconvenientes', score: null },
        ],
    },
];

/** Antigüedad como cliente. No puntúa: sirve para segmentar los resultados. */
export const TENURE_OPTIONS = [
    { value: 'LT_6M', label: 'Menos de 6 meses' },
    { value: 'M6_12', label: '6 meses a 1 año' },
    { value: 'Y1_3', label: '1 a 3 años' },
    { value: 'GT_3Y', label: 'Más de 3 años' },
] as const;

export const STRENGTH_OPTIONS = [
    { value: 'ATENCION', label: 'Atención del personal' },
    { value: 'TIEMPO_RESPUESTA', label: 'Tiempo de respuesta' },
    { value: 'CALIDAD', label: 'Calidad de los productos' },
    { value: 'DISPONIBILIDAD', label: 'Disponibilidad de productos' },
    { value: 'CUMPLIMIENTO', label: 'Cumplimiento de entregas' },
    { value: 'PRECIO', label: 'Precio' },
    { value: 'ASESORIA', label: 'Asesoría comercial' },
    { value: 'OTRO', label: 'Otro' },
] as const;

export const IMPROVEMENT_OPTIONS = [
    { value: 'ATENCION', label: 'Atención al cliente' },
    { value: 'TIEMPO_RESPUESTA', label: 'Tiempo de respuesta' },
    { value: 'COMUNICACION', label: 'Comunicación' },
    { value: 'DISPONIBILIDAD', label: 'Disponibilidad de productos' },
    { value: 'TIEMPOS_ENTREGA', label: 'Tiempos de entrega' },
    { value: 'PROCESO_PEDIDOS', label: 'Proceso de pedidos' },
    { value: 'FACTURACION', label: 'Facturación' },
    { value: 'POSVENTA', label: 'Servicio posventa' },
    { value: 'OTRO', label: 'Otro' },
] as const;

/**
 * Peso del cargo en la decisión de compra. Es lo que permite que la opinión de un
 * gerente de compras pese más que la de un contacto operativo al consolidar la
 * nota de la empresa.
 */
export const ROLE_WEIGHT_OPTIONS = [
    { value: 5, label: '5 — Decisor principal', hint: 'Gerente, propietario, quien aprueba la compra' },
    { value: 4, label: '4 — Alta influencia', hint: 'Jefe de compras, director técnico' },
    { value: 3, label: '3 — Influencia media', hint: 'Coordinador, veterinario, jefe de planta' },
    { value: 2, label: '2 — Influencia baja', hint: 'Auxiliar, asistente administrativo' },
    { value: 1, label: '1 — Informativo', hint: 'Contacto operativo sin incidencia en la decisión' },
] as const;

/** Ids de las preguntas de escala, por si se necesitan en consultas o exports. */
export const SURVEY_QUESTION_IDS = SURVEY_QUESTIONS.map(q => q.id);

/** Valida que la respuesta sea una de las opciones declaradas para esa pregunta. */
const questionEnum = (q: SurveyQuestion): z.ZodTypeAny => {
    const values = q.options.map(o => o.value);
    return z.string().refine(v => values.includes(v), 'Selecciona una opción válida');
};

/** Cada pregunta de escala es obligatoria: una encuesta a medias no es comparable. */
const scaleAnswers: Record<string, z.ZodTypeAny> = Object.fromEntries(
    SURVEY_QUESTIONS.map(q => [q.id, questionEnum(q)]),
);

export const surveySchema = z.object({
    id: z.string().uuid().optional(),

    party_id: z.string().uuid('Selecciona la empresa/cliente'),
    respondent_name: z.string().trim().min(3, 'Escribe el nombre de quien responde'),
    respondent_role: z.string().trim().min(2, 'Escribe el cargo'),
    role_weight: z.coerce.number().int().min(1).max(5),
    tenure: z.string().refine(v => TENURE_OPTIONS.some(o => o.value === v), 'Selecciona una opción'),
    survey_date: z.string().refine(v => !isNaN(Date.parse(v)), 'Fecha inválida'),

    ...scaleAnswers,

    csat: z.coerce.number().int().min(1, 'Califica de 1 a 10').max(10),
    nps: z.coerce.number().int().min(0, 'Califica de 0 a 10').max(10),

    main_strength: z.string().refine(v => STRENGTH_OPTIONS.some(o => o.value === v), 'Selecciona una opción'),
    main_strength_other: z.string().trim().max(200).nullish(),
    improvement_area: z.string().refine(v => IMPROVEMENT_OPTIONS.some(o => o.value === v), 'Selecciona una opción'),
    improvement_other: z.string().trim().max(200).nullish(),

    recommendation: z.string().trim().max(2000).nullish(),

    created_at: z.string().optional(),
})
    // "Otro" sin texto deja el dato inservible para el informe.
    .refine(d => d.main_strength !== 'OTRO' || !!d.main_strength_other?.trim(), {
        message: 'Describe cuál es la fortaleza',
        path: ['main_strength_other'],
    })
    .refine(d => d.improvement_area !== 'OTRO' || !!d.improvement_other?.trim(), {
        message: 'Describe qué se debe mejorar',
        path: ['improvement_other'],
    });

export type SurveyInput = z.infer<typeof surveySchema>;

/** Fila tal como vuelve de la BD, con los puntajes ya calculados y el cliente. */
export interface SurveyRow extends SurveyInput {
    id: string;
    tenant_id?: string;
    score_service: number | null;
    score_orders: number | null;
    score_product: number | null;
    overall_score: number | null;
    created_by?: string | null;
    created_at: string;
    party?: { legal_name: string; doc_number?: string | null } | null;
    author?: { full_name?: string | null } | null;
}
