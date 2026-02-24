import { SupabaseClient } from '@supabase/supabase-js';
import { shipmentSchema, shipmentItemSchema, Carrier, Shipment, ShipmentItem, ShipmentStatus } from '../types';
import { inventoryService } from '@/features/inventory/services/inventoryService';

export const logisticsService = {
    // Carrier Methods
    async getTenantId(supabase: SupabaseClient) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: userTenant } = await supabase
            .from('user_tenants')
            .select('tenant_id')
            .eq('user_id', user.id)
            .maybeSingle();

        return userTenant?.tenant_id || null;
    },

    async getCarriers(supabase: SupabaseClient) {
        const { data, error } = await supabase
            .from('logistics_carriers')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return data as Carrier[];
    },

    async getPendingOrders(supabase: SupabaseClient) {
        // Fetch SALES_ORDER documents that don't have a 100% completed shipment
        // For simplicity in Phase 2, we show all SALES_ORDER documents and let user decide
        const { data, error } = await supabase
            .from('documents')
            .select(`
                *,
                party:parties(legal_name, email, phone),
                lines:document_lines(*)
            `)
            .eq('doc_type', 'SALES_ORDER')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async upsertCarrier(supabase: SupabaseClient, carrier: Partial<Carrier>) {
        const tenant_id = await this.getTenantId(supabase);
        if (!tenant_id) throw new Error("No se pudo determinar el Tenant del usuario. Por favor, re-inicie sesión.");

        const payload = {
            ...carrier,
            tenant_id
        };

        const { data, error } = await supabase
            .from('logistics_carriers')
            .upsert(payload)
            .select()
            .single();

        if (error) {
            console.error("Error upserting carrier:", error);
            throw error;
        }
        return data as Carrier;
    },

    // Shipment Methods
    async getShipments(supabase: SupabaseClient) {
        const { data, error } = await supabase
            .from('logistics_shipments')
            .select(`
                *,
                carrier:logistics_carriers(name),
                order:documents(number, party:parties(legal_name))
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async createShipment(supabase: SupabaseClient, shipment: Partial<Shipment>, items: Partial<ShipmentItem>[]) {
        const tenant_id = await this.getTenantId(supabase);
        if (!tenant_id) throw new Error("Acceso denegado: No se pudo determinar el tenant");

        // 1. Create Shipment Header
        const { data: newShipment, error: sError } = await supabase
            .from('logistics_shipments')
            .insert({
                ...shipment,
                tenant_id
            })
            .select()
            .single();

        if (sError) throw sError;

        // 2. Create Shipment Items
        const itemsPayload = items.map(item => ({
            ...item,
            shipment_id: newShipment.id
        }));

        const { error: iError } = await supabase
            .from('logistics_shipment_items')
            .insert(itemsPayload);

        if (iError) throw iError;

        return newShipment as Shipment;
    },

    async updateShipmentStatus(supabase: SupabaseClient, shipmentId: string, status: ShipmentStatus) {
        // Fetch current shipment details to get warehouse and items
        const { data: shipment, error: fetchError } = await supabase
            .from('logistics_shipments')
            .select('*, items:logistics_shipment_items(*)')
            .eq('id', shipmentId)
            .single();

        if (fetchError) throw fetchError;

        const updates: any = { status };
        if (status === 'SHIPPED') updates.shipped_at = new Date().toISOString();
        if (status === 'DELIVERED') updates.delivered_at = new Date().toISOString();

        const { error } = await supabase
            .from('logistics_shipments')
            .update(updates)
            .eq('id', shipmentId);

        if (error) throw error;

        // Inventory Logic: If status changed to SHIPPED, create OUT movements
        if (status === 'SHIPPED' && shipment.status !== 'SHIPPED') {
            for (const item of shipment.items) {
                try {
                    // Get current cost for accounting
                    const cost = await inventoryService.getAvgCost(supabase, item.product_id, shipment.warehouse_id);

                    await inventoryService.createMovement(supabase, {
                        tenant_id: shipment.tenant_id,
                        product_id: item.product_id,
                        warehouse_id: shipment.warehouse_id,
                        type: 'OUT',
                        qty: item.qty_shipped,
                        cost: cost,
                        ref_doc_type: 'SHIPMENT',
                        ref_doc_id: shipmentId,
                        occurred_at: new Date().toISOString()
                    });
                } catch (invError: any) {
                    console.error("Critical: Failed to deduct inventory for shipment item", invError?.message || invError);
                }
            }
        }

        return true;
    },

    async getShipmentDetails(supabase: SupabaseClient, shipmentId: string) {
        const { data, error } = await supabase
            .from('logistics_shipments')
            .select(`
                *,
                carrier:logistics_carriers(*),
                order:documents(*, party:parties(*)),
                items:logistics_shipment_items(*, product:products(*))
            `)
            .eq('id', shipmentId)
            .single();

        if (error) throw error;
        return data;
    },

    async getDashboardStats(supabase: SupabaseClient) {
        // Summary of current shipment statuses
        const { data: statusData, error: statusError } = await supabase
            .from('logistics_shipments')
            .select('status');

        if (statusError) throw statusError;

        // Pending orders count
        const { count, error: pendingError } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('doc_type', 'SALES_ORDER');
        // In a real scenario, we'd filter out orders that are already fully shipped.

        if (pendingError) throw pendingError;

        // Stats by carrier
        const { data: carrierStats, error: carrierError } = await supabase
            .from('logistics_shipments')
            .select('carrier:logistics_carriers(name)');

        if (carrierError) throw carrierError;

        const stats = {
            total: (statusData || []).length,
            pending: (statusData || []).filter(s => s.status === 'PENDING').length,
            packed: (statusData || []).filter(s => s.status === 'PACKED').length,
            shipped: (statusData || []).filter(s => s.status === 'SHIPPED').length,
            delivered: (statusData || []).filter(s => s.status === 'DELIVERED').length,
            ordersToProcess: count || 0,
            byCarrier: (carrierStats || []).reduce((acc: any, curr: any) => {
                const name = curr.carrier?.name || 'Interno';
                acc[name] = (acc[name] || 0) + 1;
                return acc;
            }, {})
        };

        return stats;
    }
};
