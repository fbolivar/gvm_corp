'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { budgetSchema, budgetLineSchema } from './types';

export async function createBudget(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data: ut } = await supabase
        .from('user_tenants').select('tenant_id').eq('user_id', user.id).single();
    if (!ut) throw new Error('Sin tenant');

    const raw = {
        tenant_id:   ut.tenant_id,
        name:        formData.get('name') as string,
        description: formData.get('description') as string || null,
        year:        parseInt(formData.get('year') as string, 10),
        period_type: formData.get('period_type') as string || 'ANNUAL',
        status:      'DRAFT' as const,
        total_income:  0,
        total_expense: 0,
        created_by:  user.id,
    };

    const parsed = budgetSchema.safeParse(raw);
    if (!parsed.success) throw new Error(parsed.error.message);

    const { data, error } = await supabase
        .from('budgets')
        .insert(parsed.data)
        .select()
        .single();
    if (error) throw new Error(error.message);

    revalidatePath('/budget');
    redirect(`/budget/${data.id}`);
}

export async function updateBudgetStatus(budgetId: string, status: 'DRAFT' | 'APPROVED' | 'CLOSED') {
    const supabase = await createClient();
    const { error } = await supabase
        .from('budgets').update({ status }).eq('id', budgetId);
    if (error) throw new Error(error.message);
    revalidatePath(`/budget/${budgetId}`);
}

export async function upsertBudgetLine(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data: ut } = await supabase
        .from('user_tenants').select('tenant_id').eq('user_id', user.id).single();
    if (!ut) throw new Error('Sin tenant');

    const budgetId = formData.get('budget_id') as string;
    const raw = {
        id:          formData.get('id') as string || undefined,
        tenant_id:   ut.tenant_id,
        budget_id:   budgetId,
        category:    formData.get('category') as string,
        subcategory: formData.get('subcategory') as string || null,
        line_type:   formData.get('line_type') as 'INCOME' | 'EXPENSE',
        month:       formData.get('month') ? parseInt(formData.get('month') as string, 10) : null,
        amount:      parseFloat(formData.get('amount') as string),
        notes:       formData.get('notes') as string || null,
    };

    const parsed = budgetLineSchema.safeParse(raw);
    if (!parsed.success) throw new Error(parsed.error.message);

    const { error } = await supabase.from('budget_lines').upsert(parsed.data);
    if (error) throw new Error(error.message);

    // Recalculate totals
    const { data: lines } = await supabase
        .from('budget_lines').select('line_type, amount').eq('budget_id', budgetId);
    const totalIncome  = (lines ?? []).filter(l => l.line_type === 'INCOME').reduce((s, l) => s + Number(l.amount), 0);
    const totalExpense = (lines ?? []).filter(l => l.line_type === 'EXPENSE').reduce((s, l) => s + Number(l.amount), 0);
    await supabase.from('budgets').update({ total_income: totalIncome, total_expense: totalExpense }).eq('id', budgetId);

    revalidatePath(`/budget/${budgetId}`);
}

export async function deleteBudgetLine(lineId: string, budgetId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('budget_lines').delete().eq('id', lineId);
    if (error) throw new Error(error.message);

    const { data: lines } = await supabase
        .from('budget_lines').select('line_type, amount').eq('budget_id', budgetId);
    const totalIncome  = (lines ?? []).filter(l => l.line_type === 'INCOME').reduce((s, l) => s + Number(l.amount), 0);
    const totalExpense = (lines ?? []).filter(l => l.line_type === 'EXPENSE').reduce((s, l) => s + Number(l.amount), 0);
    await supabase.from('budgets').update({ total_income: totalIncome, total_expense: totalExpense }).eq('id', budgetId);

    revalidatePath(`/budget/${budgetId}`);
}
