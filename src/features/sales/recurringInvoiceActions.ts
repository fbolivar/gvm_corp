'use server';

import { createClient } from '@/lib/supabase/server';
import { recurringInvoiceService } from './services/recurringInvoiceService';
import { revalidatePath } from 'next/cache';

export async function generateRecurringInvoiceAction(id: string): Promise<{ docId?: string; error?: string }> {
    try {
        const supabase = await createClient();
        const result = await recurringInvoiceService.generateInvoice(supabase, id);
        revalidatePath('/sales/recurring');
        revalidatePath('/sales/invoices');
        return { docId: result.docId };
    } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Error generando factura' };
    }
}

export async function updateRecurringStatusAction(
    id: string,
    status: 'ACTIVE' | 'PAUSED' | 'CANCELLED'
): Promise<{ error?: string }> {
    try {
        const supabase = await createClient();
        await recurringInvoiceService.updateStatus(supabase, id, status);
        revalidatePath('/sales/recurring');
        return {};
    } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Error actualizando estado' };
    }
}

export async function createRecurringInvoiceAction(
    payload: Parameters<typeof recurringInvoiceService.create>[1]
): Promise<{ id?: string; error?: string }> {
    try {
        const supabase = await createClient();
        const result = await recurringInvoiceService.create(supabase, payload);
        revalidatePath('/sales/recurring');
        return { id: result.id };
    } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Error creando recurrencia' };
    }
}
