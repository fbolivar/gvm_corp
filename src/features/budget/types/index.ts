import { z } from 'zod';

export const BudgetStatusEnum = z.enum(['DRAFT', 'APPROVED', 'CLOSED']);
export const BudgetPeriodEnum = z.enum(['ANNUAL', 'MONTHLY', 'QUARTERLY']);
export const LineTypeEnum      = z.enum(['INCOME', 'EXPENSE']);

export const budgetSchema = z.object({
    id:             z.string().uuid().optional(),
    tenant_id:      z.string().uuid().optional(),
    name:           z.string().min(3, 'Mínimo 3 caracteres'),
    description:    z.string().optional().nullable(),
    year:           z.number().int().min(2020).max(2099),
    period_type:    BudgetPeriodEnum.default('ANNUAL'),
    status:         BudgetStatusEnum.default('DRAFT'),
    total_income:   z.number().default(0),
    total_expense:  z.number().default(0),
    created_by:     z.string().uuid().optional().nullable(),
    created_at:     z.string().optional(),
    updated_at:     z.string().optional(),
});

export const budgetLineSchema = z.object({
    id:          z.string().uuid().optional(),
    tenant_id:   z.string().uuid().optional(),
    budget_id:   z.string().uuid(),
    category:    z.string().min(1, 'Categoría requerida'),
    subcategory: z.string().optional().nullable(),
    line_type:   LineTypeEnum,
    month:       z.number().int().min(1).max(12).optional().nullable(),
    amount:      z.number().min(0),
    notes:       z.string().optional().nullable(),
});

export type Budget     = z.infer<typeof budgetSchema>;
export type BudgetLine = z.infer<typeof budgetLineSchema>;
export type BudgetStatus = z.infer<typeof BudgetStatusEnum>;
export type LineType     = z.infer<typeof LineTypeEnum>;
