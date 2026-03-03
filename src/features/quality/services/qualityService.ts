import { SupabaseClient } from '@supabase/supabase-js';
import type { Inspection, Ncr } from '../types';

export const qualityService = {
    /** Últimas inspecciones del tenant */
    async getInspections(client: SupabaseClient, tenantId: string, limit = 50): Promise<Inspection[]> {
        const { data, error } = await client
            .from('quality_inspections')
            .select('*, product:products(name, sku)')
            .eq('tenant_id', tenantId)
            .order('inspection_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data as Inspection[];
    },

    /** Crear inspección */
    async createInspection(client: SupabaseClient, payload: {
        tenant_id: string;
        stage: string;
        product_id?: string | null;
        lot_number?: string | null;
        quantity_inspected: number;
        quantity_approved: number;
        quantity_rejected: number;
        result: string;
        inspection_date: string;
        notes?: string | null;
        inspector_id?: string | null;
    }): Promise<Inspection> {
        const { data, error } = await client
            .from('quality_inspections')
            .insert(payload)
            .select()
            .single();
        if (error) throw error;
        return data as Inspection;
    },

    /** NCRs abiertas del tenant */
    async getOpenNcrs(client: SupabaseClient, tenantId: string): Promise<Ncr[]> {
        const { data, error } = await client
            .from('quality_ncrs')
            .select('*')
            .eq('tenant_id', tenantId)
            .neq('status', 'CLOSED')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data as Ncr[];
    },

    /** Todas las NCRs del tenant */
    async getAllNcrs(client: SupabaseClient, tenantId: string, limit = 50): Promise<Ncr[]> {
        const { data, error } = await client
            .from('quality_ncrs')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data as Ncr[];
    },

    /** Crear NCR */
    async createNcr(client: SupabaseClient, payload: {
        tenant_id: string;
        ncr_number: string;
        description: string;
        severity: string;
        inspection_id?: string | null;
        root_cause?: string | null;
        corrective_action?: string | null;
    }): Promise<Ncr> {
        const { data, error } = await client
            .from('quality_ncrs')
            .insert({ ...payload, status: 'OPEN' })
            .select()
            .single();
        if (error) throw error;
        return data as Ncr;
    },

    /** Cerrar NCR */
    async closeNcr(client: SupabaseClient, ncrId: string, corrective_action: string): Promise<Ncr> {
        const { data, error } = await client
            .from('quality_ncrs')
            .update({ status: 'CLOSED', corrective_action, closed_at: new Date().toISOString() })
            .eq('id', ncrId)
            .select()
            .single();
        if (error) throw error;
        return data as Ncr;
    },

    /** Métricas resumen */
    async getMetrics(client: SupabaseClient, tenantId: string) {
        const [inspRes, ncrRes] = await Promise.all([
            client.from('quality_inspections')
                .select('result, quantity_inspected, quantity_rejected')
                .eq('tenant_id', tenantId),
            client.from('quality_ncrs')
                .select('status, severity')
                .eq('tenant_id', tenantId),
        ]);

        const inspections = inspRes.data ?? [];
        const ncrs = ncrRes.data ?? [];

        const totalInspected  = inspections.reduce((s, i) => s + Number(i.quantity_inspected), 0);
        const totalRejected   = inspections.reduce((s, i) => s + Number(i.quantity_rejected), 0);
        const approvalRate    = totalInspected > 0 ? ((totalInspected - totalRejected) / totalInspected) * 100 : 100;
        const openNcrs        = ncrs.filter(n => n.status !== 'CLOSED').length;
        const criticalNcrs    = ncrs.filter(n => n.severity === 'CRITICAL' && n.status !== 'CLOSED').length;

        return { totalInspections: inspections.length, approvalRate, openNcrs, criticalNcrs };
    },
};
