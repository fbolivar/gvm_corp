import { SupabaseClient } from '@supabase/supabase-js';
import { Carrier, Shipment, ShipmentItem, ShipmentStatus } from '../types';
import { inventoryService } from '@/features/inventory/services/inventoryService';

export interface ShipmentFulfillment {
    totalOrdered: number;
    totalShipped: number;
    pctUnits: number;
    totalValueOrdered: number;
    totalValueShipped: number;
    pctValue: number;
}

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
        // Step 1: get order_ids that already have a shipment (any status).
        // These should NOT appear in "Pendientes" - they've been taken into the shipment flow.
        const { data: shipmentsWithOrders } = await supabase
            .from('logistics_shipments')
            .select('order_id');

        const excludedOrderIds = (shipmentsWithOrders ?? [])
            .map(s => s.order_id)
            .filter((id): id is string => !!id);

        // Step 2: fetch SALES_ORDER documents excluding those already in the shipment flow.
        let query = supabase
            .from('documents')
            .select(`
                *,
                party:parties(legal_name, email, phone),
                lines:document_lines(*)
            `)
            .eq('doc_type', 'SALES_ORDER')
            .order('created_at', { ascending: false });

        if (excludedOrderIds.length > 0) {
            query = query.not('id', 'in', `(${excludedOrderIds.join(',')})`);
        }

        const { data, error } = await query;
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

        // 1. Create Shipment Header — include all new fields from the payload
        const { data: newShipment, error: sError } = await supabase
            .from('logistics_shipments')
            .insert({
                order_id: shipment.order_id,
                carrier_id: shipment.carrier_id,
                warehouse_id: shipment.warehouse_id,
                tracking_number: shipment.tracking_number,
                status: shipment.status,
                notes: shipment.notes,
                freight_cost: shipment.freight_cost ?? 0,
                prepared_by: shipment.prepared_by ?? null,
                verified_by: shipment.verified_by ?? null,
                dispatched_by: shipment.dispatched_by ?? null,
                delivered_by_name: shipment.delivered_by_name ?? null,
                tenant_id,
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

        const updates: Record<string, unknown> = { status };

        // DESPACHADO = physically handed off to carrier → record shipped_at
        if (status === 'DESPACHADO') updates.shipped_at = new Date().toISOString();

        // ENTREGADO = confirmed delivery at destination → record delivered_at
        if (status === 'ENTREGADO') updates.delivered_at = new Date().toISOString();

        const { error } = await supabase
            .from('logistics_shipments')
            .update(updates)
            .eq('id', shipmentId);

        if (error) throw error;

        // Inventory Logic: when status changes to DESPACHADO, create OUT movements
        if (status === 'DESPACHADO' && shipment.status !== 'DESPACHADO') {
            for (const item of shipment.items) {
                try {
                    // Get current average cost for accounting
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
                } catch (invError: unknown) {
                    const message = invError instanceof Error ? invError.message : String(invError);
                    console.error("Critical: Failed to deduct inventory for shipment item", message);
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
                warehouse:warehouses(id, name),
                order:documents(*, party:parties(*)),
                items:logistics_shipment_items(*, product:products(*)),
                prepared_by_profile:profiles!prepared_by(id, full_name, email),
                verified_by_profile:profiles!verified_by(id, full_name, email),
                dispatched_by_profile:profiles!dispatched_by(id, full_name, email)
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
            .select('status, order_id');

        if (statusError) throw statusError;

        // Pending orders count = SALES_ORDER documents without any shipment created.
        const shipmentOrderIds = (statusData ?? [])
            .map(s => s.order_id)
            .filter((id): id is string => !!id);

        let pendingQuery = supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('doc_type', 'SALES_ORDER');

        if (shipmentOrderIds.length > 0) {
            pendingQuery = pendingQuery.not('id', 'in', `(${shipmentOrderIds.join(',')})`);
        }
        const { count, error: pendingError } = await pendingQuery;

        if (pendingError) throw pendingError;

        // Stats by carrier
        const { data: carrierStats, error: carrierError } = await supabase
            .from('logistics_shipments')
            .select('carrier:logistics_carriers(name)');

        if (carrierError) throw carrierError;

        const rows = statusData || [];

        const stats = {
            total: rows.length,
            // RECIBIDO = newly received orders awaiting processing
            pending: rows.filter(s => s.status === 'RECIBIDO').length,
            // EN_ALISTAMIENTO = orders being picked/packed
            packed: rows.filter(s => s.status === 'EN_ALISTAMIENTO').length,
            // DESPACHADO + EN_TRANSITO = in transit to customer
            shipped: rows.filter(s => s.status === 'DESPACHADO' || s.status === 'EN_TRANSITO').length,
            // ENTREGADO = confirmed delivered
            delivered: rows.filter(s => s.status === 'ENTREGADO').length,
            ordersToProcess: count || 0,
            byCarrier: (carrierStats || []).reduce((acc: Record<string, number>, curr) => {
                // Supabase returns the joined relation as an array when using select()
                const carrierRel = curr.carrier;
                const carrierName = Array.isArray(carrierRel)
                    ? (carrierRel[0]?.name ?? 'Interno')
                    : ((carrierRel as { name?: string } | null)?.name ?? 'Interno');
                acc[carrierName] = (acc[carrierName] || 0) + 1;
                return acc;
            }, {})
        };

        return stats;
    },

    async getShipmentFulfillment(supabase: SupabaseClient, shipmentId: string): Promise<ShipmentFulfillment> {
        // Fetch shipment items joined with product cost (avg_cost or last_cost)
        const { data: items, error } = await supabase
            .from('logistics_shipment_items')
            .select(`
                qty_ordered,
                qty_shipped,
                product:products(avg_cost, last_cost)
            `)
            .eq('shipment_id', shipmentId);

        if (error) throw error;

        let totalOrdered = 0;
        let totalShipped = 0;
        let totalValueOrdered = 0;
        let totalValueShipped = 0;

        for (const item of items ?? []) {
            const product = Array.isArray(item.product) ? item.product[0] : item.product;
            const unitCost: number = (product?.avg_cost ?? product?.last_cost ?? 0) as number;

            totalOrdered += item.qty_ordered;
            totalShipped += item.qty_shipped;
            totalValueOrdered += item.qty_ordered * unitCost;
            totalValueShipped += item.qty_shipped * unitCost;
        }

        const pctUnits = totalOrdered > 0 ? Math.round((totalShipped / totalOrdered) * 100) : 0;
        const pctValue = totalValueOrdered > 0
            ? Math.round((totalValueShipped / totalValueOrdered) * 100)
            : 0;

        return {
            totalOrdered,
            totalShipped,
            pctUnits,
            totalValueOrdered,
            totalValueShipped,
            pctValue,
        };
    },
};
