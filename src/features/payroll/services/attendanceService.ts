import { SupabaseClient } from '@supabase/supabase-js';
import { WorkSchedule, PunctualityRecord } from '../types';
import { scheduleService } from './scheduleService';

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
    total_worked_hours: number;
    late_minutes: number;
    check_in_lat?: number;
    check_in_lng?: number;
    check_out_lat?: number;
    check_out_lng?: number;
    notes?: string;
}

interface GeoPosition {
    lat: number;
    lng: number;
}

interface HoursCalculation {
    totalWorked: number;
    lateMinutes: number;
    overtimeHours: number;
    nightHours: number;
    sundayHours: number;
    status: 'PRESENT' | 'LATE';
}

// Default schedule if none configured
const DEFAULT_SCHEDULE: WorkSchedule = {
    id: '',
    tenant_id: '',
    name: 'Default',
    start_time: '08:00',
    end_time: '17:00',
    break_minutes: 60,
    grace_minutes: 15,
    is_night_shift: false,
    is_default: true,
};

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

    async clockIn(client: SupabaseClient, employeeId: string, tenantId: string, geo?: GeoPosition) {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const nowIso = now.toISOString();

        // Get employee schedule for lateness detection
        const schedule = await scheduleService.getEmployeeSchedule(client, employeeId) || DEFAULT_SCHEDULE;

        // Calculate lateness
        const { lateMinutes, status } = this.calculateLateness(now, schedule);

        const record: Record<string, unknown> = {
            employee_id: employeeId,
            tenant_id: tenantId,
            work_date: today,
            check_in: nowIso,
            status,
            late_minutes: lateMinutes,
        };

        if (geo) {
            record.check_in_lat = geo.lat;
            record.check_in_lng = geo.lng;
        }

        const { data, error } = await client
            .from('payroll_attendance')
            .upsert(record, { onConflict: 'employee_id, work_date' })
            .select()
            .single();

        if (error) throw error;
        return { ...data, schedule };
    },

    async clockOut(client: SupabaseClient, employeeId: string, geo?: GeoPosition) {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const nowIso = now.toISOString();

        // Get current record
        const { data: current, error: fetchError } = await client
            .from('payroll_attendance')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('work_date', today)
            .single();

        if (fetchError) throw fetchError;
        if (!current?.check_in) throw new Error('No hay registro de entrada para hoy');

        // Get schedule for hour calculations
        const schedule = await scheduleService.getEmployeeSchedule(client, employeeId) || DEFAULT_SCHEDULE;

        // Auto-calculate all hours
        const checkIn = new Date(current.check_in);
        const calc = this.calculateHours(checkIn, now, schedule);

        const updates: Record<string, unknown> = {
            check_out: nowIso,
            total_worked_hours: calc.totalWorked,
            overtime_hours: calc.overtimeHours,
            night_hours: calc.nightHours,
            sunday_hours: calc.sundayHours,
            late_minutes: calc.lateMinutes,
            status: calc.status,
        };

        if (geo) {
            updates.check_out_lat = geo.lat;
            updates.check_out_lng = geo.lng;
        }

        const { data, error } = await client
            .from('payroll_attendance')
            .update(updates)
            .eq('id', current.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Calcula tardanza basada en hora de entrada vs horario
     */
    calculateLateness(checkInTime: Date, schedule: WorkSchedule): { lateMinutes: number; status: 'PRESENT' | 'LATE' } {
        const [startH, startM] = schedule.start_time.split(':').map(Number);
        const scheduledStart = new Date(checkInTime);
        scheduledStart.setHours(startH, startM, 0, 0);

        // Add grace period
        const graceEnd = new Date(scheduledStart.getTime() + schedule.grace_minutes * 60000);

        if (checkInTime > graceEnd) {
            const lateMs = checkInTime.getTime() - scheduledStart.getTime();
            const lateMinutes = Math.round(lateMs / 60000);
            return { lateMinutes, status: 'LATE' };
        }

        return { lateMinutes: 0, status: 'PRESENT' };
    },

    /**
     * Calcula horas trabajadas, extras, nocturnas y dominicales
     * Basado en legislacion colombiana (Art. 160-168 CST):
     * - Jornada nocturna: 21:00-06:00
     * - Hora extra diurna: 1.25x
     * - Hora extra nocturna: 1.75x
     * - Dominical/festivo: 2.0x
     */
    calculateHours(checkIn: Date, checkOut: Date, schedule: WorkSchedule): HoursCalculation {
        const totalMs = checkOut.getTime() - checkIn.getTime();
        const totalHoursRaw = totalMs / 3600000;
        const breakHours = schedule.break_minutes / 60;
        const totalWorked = Math.max(0, Math.round((totalHoursRaw - breakHours) * 100) / 100);

        // Calculate standard work hours from schedule
        const [startH, startM] = schedule.start_time.split(':').map(Number);
        const [endH, endM] = schedule.end_time.split(':').map(Number);
        const scheduleHours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60 - breakHours;

        // Lateness
        const { lateMinutes, status } = this.calculateLateness(checkIn, schedule);

        // Overtime: hours beyond standard schedule
        const overtimeHours = Math.max(0, Math.round((totalWorked - scheduleHours) * 100) / 100);

        // Night hours: segments between 21:00-06:00 (Colombian law Art. 160 CST)
        const nightHours = this.calculateNightHours(checkIn, checkOut);

        // Sunday hours: if day is Sunday (0), all worked hours count as sunday
        const isSunday = checkIn.getDay() === 0;
        const sundayHours = isSunday ? totalWorked : 0;

        return {
            totalWorked,
            lateMinutes,
            overtimeHours,
            nightHours: Math.round(nightHours * 100) / 100,
            sundayHours: Math.round(sundayHours * 100) / 100,
            status,
        };
    },

    /**
     * Calcula horas en franja nocturna (21:00-06:00) para un rango dado
     */
    calculateNightHours(checkIn: Date, checkOut: Date): number {
        let nightMinutes = 0;
        const current = new Date(checkIn);

        while (current < checkOut) {
            const hour = current.getHours();
            const isNight = hour >= 21 || hour < 6;

            if (isNight) {
                const nextMinute = new Date(current.getTime() + 60000);
                const end = nextMinute > checkOut ? checkOut : nextMinute;
                nightMinutes += (end.getTime() - current.getTime()) / 60000;
            }

            current.setTime(current.getTime() + 60000);
        }

        return nightMinutes / 60;
    },

    /**
     * Valida si la posicion GPS esta dentro de alguna zona de trabajo
     */
    async validateGeoZone(client: SupabaseClient, lat: number, lng: number): Promise<{ valid: boolean; zone?: string; distance?: number }> {
        const { data: zones } = await client
            .from('attendance_geo_zones')
            .select('*')
            .eq('is_active', true);

        if (!zones || zones.length === 0) {
            // No zones configured = always valid
            return { valid: true };
        }

        for (const zone of zones) {
            const distance = this.haversineDistance(lat, lng, zone.lat, zone.lng);
            if (distance <= zone.radius_meters) {
                return { valid: true, zone: zone.name, distance: Math.round(distance) };
            }
        }

        // Return closest zone
        const closest = zones.reduce((min, z) => {
            const d = this.haversineDistance(lat, lng, z.lat, z.lng);
            return d < min.d ? { d, name: z.name } : min;
        }, { d: Infinity, name: '' });

        return { valid: false, zone: closest.name, distance: Math.round(closest.d) };
    },

    /**
     * Haversine formula for distance between two GPS coordinates (in meters)
     */
    haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    },

    /**
     * Resumen de horas para un periodo de nomina
     */
    async getPeriodSummary(client: SupabaseClient, employeeId: string, startDate: string, endDate: string) {
        const records = await this.getAttendance(client, employeeId, startDate, endDate);

        return records.reduce((acc, r) => ({
            overtime: acc.overtime + Number(r.overtime_hours || 0),
            night: acc.night + Number(r.night_hours || 0),
            sunday: acc.sunday + Number(r.sunday_hours || 0),
            daysPresent: acc.daysPresent + (['PRESENT', 'LATE'].includes(r.status) ? 1 : 0),
            totalWorkedHours: acc.totalWorkedHours + Number(r.total_worked_hours || 0),
        }), { overtime: 0, night: 0, sunday: 0, daysPresent: 0, totalWorkedHours: 0 });
    },

    /**
     * Reporte de puntualidad por empleado para un rango de fechas
     */
    async getPunctualityReport(
        client: SupabaseClient,
        startDate: string,
        endDate: string
    ): Promise<PunctualityRecord[]> {
        // Get all active employees
        const { data: employees } = await client
            .from('employees')
            .select('id, party:parties(legal_name), status')
            .eq('status', 'ACTIVE');

        if (!employees || employees.length === 0) return [];

        // Get all attendance records for the period
        const { data: records } = await client
            .from('payroll_attendance')
            .select('employee_id, status, late_minutes, overtime_hours, total_worked_hours')
            .gte('work_date', startDate)
            .lte('work_date', endDate);

        if (!records) return [];

        // Calculate working days in range
        const start = new Date(startDate);
        const end = new Date(endDate);
        let workingDays = 0;
        const d = new Date(start);
        while (d <= end) {
            if (d.getDay() !== 0) workingDays++; // Exclude Sundays
            d.setDate(d.getDate() + 1);
        }

        return employees.map(emp => {
            const empRecords = records.filter(r => r.employee_id === emp.id);
            const presentDays = empRecords.filter(r => r.status === 'PRESENT').length;
            const lateDays = empRecords.filter(r => r.status === 'LATE').length;
            const totalDays = workingDays;
            const absentDays = Math.max(0, totalDays - presentDays - lateDays);
            const lateMinutesArr = empRecords.filter(r => r.late_minutes > 0).map(r => r.late_minutes);
            const avgLateMinutes = lateMinutesArr.length > 0
                ? Math.round(lateMinutesArr.reduce((a: number, b: number) => a + b, 0) / lateMinutesArr.length)
                : 0;

            const partyData = emp.party as unknown as { legal_name: string } | { legal_name: string }[] | null;
            const name = Array.isArray(partyData) ? partyData[0]?.legal_name : partyData?.legal_name;

            return {
                employee_id: emp.id,
                name: name || 'Sin nombre',
                totalDays,
                presentDays: presentDays + lateDays, // Present includes late
                lateDays,
                absentDays,
                punctualityRate: totalDays > 0 ? Math.round(((presentDays) / totalDays) * 100) : 100,
                avgLateMinutes,
                totalOvertimeHours: empRecords.reduce((s, r) => s + Number(r.overtime_hours || 0), 0),
                totalWorkedHours: empRecords.reduce((s, r) => s + Number(r.total_worked_hours || 0), 0),
            };
        });
    },

    /**
     * Obtener estado actual del dia para un empleado
     */
    async getTodayStatus(client: SupabaseClient, employeeId: string) {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await client
            .from('payroll_attendance')
            .select('*')
            .eq('employee_id', employeeId)
            .eq('work_date', today)
            .maybeSingle();

        return data as AttendanceRecord | null;
    }
};
