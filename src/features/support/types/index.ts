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
        email: string;
    };
}
