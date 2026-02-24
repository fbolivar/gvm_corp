import { SupabaseClient } from '@supabase/supabase-js';

export interface WithholdingSummary {
    account_code: string;
    account_name: string;
    base_amount: number;
    tax_amount: number;
    rate: number;
}

export interface AnnualWithholdingRegistry {
    party_id: string;
    legal_name: string;
    doc_number: string;
    total_tax: number;
    total_base: number;
    concept_count: number;
}

export interface CertificateData {
    period: string;
    party: any;
    items: WithholdingSummary[];
    total_withheld: number;
    city_of_issue: string;
    company_info: any;
}

export const legalReportService = {
    /**
     * Obtiene el resumen de retenciones para un tercero y periodo
     * Basado en los asientos contables registrados
     */
    async getWithholdingData(client: SupabaseClient, partyId: string, startDate: string, endDate: string) {
        const { data, error } = await client
            .from('journal_lines')
            .select(`
                id,
                debit,
                credit,
                base_amount,
                tax_rate,
                description,
                chart_accounts (id, code, name),
                journal_entries!inner (id, entry_date)
            `)
            .eq('party_id', partyId)
            .gte('journal_entries.entry_date', startDate)
            .lte('journal_entries.entry_date', endDate)
            .or('code.ilike.2365%,code.ilike.2367%,code.ilike.2368%', { foreignTable: 'chart_accounts' });

        if (error) throw error;

        // Agrupar por cuenta para el certificado
        const summaryMap = new Map<string, WithholdingSummary>();

        data?.forEach((line: any) => {
            const acc = line.chart_accounts;
            const amount = line.credit; // Retención practicada
            if (amount === 0) return;

            if (summaryMap.has(acc.code)) {
                const existing = summaryMap.get(acc.code)!;
                existing.tax_amount += amount;
                existing.base_amount += (line.base_amount || 0);
            } else {
                summaryMap.set(acc.code, {
                    account_code: acc.code,
                    account_name: acc.name,
                    base_amount: line.base_amount || 0,
                    tax_amount: amount,
                    rate: line.tax_rate || 0
                });
            }
        });

        return Array.from(summaryMap.values());
    },

    /**
     * Obtiene la información completa para un certificado
     */
    async getCertificateFullData(client: SupabaseClient, partyId: string, year: number) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const [items, party, tenant] = await Promise.all([
            this.getWithholdingData(client, partyId, startDate, endDate),
            client.from('parties').select('*').eq('id', partyId).single().then(r => r.data),
            client.from('tenants').select('*').limit(1).single().then(r => r.data)
        ]);

        return {
            period: `${year}`,
            party,
            items,
            total_withheld: items.reduce((sum, i) => sum + i.tax_amount, 0),
            city_of_issue: tenant?.city || 'Bogotá D.C.',
            company_info: tenant
        } as CertificateData;
    },

    /**
     * Obtiene una lista de todos los terceros que tienen retenciones en el año
     * Útil para generación masiva o auditoría
     */
    async getAnnualWithholdingRegistry(client: SupabaseClient, year: number) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const { data, error } = await client
            .from('journal_lines')
            .select(`
                party_id,
                credit,
                base_amount,
                parties!inner (legal_name, doc_number),
                chart_accounts!inner (code),
                journal_entries!inner (entry_date)
            `)
            .gte('journal_entries.entry_date', startDate)
            .lte('journal_entries.entry_date', endDate)
            .or('code.ilike.2365%,code.ilike.2367%,code.ilike.2368%', { foreignTable: 'chart_accounts' });

        if (error) throw error;

        // Agrupar por tercero
        const registryMap = new Map<string, AnnualWithholdingRegistry>();

        data?.forEach((line: any) => {
            if (!line.party_id || line.credit === 0) return;

            const party = line.parties;
            const partyId = line.party_id;

            if (registryMap.has(partyId)) {
                const existing = registryMap.get(partyId)!;
                existing.total_tax += line.credit;
                existing.total_base += (line.base_amount || 0);
                existing.concept_count += 1;
            } else {
                registryMap.set(partyId, {
                    party_id: partyId,
                    legal_name: party.legal_name,
                    doc_number: party.doc_number,
                    total_tax: line.credit,
                    total_base: line.base_amount || 0,
                    concept_count: 1
                });
            }
        });

        return Array.from(registryMap.values()).sort((a, b) => b.total_tax - a.total_tax);
    }
};
