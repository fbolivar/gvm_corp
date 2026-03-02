'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ─── Validation Schema ────────────────────────────────────────────────────────

const AttendanceStatusEnum = z.enum(['PRESENT', 'LATE', 'ABSENT', 'HOLIDAY']);

const upsertAttendanceSchema = z.object({
    employee_id: z.string().uuid('ID de empleado inválido'),
    work_date: z.string().refine((v) => !isNaN(Date.parse(v)), 'Fecha inválida'),
    status: AttendanceStatusEnum,
    overtime_hours: z.number().min(0).max(24).default(0),
    night_hours: z.number().min(0).max(24).default(0),
    sunday_hours: z.number().min(0).max(24).default(0),
    notes: z.string().max(500).optional().nullable(),
});

export type UpsertAttendanceInput = z.infer<typeof upsertAttendanceSchema>;

export type AttendanceActionResult =
    | { success: true; id: string }
    | { success: false; error: string };

// ─── Server Action ─────────────────────────────────────────────────────────────

export async function upsertAttendanceAction(
    data: UpsertAttendanceInput
): Promise<AttendanceActionResult> {
    const supabase = await createClient();

    // Auth guard
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    // Resolve tenant
    const { data: userTenant, error: tenantError } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

    if (tenantError || !userTenant?.tenant_id) {
        return { success: false, error: 'No se pudo resolver el tenant' };
    }

    // Validate input
    const parsed = upsertAttendanceSchema.safeParse(data);
    if (!parsed.success) {
        const message = parsed.error.issues.map((e: { message: string }) => e.message).join(', ');
        return { success: false, error: message };
    }

    const {
        employee_id,
        work_date,
        status,
        overtime_hours,
        night_hours,
        sunday_hours,
        notes,
    } = parsed.data;

    // Upsert — conflict on (employee_id, work_date)
    const { data: record, error } = await supabase
        .from('payroll_attendance')
        .upsert(
            {
                tenant_id: userTenant.tenant_id,
                employee_id,
                work_date,
                status,
                overtime_hours,
                night_hours,
                sunday_hours,
                notes: notes ?? null,
            },
            { onConflict: 'employee_id,work_date' }
        )
        .select('id')
        .single();

    if (error) {
        console.error('[upsertAttendanceAction]', error);
        return { success: false, error: error.message };
    }

    revalidatePath('/payroll/attendance');
    return { success: true, id: record.id };
}
