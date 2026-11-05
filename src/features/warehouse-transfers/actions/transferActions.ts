'use server'

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { transferService } from '../services/transferService';
import { warehouseTransferSchema } from '../types';

// ─── Validation schemas ────────────────────────────────────────────────────────

// Un renglón recibido: qué lote llegó, cuándo vence y cuántas unidades.
// Una misma línea del traslado puede aparecer en varios renglones (dos lotes).
const receiptSchema = z.object({
    line_id: z.string().uuid(),
    lot_number: z.string().trim().max(60).nullish(),
    expiration_date: z.string().nullish(),
    qty: z.coerce.number().min(0),
});

const receiveTransferSchema = z.object({
    id: z.string().uuid(),
    receipts: z.array(receiptSchema).min(1, 'Debe registrar al menos un renglón'),
});

// ─── Result type ───────────────────────────────────────────────────────────────

interface ActionResult {
    success?: boolean;
    error?: string;
    id?: string;
    transfer_number?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function revalidateTransferPaths(id?: string): void {
    revalidatePath('/inventory/transfers');
    revalidatePath('/inventory');
    if (id) revalidatePath(`/inventory/transfers/${id}`);
}

// ─── Actions ───────────────────────────────────────────────────────────────────

/**
 * Creates a new warehouse transfer in DRAFT status.
 * Validates input with Zod before delegating to the service layer.
 */
export async function createTransferAction(
    formData: unknown
): Promise<ActionResult> {
    const parsed = warehouseTransferSchema.safeParse(formData);
    if (!parsed.success) {
        return { error: 'Datos inválidos: ' + JSON.stringify(parsed.error.flatten()) };
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'No autorizado. Inicie sesión para continuar.' };
    }

    try {
        const result = await transferService.createTransfer(supabase, parsed.data);
        revalidateTransferPaths(result.id);
        return { success: true, id: result.id, transfer_number: result.transfer_number };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor';
        console.error('[createTransferAction]', error);
        return { error: message };
    }
}

/**
 * Updates an existing DRAFT transfer (header + lines).
 * Only DRAFT transfers can be edited; the service enforces the status guard.
 */
export async function updateTransferAction(
    id: string,
    formData: unknown
): Promise<ActionResult> {
    const idValidation = z.string().uuid().safeParse(id);
    if (!idValidation.success) {
        return { error: 'ID de traslado inválido' };
    }

    const parsed = warehouseTransferSchema.safeParse(formData);
    if (!parsed.success) {
        return { error: 'Datos inválidos: ' + JSON.stringify(parsed.error.flatten()) };
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'No autorizado. Inicie sesión para continuar.' };
    }

    try {
        const result = await transferService.updateTransfer(supabase, id, parsed.data);
        revalidateTransferPaths(id);
        return { success: true, id: result.id, transfer_number: result.transfer_number };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor';
        console.error('[updateTransferAction]', error);
        return { error: message };
    }
}

/**
 * Transitions a DRAFT transfer to IN_TRANSIT and creates OUT inventory movements
 * from the source warehouse for each transfer line.
 */
export async function sendTransferAction(id: string): Promise<ActionResult> {
    const idValidation = z.string().uuid().safeParse(id);
    if (!idValidation.success) {
        return { error: 'ID de traslado inválido' };
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'No autorizado. Inicie sesión para continuar.' };
    }

    try {
        await transferService.sendTransfer(supabase, id);
        revalidateTransferPaths(id);
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor';
        console.error('[sendTransferAction]', error);
        // Partial success: transfer sent but some movements failed
        if (message.includes('advertencias')) {
            revalidateTransferPaths(id);
            return { success: true, error: message };
        }
        return { error: message };
    }
}

/**
 * Registra la recepción de un traslado renglón por renglón (lote, vencimiento y
 * cantidad). Mueve el inventario de la bodega de origen a la de destino.
 */
export async function receiveTransferAction(
    id: string,
    receipts: Array<{ line_id: string; lot_number?: string | null; expiration_date?: string | null; qty: number }>
): Promise<ActionResult> {
    const parsed = receiveTransferSchema.safeParse({ id, receipts });
    if (!parsed.success) {
        return { error: 'Revisa los datos de la recepción: ' + parsed.error.issues[0]?.message };
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'No autorizado. Inicie sesión para continuar.' };
    }

    try {
        const { warnings } = await transferService.receiveTransfer(supabase, id, parsed.data.receipts);
        revalidateTransferPaths(id);
        revalidatePath('/inventory/movements');
        revalidatePath('/inventory/lots');
        // La recepción quedó registrada aunque algún movimiento de inventario
        // haya fallado: se avisa en vez de callarlo.
        return warnings.length > 0
            ? { success: true, error: warnings.join(' ') }
            : { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor';
        console.error('[receiveTransferAction]', error);
        return { error: message };
    }
}

/**
 * Registra o actualiza el número de traslado legalizado (consecutivo con el que
 * el traslado queda legalizado en el sistema contable de referencia). Se puede
 * fijar en cualquier estado porque la legalización ocurre después del flujo.
 */
const legalizedNumberSchema = z.object({
    id: z.string().uuid('ID de traslado inválido'),
    legalized_number: z.string().trim().max(60, 'Máximo 60 caracteres').nullish(),
});

export async function setLegalizedNumberAction(
    id: string,
    legalizedNumber: string | null,
): Promise<ActionResult> {
    const parsed = legalizedNumberSchema.safeParse({ id, legalized_number: legalizedNumber });
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'No autorizado. Inicie sesión para continuar.' };
    }

    try {
        await transferService.setLegalizedNumber(supabase, id, parsed.data.legalized_number ?? null);
        revalidateTransferPaths(id);
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor';
        console.error('[setLegalizedNumberAction]', error);
        return { error: message };
    }
}

/**
 * Cancels a DRAFT transfer. Transfers already in transit or received cannot be cancelled.
 */
export async function cancelTransferAction(id: string): Promise<ActionResult> {
    const idValidation = z.string().uuid().safeParse(id);
    if (!idValidation.success) {
        return { error: 'ID de traslado inválido' };
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'No autorizado. Inicie sesión para continuar.' };
    }

    try {
        await transferService.cancelTransfer(supabase, id);
        revalidateTransferPaths(id);
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor';
        console.error('[cancelTransferAction]', error);
        return { error: message };
    }
}
