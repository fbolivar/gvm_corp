import { describe, test, expect } from 'vitest';
import {
    computeSurveyScores,
    questionScore,
    weightedAverage,
    computeNps,
    npsCategory,
    clampWeight,
    summarizeCompany,
    toPercent,
    scoreLabel,
} from './surveyScoring';

/** Respuestas "todo excelente" como base para variar una pregunta a la vez. */
const perfect = {
    service_attention: 'EXCELENTE',
    contact_ease: 'MUY_FACIL',
    response_time: 'EXCELENTE',
    info_clarity: 'EXCELENTE',
    timely_resolution: 'SIEMPRE',
    order_process: 'EXCELENTE',
    delivery_time: 'EXCELENTE',
    product_condition: 'EXCELENTE',
    issue_frequency: 'NUNCA',
    product_availability: 'EXCELENTE',
    product_quality: 'MUY_SATISFECHO',
    needs_understanding: 'TOTALMENTE',
    issue_handling: 'EXCELENTE',
};

const worst = {
    service_attention: 'MUY_MALA',
    contact_ease: 'MUY_DIFICIL',
    response_time: 'MUY_MALO',
    info_clarity: 'MUY_MALA',
    timely_resolution: 'NUNCA',
    order_process: 'MUY_MALO',
    delivery_time: 'MUY_MALO',
    product_condition: 'MUY_MALO',
    issue_frequency: 'MUY_FRECUENTEMENTE',
    product_availability: 'MUY_MALA',
    product_quality: 'MUY_INSATISFECHO',
    needs_understanding: 'NADA',
    issue_handling: 'MUY_MALA',
};

describe('escala de una pregunta', () => {
    test('traduce la opción a su nota 1-5', () => {
        expect(questionScore('service_attention', 'EXCELENTE')).toBe(5);
        expect(questionScore('service_attention', 'REGULAR')).toBe(3);
        expect(questionScore('service_attention', 'MUY_MALA')).toBe(1);
    });

    test('la frecuencia de inconvenientes va invertida: nunca es lo mejor', () => {
        expect(questionScore('issue_frequency', 'NUNCA')).toBe(5);
        expect(questionScore('issue_frequency', 'MUY_FRECUENTEMENTE')).toBe(1);
    });

    test('"No aplica" no puntúa', () => {
        expect(questionScore('delivery_time', 'NO_APLICA')).toBeNull();
        expect(questionScore('issue_handling', 'SIN_INCONVENIENTES')).toBeNull();
    });

    test('una pregunta o un valor inexistente devuelve null en vez de romper', () => {
        expect(questionScore('no_existe', 'EXCELENTE')).toBeNull();
        expect(questionScore('service_attention', 'VALOR_RARO')).toBeNull();
        expect(questionScore('service_attention', undefined)).toBeNull();
    });
});

describe('puntajes de una respuesta', () => {
    test('todo excelente da 100 en cada sección', () => {
        const s = computeSurveyScores(perfect);
        expect(s.service).toBe(100);
        expect(s.orders).toBe(100);
        expect(s.product).toBe(100);
        expect(s.overall).toBe(100);
    });

    test('todo lo peor da 0', () => {
        const s = computeSurveyScores(worst);
        expect(s.overall).toBe(0);
        expect(s.service).toBe(0);
    });

    test('"No aplica" se excluye y no arrastra el promedio hacia abajo', () => {
        // Arrange: dos preguntas de la sección Pedidos quedan fuera del cálculo.
        const answers = { ...perfect, delivery_time: 'NO_APLICA', product_condition: 'NO_APLICA' };

        // Act
        const s = computeSurveyScores(answers);

        // Assert: sigue siendo 100, no baja por las preguntas no aplicables.
        expect(s.orders).toBe(100);
        expect(s.overall).toBe(100);
    });

    test('el global promedia preguntas, no secciones', () => {
        // Una sola pregunta regular (3/5) entre las 13 contestadas.
        const answers = { ...perfect, service_attention: 'REGULAR' };
        const s = computeSurveyScores(answers);
        // Media 1-5 = (12*5 + 3)/13 = 4.846… → 96.15 en 0-100
        expect(s.overall).toBe(96.15);
        // La sección de servicio sí baja más: (4*5 + 3)/5 = 4.6 → 90
        expect(s.service).toBe(90);
    });

    test('sin respuestas válidas devuelve null, no cero', () => {
        const s = computeSurveyScores({});
        expect(s.overall).toBeNull();
        expect(s.service).toBeNull();
    });
});

describe('promedio ponderado por cargo', () => {
    test('la opinión del decisor pesa más que la del contacto operativo', () => {
        // Arrange: gerente (peso 5) muy satisfecho, auxiliar (peso 1) insatisfecho.
        const samples = [
            { role_weight: 5, value: 100 },
            { role_weight: 1, value: 20 },
        ];

        // Act
        const avg = weightedAverage(samples);

        // Assert: (100*5 + 20*1) / 6 = 86.67 — no 60, que sería el promedio simple.
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
            { role_weight: 1, value: 10 }, // promotor
            { role_weight: 1, value: 8 },  // pasivo
            { role_weight: 1, value: 3 },  // detractor
        ]);
        expect(nps).toBe(0);
    });

    test('pondera por cargo', () => {
        // Promotor con peso 5, detractor con peso 1 → (5-1)/6 = 66.67 → 67
        expect(computeNps([{ role_weight: 5, value: 10 }, { role_weight: 1, value: 2 }])).toBe(67);
    });

    test('todos detractores da -100', () => {
        expect(computeNps([{ role_weight: 3, value: 1 }, { role_weight: 2, value: 5 }])).toBe(-100);
    });
});

describe('consolidado de empresa', () => {
    test('resume varias personas de la misma empresa ponderando por cargo', () => {
        // Arrange: tres decisores de una misma empresa.
        const rows = [
            { role_weight: 5, overall_score: 90, score_service: 90, score_orders: 85, score_product: 95, csat: 9, nps: 10 },
            { role_weight: 3, overall_score: 70, score_service: 60, score_orders: 75, score_product: 80, csat: 7, nps: 8 },
            { role_weight: 1, overall_score: 40, score_service: 40, score_orders: 40, score_product: 40, csat: 4, nps: 3 },
        ];

        // Act
        const s = summarizeCompany(rows);

        // Assert
        expect(s.responses).toBe(3);
        expect(s.totalWeight).toBe(9);
        // (90*5 + 70*3 + 40*1) / 9 = 77.78
        expect(s.overall).toBe(77.78);
        expect(s.promoters).toBe(1);
        expect(s.passives).toBe(1);
        expect(s.detractors).toBe(1);
        // NPS ponderado: (5 - 1) / 9 = 44.4 → 44
        expect(s.nps).toBe(44);
    });

    test('empresa sin respuestas no rompe el tablero', () => {
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
