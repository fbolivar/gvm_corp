import { z } from 'zod';

export const PO_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'] as const;
export type POStatus = typeof PO_STATUSES[number];

export const PO_CURRENCIES = ['COP', 'USD'] as const;
export type POCurrency = typeof PO_CURRENCIES[number];

// Transform empty strings to undefined for optional UUID fields
const optionalUuid = z.string().transform(v => v === '' ? undefined : v).pipe(z.string().uuid().optional());

export const poLineSchema = z.object({
    id: z.string().uuid().optional(),
    order_id: z.string().uuid().optional(),
    product_id: z.string().uuid({ message: 'Seleccione un producto' }),
    qty: z.number().positive({ message: 'Cantidad debe ser mayor a 0' }),
    unit_cost: z.number().min(0, 'Costo inválido'),
    tax_rate: z.number().min(0).max(1).default(0),
    qty_received: z.number().min(0).default(0),
    notes: z.string().optional(),
});

export type POLine = z.infer<typeof poLineSchema>;

export const purchaseOrderSchema = z.object({
    id: z.string().uuid().optional(),
    po_number: z.string().optional(),
    supplier_id: z.string().uuid({ message: 'Debe seleccionar un proveedor' }),
    warehouse_id: optionalUuid,
    currency: z.enum(PO_CURRENCIES).default('COP'),
    status: z.enum(PO_STATUSES).default('DRAFT'),
    order_date: z.string().default(() => new Date().toISOString().split('T')[0]),
    expected_delivery: z.preprocess(v => v === '' ? undefined : v, z.string().optional()),
    notes: z.string().optional(),
    lines: z.array(poLineSchema).min(1, 'Debe agregar al menos una línea de producto'),
});

export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;

export interface PurchaseOrderWithDetails extends Omit<PurchaseOrder, 'lines'> {
    subtotal: number;
    tax_total: number;
    total: number;
    currency: POCurrency;
    supplier?: { legal_name: string; doc_number: string };
    warehouse?: { name: string };
    approved_by_user?: { email: string };
    lines: Array<POLine & { product?: { name: string; sku: string } }>;
    created_at?: string;
    approved_at?: string;
}

export function formatPOCurrency(amount: number, currency: POCurrency = 'COP'): string {
    return new Intl.NumberFormat(currency === 'COP' ? 'es-CO' : 'en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: currency === 'COP' ? 0 : 2,
    }).format(amount);
}
