import { z } from 'zod';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketCategory = 'TECHNICAL' | 'BILLING' | 'RMA' | 'LOGISTICS' | 'OTHER';

export const ticketSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    number: z.string().min(1),
    party_id: z.string().uuid(),
    category: z.enum(['TECHNICAL', 'BILLING', 'RMA', 'LOGISTICS', 'OTHER']),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL', 'RESOLVED', 'CLOSED']),
    subject: z.string().min(3),
    description: z.string().nullable().optional(),
    assigned_to: z.string().uuid().nullable().optional(),
    sla_deadline: z.string().nullable().optional(),
    ref_doc_id: z.string().uuid().nullable().optional(),
    ref_product_id: z.string().uuid().nullable().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});

export type Ticket = z.infer<typeof ticketSchema>;

// Esquema para el formulario de creación: exige cliente y asunto.
// El número lo genera un trigger de BD; el estado por defecto es OPEN.
export const newTicketSchema = z.object({
    party_id: z.string().uuid('Selecciona un cliente'),
    subject: z.string().min(3, 'El asunto debe tener al menos 3 caracteres'),
    description: z.string().nullable().optional(),
    category: z.enum(['TECHNICAL', 'BILLING', 'RMA', 'LOGISTICS', 'OTHER']).default('OTHER'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'PENDING_APPROVAL', 'RESOLVED', 'CLOSED']).default('OPEN'),
    // Los selects opcionales envían "" cuando no se elige nada → lo convertimos a null.
    ref_doc_id: z.preprocess((v) => (v === '' ? null : v), z.string().uuid().nullable().optional()),
    ref_product_id: z.preprocess((v) => (v === '' ? null : v), z.string().uuid().nullable().optional()),
    assigned_to: z.preprocess((v) => (v === '' ? null : v), z.string().uuid().nullable().optional()),
});

export type NewTicketInput = z.infer<typeof newTicketSchema>;

export interface TicketInteraction {
    id: string;
    ticket_id: string;
    author_id: string;
    content: string;
    is_internal: boolean;
    created_at: string;
    author?: {
        full_name: string;
        avatar_url: string;
    };
}

export interface TicketAuditLog {
    id: string;
    ticket_id: string;
    actor_id: string;
    action: string;
    prev_state: any;
    new_state: any;
    created_at: string;
    actor?: {
        full_name?: string;
    };
}
