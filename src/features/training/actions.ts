'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { settingsService } from '@/features/settings/services/settingsService';
import { trainingService } from './services/trainingService';
import { TrainingCategoryEnum } from './types';

// ─── PROGRAMS ──────────────────────────────────────────────────────────────────

export async function createProgramAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) throw new Error('Tenant no encontrado');

    const code = (formData.get('code') as string)?.trim();
    const name = (formData.get('name') as string)?.trim();
    const description = (formData.get('description') as string)?.trim() || null;
    const category = formData.get('category') as string;
    const duration_hours = parseFloat(formData.get('duration_hours') as string);
    const is_mandatory = formData.get('is_mandatory') === 'true';

    if (!code || code.length < 1) throw new Error('Código requerido');
    if (!name || name.length < 1) throw new Error('Nombre requerido');
    if (!duration_hours || duration_hours <= 0) throw new Error('Duración inválida');

    const parsed = TrainingCategoryEnum.safeParse(category);
    if (!parsed.success) throw new Error('Categoría inválida');

    await trainingService.createProgram(supabase, {
        tenant_id: tenant.id,
        code,
        name,
        description,
        category: parsed.data,
        duration_hours,
        is_mandatory,
    });

    revalidatePath('/payroll/training');
    return { success: true };
}

// ─── RECORDS ───────────────────────────────────────────────────────────────────

export async function createTrainingRecordAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) throw new Error('Tenant no encontrado');

    const employee_id = (formData.get('employee_id') as string)?.trim();
    const program_id = (formData.get('program_id') as string)?.trim();
    const scheduled_date = (formData.get('scheduled_date') as string)?.trim();

    if (!employee_id) throw new Error('Empleado requerido');
    if (!program_id) throw new Error('Programa requerido');
    if (!scheduled_date) throw new Error('Fecha requerida');

    await trainingService.createRecord(supabase, {
        tenant_id: tenant.id,
        employee_id,
        program_id,
        scheduled_date,
        status: 'SCHEDULED',
        completion_date: null,
        score: null,
        certificate_number: null,
        notes: null,
    });

    revalidatePath('/payroll/training');
    return { success: true };
}

// ─── COMPLETE ──────────────────────────────────────────────────────────────────

export async function completeTrainingAction(
    recordId: string,
    score: number,
    certificate_number?: string,
    notes?: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    if (score < 0 || score > 100) throw new Error('Puntaje debe estar entre 0 y 100');

    await trainingService.completeRecord(supabase, recordId, score, certificate_number, notes);

    revalidatePath('/payroll/training');
    return { success: true };
}
