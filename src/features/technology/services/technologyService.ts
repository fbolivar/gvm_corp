import { SupabaseClient } from '@supabase/supabase-js';
import type { ITAsset, ITAssetAssignment, ITMaintenanceSchedule } from '../types';

export const technologyService = {
    // ── Assets ──

    async getAssets(supabase: SupabaseClient, filters?: { status?: string; category?: string; search?: string }): Promise<ITAsset[]> {
        let query = supabase
            .from('it_assets')
            .select('*')
            .order('created_at', { ascending: false });

        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.category) query = query.eq('category', filters.category);
        if (filters?.search) query = query.or(`name.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%,asset_code.ilike.%${filters.search}%`);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    async getAssetById(supabase: SupabaseClient, id: string): Promise<ITAsset | null> {
        const { data, error } = await supabase
            .from('it_assets')
            .select('*')
            .eq('id', id)
            .single();
        if (error) return null;
        return data;
    },

    async createAsset(supabase: SupabaseClient, input: {
        tenant_id: string;
        name: string;
        category: string;
        brand?: string;
        model?: string;
        serial_number?: string;
        purchase_date?: string;
        purchase_cost?: number;
        warranty_expiry?: string;
        condition?: string;
        specs?: Record<string, string>;
        notes?: string;
    }): Promise<ITAsset> {
        const { data, error } = await supabase
            .from('it_assets')
            .insert({
                tenant_id: input.tenant_id,
                name: input.name,
                category: input.category,
                brand: input.brand || null,
                model: input.model || null,
                serial_number: input.serial_number || null,
                purchase_date: input.purchase_date || null,
                purchase_cost: input.purchase_cost ?? 0,
                warranty_expiry: input.warranty_expiry || null,
                condition: input.condition || 'NEW',
                specs: input.specs || {},
                notes: input.notes || null,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateAsset(supabase: SupabaseClient, id: string, updates: Partial<ITAsset>): Promise<void> {
        const { error } = await supabase
            .from('it_assets')
            .update(updates)
            .eq('id', id);
        if (error) throw error;
    },

    // ── Assignments ──

    async getAssignments(supabase: SupabaseClient, assetId: string): Promise<ITAssetAssignment[]> {
        const { data, error } = await supabase
            .from('it_asset_assignments')
            .select('*, employee:employees(id, party:parties(legal_name)), assigned_by_profile:profiles!it_asset_assignments_assigned_by_fkey(full_name)')
            .eq('asset_id', assetId)
            .order('assigned_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async getCurrentAssignment(supabase: SupabaseClient, assetId: string): Promise<ITAssetAssignment | null> {
        const { data, error } = await supabase
            .from('it_asset_assignments')
            .select('*, employee:employees(id, party:parties(legal_name))')
            .eq('asset_id', assetId)
            .is('returned_at', null)
            .single();
        if (error) return null;
        return data;
    },

    async assignAsset(supabase: SupabaseClient, input: {
        tenant_id: string;
        asset_id: string;
        employee_id: string;
        assigned_by: string;
        delivery_notes?: string;
    }): Promise<void> {
        // Check no open assignment
        const existing = await this.getCurrentAssignment(supabase, input.asset_id);
        if (existing) throw new Error('Este activo ya está asignado. Debe devolverse primero.');

        const { error: assignError } = await supabase
            .from('it_asset_assignments')
            .insert({
                tenant_id: input.tenant_id,
                asset_id: input.asset_id,
                employee_id: input.employee_id,
                assigned_by: input.assigned_by,
                delivery_notes: input.delivery_notes || null,
            });
        if (assignError) throw assignError;

        // Update asset status
        const { error: updateError } = await supabase
            .from('it_assets')
            .update({ status: 'ASSIGNED' })
            .eq('id', input.asset_id);
        if (updateError) throw updateError;
    },

    async returnAsset(supabase: SupabaseClient, assignmentId: string, input: {
        return_condition: string;
        return_notes?: string;
    }): Promise<void> {
        const { data: assignment, error: fetchError } = await supabase
            .from('it_asset_assignments')
            .select('asset_id')
            .eq('id', assignmentId)
            .single();
        if (fetchError || !assignment) throw new Error('Asignación no encontrada');

        const { error: returnError } = await supabase
            .from('it_asset_assignments')
            .update({
                returned_at: new Date().toISOString(),
                return_condition: input.return_condition,
                return_notes: input.return_notes || null,
            })
            .eq('id', assignmentId);
        if (returnError) throw returnError;

        // Update asset status + condition
        const { error: updateError } = await supabase
            .from('it_assets')
            .update({
                status: 'AVAILABLE',
                condition: input.return_condition,
            })
            .eq('id', assignment.asset_id);
        if (updateError) throw updateError;
    },

    // ── Maintenance ──

    async getAllMaintenanceSchedules(supabase: SupabaseClient): Promise<ITMaintenanceSchedule[]> {
        const { data, error } = await supabase
            .from('it_maintenance_schedules')
            .select('*')
            .order('next_due_at', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async getMaintenanceSchedules(supabase: SupabaseClient, assetId: string): Promise<ITMaintenanceSchedule[]> {
        const { data, error } = await supabase
            .from('it_maintenance_schedules')
            .select('*')
            .eq('asset_id', assetId)
            .order('next_due_at', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async createMaintenance(supabase: SupabaseClient, input: {
        tenant_id: string;
        asset_id: string;
        maintenance_type: string;
        frequency_days: number;
        next_due_at: string;
        notes?: string;
    }): Promise<void> {
        const { error } = await supabase
            .from('it_maintenance_schedules')
            .insert({
                tenant_id: input.tenant_id,
                asset_id: input.asset_id,
                maintenance_type: input.maintenance_type,
                frequency_days: input.frequency_days,
                next_due_at: input.next_due_at,
                notes: input.notes || null,
            });
        if (error) throw error;
    },

    async completeMaintenance(supabase: SupabaseClient, id: string, performedBy: string): Promise<void> {
        // Get current schedule to calculate next due
        const { data: schedule, error: fetchError } = await supabase
            .from('it_maintenance_schedules')
            .select('frequency_days')
            .eq('id', id)
            .single();
        if (fetchError || !schedule) throw new Error('Programación no encontrada');

        const now = new Date();
        const nextDue = new Date(now);
        nextDue.setDate(nextDue.getDate() + schedule.frequency_days);

        const { error } = await supabase
            .from('it_maintenance_schedules')
            .update({
                status: 'COMPLETED',
                last_performed_at: now.toISOString(),
                next_due_at: nextDue.toISOString(),
                performed_by: performedBy,
            })
            .eq('id', id);
        if (error) throw error;
    },

    // ── KPIs ──

    async getKPIs(supabase: SupabaseClient): Promise<{
        total: number;
        available: number;
        assigned: number;
        inMaintenance: number;
        maintenanceDueSoon: number;
        warrantyExpiringSoon: number;
    }> {
        const { data: assets } = await supabase.from('it_assets').select('status, warranty_expiry');
        const list = assets || [];

        const now = new Date();
        const in30Days = new Date();
        in30Days.setDate(now.getDate() + 30);

        const warrantyExpiring = list.filter(a =>
            a.warranty_expiry && new Date(a.warranty_expiry) <= in30Days && new Date(a.warranty_expiry) >= now,
        ).length;

        // Maintenance due within 7 days
        const { data: maint } = await supabase
            .from('it_maintenance_schedules')
            .select('id')
            .in('status', ['SCHEDULED', 'OVERDUE'])
            .lte('next_due_at', in30Days.toISOString());

        return {
            total: list.length,
            available: list.filter(a => a.status === 'AVAILABLE').length,
            assigned: list.filter(a => a.status === 'ASSIGNED').length,
            inMaintenance: list.filter(a => a.status === 'IN_MAINTENANCE').length,
            maintenanceDueSoon: maint?.length || 0,
            warrantyExpiringSoon: warrantyExpiring,
        };
    },
};
