'use server';

import { createClient } from '@/lib/supabase/server';
import { fiscalPeriodService, PeriodStatus } from './services/fiscalPeriodService';
import { revalidatePath } from 'next/cache';

export async function createFiscalPeriodAction(
    period: string, notes?: string
): Promise<{ id?: string; error?: string }> {
    try {
        const supabase = await createClient();
        const result = await fiscalPeriodService.createPeriod(supabase, period, notes);
        revalidatePath('/accounting/period-close');
        return { id: result.id };
    } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Error creando período' };
    }
}

export async function confirmChecklistItemAction(
    itemId: string, confirm: boolean
): Promise<{ error?: string }> {
    try {
        const supabase = await createClient();
        await fiscalPeriodService.confirmItem(supabase, itemId, confirm);
        revalidatePath('/accounting/period-close');
        return {};
    } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Error confirmando ítem' };
    }
}

export async function updatePeriodStatusAction(
    periodId: string, status: PeriodStatus
): Promise<{ error?: string }> {
    try {
        const supabase = await createClient();
        await fiscalPeriodService.updateStatus(supabase, periodId, status);
        revalidatePath('/accounting/period-close');
        return {};
    } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Error actualizando estado del período' };
    }
}
