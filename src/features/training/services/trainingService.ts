import { SupabaseClient } from '@supabase/supabase-js';
import { TrainingProgram, TrainingRecord } from '../types';

export interface TrainingMetrics {
    totalPrograms: number;
    totalRecords: number;
    completedRecords: number;
    failedRecords: number;
    completionRate: number;
}

export const trainingService = {
    async getPrograms(client: SupabaseClient, tenantId: string): Promise<TrainingProgram[]> {
        const { data, error } = await client
            .from('training_programs')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data ?? []) as TrainingProgram[];
    },

    async createProgram(
        client: SupabaseClient,
        payload: Omit<TrainingProgram, 'id' | 'created_at'>
    ): Promise<TrainingProgram> {
        const { data, error } = await client
            .from('training_programs')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data as TrainingProgram;
    },

    /** Adjunta o reemplaza el material en video de un programa (archivo subido o enlace externo). */
    async setProgramVideo(
        client: SupabaseClient,
        programId: string,
        video: { video_url?: string | null; video_path?: string | null; video_name?: string | null }
    ): Promise<void> {
        const { error } = await client
            .from('training_programs')
            .update({
                video_url: video.video_url ?? null,
                video_path: video.video_path ?? null,
                video_name: video.video_name ?? null,
            })
            .eq('id', programId);

        if (error) throw error;
    },

    async getRecords(
        client: SupabaseClient,
        tenantId: string,
        limit = 100
    ): Promise<TrainingRecord[]> {
        const { data, error } = await client
            .from('training_records')
            .select('*, program:training_programs(*), employee:employees(id, party:parties(legal_name))')
            .eq('tenant_id', tenantId)
            .order('scheduled_date', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return (data ?? []) as TrainingRecord[];
    },

    async createRecord(
        client: SupabaseClient,
        payload: Omit<TrainingRecord, 'id' | 'created_at' | 'program' | 'employee'>
    ): Promise<TrainingRecord> {
        const { data, error } = await client
            .from('training_records')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data as TrainingRecord;
    },

    /** Capacitaciones de UN empleado (portal del empleado). */
    async getRecordsByEmployee(
        client: SupabaseClient,
        employeeId: string
    ): Promise<TrainingRecord[]> {
        const { data, error } = await client
            .from('training_records')
            .select('*, program:training_programs(*)')
            .eq('employee_id', employeeId)
            .order('scheduled_date', { ascending: false });

        if (error) throw error;
        return (data ?? []) as TrainingRecord[];
    },

    /**
     * El empleado marca su capacitación como vista/completada desde su portal.
     * No lleva puntaje: RRHH puede registrarlo después si aplica.
     * El filtro por employee_id es la garantía de que solo toca la suya.
     */
    async selfCompleteRecord(
        client: SupabaseClient,
        id: string,
        employeeId: string
    ): Promise<TrainingRecord | null> {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await client
            .from('training_records')
            .update({
                status: 'COMPLETED',
                completion_date: today,
                self_completed_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('employee_id', employeeId)
            .eq('status', 'SCHEDULED')
            .select()
            .maybeSingle();

        if (error) throw error;
        return (data as TrainingRecord) ?? null;
    },

    /** Reprograma la fecha de una capacitación (solo mientras siga pendiente). */
    async rescheduleRecord(
        client: SupabaseClient,
        id: string,
        newDate: string
    ): Promise<TrainingRecord> {
        const { data, error } = await client
            .from('training_records')
            .update({ scheduled_date: newDate })
            .eq('id', id)
            .eq('status', 'SCHEDULED')
            .select()
            .single();

        if (error) throw error;
        return data as TrainingRecord;
    },

    async completeRecord(
        client: SupabaseClient,
        id: string,
        score: number,
        certificate_number?: string,
        notes?: string
    ): Promise<TrainingRecord> {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await client
            .from('training_records')
            .update({
                status: 'COMPLETED',
                completion_date: today,
                score,
                certificate_number: certificate_number ?? null,
                notes: notes ?? null,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as TrainingRecord;
    },

    async getMetrics(client: SupabaseClient, tenantId: string): Promise<TrainingMetrics> {
        const [programsRes, recordsRes] = await Promise.all([
            client
                .from('training_programs')
                .select('id', { count: 'exact', head: true })
                .eq('tenant_id', tenantId),
            client
                .from('training_records')
                .select('status')
                .eq('tenant_id', tenantId),
        ]);

        const totalPrograms = programsRes.count ?? 0;
        const records = recordsRes.data ?? [];
        const totalRecords = records.length;
        const completedRecords = records.filter(r => r.status === 'COMPLETED').length;
        const failedRecords = records.filter(r => r.status === 'FAILED').length;
        const scheduledRecords = records.filter(r => r.status === 'SCHEDULED').length;
        const finishedRecords = completedRecords + failedRecords;
        const completionRate =
            finishedRecords > 0
                ? Math.round((completedRecords / finishedRecords) * 100)
                : scheduledRecords > 0
                ? 0
                : 100;

        return {
            totalPrograms,
            totalRecords,
            completedRecords,
            failedRecords,
            completionRate,
        };
    },
};
