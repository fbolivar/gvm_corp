'use server';

import { createClient } from '@/lib/supabase/server';
import { parseLocalDate } from '@/shared/lib/dateFmt';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { overtimeService } from './services/overtimeService';
import { absenceService, ABSENCE_TYPE_LABELS } from './services/absenceService';
import { notificationService } from '@/features/notifications/services/notificationService';
import { canViewModule } from '@/shared/lib/moduleGuard';

// submitOvertimeRequest/submitAbsenceRequest NO se gatean por sub-función: son
// autoservicio (cualquier empleado solicita desde /my-payroll). Las funciones
// de revisión/administración sí, porque son las que "Permisos finos de Nómina"
// debe poder restringir por rol.

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
    if (!(await canViewModule('payroll:overtime'))) throw new Error('No autorizado para revisar horas extra');

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

    // Fechas de solo día como locales: `new Date('YYYY-MM-DD')` es medianoche UTC
    // y el día de la semana se corre según la zona del servidor.
    const start = parseLocalDate(start_date) ?? new Date(start_date);
    const end   = parseLocalDate(end_date) ?? new Date(end_date);
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
    if (!(await canViewModule('payroll:absences'))) throw new Error('No autorizado para revisar ausencias');

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

/** Admin vincula un usuario de auth a un empleado */
export async function linkEmployeeToUserAction(employeeId: string, userId: string | null) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    if (!(await canViewModule('payroll:employees'))) throw new Error('No autorizado para gestionar empleados');

    // If linking (not unlinking), verify the user isn't already linked to another employee
    if (userId) {
        const { data: existing } = await supabase
            .from('employees')
            .select('id')
            .eq('user_id', userId)
            .neq('id', employeeId)
            .maybeSingle();

        if (existing) {
            throw new Error('Este usuario ya esta vinculado a otro empleado');
        }
    }

    const { error } = await supabase
        .from('employees')
        .update({ user_id: userId })
        .eq('id', employeeId);

    if (error) throw new Error(error.message);

    revalidatePath('/payroll/employees');
    revalidatePath('/my-payroll');
    return { success: true };
}

// ─── CREACIÓN DE EMPLEADO ────────────────────────────────────────────────────

interface CreateEmployeeInput {
    party: {
        legal_name: string;
        doc_type: string;
        doc_number: string;
        email?: string | null;
        phone?: string | null;
    };
    contract_type: string;
    start_date: string;
    end_date?: string | null;
    salary: number;
    transport_allowance: boolean;
    risk_level: string;
    eps_name?: string | null;
    arl_name?: string | null;
    commissions?: number;
    collection_commissions?: number;
    additional_allowances?: number;
    mobility_allowance?: number;
    non_salary_bonus?: number;
    salary_bonus?: number;
    payment_method: string;
    bank_name?: string | null;
    bank_account_type?: string | null;
    bank_account_number?: string | null;
    user_id?: string | null;
}

/** Admin crea un nuevo empleado (party + employee) con admin client para bypass RLS.
 *  Returns { success, id } or { error } — never throws (avoids Next.js error overlay). */
export async function createEmployeeAction(input: CreateEmployeeInput): Promise<{ success: true; id: string } | { success: false; error: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };
    if (!(await canViewModule('payroll:employees'))) return { success: false, error: 'No autorizado para crear empleados' };

    const { data: tenantId, error: tenantErr } = await supabase.rpc('get_my_tenant_id');
    if (tenantErr || !tenantId) return { success: false, error: 'No se pudo obtener el tenant' };

    // Pasamos el usuario que actúa para que la auditoría lo registre (no "Sistema").
    const admin = createAdminClient(user.id);

    // Auto-vincular cuenta de usuario para habilitar el acceso a "Mi Nómina".
    // Si no llega un user_id explícito pero el email del colaborador coincide con
    // un usuario existente del tenant (que aún no esté vinculado a otro empleado),
    // se enlaza automáticamente. Es aditivo y a prueba de fallos: si algo falla o
    // no hay coincidencia, el enrolamiento continúa igual, sin vínculo.
    let resolvedUserId: string | null = input.user_id ?? null;
    if (!resolvedUserId && input.party.email) {
        try {
            const email = input.party.email.trim().toLowerCase();
            const { data: tenantUsers } = await admin
                .from('user_tenants')
                .select('user_id')
                .eq('tenant_id', tenantId);
            const userIds = (tenantUsers ?? []).map(u => u.user_id as string);
            if (userIds.length && email) {
                const { data: matches } = await admin
                    .from('profiles')
                    .select('id, email')
                    .in('id', userIds)
                    .ilike('email', email);
                const candidate = (matches ?? [])[0]?.id as string | undefined;
                if (candidate) {
                    const { data: alreadyLinked } = await admin
                        .from('employees')
                        .select('id')
                        .eq('user_id', candidate)
                        .maybeSingle();
                    if (!alreadyLinked) resolvedUserId = candidate;
                }
            }
        } catch (e) {
            console.error('[createEmployee] auto-vinculación por email falló (no crítico):', e);
        }
    }

    // 1. Find or create party (upsert to handle races)
    const { data: party, error: partyError } = await admin
        .from('parties')
        .upsert({
            tenant_id: tenantId,
            party_type: 'PERSON',
            legal_name: input.party.legal_name,
            doc_type: input.party.doc_type,
            doc_number: input.party.doc_number,
            email: input.party.email || null,
            phone: input.party.phone || null,
            is_vendor: false,
            is_customer: false,
        }, { onConflict: 'tenant_id, doc_type, doc_number' })
        .select('id')
        .single();

    if (partyError || !party) {
        return { success: false, error: partyError?.message || 'Error creando tercero' };
    }

    // 2. Check if employee already exists for this party
    const { data: existingEmployee } = await admin
        .from('employees')
        .select('id, user_id')
        .eq('tenant_id', tenantId)
        .eq('party_id', party.id)
        .maybeSingle();

    if (existingEmployee) {
        // If we have a user to link (explicit or resolved by email), link existing employee
        if (resolvedUserId && !existingEmployee.user_id) {
            const { error: linkErr } = await admin
                .from('employees')
                .update({ user_id: resolvedUserId, status: 'ACTIVE' })
                .eq('id', existingEmployee.id);

            if (linkErr) return { success: false, error: linkErr.message || 'Error vinculando usuario' };

            revalidatePath('/payroll/employees');
            revalidatePath('/my-payroll');
            return { success: true, id: existingEmployee.id };
        }

        // Already linked to this same user
        if (resolvedUserId && existingEmployee.user_id === resolvedUserId) {
            revalidatePath('/payroll/employees');
            return { success: true, id: existingEmployee.id };
        }

        return {
            success: false,
            error: `Ya existe un colaborador con documento ${input.party.doc_type} ${input.party.doc_number}. Verifique en la lista de empleados.`,
        };
    }

    // 3. Create employee record
    const employeeData: Record<string, unknown> = {
        tenant_id: tenantId,
        party_id: party.id,
        contract_type: input.contract_type,
        start_date: input.start_date,
        end_date: input.end_date || null,
        salary: input.salary,
        transport_allowance: input.transport_allowance ?? true,
        risk_level: input.risk_level || '1',
        eps_name: input.eps_name?.trim() || null,
        arl_name: input.arl_name?.trim() || null,
        commissions: input.commissions ?? 0,
        collection_commissions: input.collection_commissions ?? 0,
        additional_allowances: input.additional_allowances ?? 0,
        mobility_allowance: input.mobility_allowance ?? 0,
        non_salary_bonus: input.non_salary_bonus ?? 0,
        salary_bonus: input.salary_bonus ?? 0,
        payment_method: input.payment_method || 'CASH',
        bank_name: input.bank_name || null,
        bank_account_type: input.bank_account_type || null,
        bank_account_number: input.bank_account_number || null,
        status: 'ACTIVE',
    };

    if (resolvedUserId) {
        employeeData.user_id = resolvedUserId;
    }

    const { data: newEmployee, error: empError } = await admin
        .from('employees')
        .insert(employeeData)
        .select('id')
        .single();

    if (empError) {
        if (empError.code === '23505') {
            return { success: false, error: `Este colaborador ya esta registrado (${input.party.doc_type} ${input.party.doc_number}).` };
        }
        return { success: false, error: empError.message || 'Error creando empleado' };
    }

    if (!newEmployee) return { success: false, error: 'No se obtuvo respuesta al crear empleado' };

    revalidatePath('/payroll/employees');
    if (resolvedUserId) revalidatePath('/my-payroll');
    return { success: true, id: newEmployee.id };
}

/** Admin desactiva (o elimina) un empleado */
export async function deactivateEmployeeAction(employeeId: string): Promise<{ success: true } | { success: false; error: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };
    if (!(await canViewModule('payroll:employees'))) return { success: false, error: 'No autorizado para desactivar empleados' };

    const admin = createAdminClient(user.id);

    // Verify employee exists and belongs to user's tenant
    const { data: tenantId } = await supabase.rpc('get_my_tenant_id');
    if (!tenantId) return { success: false, error: 'No se pudo obtener el tenant' };

    const { data: emp } = await admin
        .from('employees')
        .select('id, user_id')
        .eq('id', employeeId)
        .eq('tenant_id', tenantId)
        .single();

    if (!emp) return { success: false, error: 'Empleado no encontrado' };

    // Unlink user_id if present, then set INACTIVE
    const { error } = await admin
        .from('employees')
        .update({ status: 'INACTIVE', user_id: null })
        .eq('id', employeeId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/payroll/employees');
    revalidatePath('/payroll');
    return { success: true };
}

/** Obtiene los usuarios del tenant que pueden vincularse a empleados */
export async function getTenantUsersAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No autenticado');
    if (!(await canViewModule('payroll:employees'))) throw new Error('No autorizado');

    // Use admin client to bypass RLS on profiles (profiles_own policy only allows
    // seeing your own profile, but we need to see all team members)
    const adminClient = createAdminClient();

    // 1. Get user_ids in the current tenant (use user JWT — RLS scopes to tenant)
    const { data: tenantUsers, error: tuError } = await supabase
        .from('user_tenants')
        .select('user_id')
        .order('created_at', { ascending: false });

    if (tuError) throw new Error(tuError.message);
    if (!tenantUsers?.length) return [];

    const userIds = tenantUsers.map(tu => tu.user_id as string);

    // 2. Get profiles via admin client (bypasses profiles_own RLS)
    const { data: profiles, error: profError } = await adminClient
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

    if (profError) throw new Error(profError.message);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    // 3. Get employees that already have a user_id to mark them
    const { data: linkedEmployees } = await supabase
        .from('employees')
        .select('user_id')
        .not('user_id', 'is', null);

    const linkedUserIds = new Set((linkedEmployees || []).map(e => e.user_id));

    return userIds.map(uid => {
        const profile = profileMap.get(uid);
        return {
            id: uid,
            name: profile?.full_name || profile?.email || 'Sin nombre',
            email: profile?.email || '',
            linked: linkedUserIds.has(uid),
        };
    });
}
