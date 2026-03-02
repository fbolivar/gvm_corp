'use server';

import { createClient } from '@/lib/supabase/server';
import { budgetService, BudgetStatus, MonthKey } from './services/budgetService';
import { revalidatePath } from 'next/cache';

export async function createBudgetAction(
    name: string, year: number, notes?: string
): Promise<{ id?: string; error?: string }> {
    try {
        const supabase = await createClient();
        const result = await budgetService.create(supabase, name, year, notes);
        revalidatePath('/accounting/budget');
        return { id: result.id };
    } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Error creando presupuesto' };
    }
}

export async function upsertBudgetLineAction(
    lineId: string, month: MonthKey, value: number
): Promise<{ error?: string }> {
    try {
        const supabase = await createClient();
        await budgetService.upsertLine(supabase, lineId, month, value);
        return {};
    } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Error actualizando línea' };
    }
}

export async function updateBudgetStatusAction(
    id: string, status: BudgetStatus
): Promise<{ error?: string }> {
    try {
        const supabase = await createClient();
        await budgetService.updateStatus(supabase, id, status);
        revalidatePath('/accounting/budget');
        revalidatePath(`/accounting/budget/${id}`);
        return {};
    } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Error actualizando estado' };
    }
}
