import { z } from 'zod';

// ─── Status constants ──────────────────────────────────────────────────────────

export const TRANSFER_STATUSES = ['DRAFT', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'] as const;
export type TransferStatus = typeof TRANSFER_STATUSES[number];

// ─── Schemas ───────────────────────────────────────────────────────────────────

export const transferLineSchema = z.object({
    id: z.string().uuid().optional(),
    transfer_id: z.string().uuid().optional(),
    product_id: z.string().uuid(),
    qty: z.number().positive('Cantidad debe ser mayor a 0'),
    qty_received: z.number().min(0).default(0),
    notes: z.string().optional(),
});

export type TransferLine = z.infer<typeof transferLineSchema>;

export const warehouseTransferSchema = z.object({
    id: z.string().uuid().optional(),
    transfer_number: z.string().optional(),
    from_warehouse_id: z.string().uuid('Bodega origen requerida'),
    to_warehouse_id: z.string().uuid('Bodega destino requerida'),
    status: z.enum(TRANSFER_STATUSES).default('DRAFT'),
    notes: z.string().optional(),
    lines: z.array(transferLineSchema).min(1, 'Debe tener al menos una línea'),
}).refine(
    (data) => data.from_warehouse_id !== data.to_warehouse_id,
    { message: 'La bodega destino debe ser diferente a la bodega origen', path: ['to_warehouse_id'] }
);

export type WarehouseTransfer = z.infer<typeof warehouseTransferSchema>;

// ─── Extended types with relations ────────────────────────────────────────────

export interface TransferWithDetails extends Omit<WarehouseTransfer, 'lines'> {
    transfer_number: string;
    from_warehouse?: { name: string };
    to_warehouse?: { name: string };
    transferred_by_user?: { email: string };
    received_by_user?: { email: string };
    lines: Array<TransferLine & { product?: { name: string; sku: string } }>;
    created_at?: string;
    transferred_at?: string;
    received_at?: string;
}

// ─── Action input types ────────────────────────────────────────────────────────

export interface ReceiveTransferLine {
    line_id: string;
    qty_received: number;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface TransferStats {
    total: number;
    drafts: number;
    inTransit: number;
    received: number;
    cancelled: number;
}
