'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { overtimeService } from './services/overtimeService';
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
