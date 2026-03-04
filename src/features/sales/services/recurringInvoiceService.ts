import { SupabaseClient } from '@supabase/supabase-js';

export interface RecurringInvoiceLine {
    description: string;
    qty: number;
    unit_price: number;
    tax_config?: { id: string; name: string; rate: number }[];
}

export interface RecurringInvoice {
    id: string;
    tenant_id: string;
    name: string;
    party_id: string | null;
    frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
    next_run_date: string;
    last_run_date: string | null;
    status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
    lines: RecurringInvoiceLine[];
    currency: string;
    notes_public: string | null;
    created_at: string;
    party?: { legal_name: string } | null;
}

const FREQ_LABELS: Record<string, string> = {
    WEEKLY:    'Semanal',
    BIWEEKLY:  'Quincenal',
    MONTHLY:   'Mensual',
    QUARTERLY: 'Trimestral',
    ANNUALLY:  'Anual',
};

function addFrequency(date: string, freq: RecurringInvoice['frequency']): string {
    const d = new Date(date + 'T12:00:00');
    switch (freq) {
        case 'WEEKLY':    d.setDate(d.getDate() + 7);   break;
        case 'BIWEEKLY':  d.setDate(d.getDate() + 14);  break;
        case 'MONTHLY':   d.setMonth(d.getMonth() + 1); break;
        case 'QUARTERLY': d.setMonth(d.getMonth() + 3); break;
        case 'ANNUALLY':  d.setFullYear(d.getFullYear() + 1); break;
    }
    return d.toISOString().split('T')[0];
}

function calcTotals(lines: RecurringInvoiceLine[]): { subtotal: number; taxes: number; total: number } {
    let subtotal = 0;
    let taxes = 0;
    for (const l of lines) {
        const lineTotal = l.qty * l.unit_price;
        subtotal += lineTotal;
        if (l.tax_config) {
            for (const t of l.tax_config) {
                taxes += lineTotal * (t.rate / 100);
            }
        }
    }
    return { subtotal, taxes, total: subtotal + taxes };
}

export const recurringInvoiceService = {
    freqLabel: (f: string) => FREQ_LABELS[f] ?? f,

    async getAll(client: SupabaseClient): Promise<RecurringInvoice[]> {
        const { data, error } = await client
            .from('recurring_invoices')
            .select('*, party:parties(legal_name)')
            .order('created_at', { ascending: false });
        if (error) { console.error('[recurring] getAll:', error.message); return []; }
        return (data ?? []) as RecurringInvoice[];
    },

    async create(
        client: SupabaseClient,
        payload: Omit<RecurringInvoice, 'id' | 'tenant_id' | 'last_run_date' | 'created_at' | 'party'>
    ): Promise<RecurringInvoice> {
        const { data: tenantRow } = await client
            .from('tenants').select('id').limit(1).single();
        const tenant_id = tenantRow?.id;

        const { data: { user } } = await client.auth.getUser();

        const { data, error } = await client
            .from('recurring_invoices')
            .insert({ ...payload, tenant_id, created_by: user?.id })
            .select('*, party:parties(legal_name)')
            .single();
        if (error) throw error;
        return data as RecurringInvoice;
    },

    async updateStatus(
        client: SupabaseClient,
        id: string,
        status: 'ACTIVE' | 'PAUSED' | 'CANCELLED'
    ): Promise<void> {
        const { error } = await client
            .from('recurring_invoices')
            .update({ status })
            .eq('id', id);
        if (error) throw error;
    },

    async generateInvoice(client: SupabaseClient, id: string): Promise<{ docId: string }> {
        const { data: rec, error: fetchErr } = await client
            .from('recurring_invoices')
            .select('*, party:parties(legal_name)')
            .eq('id', id)
            .single();
        if (fetchErr) throw fetchErr;
        if (!rec) throw new Error('Recurrencia no encontrada');

        const lines: RecurringInvoiceLine[] = rec.lines ?? [];
        const { subtotal, taxes, total } = calcTotals(lines);
        const today = new Date().toISOString().split('T')[0];

        // Create invoice document
        const { data: doc, error: docErr } = await client
            .from('documents')
            .insert({
                tenant_id: rec.tenant_id,
                doc_type: 'INVOICE',
                party_id: rec.party_id,
                issue_date: today,
                currency: rec.currency,
                subtotal,
                taxes,
                total,
                status: 'DRAFT',
                notes_public: rec.notes_public,
                notes_internal: `Generado automáticamente desde recurrencia: ${rec.name}`,
            })
            .select('id')
            .single();
        if (docErr) throw docErr;

        // Create document lines
        const docLines = lines.map(l => ({
            tenant_id: rec.tenant_id,
            document_id: doc.id,
            description: l.description,
            qty: l.qty,
            unit_price: l.unit_price,
            line_total: l.qty * l.unit_price,
            tax_config: l.tax_config ?? null,
        }));

        const { error: linesErr } = await client
            .from('document_lines')
            .insert(docLines);
        if (linesErr) throw linesErr;

        // Update recurring invoice: last_run_date + next_run_date
        const nextRun = addFrequency(today, rec.frequency);
        const { error: updErr } = await client
            .from('recurring_invoices')
            .update({ last_run_date: today, next_run_date: nextRun })
            .eq('id', id);
        if (updErr) throw updErr;

        return { docId: doc.id };
    },
};
