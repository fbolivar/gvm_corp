import { z } from 'zod';

export const LeadStatusEnum = z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'LOST', 'CONVERTED']);
export type LeadStatus = z.infer<typeof LeadStatusEnum>;

export const leadSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    name: z.string().min(1, "Nombre del prospecto requerido"),
    company_name: z.string().optional().nullable(),
    email: z.string().email("Correo inválido").optional().nullable().or(z.literal("")),
    phone: z.string().optional().nullable(),
    status: LeadStatusEnum.default('NEW'),
    source: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    assigned_to: z.string().uuid().optional().nullable(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});

export type Lead = z.infer<typeof leadSchema>;

export const leadFilterSchema = z.object({
    status: LeadStatusEnum.optional(),
    search: z.string().optional(),
    assigned_to: z.string().uuid().optional(),
});

export type LeadFilters = z.infer<typeof leadFilterSchema>;

// Opportunities
export const OpportunityStageEnum = z.enum(['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']);
export type OpportunityStage = z.infer<typeof OpportunityStageEnum>;

export const opportunitySchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    name: z.string().min(1, 'Nombre de la oportunidad requerido'),
    description: z.string().optional().nullable(),
    value: z.number().min(0).default(0),
    probability: z.number().min(0).max(100).default(0),
    stage: OpportunityStageEnum.default('PROSPECTING'),
    expected_close_date: z.string().optional().nullable(),
    lead_id: z.string().uuid().optional().nullable(),
    party_id: z.string().uuid().optional().nullable(),
    assigned_to: z.string().uuid().optional().nullable(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});

export type Opportunity = z.infer<typeof opportunitySchema>;
