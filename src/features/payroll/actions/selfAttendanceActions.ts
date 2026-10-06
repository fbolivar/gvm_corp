'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { attendanceService } from '../services/attendanceService';
import { scheduleService } from '../services/scheduleService';
import { bogotaDateString, bogotaTimeLabel } from '../utils/bogotaTime';

/**
 * Asistencia registrada por el propio empleado desde "Mi nómina".
 *
 * Dos casos que la tablet no cubre:
 *  - No puede ir a la oficina: marca entrada REMOTA dejando el motivo.
 *  - Sale antes de su hora (haya entrado por tablet o por la app): registra la
 *    salida con una justificación, que el servidor exige si aún no es la hora.
 *
 * El empleado se resuelve SIEMPRE desde el usuario autenticado; el cliente nunca
 * envía un employee_id. Se usa el admin client filtrado por ese empleado, igual
 * que el resto del portal, porque la RLS de employees protege los salarios.
 */

const geoSchema = z.object({ lat: z.number(), lng: z.number() }).optional();

const remoteSchema = z.object({
    reason: z.string().trim().min(3, 'Escribe el motivo por el que no vas a la oficina.').max(300),
    geo: geoSchema,
});

const clockOutSchema = z.object({
    reason: z.string().trim().max(300).optional().nullable(),
    geo: geoSchema,
});

async function resolveEmployee() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sesión expirada. Vuelve a iniciar sesión.');

    const admin = createAdminClient(user.id);
    // Solo identidad: nada de columnas salariales en este flujo, aunque el
    // admin client salte la RLS de employees.
    const { data: employee } = await admin
        .from('employees')
        .select('id, tenant_id, status')
        .eq('user_id', user.id)
        .maybeSingle();
    if (!employee?.id || !employee.tenant_id) {
        throw new Error('Tu usuario no está vinculado a un empleado. Pide a Nómina que lo vincule.');
    }
    return { admin, employee: { id: employee.id, tenant_id: employee.tenant_id } };
}

export interface MyAttendanceToday {
    date: string;
    check_in: string | null;
    check_out: string | null;
    check_in_mode: 'KIOSK' | 'APP' | 'REMOTE' | 'MANUAL' | null;
    check_in_terminal: string | null;
    remote_reason: string | null;
    early_leave_reason: string | null;
    late_minutes: number;
    total_worked_hours: number;
    /** Hora de fin del turno de hoy ('HH:MM'); null si el turno es flexible. */
    expected_end: string | null;
    /** true si salir AHORA sería antes de la hora del turno. */
    leaving_now_is_early: boolean;
}

/** Estado de hoy para pintar el widget. */
export async function getMyAttendanceTodayAction(): Promise<MyAttendanceToday> {
    const { admin, employee } = await resolveEmployee();

    const [{ data: record }, schedule] = await Promise.all([
        admin
            .from('payroll_attendance')
            .select('check_in, check_out, check_in_mode, remote_reason, early_leave_reason, late_minutes, total_worked_hours, terminal:kiosk_terminals!check_in_terminal_id(name)')
            .eq('employee_id', employee.id)
            .eq('work_date', bogotaDateString())
            .maybeSingle(),
        scheduleService.getEmployeeSchedule(admin, employee.id),
    ]);

    const early = schedule ? attendanceService.isEarlyLeave(new Date(), schedule) : { early: false, expectedEnd: '' };
    const terminal = record?.terminal as { name?: string } | { name?: string }[] | null | undefined;

    return {
        date: bogotaDateString(),
        check_in: record?.check_in ?? null,
        check_out: record?.check_out ?? null,
        check_in_mode: (record?.check_in_mode as MyAttendanceToday['check_in_mode']) ?? null,
        check_in_terminal: (Array.isArray(terminal) ? terminal[0]?.name : terminal?.name) ?? null,
        remote_reason: record?.remote_reason ?? null,
        early_leave_reason: record?.early_leave_reason ?? null,
        late_minutes: Number(record?.late_minutes ?? 0),
        total_worked_hours: Number(record?.total_worked_hours ?? 0),
        expected_end: schedule?.is_flexible ? null : early.expectedEnd || null,
        leaving_now_is_early: early.early,
    };
}

/**
 * Entrada normal desde la app (sedes sin tablet). Queda como APP para
 * distinguirla de la tablet (KIOSK) y del trabajo fuera de la oficina (REMOTE).
 */
export async function appClockInAction(input: { geo?: { lat: number; lng: number } }) {
    const parsed = z.object({ geo: geoSchema }).safeParse(input ?? {});
    if (!parsed.success) return { error: 'Datos inválidos' };

    try {
        const { admin, employee } = await resolveEmployee();

        const { data: existing } = await admin
            .from('payroll_attendance')
            .select('check_in')
            .eq('employee_id', employee.id)
            .eq('work_date', bogotaDateString())
            .maybeSingle();
        if (existing?.check_in) return { error: 'Hoy ya tienes una entrada registrada.' };

        const result = await attendanceService.clockIn(
            admin, employee.id, employee.tenant_id, parsed.data.geo, undefined, { mode: 'APP' },
        );

        revalidatePath('/my-payroll');
        revalidatePath('/payroll/attendance');
        return { success: true, time: bogotaTimeLabel(), late_minutes: Number(result.late_minutes ?? 0) };
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'No se pudo registrar la entrada' };
    }
}

/** Entrada sin ir a la oficina, con motivo obligatorio. */
export async function remoteClockInAction(input: { reason: string; geo?: { lat: number; lng: number } }) {
    const parsed = remoteSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

    try {
        const { admin, employee } = await resolveEmployee();

        const { data: existing } = await admin
            .from('payroll_attendance')
            .select('check_in')
            .eq('employee_id', employee.id)
            .eq('work_date', bogotaDateString())
            .maybeSingle();
        if (existing?.check_in) return { error: 'Hoy ya tienes una entrada registrada.' };

        const result = await attendanceService.clockIn(
            admin, employee.id, employee.tenant_id, parsed.data.geo, undefined,
            { mode: 'REMOTE', remoteReason: parsed.data.reason },
        );

        revalidatePath('/my-payroll');
        revalidatePath('/payroll/attendance');
        return { success: true, time: bogotaTimeLabel(), late_minutes: Number(result.late_minutes ?? 0) };
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'No se pudo registrar la entrada' };
    }
}

/**
 * Salida desde la app. Si aún no es la hora de fin del turno, la justificación
 * es obligatoria; el servidor lo decide, no el navegador.
 */
export async function selfClockOutAction(input: { reason?: string | null; geo?: { lat: number; lng: number } }) {
    const parsed = clockOutSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' };

    try {
        const { admin, employee } = await resolveEmployee();

        const schedule = await scheduleService.getEmployeeSchedule(admin, employee.id);
        const early = schedule ? attendanceService.isEarlyLeave(new Date(), schedule) : { early: false, expectedEnd: '' , minutesEarly: 0 };
        const reason = parsed.data.reason?.trim() || null;

        if (early.early && (!reason || reason.length < 3)) {
            return {
                error: `Tu turno termina a las ${early.expectedEnd}. Para salir antes escribe la justificación.`,
                early: true,
                expected_end: early.expectedEnd,
            };
        }

        const result = await attendanceService.clockOut(
            admin, employee.id, parsed.data.geo, undefined,
            { earlyLeaveReason: early.early ? reason : null },
        );

        revalidatePath('/my-payroll');
        revalidatePath('/payroll/attendance');
        return {
            success: true,
            time: bogotaTimeLabel(),
            early: early.early,
            total_worked_hours: Number(result.total_worked_hours ?? 0),
        };
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'No se pudo registrar la salida' };
    }
}

/**
 * Justificar una salida anticipada que ya quedó registrada (por ejemplo, marcó
 * la salida en la tablet y luego escribe el motivo desde el celular).
 */
export async function justifyEarlyLeaveAction(input: { reason: string }) {
    const reason = String(input.reason ?? '').trim();
    if (reason.length < 3) return { error: 'Escribe la justificación.' };

    try {
        const { admin, employee } = await resolveEmployee();
        const { error } = await admin
            .from('payroll_attendance')
            .update({ early_leave_reason: reason.slice(0, 300) })
            .eq('employee_id', employee.id)
            .eq('work_date', bogotaDateString())
            .not('check_out', 'is', null);
        if (error) return { error: 'No se pudo guardar la justificación' };

        revalidatePath('/my-payroll');
        revalidatePath('/payroll/attendance');
        return { success: true };
    } catch (e) {
        return { error: e instanceof Error ? e.message : 'No se pudo guardar la justificación' };
    }
}
