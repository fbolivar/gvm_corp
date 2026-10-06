import { describe, test, expect } from 'vitest';
import {
    computeVendorSurveyScores,
    questionScore,
    weightedAverage,
    computeNps,
    npsCategory,
    clampWeight,
    summarizeCompany,
    toPercent,
    scoreLabel,
} from './vendorSurveyScoring';

/** Respuestas "todo excelente" como base para variar una pregunta a la vez. */
const perfect = {
    buying_team_attention: 'EXCELENTE',
    contact_ease: 'MUY_FACIL',
    response_time: 'EXCELENTE',
    po_clarity: 'EXCELENTE',
    timely_resolution: 'SIEMPRE',
    order_process: 'EXCELENTE',
    payment_timeliness: 'EXCELENTE',
    receiving_compliance: 'EXCELENTE',
    issue_frequency: 'NUNCA',
    price_competitiveness: 'EXCELENTE',
    purchase_volume_satisfaction: 'MUY_SATISFECHO',
    needs_understanding: 'TOTALMENTE',
    issue_handling: 'EXCELENTE',
};

const worst = {
    buying_team_attention: 'MUY_MALA',
    contact_ease: 'MUY_DIFICIL',
    response_time: 'MUY_MALO',
    po_clarity: 'MUY_MALA',
    timely_resolution: 'NUNCA',
    order_process: 'MUY_MALO',
    payment_timeliness: 'MUY_MALO',
    receiving_compliance: 'MUY_MALO',
    issue_frequency: 'MUY_FRECUENTEMENTE',
    price_competitiveness: 'MUY_MALA',
    purchase_volume_satisfaction: 'MUY_INSATISFECHO',
    needs_understanding: 'NADA',
    issue_handling: 'MUY_MALA',
};

describe('escala de una pregunta', () => {
    test('traduce la opción a su nota 1-5', () => {
        expect(questionScore('buying_team_attention', 'EXCELENTE')).toBe(5);
        expect(questionScore('buying_team_attention', 'REGULAR')).toBe(3);
        expect(questionScore('buying_team_attention', 'MUY_MALA')).toBe(1);
    });

    test('la frecuencia de inconvenientes va invertida: nunca es lo mejor', () => {
        expect(questionScore('issue_frequency', 'NUNCA')).toBe(5);
        expect(questionScore('issue_frequency', 'MUY_FRECUENTEMENTE')).toBe(1);
    });

    test('"No aplica" no puntúa', () => {
        expect(questionScore('payment_timeliness', 'NO_APLICA')).toBeNull();
        expect(questionScore('issue_handling', 'SIN_INCONVENIENTES')).toBeNull();
    });

    test('una pregunta o un valor inexistente devuelve null en vez de romper', () => {
        expect(questionScore('no_existe', 'EXCELENTE')).toBeNull();
        expect(questionScore('buying_team_attention', 'VALOR_RARO')).toBeNull();
        expect(questionScore('buying_team_attention', undefined)).toBeNull();
    });
});

describe('puntajes de una respuesta', () => {
    test('todo excelente da 100 en cada sección', () => {
        const s = computeVendorSurveyScores(perfect);
        expect(s.relationship).toBe(100);
        expect(s.ordersPayments).toBe(100);
        expect(s.commercial).toBe(100);
        expect(s.overall).toBe(100);
    });

    test('todo lo peor da 0', () => {
        const s = computeVendorSurveyScores(worst);
        expect(s.overall).toBe(0);
        expect(s.relationship).toBe(0);
    });

    test('"No aplica" se excluye y no arrastra el promedio hacia abajo', () => {
        const answers = { ...perfect, payment_timeliness: 'NO_APLICA', receiving_compliance: 'NO_APLICA' };
        const s = computeVendorSurveyScores(answers);
        expect(s.ordersPayments).toBe(100);
        expect(s.overall).toBe(100);
    });

    test('el global promedia preguntas, no secciones', () => {
        // Una sola pregunta regular (3/5) entre las 13 contestadas.
        const answers = { ...perfect, buying_team_attention: 'REGULAR' };
        const s = computeVendorSurveyScores(answers);
        // Media 1-5 = (12*5 + 3)/13 = 4.846… → 96.15 en 0-100
        expect(s.overall).toBe(96.15);
        // La sección de relación sí baja más: (4*5 + 3)/5 = 4.6 → 90
        expect(s.relationship).toBe(90);
    });

    test('sin respuestas válidas devuelve null, no cero', () => {
        const s = computeVendorSurveyScores({});
        expect(s.overall).toBeNull();
        expect(s.relationship).toBeNull();
    });
});

describe('promedio ponderado por cargo', () => {
    test('la opinión del decisor pesa más que la del contacto operativo', () => {
        const samples = [
            { role_weight: 5, value: 100 },
            { role_weight: 1, value: 20 },
        ];
        const avg = weightedAverage(samples);
        expect(avg).toBe(86.67);
    });

    test('ignora respuestas sin valor', () => {
        expect(weightedAverage([{ role_weight: 5, value: null }, { role_weight: 3, value: 60 }])).toBe(60);
    });

    test('sin datos devuelve null', () => {
        expect(weightedAverage([])).toBeNull();
        expect(weightedAverage([{ role_weight: 5, value: null }])).toBeNull();
    });

    test('un peso corrupto se acota a 1-5 en vez de distorsionar el promedio', () => {
        expect(clampWeight(99)).toBe(5);
        expect(clampWeight(0)).toBe(1);
        expect(clampWeight('tres' as unknown)).toBe(1);
        expect(weightedAverage([{ role_weight: 999, value: 100 }, { role_weight: 5, value: 0 }])).toBe(50);
    });
});

describe('NPS', () => {
    test('clasifica promotores, pasivos y detractores', () => {
        expect(npsCategory(10)).toBe('PROMOTER');
        expect(npsCategory(9)).toBe('PROMOTER');
        expect(npsCategory(8)).toBe('PASSIVE');
        expect(npsCategory(7)).toBe('PASSIVE');
        expect(npsCategory(6)).toBe('DETRACTOR');
        expect(npsCategory(0)).toBe('DETRACTOR');
    });

    test('los pasivos no suman ni restan, pero sí diluyen', () => {
        const nps = computeNps([
            { role_weight: 1, value: 10 },
            { role_weight: 1, value: 8 },
            { role_weight: 1, value: 3 },
        ]);
        expect(nps).toBe(0);
    });

    test('pondera por cargo', () => {
        expect(computeNps([{ role_weight: 5, value: 10 }, { role_weight: 1, value: 2 }])).toBe(67);
    });

    test('todos detractores da -100', () => {
        expect(computeNps([{ role_weight: 3, value: 1 }, { role_weight: 2, value: 5 }])).toBe(-100);
    });
});

describe('consolidado de proveedor', () => {
    test('resume varias personas del mismo proveedor ponderando por cargo', () => {
        const rows = [
            { role_weight: 5, overall_score: 90, score_relationship: 90, score_orders_payments: 85, score_commercial: 95, csat: 9, nps: 10 },
            { role_weight: 3, overall_score: 70, score_relationship: 60, score_orders_payments: 75, score_commercial: 80, csat: 7, nps: 8 },
            { role_weight: 1, overall_score: 40, score_relationship: 40, score_orders_payments: 40, score_commercial: 40, csat: 4, nps: 3 },
        ];
        const s = summarizeCompany(rows);
        expect(s.responses).toBe(3);
        expect(s.totalWeight).toBe(9);
        expect(s.overall).toBe(77.78);
        expect(s.promoters).toBe(1);
        expect(s.passives).toBe(1);
        expect(s.detractors).toBe(1);
        expect(s.nps).toBe(44);
    });

    test('proveedor sin respuestas no rompe el tablero', () => {
        const s = summarizeCompany([]);
        expect(s.responses).toBe(0);
        expect(s.overall).toBeNull();
        expect(s.nps).toBeNull();
    });
});

describe('presentación', () => {
    test('convierte la escala 1-5 a 0-100', () => {
        expect(toPercent(5)).toBe(100);
        expect(toPercent(3)).toBe(50);
        expect(toPercent(1)).toBe(0);
    });

    test('etiqueta el puntaje por rangos', () => {
        expect(scoreLabel(90).tone).toBe('good');
        expect(scoreLabel(75).tone).toBe('ok');
        expect(scoreLabel(55).tone).toBe('warn');
        expect(scoreLabel(30).tone).toBe('bad');
        expect(scoreLabel(null).tone).toBe('none');
    });
});
