import { z } from 'zod';

// ─── Status constants ──────────────────────────────────────────────────────────

export const TRANSFER_STATUSES = ['DRAFT', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'] as const;
export type TransferStatus = typeof TRANSFER_STATUSES[number];

// ─── Schemas ───────────────────────────────────────────────────────────────────

export const transferLineSchema = z.object({
    id: z.string().optional(),
    transfer_id: z.string().optional(),
    product_id: z.string().min(1, 'Producto requerido'),
    qty: z.coerce.number().positive('Cantidad debe ser mayor a 0'),
    qty_received: z.coerce.number().min(0).default(0),
    notes: z.string().optional().default(''),
});

export type TransferLine = z.infer<typeof transferLineSchema>;

export const warehouseTransferSchema = z.object({
    id: z.string().optional(),
    transfer_number: z.string().optional(),
    from_warehouse_id: z.string().min(1, 'Bodega origen requerida'),
    to_warehouse_id: z.string().min(1, 'Bodega destino requerida'),
    status: z.enum(TRANSFER_STATUSES).default('DRAFT'),
    notes: z.string().optional().default(''),
    lines: z.array(transferLineSchema).min(1, 'Debe tener al menos una línea'),
});

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
