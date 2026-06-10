import { SupabaseClient } from '@supabase/supabase-js';
import { PurchaseOrder, PurchaseOrderWithDetails, POStatus } from '../types';

export const purchaseOrderService = {
    async getTenantId(client: SupabaseClient) {
        const { data, error } = await client.rpc('get_my_tenant_id');
        if (!error && data) return data;
        const { data: tenantData } = await client.from('tenants').select('id').limit(1).maybeSingle();
        return tenantData?.id;
    },

    async getNextPONumber(client: SupabaseClient): Promise<string> {
        const tenant_id = await this.getTenantId(client);
        if (!tenant_id) throw new Error('No tenant found');
        const year = new Date().getFullYear();
        const { data } = await client
            .from('po_number_sequences')
            .select('last_value')
            .eq('tenant_id', tenant_id)
            .eq('year', year)
            .maybeSingle();
        const nextVal = ((data?.last_value as number) ?? 0) + 1;
        return `OC-${year}-${String(nextVal).padStart(5, '0')}`;
    },

    async getOrders(client: SupabaseClient, filters?: { status?: string; search?: string }) {
        let query = client
            .from('purchase_orders')
            .select(`
                *,
                supplier:parties(legal_name, doc_number),
                warehouse:warehouses(name),
                lines:purchase_order_lines(
                    id, product_id, qty, unit_cost, tax_rate, line_total, qty_received,
                    product:products(name, sku)
                )
            `)
            .order('created_at', { ascending: false });

        if (filters?.status && filters.status !== 'all') {
            query = query.eq('status', filters.status);
        }

        const { data, error } = await query;
        if (error) throw error;

        let results = data as PurchaseOrderWithDetails[];
        if (filters?.search) {
            const s = filters.search.toLowerCase();
            results = results.filter(o =>
                o.po_number?.toLowerCase().includes(s) ||
                (o.supplier as any)?.legal_name?.toLowerCase().includes(s)
            );
        }
        return results;
    },

    async getOrderById(client: SupabaseClient, id: string) {
        const { data, error } = await client
            .from('purchase_orders')
            .select(`
                *,
                supplier:parties(legal_name, doc_number),
                warehouse:warehouses(name),
                lines:purchase_order_lines(
                    id, product_id, qty, unit_cost, tax_rate, line_total, qty_received, notes,
                    product:products(name, sku)
                )
            `)
            .eq('id', id)
            .single();
        if (error) throw error;
        return data as PurchaseOrderWithDetails;
    },

    async createOrder(client: SupabaseClient, order: PurchaseOrder) {
        const tenant_id = await this.getTenantId(client);
        const { lines, ...header } = order;

        // Calculate totals
        const subtotal = lines.reduce((sum, l) => sum + l.qty * l.unit_cost, 0);
        const tax_total = lines.reduce((sum, l) => sum + l.qty * l.unit_cost * (l.tax_rate || 0.19), 0);
        const total = subtotal + tax_total;

        const { data: po, error: poError } = await client
            .from('purchase_orders')
            .insert({ ...header, tenant_id, subtotal, tax_total, total })
            .select()
            .single();
        if (poError) throw poError;

        const lineData = lines.map(l => ({
            order_id: po.id,
            product_id: l.product_id,
            qty: l.qty,
            unit_cost: l.unit_cost,
            tax_rate: l.tax_rate || 0.19,
            notes: l.notes,
        }));

        const { error: linesError } = await client
            .from('purchase_order_lines')
            .insert(lineData);
        if (linesError) throw linesError;

        return po;
    },

    async updateOrder(client: SupabaseClient, orderId: string, order: PurchaseOrder) {
        const { lines, ...header } = order;

        const subtotal = lines.reduce((sum, l) => sum + l.qty * l.unit_cost, 0);
        const tax_total = lines.reduce((sum, l) => sum + l.qty * l.unit_cost * (l.tax_rate || 0), 0);
        const total = subtotal + tax_total;

        const { error: headerError } = await client
            .from('purchase_orders')
            .update({ ...header, subtotal, tax_total, total, updated_at: new Date().toISOString() })
            .eq('id', orderId)
            .eq('status', 'DRAFT');
        if (headerError) throw headerError;

        const { error: deleteError } = await client
            .from('purchase_order_lines')
            .delete()
            .eq('order_id', orderId);
        if (deleteError) throw deleteError;

        const lineData = lines.map(l => ({
            order_id: orderId,
            product_id: l.product_id,
            qty: l.qty,
            unit_cost: l.unit_cost,
            tax_rate: l.tax_rate || 0,
            notes: l.notes,
        }));

        const { error: linesError } = await client
            .from('purchase_order_lines')
            .insert(lineData);
        if (linesError) throw linesError;
    },

    async submitForApproval(client: SupabaseClient, orderId: string) {
        const { error } = await client
            .from('purchase_orders')
            .update({ status: 'PENDING_APPROVAL' as POStatus, updated_at: new Date().toISOString() })
            .eq('id', orderId)
            .eq('status', 'DRAFT');
        if (error) throw error;
    },

    async approveOrder(client: SupabaseClient, orderId: string) {
        const { data: { user } } = await client.auth.getUser();
        const { error } = await client
            .from('purchase_orders')
            .update({
                status: 'APPROVED' as POStatus,
                approved_by: user?.id,
                approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId)
            .eq('status', 'PENDING_APPROVAL');
        if (error) throw error;
    },

    async rejectOrder(client: SupabaseClient, orderId: string) {
        const { error } = await client
            .from('purchase_orders')
            .update({ status: 'DRAFT' as POStatus, updated_at: new Date().toISOString() })
            .eq('id', orderId)
            .eq('status', 'PENDING_APPROVAL');
        if (error) throw error;
    },

    async cancelOrder(client: SupabaseClient, orderId: string) {
        const { error } = await client
            .from('purchase_orders')
            .update({ status: 'CANCELLED' as POStatus, updated_at: new Date().toISOString() })
            .eq('id', orderId);
        if (error) throw error;
    },

    async receiveOrder(client: SupabaseClient, orderId: string, receivedLines: Array<{ line_id: string; qty_received: number }>) {
        // Update each line's qty_received
        for (const rl of receivedLines) {
            await client
                .from('purchase_order_lines')
                .update({ qty_received: rl.qty_received })
                .eq('id', rl.line_id);
        }

        // Check if all lines fully received
        const { data: lines } = await client
            .from('purchase_order_lines')
            .select('qty, qty_received')
            .eq('order_id', orderId);

        const allReceived = lines?.every(l => Number(l.qty_received) >= Number(l.qty));
        const someReceived = lines?.some(l => Number(l.qty_received) > 0);

        const newStatus: POStatus = allReceived ? 'RECEIVED' : someReceived ? 'PARTIALLY_RECEIVED' : 'APPROVED';

        await client
            .from('purchase_orders')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', orderId);
    },

    async getStats(client: SupabaseClient) {
        const { data: rows } = await client
            .from('purchase_orders')
            .select('status, total');

        const all = (rows ?? []) as Array<{ status: string; total: number }>;

        const total = all.length;
        const pendingApproval = all.filter(o => o.status === 'PENDING_APPROVAL').length;
        const inTransit = all.filter(o => o.status === 'APPROVED').length;
        const totalCommitted = all
            .filter(o => o.status !== 'CANCELLED')
            .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

        return { total, pendingApproval, inTransit, totalCommitted };
    }
};
