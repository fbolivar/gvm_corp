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
