import { z } from 'zod';

// ─── Status constants ──────────────────────────────────────────────────────────

export const TRANSFER_STATUSES = ['DRAFT', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'] as const;
export type TransferStatus = typeof TRANSFER_STATUSES[number];

// ─── Schemas ───────────────────────────────────────────────────────────────────

export const transferLineSchema = z.object({
    id: z.string().optional(),
    transfer_id: z.string().optional(),
    // product_id es opcional: se permite un ítem de texto libre (producto aún no
    // creado en el sistema) usando `description`. Debe haber al menos uno de los dos.
    product_id: z.string().optional().nullable(),
    description: z.string().optional().default(''),
    qty: z.coerce.number().positive('Cantidad debe ser mayor a 0'),
    qty_received: z.coerce.number().min(0).default(0),
    notes: z.string().optional().default(''),
}).refine(
    (l) => (!!l.product_id && l.product_id.length > 0) || (!!l.description && l.description.trim().length > 0),
    { message: 'Selecciona un producto o escribe una descripción', path: ['description'] }
);

export type TransferLine = z.infer<typeof transferLineSchema>;

export const warehouseTransferSchema = z.object({
    id: z.string().optional(),
    transfer_number: z.string().optional(),
    from_warehouse_id: z.string().min(1, 'Bodega origen requerida'),
    to_warehouse_id: z.string().min(1, 'Bodega destino requerida'),
    status: z.enum(TRANSFER_STATUSES).default('DRAFT'),
    notes: z.string().optional().default(''),
    // Número/consecutivo con el que el traslado queda legalizado en el sistema
    // contable de referencia (WorldOffice). Opcional; normalmente se captura
    // después, desde el detalle.
    legalized_number: z.string().trim().max(60, 'Máximo 60 caracteres').optional().nullable(),
    lines: z.array(transferLineSchema).min(1, 'Debe tener al menos una línea'),
});

export type WarehouseTransfer = z.infer<typeof warehouseTransferSchema>;

// ─── Extended types with relations ────────────────────────────────────────────

export interface TransferWithDetails extends Omit<WarehouseTransfer, 'lines'> {
    transfer_number: string;
    legalized_number?: string | null;
    from_warehouse?: { name: string };
    to_warehouse?: { name: string };
    transferred_by_user?: { email: string };
    received_by_user?: { email: string };
    lines: Array<TransferLine & { product?: { name: string; sku: string } }>;
    receipts?: TransferReceipt[];
    created_at?: string;
    transferred_at?: string;
    received_at?: string;
}

/** Un renglón recibido: qué lote llegó, cuándo vence y cuántas unidades. */
export interface TransferReceipt {
    id: string;
    transfer_line_id: string;
    product_id?: string | null;
    lot_number?: string | null;
    expiration_date?: string | null;
    qty: number;
    received_at: string;
    receiver?: { full_name?: string | null } | null;
}

// ─── Action input types ────────────────────────────────────────────────────────

/** @deprecated La recepción se registra por renglón (lote + vencimiento). Ver ReceiptDraft. */
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
