import { VENDOR_SURVEY_QUESTIONS, VendorSurveySectionId } from '../types/vendorSurvey';

/**
 * Cálculo de puntajes de la encuesta a proveedores — mismo algoritmo que
 * `support/utils/surveyScoring.ts` (encuesta de clientes), duplicado aquí (no
 * importado) porque el cuestionario y las secciones son distintos y no vale la
 * pena acoplar ambos módulos por ~80 líneas de funciones genéricas.
 *
 * Convenciones:
 * - Las respuestas se guardan como texto (EXCELENTE, REGULAR...) y se traducen a
 *   1–5 mediante el catálogo de preguntas.
 * - Los puntajes se exponen en escala 0–100: 1 → 0 y 5 → 100.
 * - Una opción sin puntaje ("No aplica") NO entra al promedio.
 */

export type ScaleAnswers = Record<string, unknown>;

export interface VendorSurveyScores {
    /** 0–100 por sección; null si no se respondió ninguna pregunta puntuable. */
    relationship: number | null;
    ordersPayments: number | null;
    commercial: number | null;
    /** 0–100 sobre todas las preguntas de escala contestadas. */
    overall: number | null;
}

export function toPercent(value1to5: number): number {
    return round2(((value1to5 - 1) / 4) * 100);
}

export function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

/** Nota 1–5 de una respuesta concreta. null si no puntúa o el valor no existe. */
export function questionScore(questionId: string, answer: unknown): number | null {
    const question = VENDOR_SURVEY_QUESTIONS.find(q => q.id === questionId);
    if (!question) return null;
    const option = question.options.find(o => o.value === answer);
    return option?.score ?? null;
}

function sectionPercent(answers: ScaleAnswers, section: VendorSurveySectionId): number | null {
    const scores = VENDOR_SURVEY_QUESTIONS
        .filter(q => q.section === section)
        .map(q => questionScore(q.id, answers[q.id]))
        .filter((s): s is number => s !== null);

    if (scores.length === 0) return null;
    return toPercent(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * Puntajes de una respuesta individual. El global promedia TODAS las preguntas
 * de escala contestadas (no el promedio de secciones).
 */
export function computeVendorSurveyScores(answers: ScaleAnswers): VendorSurveyScores {
    const all = VENDOR_SURVEY_QUESTIONS
        .map(q => questionScore(q.id, answers[q.id]))
        .filter((s): s is number => s !== null);

    return {
        relationship: sectionPercent(answers, 'RELATIONSHIP'),
        ordersPayments: sectionPercent(answers, 'ORDERS_PAYMENTS'),
        commercial: sectionPercent(answers, 'COMMERCIAL'),
        overall: all.length === 0 ? null : toPercent(all.reduce((a, b) => a + b, 0) / all.length),
    };
}

// ————————————————————————————————————————————————————————————————
// Consolidado por empresa (idéntico al de la encuesta de clientes)
// ————————————————————————————————————————————————————————————————

export interface WeightedSample {
    role_weight: number;
    value: number | null;
}

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

export function clampWeight(w: unknown): number {
    const n = Number(w);
    if (!Number.isFinite(n)) return 1;
    return Math.min(5, Math.max(1, Math.round(n)));
}

export type NpsCategory = 'PROMOTER' | 'PASSIVE' | 'DETRACTOR';

export function npsCategory(score: number): NpsCategory {
    if (score >= 9) return 'PROMOTER';
    if (score >= 7) return 'PASSIVE';
    return 'DETRACTOR';
}

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
    score_relationship: number | null;
    score_orders_payments: number | null;
    score_commercial: number | null;
    csat: number | null;
    nps: number | null;
}

export interface CompanySummary {
    responses: number;
    totalWeight: number;
    overall: number | null;
    relationship: number | null;
    ordersPayments: number | null;
    commercial: number | null;
    csat: number | null;
    nps: number | null;
    promoters: number;
    passives: number;
    detractors: number;
}

/** Consolida todas las respuestas de un proveedor en una sola lectura. */
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
        relationship: weightedAverage(pick('score_relationship')),
        ordersPayments: weightedAverage(pick('score_orders_payments')),
        commercial: weightedAverage(pick('score_commercial')),
        csat: weightedAverage(pick('csat')),
        nps: computeNps(pick('nps')),
        promoters,
        passives,
        detractors,
    };
}

/** Etiqueta y color de un puntaje 0–100, para tableros. */
export function scoreLabel(score: number | null): { label: string; tone: 'good' | 'ok' | 'warn' | 'bad' | 'none' } {
    if (score === null) return { label: 'Sin datos', tone: 'none' };
    if (score >= 85) return { label: 'Excelente', tone: 'good' };
    if (score >= 70) return { label: 'Bueno', tone: 'ok' };
    if (score >= 50) return { label: 'Por mejorar', tone: 'warn' };
    return { label: 'Crítico', tone: 'bad' };
}
