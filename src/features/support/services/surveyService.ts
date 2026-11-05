import { SupabaseClient } from '@supabase/supabase-js';
import { SurveyRow } from '../types/survey';
import { summarizeCompany, CompanySummary } from '../utils/surveyScoring';

// Dos FKs a profiles (created_by y salesperson_id) → hay que nombrar el constraint
// en cada embed o PostgREST no sabe cuál usar ("more than one relationship found").
const SELECT = `
    *,
    party:parties(legal_name, doc_number),
    author:profiles!satisfaction_surveys_created_by_profiles_fkey(full_name),
    salesperson:profiles!satisfaction_surveys_salesperson_id_profiles_fkey(full_name)
`;

export interface SurveyFilters {
    party_id?: string;
    start_date?: string;
    end_date?: string;
    search?: string;
}

export interface CompanyResult extends CompanySummary {
    party_id: string;
    party_name: string;
    doc_number: string | null;
    last_survey_date: string;
    rows: SurveyRow[];
}

export const surveyService = {
    /** Respuestas individuales, de la más reciente a la más antigua. */
    async getSurveys(client: SupabaseClient, filters: SurveyFilters = {}): Promise<SurveyRow[]> {
        let query = client.from('satisfaction_surveys').select(SELECT);

        if (filters.party_id) query = query.eq('party_id', filters.party_id);
        if (filters.start_date) query = query.gte('survey_date', filters.start_date);
        if (filters.end_date) query = query.lte('survey_date', filters.end_date);
        if (filters.search) query = query.ilike('respondent_name', `%${filters.search}%`);

        const { data, error } = await query
            .order('survey_date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) { console.error('[surveys] getSurveys:', error.message); return []; }
        return (data ?? []) as unknown as SurveyRow[];
    },

    async getSurveyById(client: SupabaseClient, id: string): Promise<SurveyRow | null> {
        const { data, error } = await client
            .from('satisfaction_surveys')
            .select(SELECT)
            .eq('id', id)
            .maybeSingle();

        if (error) { console.error('[surveys] getSurveyById:', error.message); return null; }
        return (data as unknown as SurveyRow) ?? null;
    },

    /**
     * Consolidado por empresa: agrupa las respuestas y las promedia ponderando
     * por el peso del cargo de cada persona que respondió.
     */
    async getCompanyResults(client: SupabaseClient, filters: SurveyFilters = {}): Promise<CompanyResult[]> {
        const rows = await surveyService.getSurveys(client, filters);

        const byParty = new Map<string, SurveyRow[]>();
        for (const row of rows) {
            const list = byParty.get(row.party_id) ?? [];
            list.push(row);
            byParty.set(row.party_id, list);
        }

        const results: CompanyResult[] = [];
        for (const [partyId, partyRows] of byParty) {
            const summary = summarizeCompany(partyRows.map(r => ({
                role_weight: r.role_weight,
                overall_score: r.overall_score,
                score_service: r.score_service,
                score_orders: r.score_orders,
                score_product: r.score_product,
                score_commercial: r.score_commercial,
                csat: r.csat,
                nps: r.nps,
            })));

            results.push({
                ...summary,
                party_id: partyId,
                party_name: partyRows[0]?.party?.legal_name ?? 'Cliente sin nombre',
                doc_number: partyRows[0]?.party?.doc_number ?? null,
                // getSurveys ya viene ordenado por fecha descendente.
                last_survey_date: partyRows[0]?.survey_date ?? '',
                rows: partyRows,
            });
        }

        // Primero lo que necesita atención: la peor nota arriba.
        return results.sort((a, b) => (a.overall ?? 101) - (b.overall ?? 101));
    },
};
