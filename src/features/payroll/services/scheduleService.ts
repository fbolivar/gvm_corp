import { SupabaseClient } from '@supabase/supabase-js';
import { WorkSchedule } from '../types';

export const scheduleService = {
    async getSchedules(client: SupabaseClient): Promise<WorkSchedule[]> {
        const { data, error } = await client
            .from('work_schedules')
            .select('*')
            .order('is_default', { ascending: false })
            .order('name');

        if (error) throw error;
        return data as WorkSchedule[];
    },

    async getDefaultSchedule(client: SupabaseClient): Promise<WorkSchedule | null> {
        const { data, error } = await client
            .from('work_schedules')
            .select('*')
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
                .select('*')
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

        const { data, error } = await client
            .from('work_schedules')
            .insert({ ...schedule, tenant_id: tenantId })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateSchedule(client: SupabaseClient, id: string, updates: Partial<WorkSchedule>) {
        if (updates.is_default) {
            await client
                .from('work_schedules')
                .update({ is_default: false })
                .eq('is_default', true);
        }

        const { data, error } = await client
            .from('work_schedules')
            .update(updates)
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
