'use server'

import { createClient } from '@/lib/supabase/server'
import { accountingService } from './services/accountingService'
import { accountFormSchema, AccountFormData } from './types'
import { revalidatePath } from 'next/cache'

export async function createAccountAction(
    data: AccountFormData
): Promise<{ id?: string; error?: string }> {
    try {
        const parsed = accountFormSchema.safeParse(data);
        if (!parsed.success) {
            return { error: parsed.error.issues[0]?.message || 'Datos inválidos' };
        }

        const supabase = await createClient();
        const account = await accountingService.createAccount(supabase, parsed.data);

        revalidatePath('/accounting/accounts');
        return { id: account.id };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al crear cuenta';
        if (msg.includes('duplicate') || msg.includes('unique')) {
            return { error: 'Ya existe una cuenta con ese código' };
        }
        return { error: msg };
    }
}

export async function updateAccountAction(
    id: string,
    data: AccountFormData
): Promise<{ error?: string }> {
    try {
        const parsed = accountFormSchema.safeParse(data);
        if (!parsed.success) {
            return { error: parsed.error.issues[0]?.message || 'Datos inválidos' };
        }

        const supabase = await createClient();
        await accountingService.updateAccount(supabase, id, parsed.data);

        revalidatePath('/accounting/accounts');
        return {};
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error al actualizar cuenta';
        if (msg.includes('duplicate') || msg.includes('unique')) {
            return { error: 'Ya existe una cuenta con ese código' };
        }
        return { error: msg };
    }
}

export async function deleteAccountAction(
    id: string
): Promise<{ error?: string }> {
    try {
        const supabase = await createClient();
        await accountingService.deleteAccount(supabase, id);

        revalidatePath('/accounting/accounts');
        return {};
    } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Error al eliminar cuenta' };
    }
}

export async function toggleAccountActiveAction(
    id: string,
    isActive: boolean
): Promise<{ error?: string }> {
    try {
        const supabase = await createClient();
        await accountingService.toggleAccountActive(supabase, id, isActive);

        revalidatePath('/accounting/accounts');
        return {};
    } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Error al cambiar estado' };
    }
}
