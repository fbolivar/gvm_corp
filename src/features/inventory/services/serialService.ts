import { SupabaseClient } from '@supabase/supabase-js';

export type SerialStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'RETURNED' | 'DEFECTIVE';

export interface ProductSerial {
    id: string;
    tenant_id: string;
    product_id: string;
    warehouse_id: string | null;
    serial_number: string;
    lot_id: string | null;
    status: SerialStatus;
    purchase_order_id: string | null;
    movement_id: string | null;
    created_at: string;
    product?: { name: string; sku: string };
    warehouse?: { name: string };
}

export const serialService = {
    async getSerials(client: SupabaseClient, filters?: {
        product_id?: string;
        warehouse_id?: string;
        status?: SerialStatus;
        search?: string;
    }): Promise<ProductSerial[]> {
        let query = client
            .from('product_serials')
            .select('*, product:products(name, sku), warehouse:warehouses(name)')
            .order('created_at', { ascending: false })
            .limit(200);

        if (filters?.product_id) query = query.eq('product_id', filters.product_id);
        if (filters?.warehouse_id) query = query.eq('warehouse_id', filters.warehouse_id);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.search) query = query.ilike('serial_number', `%${filters.search}%`);

        const { data, error } = await query;
        if (error) { console.error('[serial] getSerials:', error.message); return []; }
        return (data ?? []) as ProductSerial[];
    },

    async createSerial(client: SupabaseClient, serial: {
        product_id: string;
        warehouse_id?: string;
        serial_number: string;
        lot_id?: string;
        status?: SerialStatus;
        purchase_order_id?: string;
        movement_id?: string;
    }): Promise<ProductSerial> {
        const { data: tenantId } = await client.rpc('get_my_tenant_id');
        const { data, error } = await client
            .from('product_serials')
            .insert({
                ...serial,
                tenant_id: tenantId,
                status: serial.status || 'AVAILABLE',
            })
            .select()
            .single();
        if (error) throw error;
        return data as ProductSerial;
    },

    async updateSerialStatus(client: SupabaseClient, id: string, status: SerialStatus): Promise<void> {
        const { error } = await client
            .from('product_serials')
            .update({ status })
            .eq('id', id);
        if (error) throw error;
    },

    async getSerialByNumber(client: SupabaseClient, productId: string, serialNumber: string): Promise<ProductSerial | null> {
        const { data, error } = await client
            .from('product_serials')
            .select('*')
            .eq('product_id', productId)
            .eq('serial_number', serialNumber)
            .maybeSingle();
        if (error) return null;
        return data as ProductSerial | null;
    },

    async bulkCreateSerials(client: SupabaseClient, serials: Array<{
        product_id: string;
        warehouse_id?: string;
        serial_number: string;
        purchase_order_id?: string;
    }>): Promise<number> {
        const { data: tenantId } = await client.rpc('get_my_tenant_id');
        const rows = serials.map(s => ({
            ...s,
            tenant_id: tenantId,
            status: 'AVAILABLE' as SerialStatus,
        }));

        const { error } = await client
            .from('product_serials')
            .insert(rows);

        if (error) throw error;
        return serials.length;
    },

    async getStats(client: SupabaseClient): Promise<{
        total: number;
        available: number;
        sold: number;
        defective: number;
    }> {
        const { data, error } = await client
            .from('product_serials')
            .select('status');

        if (error) return { total: 0, available: 0, sold: 0, defective: 0 };

        const all = data ?? [];
        return {
            total: all.length,
            available: all.filter(s => s.status === 'AVAILABLE').length,
            sold: all.filter(s => s.status === 'SOLD').length,
            defective: all.filter(s => s.status === 'DEFECTIVE').length,
        };
    },
};
