'use server'

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { transferService } from '../services/transferService';
import { warehouseTransferSchema } from '../types';

// ─── Validation schemas ────────────────────────────────────────────────────────

const receiveLineSchema = z.object({
    line_id: z.string().uuid(),
    qty_received: z.number().min(0),
});

const receiveTransferSchema = z.object({
    id: z.string().uuid(),
    lines: z.array(receiveLineSchema).min(1, 'Debe proporcionar al menos una línea'),
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
 * Receives an IN_TRANSIT transfer at the destination warehouse.
 * Creates IN inventory movements for each received line and updates qty_received.
 */
export async function receiveTransferAction(
    id: string,
    lines: Array<{ line_id: string; qty_received: number }>
): Promise<ActionResult> {
    const parsed = receiveTransferSchema.safeParse({ id, lines });
    if (!parsed.success) {
        return { error: 'Datos inválidos: ' + JSON.stringify(parsed.error.flatten()) };
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: 'No autorizado. Inicie sesión para continuar.' };
    }

    try {
        await transferService.receiveTransfer(supabase, id, parsed.data.lines);
        revalidateTransferPaths(id);
        revalidatePath('/inventory/movements');
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error interno del servidor';
        console.error('[receiveTransferAction]', error);
        // Partial success: receipt registered but some movements failed
        if (message.includes('advertencias')) {
            revalidateTransferPaths(id);
            revalidatePath('/inventory/movements');
            return { success: true, error: message };
        }
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
