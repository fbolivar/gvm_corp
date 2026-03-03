'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { overtimeService } from './services/overtimeService';
import { absenceService, ABSENCE_TYPE_LABELS } from './services/absenceService';
import { notificationService } from '@/features/notifications/services/notificationService';

/** Empleado envía solicitud de hora extra */
export async function submitOvertimeRequest(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    // Obtener el empleado del usuario logueado
    const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, tenant_id, salary, party:parties(legal_name)')
        .eq('user_id', user.id)
        .single();

    if (empError || !employee) throw new Error('Empleado no encontrado');

    const hours = parseFloat(formData.get('hours') as string);
    const reason = formData.get('reason') as string;
    const date = formData.get('date') as string;
    const start_time = (formData.get('start_time') as string) || null;
    const end_time = (formData.get('end_time') as string) || null;

    if (!hours || hours <= 0) throw new Error('Horas inválidas');
    if (!reason || reason.length < 10) throw new Error('Motivo muy corto (mín. 10 caracteres)');
    if (!date) throw new Error('Fecha requerida');

    const request = await overtimeService.create(supabase, {
        tenant_id: employee.tenant_id as string,
        employee_id: employee.id as string,
        date,
        start_time: start_time ?? undefined,
        end_time: end_time ?? undefined,
        hours,
        reason,
    });

    // Notificar a todos los admins del tenant (Jefe de Logística / RRHH)
    const employeeName = (employee.party as any)?.legal_name ?? 'Empleado';
    await notificationService.createInAppNotification(supabase, {
        tenant_id: employee.tenant_id as string,
        title: `⏰ Solicitud de Hora Extra — ${employeeName}`,
        body: `${employeeName} solicita ${hours}h extra el ${date}. Motivo: ${reason.slice(0, 80)}${reason.length > 80 ? '…' : ''}`,
        category: 'GENERAL',
        priority: hours >= 4 ? 'HIGH' : 'MEDIUM',
        link: '/payroll?tab=overtime',
    });

    revalidatePath('/my-payroll');
    return { success: true, id: request.id };
}

/** Aprobador acepta o rechaza una solicitud */
export async function reviewOvertimeRequest(
    requestId: string,
    action: 'APPROVED' | 'REJECTED',
    notes: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const updated = await overtimeService.review(supabase, requestId, action, user.id, notes);

    // Obtener empleado para notificarle
    const { data: req } = await supabase
        .from('overtime_requests')
        .select('employee:employees(user_id, salary, party:parties(legal_name)), tenant_id, date, hours')
        .eq('id', requestId)
        .single();

    if (req) {
        const emp = req.employee as any;
        const label = action === 'APPROVED' ? '✅ APROBADA' : '❌ RECHAZADA';
        const icon = action === 'APPROVED' ? '✅' : '❌';
        await notificationService.createInAppNotification(supabase, {
            user_id: emp?.user_id,
            tenant_id: req.tenant_id as string,
            title: `${label} — Solicitud de Hora Extra`,
            body: `Tu solicitud de ${req.hours}h extra el ${req.date} fue ${action === 'APPROVED' ? 'aprobada' : 'rechazada'}. ${notes ? 'Nota: ' + notes : ''}`,
            category: 'GENERAL',
            priority: 'MEDIUM',
            link: '/my-payroll',
        });
    }

    revalidatePath('/payroll');
    revalidatePath('/my-payroll');
    return { success: true, status: updated.status };
}

// ─── AUSENCIAS ─────────────────────────────────────────────────────────────────

/** Empleado envía solicitud de ausencia */
export async function submitAbsenceRequest(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('id, tenant_id, party:parties(legal_name)')
        .eq('user_id', user.id)
        .single();

    if (empError || !employee) throw new Error('Empleado no encontrado');

    const absence_type = formData.get('absence_type') as string;
    const start_date   = formData.get('start_date') as string;
    const end_date     = formData.get('end_date') as string;
    const reason       = (formData.get('reason') as string) || undefined;

    if (!absence_type || !start_date || !end_date) throw new Error('Campos requeridos');

    const start = new Date(start_date);
    const end   = new Date(end_date);
    if (end < start) throw new Error('La fecha de fin debe ser mayor o igual a la de inicio');

    // Calcular días hábiles (approx: días naturales excluyendo fin de semana)
    let days = 0;
    const cur = new Date(start);
    while (cur <= end) {
        const dow = cur.getDay();
        if (dow !== 0 && dow !== 6) days++;
        cur.setDate(cur.getDate() + 1);
    }
    if (days === 0) days = 1;

    await absenceService.create(supabase, {
        tenant_id: employee.tenant_id as string,
        employee_id: employee.id as string,
        absence_type,
        start_date,
        end_date,
        days,
        reason,
    });

    const employeeName = (employee.party as any)?.legal_name ?? 'Empleado';
    const typeLabel = ABSENCE_TYPE_LABELS[absence_type] ?? absence_type;
    await notificationService.createInAppNotification(supabase, {
        tenant_id: employee.tenant_id as string,
        title: `🗓️ Solicitud de ${typeLabel} — ${employeeName}`,
        body: `${employeeName} solicita ${typeLabel} del ${start_date} al ${end_date} (${days} días).`,
        category: 'GENERAL',
        priority: 'MEDIUM',
        link: '/payroll/absences',
    });

    revalidatePath('/my-payroll');
    return { success: true };
}

/** Aprobador acepta o rechaza solicitud de ausencia */
export async function reviewAbsenceRequest(
    requestId: string,
    action: 'APPROVED' | 'REJECTED',
    notes: string,
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');

    const updated = await absenceService.review(supabase, requestId, action, user.id, notes);

    const { data: req } = await supabase
        .from('absence_requests')
        .select('employee:employees(user_id, party:parties(legal_name)), tenant_id, absence_type, start_date, end_date, days')
        .eq('id', requestId)
        .single();

    if (req) {
        const emp = req.employee as any;
        const typeLabel = ABSENCE_TYPE_LABELS[(req as any).absence_type] ?? (req as any).absence_type;
        const label = action === 'APPROVED' ? '✅ APROBADA' : '❌ RECHAZADA';
        await notificationService.createInAppNotification(supabase, {
            user_id: emp?.user_id,
            tenant_id: req.tenant_id as string,
            title: `${label} — Solicitud de ${typeLabel}`,
            body: `Tu solicitud de ${typeLabel} del ${(req as any).start_date} al ${(req as any).end_date} fue ${action === 'APPROVED' ? 'aprobada' : 'rechazada'}. ${notes ? 'Nota: ' + notes : ''}`,
            category: 'GENERAL',
            priority: 'MEDIUM',
            link: '/my-payroll',
        });
    }

    revalidatePath('/payroll/absences');
    revalidatePath('/my-payroll');
    return { success: true, status: updated.status };
}
