import { z } from 'zod';

export const carrierSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    name: z.string().min(1, "Nombre requerido"),
    nit: z.string().optional().nullable(),
    contact_name: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().email("Email inválido").optional().nullable().or(z.literal('')),
    is_active: z.boolean().default(true),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});

export type Carrier = z.infer<typeof carrierSchema>;

export const shipmentStatusEnum = z.enum(['PENDING', 'PACKED', 'SHIPPED', 'DELIVERED', 'RETURNED']);
export type ShipmentStatus = z.infer<typeof shipmentStatusEnum>;

export const shipmentSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    order_id: z.string().uuid("Orden requerida"),
    carrier_id: z.string().uuid("Transportadora requerida").optional().nullable(),
    warehouse_id: z.string().uuid("Bodega requerida").optional().nullable(),
    tracking_number: z.string().optional().nullable(),
    status: shipmentStatusEnum.default('PENDING'),
    shipped_at: z.string().optional().nullable(),
    delivered_at: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});

export type Shipment = z.infer<typeof shipmentSchema>;

export const shipmentItemSchema = z.object({
    id: z.string().uuid().optional(),
    shipment_id: z.string().uuid().optional(),
    product_id: z.string().uuid(),
    qty_ordered: z.number().min(0),
    qty_shipped: z.number().min(0),
    created_at: z.string().optional(),
});

export type ShipmentItem = z.infer<typeof shipmentItemSchema>;
