import { SupabaseClient } from '@supabase/supabase-js';

export interface AttendanceRecord {
    id: string;
    employee_id: string;
    work_date: string;
    check_in?: string;
    check_out?: string;
    status: 'PRESENT' | 'LATE' | 'ABSENT' | 'HOLIDAY';
    overtime_hours: number;
    night_hours: number;
    sunday_hours: number;
    notes?: string;
}

export const attendanceService = {
    async getAttendance(client: SupabaseClient, employeeId: string, startDate: string, endDate: string) {
        const { data, error } = await client
            .from('payroll_attendance')
            .select('*')
            .eq('employee_id', employeeId)
            .gte('work_date', startDate)
            .lte('work_date', endDate)
            .order('work_date', { ascending: true });

        if (error) throw error;
        return data as AttendanceRecord[];
    },

    async clockIn(client: SupabaseClient, employeeId: string, tenantId: string) {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        const { data, error } = await client
            .from('payroll_attendance')
            .upsert({
                employee_id: employeeId,
                tenant_id: tenantId,
                work_date: today,
                check_in: now,
                status: 'PRESENT'
            }, { onConflict: 'employee_id, work_date' })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async clockOut(client: SupabaseClient, employeeId: string) {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toISOString();

        // 1. Get current record to calculate hours
        const { data: current, error: fetchError } = await client
            .from('payroll_attendance')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('work_date', today)
            .single();

        if (fetchError) throw fetchError;

        // Calculate hours logic (Simplified for now)
        // In a real scenario, we'd calculate base vs overtime here.

        const { data, error } = await client
            .from('payroll_attendance')
            .update({
                check_out: now
            })
            .eq('id', current.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Resumen de horas para un periodo de nómina
     */
    async getPeriodSummary(client: SupabaseClient, employeeId: string, startDate: string, endDate: string) {
        const records = await this.getAttendance(client, employeeId, startDate, endDate);

        return records.reduce((acc, r) => ({
            overtime: acc.overtime + Number(r.overtime_hours || 0),
            night: acc.night + Number(r.night_hours || 0),
            sunday: acc.sunday + Number(r.sunday_hours || 0),
            daysPresent: acc.daysPresent + (r.status === 'PRESENT' ? 1 : 0)
        }), { overtime: 0, night: 0, sunday: 0, daysPresent: 0 });
    }
};
