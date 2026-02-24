import { z } from 'zod';

export const MovementTypeEnum = z.enum(['IN', 'OUT', 'TRANSFER']);

export type MovementType = z.infer<typeof MovementTypeEnum>;

export const movementSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),

    warehouse_id: z.string().uuid(),
    product_id: z.string().uuid(),

    type: MovementTypeEnum,
    qty: z.number().positive("Cantidad debe ser positiva"),
    cost: z.number().min(0).default(0),

    ref_doc_type: z.string().optional(),
    ref_doc_id: z.string().uuid().optional(),

    occurred_at: z.string().optional(), // ISO Date
    created_at: z.string().optional(),
});

export type InventoryMovement = z.infer<typeof movementSchema>;

export const warehouseSchema = z.object({
    id: z.string().uuid().optional(),
    code: z.string().min(1),
    name: z.string().min(1),
    created_at: z.string().optional(),
});

export type Warehouse = z.infer<typeof warehouseSchema>;

export const productStockSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    product_id: z.string().uuid(),
    warehouse_id: z.string().uuid(),
    qty: z.number(),
    avg_cost: z.number(),
    last_updated: z.string().optional(),
});

export type ProductStock = z.infer<typeof productStockSchema>;
