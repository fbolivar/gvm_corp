import { SupabaseClient } from '@supabase/supabase-js';

export interface ClientSummary {
    id: string;
    legal_name: string;
    nit: string;
    email: string | null;
    phone: string | null;
    city: string | null;
    total_orders: number;
    open_orders: number;
    total_billed: number;
    pending_collection: number;
    last_invoice_date: string | null;
}

export interface ClientDocument {
    id: string;
    number: string;
    doc_type: string;
    status: string;
    issue_date: string;
    due_date: string | null;
    total: number;
    notes: string | null;
}

export interface ClientStatement {
    client: {
        id: string;
        legal_name: string;
        nit: string;
        email: string | null;
        phone: string | null;
        city: string | null;
        address: string | null;
    };
    invoices: ClientDocument[];
    orders: ClientDocument[];
    totalPending: number;
    totalCollected: number;
    totalOrders: number;
    overdueAmount: number;
}

export const clientPortalService = {
    async getClients(client: SupabaseClient): Promise<ClientSummary[]> {
        const { data: parties } = await client
            .from('parties')
            .select('id, legal_name, nit, email, phone, city')
            .eq('status', 'ACTIVE')
            .order('legal_name');

        if (!parties || parties.length === 0) return [];

        const [{ data: invoices }, { data: orders }] = await Promise.all([
            client.from('documents')
                .select('party_id, status, total, issue_date, due_date')
                .eq('doc_type', 'INVOICE'),
            client.from('documents')
                .select('party_id, status, total, issue_date')
                .in('doc_type', ['SALES_ORDER', 'QUOTATION']),
        ]);

        const today = new Date().toISOString().split('T')[0];
        const pendingStatuses = ['DRAFT', 'SENT', 'ACCEPTED'];

        return parties
            .map(party => {
                const partyInvoices = (invoices ?? []).filter(i => i.party_id === party.id);
                const partyOrders = (orders ?? []).filter(o => o.party_id === party.id);

                const openOrders = partyOrders.filter(o => pendingStatuses.includes(o.status)).length;
                const totalBilled = partyInvoices.reduce((s, i) => s + Number(i.total), 0);
                const pendingCollection = partyInvoices
                    .filter(i => pendingStatuses.includes(i.status))
                    .reduce((s, i) => s + Number(i.total), 0);

                const dates = partyInvoices.map(i => i.issue_date).filter(Boolean).sort();
                const lastInvoiceDate = dates.length > 0 ? dates[dates.length - 1] : null;

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
                    pending_collection: pendingCollection,
                    last_invoice_date: lastInvoiceDate,
                };
            })
            .filter(c => c.total_orders > 0 || c.total_billed > 0);
    },

    async getClientStatement(client: SupabaseClient, partyId: string): Promise<ClientStatement> {
        const [{ data: party }, { data: invoices }, { data: orders }] = await Promise.all([
            client.from('parties')
                .select('id, legal_name, nit, email, phone, city, address')
                .eq('id', partyId)
                .single(),
            client.from('documents')
                .select('id, number, doc_type, status, issue_date, due_date, total, notes')
                .eq('doc_type', 'INVOICE')
                .eq('party_id', partyId)
                .order('issue_date', { ascending: false })
                .limit(30),
            client.from('documents')
                .select('id, number, doc_type, status, issue_date, due_date, total, notes')
                .in('doc_type', ['SALES_ORDER', 'QUOTATION'])
                .eq('party_id', partyId)
                .order('issue_date', { ascending: false })
                .limit(30),
        ]);

        const today = new Date().toISOString().split('T')[0];
        const invoiceList = (invoices ?? []) as ClientDocument[];
        const orderList = (orders ?? []) as ClientDocument[];

        const pendingStatuses = ['DRAFT', 'SENT', 'ACCEPTED'];
        const totalPending = invoiceList
            .filter(i => pendingStatuses.includes(i.status))
            .reduce((s, i) => s + Number(i.total), 0);
        const totalCollected = invoiceList
            .filter(i => i.status === 'PAID' || i.status === 'VOID')
            .reduce((s, i) => s + Number(i.total), 0);
        const overdueAmount = invoiceList
            .filter(i => pendingStatuses.includes(i.status) && i.due_date && i.due_date < today)
            .reduce((s, i) => s + Number(i.total), 0);

        return {
            client: party as ClientStatement['client'],
            invoices: invoiceList,
            orders: orderList,
            totalPending,
            totalCollected,
            totalOrders: orderList.length,
            overdueAmount,
        };
    },
};
