import { SupabaseClient } from '@supabase/supabase-js';
import { VendorSurveyRow } from '../types/vendorSurvey';
import { summarizeCompany, CompanySummary } from '../utils/vendorSurveyScoring';

const SELECT = `
    *,
    party:parties(legal_name, doc_number),
    author:profiles(full_name)
`;

export interface VendorSurveyFilters {
    party_id?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
}

export interface VendorCompanyResult extends CompanySummary {
    party_id: string;
    party_name: string;
    doc_number: string | null;
    last_survey_date: string;
    rows: VendorSurveyRow[];
}

export const vendorSurveyService = {
    /** Respuestas individuales, de la más reciente a la más antigua. */
    async getSurveys(client: SupabaseClient, filters: VendorSurveyFilters = {}): Promise<VendorSurveyRow[]> {
        let query = client.from('vendor_satisfaction_surveys').select(SELECT);

        if (filters.party_id) query = query.eq('party_id', filters.party_id);
        if (filters.start_date) query = query.gte('survey_date', filters.start_date);
        if (filters.end_date) query = query.lte('survey_date', filters.end_date);
        if (filters.search) query = query.ilike('respondent_name', `%${filters.search}%`);

        const { data, error } = await query
            .order('survey_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) { console.error('[vendorSurveys] getSurveys:', error.message); return []; }
        return (data ?? []) as unknown as VendorSurveyRow[];
    },

    async getSurveyById(client: SupabaseClient, id: string): Promise<VendorSurveyRow | null> {
        const { data, error } = await client
            .from('vendor_satisfaction_surveys')
            .select(SELECT)
            .eq('id', id)
            .maybeSingle();

        if (error) { console.error('[vendorSurveys] getSurveyById:', error.message); return null; }
        return (data as unknown as VendorSurveyRow) ?? null;
    },

    /**
     * Consolidado por proveedor: agrupa las respuestas y las promedia ponderando
     * por el peso del cargo de cada persona que respondió.
     */
    async getCompanyResults(client: SupabaseClient, filters: VendorSurveyFilters = {}): Promise<VendorCompanyResult[]> {
        const rows = await vendorSurveyService.getSurveys(client, filters);

        const byParty = new Map<string, VendorSurveyRow[]>();
        for (const row of rows) {
            const list = byParty.get(row.party_id) ?? [];
            list.push(row);
            byParty.set(row.party_id, list);
        }

        const results: VendorCompanyResult[] = [];
        for (const [partyId, partyRows] of byParty) {
            const summary = summarizeCompany(partyRows.map(r => ({
                role_weight: r.role_weight,
                overall_score: r.overall_score,
                score_relationship: r.score_relationship,
                score_orders_payments: r.score_orders_payments,
                score_commercial: r.score_commercial,
                csat: r.csat,
                nps: r.nps,
            })));

            results.push({
                ...summary,
                party_id: partyId,
                party_name: partyRows[0]?.party?.legal_name ?? 'Proveedor sin nombre',
                doc_number: partyRows[0]?.party?.doc_number ?? null,
                last_survey_date: partyRows[0]?.survey_date ?? '',
                rows: partyRows,
            });
        }

        // Primero lo que necesita atención: la peor nota arriba.
        return results.sort((a, b) => (a.overall ?? 101) - (b.overall ?? 101));
    },
};
