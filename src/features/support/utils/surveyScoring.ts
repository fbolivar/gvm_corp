import { SURVEY_QUESTIONS, SurveySectionId } from '../types/survey';

/**
 * Cálculo de puntajes de la encuesta de satisfacción.
 *
 * Todo el cálculo vive aquí, en funciones puras y con tests: es la parte que se
 * rompe en silencio (una opción "No aplica" contada como 1, un promedio que
 * ignora el peso del cargo) y la que sostiene los informes que ve la gerencia.
 *
 * Convenciones:
 * - Las respuestas se guardan como texto (EXCELENTE, REGULAR...) y se traducen a
 *   1–5 mediante el catálogo de preguntas.
 * - Los puntajes que se exponen van en escala 0–100, más legible en tableros:
 *   1 → 0 y 5 → 100.
 * - Una opción sin puntaje ("No aplica", "No he presentado inconvenientes") NO
 *   entra al promedio. No es una mala calificación, es una pregunta que no
 *   corresponde a ese cliente.
 */

/** Respuestas de escala: { service_attention: 'EXCELENTE', ... } */
export type ScaleAnswers = Record<string, unknown>;

export interface SurveyScores {
    /** 0–100 por sección; null si el cliente no respondió ninguna pregunta puntuable. */
    service: number | null;
    orders: number | null;
    product: number | null;
    /** Gestión del comercial, 0–100. */
    commercial: number | null;
    /** 0–100 sobre todas las preguntas de escala contestadas. */
    overall: number | null;
}

/** Convierte una nota 1–5 a la escala 0–100. */
export function toPercent(value1to5: number): number {
    return round2(((value1to5 - 1) / 4) * 100);
}

export function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

/** Nota 1–5 de una respuesta concreta. null si no puntúa o el valor no existe. */
export function questionScore(questionId: string, answer: unknown): number | null {
    const question = SURVEY_QUESTIONS.find(q => q.id === questionId);
    if (!question) return null;
    const option = question.options.find(o => o.value === answer);
    return option?.score ?? null;
}

/** Promedio 0–100 de las preguntas de una sección que sí puntuaron. */
function sectionPercent(answers: ScaleAnswers, section: SurveySectionId): number | null {
    const scores = SURVEY_QUESTIONS
        .filter(q => q.section === section)
        .map(q => questionScore(q.id, answers[q.id]))
        .filter((s): s is number => s !== null);

    if (scores.length === 0) return null;
    return toPercent(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * Puntajes de una respuesta individual. El global promedia TODAS las preguntas
 * de escala contestadas (no el promedio de secciones), para que una sección con
 * más preguntas pese lo que realmente aporta.
 */
export function computeSurveyScores(answers: ScaleAnswers): SurveyScores {
    const all = SURVEY_QUESTIONS
        .map(q => questionScore(q.id, answers[q.id]))
        .filter((s): s is number => s !== null);

    return {
        service: sectionPercent(answers, 'SERVICE'),
        orders: sectionPercent(answers, 'ORDERS'),
        product: sectionPercent(answers, 'PRODUCT'),
        commercial: sectionPercent(answers, 'COMMERCIAL'),
        overall: all.length === 0 ? null : toPercent(all.reduce((a, b) => a + b, 0) / all.length),
    };
}

// ————————————————————————————————————————————————————————————————
// Consolidado por empresa
// ————————————————————————————————————————————————————————————————

export interface WeightedSample {
    /** Peso del cargo, 1–5. */
    role_weight: number;
    value: number | null;
}

/**
 * Promedio ponderado por el peso del cargo. Es el corazón del requisito: en una
 * misma empresa responden varias personas y la del decisor debe pesar más.
 * Devuelve null si ninguna respuesta aporta valor.
 */
export function weightedAverage(samples: WeightedSample[]): number | null {
    let sum = 0;
    let weight = 0;
    for (const s of samples) {
        if (s.value === null || s.value === undefined || Number.isNaN(s.value)) continue;
        const w = clampWeight(s.role_weight);
        sum += s.value * w;
        weight += w;
    }
    if (weight === 0) return null;
    return round2(sum / weight);
}

/** Un peso fuera de 1–5 (dato viejo o manipulado) no debe distorsionar el promedio. */
export function clampWeight(w: unknown): number {
    const n = Number(w);
    if (!Number.isFinite(n)) return 1;
    return Math.min(5, Math.max(1, Math.round(n)));
}

export type NpsCategory = 'PROMOTER' | 'PASSIVE' | 'DETRACTOR';

/** Clasificación estándar de NPS sobre la pregunta de recomendación (0–10). */
export function npsCategory(score: number): NpsCategory {
    if (score >= 9) return 'PROMOTER';
    if (score >= 7) return 'PASSIVE';
    return 'DETRACTOR';
}

/**
 * NPS ponderado: % promotores − % detractores, contando cada respuesta según el
 * peso del cargo. Rango −100 a 100.
 */
export function computeNps(samples: WeightedSample[]): number | null {
    let promoters = 0;
    let detractors = 0;
    let weight = 0;
    for (const s of samples) {
        if (s.value === null || s.value === undefined || Number.isNaN(s.value)) continue;
        const w = clampWeight(s.role_weight);
        const cat = npsCategory(s.value);
        if (cat === 'PROMOTER') promoters += w;
        if (cat === 'DETRACTOR') detractors += w;
        weight += w;
    }
    if (weight === 0) return null;
    return Math.round(((promoters - detractors) / weight) * 100);
}

export interface CompanySummaryInput {
    role_weight: number;
    overall_score: number | null;
    score_service: number | null;
    score_orders: number | null;
    score_product: number | null;
    score_commercial: number | null;
    csat: number | null;
    nps: number | null;
}

export interface CompanySummary {
    responses: number;
    /** Suma de pesos: indica cuánto respaldo decisorio tiene el resultado. */
    totalWeight: number;
    overall: number | null;
    service: number | null;
    orders: number | null;
    product: number | null;
    commercial: number | null;
    /** CSAT ponderado en su escala original 1–10. */
    csat: number | null;
    nps: number | null;
    promoters: number;
    passives: number;
    detractors: number;
}

/** Consolida todas las respuestas de una empresa en una sola lectura. */
export function summarizeCompany(rows: CompanySummaryInput[]): CompanySummary {
    const pick = (key: keyof CompanySummaryInput): WeightedSample[] =>
        rows.map(r => ({ role_weight: r.role_weight, value: r[key] as number | null }));

    let promoters = 0, passives = 0, detractors = 0;
    for (const r of rows) {
        if (r.nps === null || r.nps === undefined) continue;
        const cat = npsCategory(r.nps);
        if (cat === 'PROMOTER') promoters++;
        else if (cat === 'PASSIVE') passives++;
        else detractors++;
    }

    return {
        responses: rows.length,
        totalWeight: rows.reduce((acc, r) => acc + clampWeight(r.role_weight), 0),
        overall: weightedAverage(pick('overall_score')),
        service: weightedAverage(pick('score_service')),
        orders: weightedAverage(pick('score_orders')),
        product: weightedAverage(pick('score_product')),
        commercial: weightedAverage(pick('score_commercial')),
        csat: weightedAverage(pick('csat')),
        nps: computeNps(pick('nps')),
        promoters,
        passives,
        detractors,
    };
}

/** Etiqueta y color de un puntaje 0–100, para tableros y PDF. */
export function scoreLabel(score: number | null): { label: string; tone: 'good' | 'ok' | 'warn' | 'bad' | 'none' } {
    if (score === null) return { label: 'Sin datos', tone: 'none' };
    if (score >= 85) return { label: 'Excelente', tone: 'good' };
    if (score >= 70) return { label: 'Bueno', tone: 'ok' };
    if (score >= 50) return { label: 'Por mejorar', tone: 'warn' };
    return { label: 'Crítico', tone: 'bad' };
}
