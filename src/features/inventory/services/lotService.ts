import { SupabaseClient } from '@supabase/supabase-js';

export interface ProductLot {
    id?: string;
    tenant_id?: string;
    product_id: string;
    warehouse_id: string;
    lot_number: string;
    batch_code?: string;
    qty: number;
    cost: number;
    manufacture_date?: string;
    expiration_date: string;
    supplier_id?: string;
    status: 'ACTIVE' | 'QUARANTINE' | 'EXPIRED' | 'DEPLETED';
    notes?: string;
    created_at?: string;
    // Joined
    product?: { name: string; sku: string };
    warehouse?: { name: string };
    supplier?: { legal_name: string };
}

export interface LotSummary {
    total_lots: number;
    active_lots: number;
    expired_lots: number;
    expiring_30d: number;
    expiring_90d: number;
    quarantine_lots: number;
    total_value: number;
}

export interface ExpiringLot {
    id: string;
    lot_number: string;
    batch_code: string;
    product_id: string;
    product_name: string;
    product_sku: string;
    warehouse_name: string;
    qty: number;
    cost: number;
    expiration_date: string;
    days_until_expiry: number;
    status: string;
    supplier_name: string;
}

export const lotService = {
    async getLots(client: SupabaseClient, filters?: { status?: string; search?: string }) {
        let query = client
            .from('product_lots')
            .select(`
                *,
                product:products(name, sku),
                warehouse:warehouses(name),
                supplier:parties(legal_name)
            `)
            .gt('qty', 0)
            .order('expiration_date', { ascending: true });

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        if (filters?.search) {
            query = query.or(`lot_number.ilike.%${filters.search}%,product.name.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as ProductLot[];
    },

    async getSummary(client: SupabaseClient): Promise<LotSummary> {
        const { data, error } = await client.rpc('get_lot_summary');
        if (error) throw error;
        return (data as LotSummary[])?.[0] || {
            total_lots: 0, active_lots: 0, expired_lots: 0,
            expiring_30d: 0, expiring_90d: 0, quarantine_lots: 0, total_value: 0
        };
    },

    async getExpiringLots(client: SupabaseClient, daysAhead: number = 90, search?: string): Promise<ExpiringLot[]> {
        const { data, error } = await client.rpc('get_expiring_lots', {
            p_days_ahead: daysAhead,
            p_search: search || null
        });
        if (error) throw error;
        return data as ExpiringLot[];
    },

    async createLot(client: SupabaseClient, lot: Omit<ProductLot, 'id' | 'created_at'>) {
        const { data, error } = await client
            .from('product_lots')
            .insert(lot)
            .select()
            .single();
        if (error) throw error;
        return data as ProductLot;
    },

    async updateLotStatus(client: SupabaseClient, lotId: string, status: ProductLot['status']) {
        const { error } = await client
            .from('product_lots')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', lotId);
        if (error) throw error;
    },

    async adjustLotQty(client: SupabaseClient, lotId: string, newQty: number) {
        const updates: Record<string, unknown> = {
            qty: newQty,
            updated_at: new Date().toISOString()
        };
        if (newQty <= 0) {
            updates.status = 'DEPLETED';
        }
        const { error } = await client
            .from('product_lots')
            .update(updates)
            .eq('id', lotId);
        if (error) throw error;
    },

    /** Marca lotes expirados automaticamente */
    async markExpiredLots(client: SupabaseClient) {
        const { data, error } = await client
            .from('product_lots')
            .update({ status: 'EXPIRED', updated_at: new Date().toISOString() })
            .eq('status', 'ACTIVE')
            .lt('expiration_date', new Date().toISOString().split('T')[0])
            .gt('qty', 0)
            .select('id');
        if (error) throw error;
        return data?.length || 0;
    }
};
