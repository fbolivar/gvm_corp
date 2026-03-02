import { SupabaseClient } from '@supabase/supabase-js';
import { OvertimeRequest } from '../types';

export const overtimeService = {
    /** Horas extras del empleado logueado */
    async getMyOvertimeRequests(client: SupabaseClient, employeeId: string): Promise<OvertimeRequest[]> {
        const { data, error } = await client
            .from('overtime_requests')
            .select('*')
            .eq('employee_id', employeeId)
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) throw error;
        return data as OvertimeRequest[];
    },

    /** Solicitudes PENDIENTES del tenant (vista del aprobador) */
    async getPendingRequests(client: SupabaseClient, tenantId: string): Promise<OvertimeRequest[]> {
        const { data, error } = await client
            .from('overtime_requests')
            .select('*, employee:employees(id, salary, contract_type, party:parties(legal_name))')
            .eq('tenant_id', tenantId)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data as OvertimeRequest[];
    },

    /** Todas las solicitudes del tenant para el dashboard del aprobador */
    async getAllRequests(client: SupabaseClient, tenantId: string): Promise<OvertimeRequest[]> {
        const { data, error } = await client
            .from('overtime_requests')
            .select('*, employee:employees(id, salary, contract_type, party:parties(legal_name))')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) throw error;
        return data as OvertimeRequest[];
    },

    /** Crear solicitud de hora extra */
    async create(client: SupabaseClient, payload: {
        tenant_id: string;
        employee_id: string;
        date: string;
        start_time?: string;
        end_time?: string;
        hours: number;
        reason: string;
    }): Promise<OvertimeRequest> {
        const { data, error } = await client
            .from('overtime_requests')
            .insert({ ...payload, status: 'PENDING' })
            .select()
            .single();
        if (error) throw error;
        return data as OvertimeRequest;
    },

    /** Aprobar o rechazar una solicitud (solo aprobadores) */
    async review(client: SupabaseClient, id: string, action: 'APPROVED' | 'REJECTED', reviewerId: string, notes?: string): Promise<OvertimeRequest> {
        const { data, error } = await client
            .from('overtime_requests')
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
        return data as OvertimeRequest;
    },

    /** Cálculo del valor de una hora extra en Colombia */
    calculateOvertimeValue(baseSalary: number, hours: number, type: 'diurna' | 'nocturna' | 'festiva' = 'diurna'): number {
        const hourlyRate = baseSalary / 240; // 30 días × 8 horas
        const multipliers = { diurna: 1.25, nocturna: 1.75, festiva: 2.0 };
        return Math.round(hourlyRate * multipliers[type] * hours);
    },
};
