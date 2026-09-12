'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { settingsService } from '@/features/settings/services/settingsService';
import { notificationService } from '@/features/notifications/services/notificationService';
import { trainingService } from './services/trainingService';
import { TrainingCategoryEnum } from './types';

const VIDEO_BUCKET = 'training-videos';

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

// ─── VIDEO / MATERIAL ────────────────────────────────────────────────────────────

/**
 * Adjunta o reemplaza el material en video de un programa.
 * Acepta un archivo ya subido al bucket (video_path) o un enlace externo (video_url).
 * El archivo se sube desde el navegador; aquí solo se persiste la referencia y se
 * limpia el archivo anterior si fue reemplazado.
 */
export async function setProgramVideoAction(
    programId: string,
    input: { video_url?: string | null; video_path?: string | null; video_name?: string | null }
): Promise<{ success?: boolean; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    if (!programId) return { success: false, error: 'Programa requerido' };

    // Normalizar enlace externo (si es lo que se envió)
    let videoUrl = input.video_url?.trim() || null;
    if (videoUrl && !/^https?:\/\//i.test(videoUrl)) {
        videoUrl = `https://${videoUrl}`;
    }

    // El programa debe existir y ser visible para el usuario (RLS lo restringe al tenant)
    const { data: program } = await supabase
        .from('training_programs')
        .select('id, video_path')
        .eq('id', programId)
        .maybeSingle();
    if (!program) return { success: false, error: 'Programa no encontrado' };

    try {
        await trainingService.setProgramVideo(supabase, programId, {
            video_url: videoUrl,
            video_path: input.video_path ?? null,
            video_name: input.video_name ?? null,
        });

        // Borrar el archivo anterior si fue reemplazado (por otro archivo o por un enlace)
        const oldPath = program.video_path as string | null;
        if (oldPath && oldPath !== input.video_path) {
            const admin = createAdminClient();
            await admin.storage.from(VIDEO_BUCKET).remove([oldPath]).catch(() => {});
        }

        revalidatePath('/payroll/training');
        return { success: true };
    } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : 'No se pudo guardar el video' };
    }
}

/** Genera un enlace temporal para ver el video (archivo subido) o devuelve el enlace externo. */
export async function getProgramVideoUrlAction(programId: string): Promise<{ url?: string; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const { data: program } = await supabase
        .from('training_programs')
        .select('video_url, video_path')
        .eq('id', programId)
        .maybeSingle();
    if (!program) return { error: 'Programa no encontrado' };

    if (program.video_url) return { url: program.video_url as string };
    if (!program.video_path) return { error: 'Este programa no tiene video' };

    const admin = createAdminClient();
    const { data, error } = await admin.storage
        .from(VIDEO_BUCKET)
        .createSignedUrl(program.video_path as string, 60 * 60); // 1 hora
    if (error || !data?.signedUrl) return { error: error?.message || 'No se pudo generar el enlace' };
    return { url: data.signedUrl };
}

/** Quita el material en video de un programa (y borra el archivo si lo había). */
export async function removeProgramVideoAction(programId: string): Promise<{ success?: boolean; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data: program } = await supabase
        .from('training_programs')
        .select('video_path')
        .eq('id', programId)
        .maybeSingle();
    if (!program) return { success: false, error: 'Programa no encontrado' };

    try {
        await trainingService.setProgramVideo(supabase, programId, { video_url: null, video_path: null, video_name: null });
        const oldPath = program.video_path as string | null;
        if (oldPath) {
            const admin = createAdminClient();
            await admin.storage.from(VIDEO_BUCKET).remove([oldPath]).catch(() => {});
        }
        revalidatePath('/payroll/training');
        return { success: true };
    } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : 'No se pudo quitar el video' };
    }
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

    // Avisar al empleado en su campana. No debe tumbar la programación si falla.
    await notifyEmployeeOfTraining(tenant.id, employee_id, program_id, scheduled_date)
        .catch(err => console.error('[training] notificación al empleado falló:', err));

    revalidatePath('/payroll/training');
    revalidatePath('/my-payroll');
    return { success: true };
}

/**
 * Asigna un programa a VARIOS empleados de una vez (desde la lista de programas).
 * Crea un registro programado por empleado y le notifica. No falla todo si uno falla.
 */
export async function assignProgramToEmployeesAction(
    programId: string,
    employeeIds: string[],
    scheduledDate: string
): Promise<{ success?: boolean; assigned?: number; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const tenant = await settingsService.getTenantInfo(supabase);
    if (!tenant) return { error: 'Tenant no encontrado' };

    if (!programId) return { error: 'Programa requerido' };
    if (!employeeIds?.length) return { error: 'Selecciona al menos un empleado' };
    if (!scheduledDate || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) return { error: 'Fecha inválida' };

    let assigned = 0;
    for (const employee_id of employeeIds) {
        try {
            await trainingService.createRecord(supabase, {
                tenant_id: tenant.id,
                employee_id,
                program_id: programId,
                scheduled_date: scheduledDate,
                status: 'SCHEDULED',
                completion_date: null,
                score: null,
                certificate_number: null,
                notes: null,
            });
            await notifyEmployeeOfTraining(tenant.id, employee_id, programId, scheduledDate).catch(() => {});
            assigned++;
        } catch (err) {
            console.error('[training] assign a empleado falló:', err);
        }
    }

    revalidatePath('/payroll/training');
    revalidatePath('/my-payroll');
    return { success: true, assigned };
}

/**
 * Notifica in-app al empleado que le programaron una capacitación.
 * Usa admin client porque debe escribir una notificación dirigida a OTRO usuario
 * (el empleado), no al usuario de RRHH que ejecuta la acción.
 */
async function notifyEmployeeOfTraining(
    tenantId: string,
    employeeId: string,
    programId: string,
    scheduledDate: string
): Promise<void> {
    const admin = createAdminClient();

    const [{ data: employee }, { data: program }] = await Promise.all([
        admin.from('employees').select('user_id').eq('id', employeeId).maybeSingle(),
        admin.from('training_programs')
            .select('name, is_mandatory, video_url, video_path')
            .eq('id', programId).maybeSingle(),
    ]);

    // Empleado sin usuario vinculado no tiene portal donde recibirla.
    if (!employee?.user_id) return;

    const nombre = program?.name ?? 'una capacitación';
    const obligatoria = program?.is_mandatory ? ' (obligatoria)' : '';
    const conVideo = Boolean(program?.video_url || program?.video_path);
    const fecha = formatDateCO(scheduledDate);

    await notificationService.createInAppNotification(admin, {
        user_id: employee.user_id as string,
        tenant_id: tenantId,
        title: '🎓 Nueva capacitación asignada',
        body: `Se te programó «${nombre}»${obligatoria} para el ${fecha}.` +
            (conVideo ? ' Ya puedes ver el video y marcarla como vista.' : ''),
        category: 'OPERATIONS',
        priority: program?.is_mandatory ? 'HIGH' : 'MEDIUM',
        link: '/my-payroll',
    });
}

/** Fecha date-only a formato local Bogotá (evita el corrimiento de un día por UTC). */
function formatDateCO(date: string): string {
    const [y, m, d] = date.split('-').map(Number);
    if (!y || !m || !d) return date;
    return new Date(y, m - 1, d).toLocaleDateString('es-CO', {
        day: 'numeric', month: 'long', year: 'numeric',
    });
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

// ─── PORTAL DEL EMPLEADO ───────────────────────────────────────────────────────

/**
 * El empleado marca SU capacitación como vista desde /my-payroll.
 *
 * Seguridad: la RLS de training_records es tenant-wide (cualquier miembro de la
 * empresa podría tocar registros ajenos), así que NO nos apoyamos en ella:
 * resolvemos la ficha del empleado desde el user_id autenticado con admin client
 * y el UPDATE va filtrado por ese employee_id. Un empleado solo puede completar
 * la suya, aunque manipule el id que envía.
 */
export async function selfCompleteTrainingAction(
    recordId: string
): Promise<{ success?: boolean; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };
    if (!recordId) return { success: false, error: 'Capacitación requerida' };

    const admin = createAdminClient();

    // Ficha del empleado dueño de ESTE usuario autenticado
    const { data: employee } = await admin
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
    if (!employee) return { success: false, error: 'Tu usuario no está vinculado a una ficha de empleado' };

    try {
        const updated = await trainingService.selfCompleteRecord(admin, recordId, employee.id as string);
        if (!updated) {
            return { success: false, error: 'No se pudo marcar: la capacitación no es tuya o ya no está pendiente' };
        }
        revalidatePath('/my-payroll');
        revalidatePath('/payroll/training');
        return { success: true };
    } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : 'No se pudo marcar la capacitación' };
    }
}

// ─── RESCHEDULE ────────────────────────────────────────────────────────────────

export async function rescheduleTrainingAction(
    recordId: string,
    newDate: string
): Promise<{ success?: boolean; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const date = newDate?.trim();
    if (!date) return { success: false, error: 'Fecha requerida' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false, error: 'Fecha inválida' };

    try {
        const updated = await trainingService.rescheduleRecord(supabase, recordId, date);

        // Avisar al empleado del cambio de fecha (si no, se queda con la anterior).
        if (updated) {
            await notifyEmployeeOfReschedule(recordId, date)
                .catch(err => console.error('[training] notificación de reprogramación falló:', err));
        }

        revalidatePath('/payroll/training');
        revalidatePath('/my-payroll');
        return { success: true };
    } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : 'No se pudo reprogramar' };
    }
}

/** Notifica al empleado que su capacitación cambió de fecha. */
async function notifyEmployeeOfReschedule(recordId: string, newDate: string): Promise<void> {
    const admin = createAdminClient();

    const { data: record } = await admin
        .from('training_records')
        .select('tenant_id, employee:employees(user_id), program:training_programs(name)')
        .eq('id', recordId)
        .maybeSingle();
    if (!record) return;

    // PostgREST devuelve las relaciones embebidas como objeto o array según el caso.
    const emp = Array.isArray(record.employee) ? record.employee[0] : record.employee;
    const prog = Array.isArray(record.program) ? record.program[0] : record.program;
    const userId = (emp as { user_id?: string } | null)?.user_id;
    if (!userId) return;

    await notificationService.createInAppNotification(admin, {
        user_id: userId,
        tenant_id: record.tenant_id as string,
        title: '📅 Capacitación reprogramada',
        body: `«${(prog as { name?: string } | null)?.name ?? 'Tu capacitación'}» quedó para el ${formatDateCO(newDate)}.`,
        category: 'OPERATIONS',
        priority: 'MEDIUM',
        link: '/my-payroll',
    });
}
