import { SupabaseClient } from '@supabase/supabase-js';

export interface VendorSummary {
    id: string;
    legal_name: string;
    nit: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    total_orders: number;
    open_orders: number;
    total_billed: number;
    pending_payment: number;
    last_order_date: string | null;
}

export interface VendorDocument {
    id: string;
    number: string;
    doc_type: string;
    status: string;
    issue_date: string;
    due_date: string | null;
    total: number;
    notes: string | null;
}

export interface VendorStatement {
    vendor: {
        id: string;
        legal_name: string;
        nit: string;
        email: string | null;
        phone: string | null;
        city: string | null;
        address: string | null;
    };
    orders: VendorDocument[];
    bills: VendorDocument[];
    totalPending: number;
    totalPaid: number;
    totalOrders: number;
    overdueAmount: number;
}

export const vendorPortalService = {
    async getVendors(client: SupabaseClient): Promise<VendorSummary[]> {
        // Get all parties that are vendors (have at least one purchase order or vendor bill)
        const { data: parties } = await client
            .from('parties')
            .select('id, legal_name, nit, email, phone, city')
            .eq('is_vendor', true)
            .order('legal_name');

        if (!parties || parties.length === 0) return [];

        // Get purchase orders and bills grouped by party
        const [{ data: orders }, { data: bills }] = await Promise.all([
            client.from('documents')
                .select('party_id, status, total, issue_date')
                .eq('doc_type', 'PURCHASE_ORDER'),
            client.from('documents')
                .select('party_id, status, total, due_date')
                .eq('doc_type', 'VENDOR_BILL'),
        ]);

        const today = new Date().toISOString().split('T')[0];

        return parties
            .map(party => {
                const partyOrders = (orders ?? []).filter(o => o.party_id === party.id);
                const partyBills = (bills ?? []).filter(b => b.party_id === party.id);

                const openOrders = partyOrders.filter(o => ['DRAFT', 'SENT', 'ACCEPTED'].includes(o.status)).length;
                const totalBilled = partyBills.reduce((s, b) => s + Number(b.total), 0);
                const pendingPayment = partyBills
                    .filter(b => ['DRAFT', 'SENT', 'ACCEPTED'].includes(b.status))
                    .reduce((s, b) => s + Number(b.total), 0);

                const dates = partyOrders.map(o => o.issue_date).filter(Boolean).sort();
                const lastOrderDate = dates.length > 0 ? dates[dates.length - 1] : null;

                return {
                    id: party.id,
                    legal_name: party.legal_name,
                    nit: party.nit,
                    email: party.email,
                    phone: party.phone,
                    city: party.city,
                    total_orders: partyOrders.length,
                    open_orders: openOrders,
                    total_billed: totalBilled,
                    pending_payment: pendingPayment,
                    last_order_date: lastOrderDate,
                };
            })
            .filter(v => v.total_orders > 0 || v.total_billed > 0); // only vendors with activity
    },

    async getVendorStatement(client: SupabaseClient, partyId: string): Promise<VendorStatement> {
        const [{ data: party }, { data: orders }, { data: bills }] = await Promise.all([
            client.from('parties')
                .select('id, legal_name, nit, email, phone, city, address')
                .eq('id', partyId)
                .single(),
            client.from('documents')
                .select('id, number, doc_type, status, issue_date, due_date, total, notes')
                .eq('doc_type', 'PURCHASE_ORDER')
                .eq('party_id', partyId)
                .order('issue_date', { ascending: false })
                .limit(30),
            client.from('documents')
                .select('id, number, doc_type, status, issue_date, due_date, total, notes')
                .eq('doc_type', 'VENDOR_BILL')
                .eq('party_id', partyId)
                .order('issue_date', { ascending: false })
                .limit(30),
        ]);

        const today = new Date().toISOString().split('T')[0];
        const billList = (bills ?? []) as VendorDocument[];
        const orderList = (orders ?? []) as VendorDocument[];

        const pendingStatuses = ['DRAFT', 'SENT', 'ACCEPTED'];
        const totalPending = billList
            .filter(b => pendingStatuses.includes(b.status))
            .reduce((s, b) => s + Number(b.total), 0);
        const totalPaid = billList
            .filter(b => b.status === 'PAID' || b.status === 'VOID')
            .reduce((s, b) => s + Number(b.total), 0);
        const overdueAmount = billList
            .filter(b => pendingStatuses.includes(b.status) && b.due_date && b.due_date < today)
            .reduce((s, b) => s + Number(b.total), 0);

        return {
            vendor: party as VendorStatement['vendor'],
            orders: orderList,
            bills: billList,
            totalPending,
            totalPaid,
            totalOrders: orderList.length,
            overdueAmount,
        };
    },
};
