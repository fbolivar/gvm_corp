'use server'

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { pettyCashService, type ExpenseCategory } from '../services/pettyCashService';

// ── Validation schemas ─────────────────────────────────────────────────────────

const createFundSchema = z.object({
    name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
    custodian_id: z.string().uuid().nullable().optional(),
    treasury_account_id: z.string().uuid().nullable().optional(),
    max_amount: z
        .number({ error: 'Monto máximo inválido' })
        .positive('El monto máximo debe ser mayor a 0'),
    opening_balance: z
        .number({ error: 'Saldo inicial inválido' })
        .min(0, 'El saldo inicial no puede ser negativo'),
});

const addExpenseSchema = z.object({
    amount: z
        .number({ error: 'Monto inválido' })
        .positive('El monto debe ser mayor a 0'),
    description: z.string().min(3, 'Descripción debe tener al menos 3 caracteres'),
    receipt_number: z.string().nullable().optional(),
    expense_category: z
        .enum(['TRANSPORTE', 'PAPELERIA', 'ASEO', 'ALIMENTACION', 'OTROS'])
        .nullable()
        .optional(),
});

const reimbursementSchema = z.object({
    amount: z
        .number({ error: 'Monto inválido' })
        .positive('El monto debe ser mayor a 0'),
    description: z.string().min(3, 'Descripción debe tener al menos 3 caracteres'),
});

// ── Action result type ─────────────────────────────────────────────────────────

interface ActionResult {
    success?: boolean;
    error?: string;
    id?: string;
}

// ── Actions ────────────────────────────────────────────────────────────────────

export async function createPettyCashFundAction(
    formData: Record<string, unknown>
): Promise<ActionResult> {
    const parsed = createFundSchema.safeParse(formData);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: 'No autorizado' };

        const fund = await pettyCashService.createFund(supabase, parsed.data);
        revalidatePath('/treasury/petty-cash');
        return { success: true, id: fund.id };
    } catch (error: unknown) {
        console.error('[pettyCash] createFundAction:', error);
        return { error: (error as Error).message };
    }
}

export async function addPettyCashExpenseAction(
    fundId: string,
    formData: Record<string, unknown>
): Promise<ActionResult> {
    if (!fundId) return { error: 'ID de fondo requerido' };

    const parsed = addExpenseSchema.safeParse(formData);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: 'No autorizado' };

        const tx = await pettyCashService.addExpense(supabase, fundId, {
            amount: parsed.data.amount,
            description: parsed.data.description,
            receipt_number: parsed.data.receipt_number ?? null,
            expense_category: (parsed.data.expense_category as ExpenseCategory) ?? null,
        });

        revalidatePath('/treasury/petty-cash');
        return { success: true, id: tx.id };
    } catch (error: unknown) {
        console.error('[pettyCash] addExpenseAction:', error);
        return { error: (error as Error).message };
    }
}

export async function addPettyCashReimbursementAction(
    fundId: string,
    formData: Record<string, unknown>
): Promise<ActionResult> {
    if (!fundId) return { error: 'ID de fondo requerido' };

    const parsed = reimbursementSchema.safeParse(formData);
    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };
    }

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: 'No autorizado' };

        const tx = await pettyCashService.addReimbursement(
            supabase,
            fundId,
            parsed.data.amount,
            parsed.data.description
        );

        revalidatePath('/treasury/petty-cash');
        return { success: true, id: tx.id };
    } catch (error: unknown) {
        console.error('[pettyCash] addReimbursementAction:', error);
        return { error: (error as Error).message };
    }
}

export async function closePettyCashFundAction(fundId: string): Promise<ActionResult> {
    if (!fundId) return { error: 'ID de fondo requerido' };

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { error: 'No autorizado' };

        await pettyCashService.closeFund(supabase, fundId);
        revalidatePath('/treasury/petty-cash');
        return { success: true };
    } catch (error: unknown) {
        console.error('[pettyCash] closeFundAction:', error);
        return { error: (error as Error).message };
    }
}
