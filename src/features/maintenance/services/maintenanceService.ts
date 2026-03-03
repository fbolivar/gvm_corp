import { SupabaseClient } from '@supabase/supabase-js';
import type { Equipment, MaintenanceOrder } from '../types';

export const maintenanceService = {
    async getEquipment(client: SupabaseClient, tenantId: string): Promise<Equipment[]> {
        const { data, error } = await client
            .from('equipment')
            .select('*')
            .eq('tenant_id', tenantId)
            .neq('status', 'RETIRED')
            .order('name');
        if (error) throw error;
        return data as Equipment[];
    },

    async createEquipment(client: SupabaseClient, payload: Partial<Equipment>): Promise<Equipment> {
        const { data, error } = await client
            .from('equipment')
            .insert(payload)
            .select()
            .single();
        if (error) throw error;
        return data as Equipment;
    },

    async getOrders(client: SupabaseClient, tenantId: string, limit = 50): Promise<MaintenanceOrder[]> {
        const { data, error } = await client
            .from('maintenance_orders')
            .select('*, equipment:equipment(id, code, name, location)')
            .eq('tenant_id', tenantId)
            .order('scheduled_date', { ascending: true })
            .limit(limit);
        if (error) throw error;
        return data as MaintenanceOrder[];
    },

    async getPendingOrders(client: SupabaseClient, tenantId: string): Promise<MaintenanceOrder[]> {
        const { data, error } = await client
            .from('maintenance_orders')
            .select('*, equipment:equipment(id, code, name, location)')
            .eq('tenant_id', tenantId)
            .in('status', ['PENDING', 'IN_PROGRESS'])
            .order('scheduled_date', { ascending: true });
        if (error) throw error;
        return data as MaintenanceOrder[];
    },

    async createOrder(client: SupabaseClient, payload: {
        tenant_id: string;
        equipment_id: string;
        order_type: string;
        priority: string;
        description: string;
        technician_name?: string | null;
        scheduled_date: string;
        estimated_cost?: number | null;
    }): Promise<MaintenanceOrder> {
        const { data, error } = await client
            .from('maintenance_orders')
            .insert({ ...payload, status: 'PENDING' })
            .select()
            .single();
        if (error) throw error;
        return data as MaintenanceOrder;
    },

    async updateOrderStatus(
        client: SupabaseClient,
        id: string,
        status: string,
        actual_cost?: number,
        notes?: string,
    ): Promise<MaintenanceOrder> {
        const updates: Record<string, unknown> = { status };
        if (status === 'COMPLETED') updates.completed_date = new Date().toISOString().slice(0, 10);
        if (actual_cost != null) updates.actual_cost = actual_cost;
        if (notes) updates.notes = notes;

        const { data, error } = await client
            .from('maintenance_orders')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as MaintenanceOrder;
    },

    async getMetrics(client: SupabaseClient, tenantId: string) {
        const [eqRes, ordRes] = await Promise.all([
            client.from('equipment').select('status').eq('tenant_id', tenantId),
            client.from('maintenance_orders').select('status, priority, actual_cost').eq('tenant_id', tenantId),
        ]);

        const equipment = eqRes.data ?? [];
        const orders = ordRes.data ?? [];

        const activeEquipment = equipment.filter(e => e.status === 'ACTIVE').length;
        const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
        const criticalOrders = orders.filter(o => o.priority === 'CRITICAL' && o.status !== 'COMPLETED').length;
        const totalCost = orders
            .filter(o => o.status === 'COMPLETED')
            .reduce((sum, o) => sum + Number(o.actual_cost ?? 0), 0);

        return { activeEquipment, pendingOrders, criticalOrders, totalCost };
    },
};
