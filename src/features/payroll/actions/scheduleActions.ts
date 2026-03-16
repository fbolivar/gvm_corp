'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { scheduleService } from '../services/scheduleService';

export async function createScheduleAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data: ut } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
    if (!ut) throw new Error('Sin tenant');

    await scheduleService.createSchedule(supabase, ut.tenant_id, {
        name: formData.get('name') as string,
        start_time: formData.get('start_time') as string,
        end_time: formData.get('end_time') as string,
        break_minutes: Number(formData.get('break_minutes') || 60),
        grace_minutes: Number(formData.get('grace_minutes') || 15),
        is_night_shift: formData.get('is_night_shift') === 'true',
        is_default: formData.get('is_default') === 'true',
    });

    revalidatePath('/payroll/schedules');
}

export async function updateScheduleAction(id: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    await scheduleService.updateSchedule(supabase, id, {
        name: formData.get('name') as string,
        start_time: formData.get('start_time') as string,
        end_time: formData.get('end_time') as string,
        break_minutes: Number(formData.get('break_minutes') || 60),
        grace_minutes: Number(formData.get('grace_minutes') || 15),
        is_night_shift: formData.get('is_night_shift') === 'true',
        is_default: formData.get('is_default') === 'true',
    });

    revalidatePath('/payroll/schedules');
}

export async function deleteScheduleAction(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    await scheduleService.deleteSchedule(supabase, id);
    revalidatePath('/payroll/schedules');
}

export async function assignScheduleAction(employeeId: string, scheduleId: string | null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    await scheduleService.assignSchedule(supabase, employeeId, scheduleId);
    revalidatePath('/payroll/schedules');
}
