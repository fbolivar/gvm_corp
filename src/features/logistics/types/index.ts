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

export const SHIPMENT_STATUSES = [
    'RECIBIDO',
    'EN_ALISTAMIENTO',
    'LISTO_DESPACHO',
    'DESPACHADO',
    'EN_TRANSITO',
    'ENTREGADO',
    'RETURNED',
] as const;

export const shipmentStatusEnum = z.enum(SHIPMENT_STATUSES);
export type ShipmentStatus = z.infer<typeof shipmentStatusEnum>;

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
    RECIBIDO: 'Recibido',
    EN_ALISTAMIENTO: 'En Alistamiento',
    LISTO_DESPACHO: 'Listo para Despacho',
    DESPACHADO: 'Despachado',
    EN_TRANSITO: 'En Tránsito',
    ENTREGADO: 'Entregado',
    RETURNED: 'Devuelto',
};

export const shipmentSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    order_id: z.string().uuid("Orden requerida"),
    carrier_id: z.string().uuid("Transportadora requerida").optional().nullable(),
    warehouse_id: z.string().uuid("Bodega requerida").optional().nullable(),
    tracking_number: z.string().optional().nullable(),
    status: shipmentStatusEnum.default('RECIBIDO'),
    shipped_at: z.string().optional().nullable(),
    delivered_at: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    prepared_by: z.string().uuid().optional().nullable(),
    verified_by: z.string().uuid().optional().nullable(),
    dispatched_by: z.string().uuid().optional().nullable(),
    delivered_by_name: z.string().optional().nullable(),
    freight_cost: z.number().min(0).default(0),
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
