import { SupabaseClient } from '@supabase/supabase-js';
import { AbsenceRequest } from '../types';

export const ABSENCE_TYPE_LABELS: Record<string, string> = {
    VACATION:   'Vacaciones',
    SICK_LEAVE: 'Incapacidad',
    PERSONAL:   'Permiso Personal',
    UNPAID:     'Licencia No Remunerada',
    MATERNITY:  'Licencia Maternidad',
    PATERNITY:  'Licencia Paternidad',
};

export const absenceService = {
    /** Ausencias del empleado logueado */
    async getMyRequests(client: SupabaseClient, employeeId: string): Promise<AbsenceRequest[]> {
        const { data, error } = await client
            .from('absence_requests')
            .select('*')
            .eq('employee_id', employeeId)
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) throw error;
        return data as AbsenceRequest[];
    },

    /** Solicitudes PENDIENTES del tenant (vista del aprobador) */
    async getPendingRequests(client: SupabaseClient, tenantId: string): Promise<AbsenceRequest[]> {
        const { data, error } = await client
            .from('absence_requests')
            .select('*, employee:employees(id, salary, contract_type, party:parties(legal_name))')
            .eq('tenant_id', tenantId)
            .eq('status', 'PENDING')
            .order('start_date', { ascending: true });
        if (error) throw error;
        return data as AbsenceRequest[];
    },

    /** Todas las solicitudes del tenant (dashboard RRHH) */
    async getAllRequests(client: SupabaseClient, tenantId: string): Promise<AbsenceRequest[]> {
        const { data, error } = await client
            .from('absence_requests')
            .select('*, employee:employees(id, salary, contract_type, party:parties(legal_name))')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) throw error;
        return data as AbsenceRequest[];
    },

    /** Crear solicitud de ausencia */
    async create(client: SupabaseClient, payload: {
        tenant_id: string;
        employee_id: string;
        absence_type: string;
        start_date: string;
        end_date: string;
        days: number;
        reason?: string;
    }): Promise<AbsenceRequest> {
        const { data, error } = await client
            .from('absence_requests')
            .insert({ ...payload, status: 'PENDING' })
            .select()
            .single();
        if (error) throw error;
        return data as AbsenceRequest;
    },

    /** Aprobar o rechazar solicitud */
    async review(
        client: SupabaseClient,
        id: string,
        action: 'APPROVED' | 'REJECTED',
        reviewerId: string,
        notes?: string,
    ): Promise<AbsenceRequest> {
        const { data, error } = await client
            .from('absence_requests')
            .update({
                status: action,
                reviewed_by: reviewerId,
                reviewed_at: new Date().toISOString(),
                reviewer_notes: notes ?? null,
            })
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as AbsenceRequest;
    },
};
