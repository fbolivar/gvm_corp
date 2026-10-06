'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { scheduleService } from '../services/scheduleService';
import { canViewModule } from '@/shared/lib/moduleGuard';
import type { WorkScheduleDay } from '../types';

/**
 * Excepciones por día del formulario (`day_<weekday>_start` / `day_<weekday>_end`).
 * Un día cuenta solo si trae las dos horas; el resto usa el horario base.
 */
function parseScheduleDays(formData: FormData): WorkScheduleDay[] {
    const days: WorkScheduleDay[] = [];
    for (let weekday = 0; weekday <= 6; weekday++) {
        const start = String(formData.get(`day_${weekday}_start`) ?? '').trim();
        const end = String(formData.get(`day_${weekday}_end`) ?? '').trim();
        if (start && end) days.push({ weekday, start_time: start, end_time: end });
    }
    return days;
}

export async function createScheduleAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    if (!(await canViewModule('payroll:schedules'))) throw new Error('No autorizado para gestionar turnos');

    const { data: ut } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();
    if (!ut) throw new Error('Sin tenant');

    const created = await scheduleService.createSchedule(supabase, ut.tenant_id, {
        name: formData.get('name') as string,
        start_time: formData.get('start_time') as string,
        end_time: formData.get('end_time') as string,
        break_minutes: Number(formData.get('break_minutes') || 60),
        grace_minutes: Number(formData.get('grace_minutes') || 15),
        is_night_shift: formData.get('is_night_shift') === 'true',
        is_default: formData.get('is_default') === 'true',
        is_flexible: formData.get('is_flexible') === 'true',
    });

    const days = parseScheduleDays(formData);
    if (days.length > 0 && created?.id) {
        await scheduleService.setScheduleDays(supabase, created.id, days);
    }

    revalidatePath('/payroll/schedules');
}

export async function updateScheduleAction(id: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    if (!(await canViewModule('payroll:schedules'))) throw new Error('No autorizado para gestionar turnos');

    await scheduleService.updateSchedule(supabase, id, {
        name: formData.get('name') as string,
        start_time: formData.get('start_time') as string,
        end_time: formData.get('end_time') as string,
        break_minutes: Number(formData.get('break_minutes') || 60),
        grace_minutes: Number(formData.get('grace_minutes') || 15),
        is_night_shift: formData.get('is_night_shift') === 'true',
        is_default: formData.get('is_default') === 'true',
        is_flexible: formData.get('is_flexible') === 'true',
    });

    await scheduleService.setScheduleDays(supabase, id, parseScheduleDays(formData));

    revalidatePath('/payroll/schedules');
}

export async function deleteScheduleAction(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    if (!(await canViewModule('payroll:schedules'))) throw new Error('No autorizado para gestionar turnos');

    await scheduleService.deleteSchedule(supabase, id);
    revalidatePath('/payroll/schedules');
}

export async function assignScheduleAction(employeeId: string, scheduleId: string | null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    if (!(await canViewModule('payroll:schedules'))) throw new Error('No autorizado para gestionar turnos');

    await scheduleService.assignSchedule(supabase, employeeId, scheduleId);
    revalidatePath('/payroll/schedules');
}
