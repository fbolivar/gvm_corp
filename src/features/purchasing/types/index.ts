import { z } from 'zod';

export const PO_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'] as const;
export type POStatus = typeof PO_STATUSES[number];

export const poLineSchema = z.object({
    id: z.string().uuid().optional(),
    order_id: z.string().uuid().optional(),
    product_id: z.string().uuid(),
    qty: z.number().positive(),
    unit_cost: z.number().min(0),
    tax_rate: z.number().min(0).max(1).default(0.19),
    qty_received: z.number().min(0).default(0),
    notes: z.string().optional(),
});

export type POLine = z.infer<typeof poLineSchema>;

export const purchaseOrderSchema = z.object({
    id: z.string().uuid().optional(),
    po_number: z.string().optional(),
    supplier_id: z.string().uuid(),
    warehouse_id: z.string().uuid().optional(),
    status: z.enum(PO_STATUSES).default('DRAFT'),
    order_date: z.string().default(() => new Date().toISOString().split('T')[0]),
    expected_delivery: z.string().optional(),
    notes: z.string().optional(),
    lines: z.array(poLineSchema).min(1, 'Debe tener al menos una línea'),
});

export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;

export interface PurchaseOrderWithDetails extends Omit<PurchaseOrder, 'lines'> {
    subtotal: number;
    tax_total: number;
    total: number;
    supplier?: { legal_name: string; doc_number: string };
    warehouse?: { name: string };
    approved_by_user?: { email: string };
    lines: Array<POLine & { product?: { name: string; sku: string } }>;
    created_at?: string;
    approved_at?: string;
}
