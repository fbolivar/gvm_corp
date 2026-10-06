import { z } from 'zod';

export const PROBATION_DAYS = 60;
export const PROBATION_ALERT_FROM_DAYS = 45;
export const PROBATION_CRITICAL_DAYS = 7;
/** Promedio mínimo (escala 1–5) para "cumple". Debe coincidir con close_probation_evaluation. */
export const PROBATION_MIN_AVERAGE = 3;

export const probationCreateSchema = z.object({
    employeeId: z.string().uuid(),
    evaluatorId: z.string().uuid(),
});

export const probationSubmitSchema = z.object({
    evaluationId: z.string().uuid(),
    scores: z.array(z.object({
        criterionId: z.string().uuid(),
        score: z.number().int().min(1).max(5),
        comment: z.string().max(1000).optional().nullable(),
    })).min(1),
    outcomeComments: z.string().max(2000).optional().nullable(),
});

export const OUTCOME_LABEL: Record<string, string> = {
    MEETS: 'Cumple las condiciones del cargo',
    DOES_NOT_MEET: 'No cumple las condiciones del cargo',
};

export const EVAL_STATUS_LABEL: Record<string, string> = {
    PENDING: 'Pendiente',
    IN_PROGRESS: 'En curso',
    CLOSED: 'Cerrada',
};
