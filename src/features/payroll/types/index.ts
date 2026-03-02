import { z } from 'zod';
import { Party } from "@/features/parties/types";
import { partySchema } from "@/features/parties/types";

// ─── OVERTIME REQUESTS ────────────────────────────────────────────────────────
export const OvertimeStatusEnum = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export const overtimeRequestSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    employee_id: z.string().uuid(),
    date: z.string().refine(v => !isNaN(Date.parse(v)), 'Fecha inválida'),
    start_time: z.string().optional().nullable(),
    end_time: z.string().optional().nullable(),
    hours: z.number().min(0.5).max(24),
    reason: z.string().min(10, 'Mínimo 10 caracteres'),
    status: OvertimeStatusEnum.default('PENDING'),
    reviewed_by: z.string().uuid().optional().nullable(),
    reviewed_at: z.string().optional().nullable(),
    reviewer_notes: z.string().optional().nullable(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    // join
    employee: z.object({
        id: z.string(),
        salary: z.number(),
        contract_type: z.string(),
        party: z.object({ legal_name: z.string() }).optional(),
    }).optional(),
});

export type OvertimeRequest = z.infer<typeof overtimeRequestSchema>;
export type OvertimeStatus = z.infer<typeof OvertimeStatusEnum>;

// ─── CONTRACT TYPE ────────────────────────────────────────────────────────────
// Enum for Contract Type
export const ContractTypeEnum = z.enum(['INDEFINIDO', 'FIJO', 'OBRA_LABOR', 'APRENDIZAJE', 'PRESTACION_SERVICIOS']);

export const employeeSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    party_id: z.string().uuid().optional(),

    contract_type: ContractTypeEnum,
    start_date: z.string().refine((val) => !isNaN(Date.parse(val)), "Fecha inválida"),
    end_date: z.string().optional().nullable(),

    salary: z.number().min(0, "Salario debe ser mayor o igual a 0"),
    transport_allowance: z.boolean().default(true),
    risk_level: z.string().default('1'),

    payment_method: z.string().default('CASH'),
    bank_name: z.string().optional().nullable(),
    bank_account_type: z.string().optional().nullable(),
    bank_account_number: z.string().optional().nullable(),

    status: z.enum(['ACTIVE', 'INACTIVE', 'TERMINATED']).default('ACTIVE'),
    created_at: z.string().optional(),

    // Relation with Party
    party: partySchema.optional() // When fetching, we get the full party details
});

export type Employee = z.infer<typeof employeeSchema>;

export const loanSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid(),
    employee_id: z.string().uuid(),
    amount_total: z.number().min(0),
    amount_paid: z.number().default(0),
    installment_count: z.number().min(1),
    installments_paid: z.number().default(0),
    installment_amount: z.number().min(0),
    interest_rate: z.number().default(0),
    start_date: z.string(),
    description: z.string().optional().nullable(),
    status: z.enum(['ACTIVE', 'PAID', 'CANCELLED']).default('ACTIVE'),
    created_at: z.string().optional()
});

export type PayrollLoan = z.infer<typeof loanSchema>;

export const benefitSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid(),
    employee_id: z.string().uuid(),
    name: z.string(),
    amount: z.number().min(0),
    is_taxable: z.boolean().default(false),
    is_salary: z.boolean().default(false),
    frequency: z.enum(['MONTHLY', 'ONE_TIME']).default('MONTHLY'),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    created_at: z.string().optional()
});

export type PayrollBenefit = z.infer<typeof benefitSchema>;

export interface PayrollConcept {
    name: string;
    type: 'EARNING' | 'DEDUCTION';
    amount: number;
    description?: string;
    category?: string;
}

export interface SocialSecuritySummary {
    ibc: number;
    employee: {
        health: number;
        pension: number;
        total: number;
    };
    employer: {
        health: number;
        pension: number;
        arl: number;
        total: number;
    };
    parafiscales: {
        ccf: number;
        sena: number;
        icbf: number;
        total: number;
    };
    total_cost: number;
}

export interface ProvisionsSummary {
    cesantias: number;
    intereses_cesantias: number;
    prima: number;
    vacaciones: number;
    total: number;
}

export interface PayrollSettlement {
    employee_id: string;
    period_start: string;
    period_end: string;
    salary_base: number;
    concepts: PayrollConcept[];
    total_earnings: number;
    total_deductions: number;
    net_pay: number;
    social_security?: SocialSecuritySummary;
    provisions?: ProvisionsSummary;
}
