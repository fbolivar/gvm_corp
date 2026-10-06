import { SupabaseClient } from '@supabase/supabase-js';
import { WorkSchedule, WorkScheduleDay } from '../types';

export const scheduleService = {
    async getSchedules(client: SupabaseClient): Promise<WorkSchedule[]> {
        const { data, error } = await client
            .from('work_schedules')
            .select('*, days:work_schedule_days(id, weekday, start_time, end_time)')
            .order('is_default', { ascending: false })
            .order('name');

        if (error) throw error;
        return data as WorkSchedule[];
    },

    async getDefaultSchedule(client: SupabaseClient): Promise<WorkSchedule | null> {
        const { data, error } = await client
            .from('work_schedules')
            .select('*, days:work_schedule_days(id, weekday, start_time, end_time)')
            .eq('is_default', true)
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data as WorkSchedule | null;
    },

    async getEmployeeSchedule(client: SupabaseClient, employeeId: string): Promise<WorkSchedule | null> {
        // First try employee's assigned schedule
        const { data: emp } = await client
            .from('employees')
            .select('schedule_id')
            .eq('id', employeeId)
            .single();

        if (emp?.schedule_id) {
            const { data } = await client
                .from('work_schedules')
                .select('*, days:work_schedule_days(id, weekday, start_time, end_time)')
                .eq('id', emp.schedule_id)
                .single();
            if (data) return data as WorkSchedule;
        }

        // Fall back to tenant default
        return this.getDefaultSchedule(client);
    },

    async createSchedule(client: SupabaseClient, tenantId: string, schedule: Omit<WorkSchedule, 'id' | 'tenant_id' | 'created_at'>) {
        // If setting as default, unset other defaults
        if (schedule.is_default) {
            await client
                .from('work_schedules')
                .update({ is_default: false })
                .eq('is_default', true);
        }

        const { days: _days, ...row } = schedule;
        const { data, error } = await client
            .from('work_schedules')
            .insert({ ...row, tenant_id: tenantId })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Reemplaza las excepciones por día de un turno. Se guardan solo los días
     * que difieren del horario base; el resto se borra.
     */
    async setScheduleDays(client: SupabaseClient, scheduleId: string, days: WorkScheduleDay[]) {
        const { error: delError } = await client
            .from('work_schedule_days')
            .delete()
            .eq('schedule_id', scheduleId);
        if (delError) throw delError;

        if (days.length === 0) return;

        const { error } = await client
            .from('work_schedule_days')
            .insert(days.map(d => ({
                schedule_id: scheduleId,
                weekday: d.weekday,
                start_time: d.start_time,
                end_time: d.end_time,
            })));
        if (error) throw error;
    },

    async updateSchedule(client: SupabaseClient, id: string, updates: Partial<WorkSchedule>) {
        if (updates.is_default) {
            await client
                .from('work_schedules')
                .update({ is_default: false })
                .eq('is_default', true);
        }

        const { days: _days, ...row } = updates;
        const { data, error } = await client
            .from('work_schedules')
            .update(row)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteSchedule(client: SupabaseClient, id: string) {
        // Unassign employees first
        await client
            .from('employees')
            .update({ schedule_id: null })
            .eq('schedule_id', id);

        const { error } = await client
            .from('work_schedules')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async assignSchedule(client: SupabaseClient, employeeId: string, scheduleId: string | null) {
        const { error } = await client
            .from('employees')
            .update({ schedule_id: scheduleId })
            .eq('id', employeeId);

        if (error) throw error;
    },

    async getScheduleAssignments(client: SupabaseClient) {
        const { data, error } = await client
            .from('employees')
            .select('id, schedule_id, party:parties(legal_name)')
            .eq('status', 'ACTIVE')
            .order('party(legal_name)');

        if (error) throw error;
        return data;
    }
};
