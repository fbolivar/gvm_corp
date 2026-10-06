import { z } from 'zod';

/**
 * Encuesta a proveedores: el ESPEJO de la encuesta de satisfacción de clientes
 * (`src/features/support/types/survey.ts`) — aquí es el proveedor quien
 * califica a GVM como comprador, no al revés.
 *
 * Misma arquitectura: una fila = una persona que responde por el proveedor,
 * ponderada por `role_weight` (1–5) al consolidar por empresa. Este archivo es
 * la FUENTE ÚNICA del cuestionario: migración, formulario, cálculo de puntajes
 * y reportes salen de estas constantes.
 */

export interface ScaleOption {
    value: string;
    label: string;
    /** null = no puntúa (p. ej. "No aplica"): se excluye del promedio. */
    score: number | null;
}

export type VendorSurveySectionId = 'RELATIONSHIP' | 'ORDERS_PAYMENTS' | 'COMMERCIAL' | 'GENERAL';

export interface VendorSurveyQuestion {
    /** Coincide con el nombre de la columna en `vendor_satisfaction_surveys`. */
    id: string;
    section: VendorSurveySectionId;
    label: string;
    options: ScaleOption[];
}

export const VENDOR_SURVEY_SECTIONS: { id: VendorSurveySectionId; title: string; description: string }[] = [
    { id: 'RELATIONSHIP', title: 'Relación comercial y comunicación', description: 'Trato, comunicación y respuesta del equipo de compras de GVM.' },
    { id: 'ORDERS_PAYMENTS', title: 'Pedidos y pagos', description: 'Órdenes de compra, recepción de mercancía y cumplimiento de pagos.' },
    { id: 'COMMERCIAL', title: 'Condiciones comerciales', description: 'Precio, volumen de compra y comprensión de sus capacidades.' },
    { id: 'GENERAL', title: 'Experiencia general', description: 'Satisfacción global, recomendación y oportunidades de mejora.' },
];

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
export const VENDOR_SURVEY_QUESTIONS: VendorSurveyQuestion[] = [
    // — Relación comercial y comunicación —
    {
        id: 'buying_team_attention',
        section: 'RELATIONSHIP',
        label: '¿Cómo califica la atención recibida por parte del equipo de compras de GVM?',
        options: QUALITY_F,
    },
    {
        id: 'contact_ease',
        section: 'RELATIONSHIP',
        label: '¿Qué tan fácil es comunicarse con GVM cuando necesita gestionar un pedido o resolver una inquietud?',
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
        section: 'RELATIONSHIP',
        label: '¿Cómo califica el tiempo de respuesta de GVM a sus solicitudes o cotizaciones?',
        options: QUALITY_M,
    },
    {
        id: 'po_clarity',
        section: 'RELATIONSHIP',
        label: '¿Cómo califica la claridad de las órdenes de compra y la información que recibe de GVM?',
        options: QUALITY_F,
    },
    {
        id: 'timely_resolution',
        section: 'RELATIONSHIP',
        label: '¿Considera que sus solicitudes son atendidas y resueltas oportunamente?',
        options: [
            { value: 'SIEMPRE', label: 'Siempre', score: 5 },
            { value: 'CASI_SIEMPRE', label: 'Casi siempre', score: 4 },
            { value: 'ALGUNAS_VECES', label: 'Algunas veces', score: 3 },
            { value: 'RARA_VEZ', label: 'Rara vez', score: 2 },
            { value: 'NUNCA', label: 'Nunca', score: 1 },
        ],
    },

    // — Pedidos y pagos —
    {
        id: 'order_process',
        section: 'ORDERS_PAYMENTS',
        label: '¿Cómo califica el proceso de generación y gestión de las órdenes de compra por parte de GVM?',
        options: QUALITY_M,
    },
    {
        id: 'payment_timeliness',
        section: 'ORDERS_PAYMENTS',
        label: '¿Cómo califica el cumplimiento de GVM con los tiempos de pago acordados?',
        options: [...QUALITY_M, NOT_APPLICABLE],
    },
    {
        id: 'receiving_compliance',
        section: 'ORDERS_PAYMENTS',
        label: '¿Cómo califica el cumplimiento de las cantidades y condiciones pactadas al recibir la mercancía?',
        options: [...QUALITY_M, NOT_APPLICABLE],
    },
    {
        id: 'issue_frequency',
        section: 'ORDERS_PAYMENTS',
        label: '¿Con qué frecuencia ha presentado inconvenientes relacionados con sus pedidos o pagos con GVM?',
        // Escala invertida: menos inconvenientes = mejor puntaje.
        options: [
            { value: 'NUNCA', label: 'Nunca', score: 5 },
            { value: 'RARA_VEZ', label: 'Rara vez', score: 4 },
            { value: 'ALGUNAS_VECES', label: 'Algunas veces', score: 3 },
            { value: 'FRECUENTEMENTE', label: 'Frecuentemente', score: 2 },
            { value: 'MUY_FRECUENTEMENTE', label: 'Muy frecuentemente', score: 1 },
        ],
    },

    // — Condiciones comerciales —
    {
        id: 'price_competitiveness',
        section: 'COMMERCIAL',
        label: '¿Cómo califica la competitividad de los precios y condiciones que maneja GVM frente a otros clientes del sector?',
        options: QUALITY_F,
    },
    {
        id: 'purchase_volume_satisfaction',
        section: 'COMMERCIAL',
        label: '¿Qué tan satisfecho está con el volumen y la frecuencia de compra de GVM?',
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
        section: 'COMMERCIAL',
        label: '¿Considera que GVM comprende adecuadamente sus capacidades de producción y entrega?',
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

/** Antigüedad como proveedor. No puntúa: sirve para segmentar los resultados. */
export const VENDOR_TENURE_OPTIONS = [
    { value: 'LT_6M', label: 'Menos de 6 meses' },
    { value: 'M6_12', label: '6 meses a 1 año' },
    { value: 'Y1_3', label: '1 a 3 años' },
    { value: 'GT_3Y', label: 'Más de 3 años' },
] as const;

export const VENDOR_STRENGTH_OPTIONS = [
    { value: 'ATENCION', label: 'Atención del equipo de compras' },
    { value: 'TIEMPO_PAGO', label: 'Tiempo de pago' },
    { value: 'CLARIDAD_OC', label: 'Claridad de las órdenes de compra' },
    { value: 'VOLUMEN', label: 'Volumen o frecuencia de compra' },
    { value: 'CUMPLIMIENTO', label: 'Cumplimiento de condiciones pactadas' },
    { value: 'COMUNICACION', label: 'Comunicación' },
    { value: 'PRECIO', label: 'Precio' },
    { value: 'OTRO', label: 'Otro' },
] as const;

export const VENDOR_IMPROVEMENT_OPTIONS = [
    { value: 'TIEMPO_PAGO', label: 'Tiempo de pago' },
    { value: 'COMUNICACION', label: 'Comunicación' },
    { value: 'CLARIDAD_OC', label: 'Claridad de las órdenes de compra' },
    { value: 'RECEPCION', label: 'Proceso de recepción o devoluciones' },
    { value: 'CONDICIONES', label: 'Condiciones comerciales' },
    { value: 'ATENCION', label: 'Atención del equipo de compras' },
    { value: 'OTRO', label: 'Otro' },
] as const;

/**
 * Peso del cargo en la decisión comercial del proveedor. Permite que la opinión
 * de un gerente/propietario pese más que la de un contacto operativo al
 * consolidar la nota de la empresa.
 */
export const VENDOR_ROLE_WEIGHT_OPTIONS = [
    { value: 5, label: '5 — Decisor principal', hint: 'Gerente, propietario, quien aprueba la relación comercial' },
    { value: 4, label: '4 — Alta influencia', hint: 'Jefe/director comercial o de ventas' },
    { value: 3, label: '3 — Influencia media', hint: 'Coordinador comercial, ejecutivo de cuenta' },
    { value: 2, label: '2 — Influencia baja', hint: 'Asesor, auxiliar administrativo' },
    { value: 1, label: '1 — Informativo', hint: 'Contacto operativo sin incidencia en la decisión' },
] as const;

/** Ids de las preguntas de escala, por si se necesitan en consultas o exports. */
export const VENDOR_SURVEY_QUESTION_IDS = VENDOR_SURVEY_QUESTIONS.map(q => q.id);

const questionEnum = (q: VendorSurveyQuestion): z.ZodTypeAny => {
    const values = q.options.map(o => o.value);
    return z.string().refine(v => values.includes(v), 'Selecciona una opción válida');
};

const scaleAnswers: Record<string, z.ZodTypeAny> = Object.fromEntries(
    VENDOR_SURVEY_QUESTIONS.map(q => [q.id, questionEnum(q)]),
);

export const vendorSurveySchema = z.object({
    id: z.string().uuid().optional(),

    party_id: z.string().uuid('Selecciona el proveedor'),
    respondent_name: z.string().trim().min(3, 'Escribe el nombre de quien responde'),
    respondent_role: z.string().trim().min(2, 'Escribe el cargo'),
    role_weight: z.coerce.number().int().min(1).max(5),
    tenure: z.string().refine(v => VENDOR_TENURE_OPTIONS.some(o => o.value === v), 'Selecciona una opción'),
    survey_date: z.string().refine(v => !isNaN(Date.parse(v)), 'Fecha inválida'),

    ...scaleAnswers,

    csat: z.coerce.number().int().min(1, 'Califica de 1 a 10').max(10),
    nps: z.coerce.number().int().min(0, 'Califica de 0 a 10').max(10),

    main_strength: z.string().refine(v => VENDOR_STRENGTH_OPTIONS.some(o => o.value === v), 'Selecciona una opción'),
    main_strength_other: z.string().trim().max(200).nullish(),
    improvement_area: z.string().refine(v => VENDOR_IMPROVEMENT_OPTIONS.some(o => o.value === v), 'Selecciona una opción'),
    improvement_other: z.string().trim().max(200).nullish(),

    recommendation: z.string().trim().max(2000).nullish(),

    created_at: z.string().optional(),
})
    .refine(d => d.main_strength !== 'OTRO' || !!d.main_strength_other?.trim(), {
        message: 'Describe cuál es la fortaleza',
        path: ['main_strength_other'],
    })
    .refine(d => d.improvement_area !== 'OTRO' || !!d.improvement_other?.trim(), {
        message: 'Describe qué se debe mejorar',
        path: ['improvement_other'],
    });

export type VendorSurveyInput = z.infer<typeof vendorSurveySchema>;

/** Fila tal como vuelve de la BD, con los puntajes ya calculados y el proveedor. */
export interface VendorSurveyRow extends VendorSurveyInput {
    id: string;
    tenant_id?: string;
    score_relationship: number | null;
    score_orders_payments: number | null;
    score_commercial: number | null;
    overall_score: number | null;
    created_by?: string | null;
    created_at: string;
    party?: { legal_name: string; doc_number?: string | null } | null;
    author?: { full_name?: string | null } | null;
}
