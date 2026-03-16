import { SupabaseClient } from '@supabase/supabase-js';
import { Lead, LeadStatus, Opportunity, OpportunityStage } from '../types';

export const crmService = {
    async getLeads(client: SupabaseClient, filters?: any) {
        let query = client.from('leads').select('*').order('created_at', { ascending: false });

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        const { data, error } = await query;
        if (error) { console.error('[crm] getLeads:', error.message); return [] as Lead[]; }
        return data as Lead[];
    },

    async createLead(client: SupabaseClient, lead: Partial<Lead>) {
        const { data, error } = await client
            .from('leads')
            .insert(lead)
            .select()
            .single();

        if (error) throw error;
        return data as Lead;
    },

    async getLeadById(client: SupabaseClient, id: string) {
        const { data, error } = await client
            .from('leads')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Lead;
    },

    async deleteLead(client: SupabaseClient, id: string) {
        const { error } = await client
            .from('leads')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async updateLead(client: SupabaseClient, id: string, lead: Partial<Lead>) {
        const { data, error } = await client
            .from('leads')
            .update(lead)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Lead;
    },

    // Opportunities
    async getOpportunities(client: SupabaseClient) {
        const { data, error } = await client
            .from('crm_opportunities')
            .select(`
                *,
                leads (name, company_name),
                parties (legal_name, trade_name)
            `)
            .order('created_at', { ascending: false });

        if (error) { console.error('[crm] getOpportunities:', error.message); return [] as any[]; }
        return data as any[];
    },

    async createOpportunity(client: SupabaseClient, opportunity: Partial<Opportunity>) {
        const { data, error } = await client
            .from('crm_opportunities')
            .insert(opportunity)
            .select()
            .single();

        if (error) throw error;
        return data as Opportunity;
    },

    async updateOpportunity(client: SupabaseClient, id: string, opportunity: Partial<Opportunity>) {
        const { data, error } = await client
            .from('crm_opportunities')
            .update(opportunity)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Opportunity;
    },

    async getOpportunityById(client: SupabaseClient, id: string) {
        const { data, error } = await client
            .from('crm_opportunities')
            .select(`
                *,
                leads (name, company_name, email, phone, status),
                parties (legal_name, trade_name, email, phone)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as any;
    },

    // Default probability by stage — auto-adjusts on stage transition
    getStageProbability(stage: OpportunityStage): number {
        const map: Record<OpportunityStage, number> = {
            PROSPECTING: 10,
            QUALIFICATION: 25,
            PROPOSAL: 50,
            NEGOTIATION: 75,
            CLOSED_WON: 100,
            CLOSED_LOST: 0,
        };
        return map[stage] ?? 10;
    },

    async updateStage(client: SupabaseClient, id: string, stage: OpportunityStage) {
        // Get current state before update
        const { data: current } = await client
            .from('crm_opportunities')
            .select('stage, probability, tenant_id')
            .eq('id', id)
            .single();

        const newProbability = this.getStageProbability(stage);

        const { data, error } = await client
            .from('crm_opportunities')
            .update({
                stage,
                probability: newProbability,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Log stage change activity
        if (current) {
            const { data: { user } } = await client.auth.getUser();
            await client.from('crm_opportunity_activities').insert({
                tenant_id: current.tenant_id,
                opportunity_id: id,
                user_id: user?.id ?? null,
                type: 'STAGE_CHANGE',
                title: `Etapa cambiada a ${stage}`,
                old_stage: current.stage,
                new_stage: stage,
                old_probability: current.probability,
                new_probability: newProbability,
            });
        }

        return data as Opportunity;
    },

    async getActivities(client: SupabaseClient, opportunityId: string) {
        const { data, error } = await client
            .from('crm_opportunity_activities')
            .select('*, profiles:user_id (full_name, email)')
            .eq('opportunity_id', opportunityId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) { console.error('[crm] getActivities:', error.message); return []; }
        return data as Array<Record<string, unknown>>;
    },

    async addActivity(client: SupabaseClient, activity: {
        opportunity_id: string;
        type: string;
        title: string;
        description?: string;
    }) {
        const { data: { user } } = await client.auth.getUser();
        if (!user) throw new Error('No autenticado');

        const { data: tenantId } = await client.rpc('get_my_tenant_id');

        const { data, error } = await client
            .from('crm_opportunity_activities')
            .insert({
                ...activity,
                tenant_id: tenantId,
                user_id: user.id,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async getForecastByMonth(client: SupabaseClient, months = 6) {
        const { data, error } = await client.rpc('get_forecast_by_month', { p_months: months });
        if (error) { console.error('[crm] getForecastByMonth:', error.message); return []; }
        return (data ?? []) as Array<{
            month: string;
            opp_count: number;
            nominal: number;
            weighted: number;
            commit_val: number;
            best_case: number;
            pipeline_val: number;
        }>;
    },

    async getForecastByAssignee(client: SupabaseClient) {
        const { data, error } = await client.rpc('get_forecast_by_assignee');
        if (error) { console.error('[crm] getForecastByAssignee:', error.message); return []; }
        return (data ?? []) as Array<{
            user_id: string | null;
            full_name: string;
            opp_count: number;
            nominal: number;
            weighted: number;
            commit_val: number;
            best_case: number;
            pipeline_val: number;
        }>;
    },

    async getUpcomingCloses(client: SupabaseClient, limit = 10) {
        const { data, error } = await client
            .from('crm_opportunities')
            .select(`
                id, name, value, probability, stage, expected_close_date,
                parties (legal_name)
            `)
            .not('stage', 'in', '("CLOSED_WON","CLOSED_LOST")')
            .not('expected_close_date', 'is', null)
            .gte('expected_close_date', new Date().toISOString().split('T')[0])
            .order('expected_close_date', { ascending: true })
            .limit(limit);

        if (error) { console.error('[crm] getUpcomingCloses:', error.message); return []; }
        // Supabase returns party as object (single FK) — normalize
        return ((data ?? []) as unknown[]).map((row: unknown) => {
            const r = row as Record<string, unknown>;
            const parties = r.parties;
            return {
                ...r,
                parties: Array.isArray(parties) ? (parties[0] as { legal_name: string } | undefined) ?? null : parties as { legal_name: string } | null,
            };
        }) as Array<{
            id: string;
            name: string;
            value: number;
            probability: number;
            stage: string;
            expected_close_date: string;
            parties: { legal_name: string } | null;
        }>;
    },

    async getDashboardStats(client: SupabaseClient) {
        const [leads, opportunities] = await Promise.all([
            this.getLeads(client),
            this.getOpportunities(client)
        ]);

        const totalLeads = leads.length;
        const newLeads = leads.filter(l => l.status === 'NEW').length;
        const convertedLeads = leads.filter(l => l.status === 'CONVERTED').length;

        const openOpportunities = opportunities.filter(o => o.stage !== 'CLOSED_WON' && o.stage !== 'CLOSED_LOST');
        const closedWon = opportunities.filter(o => o.stage === 'CLOSED_WON');

        // Pipeline Value (Nominal)
        const pipelineValue = openOpportunities.reduce((sum, o) => sum + (Number(o.value) || 0), 0);

        // Forecast Value (Weighted by probability)
        const forecastValue = openOpportunities.reduce((sum, o) => {
            const val = Number(o.value) || 0;
            const prob = (Number(o.probability) || 0) / 100;
            return sum + (val * prob);
        }, 0);

        const winRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

        // Distribución por etapas
        const stagesDistribution = openOpportunities.reduce((acc: any, o) => {
            acc[o.stage] = (acc[o.stage] || 0) + (Number(o.value) || 0);
            return acc;
        }, {});

        // Data for lead funnel
        const leadFunnel = {
            new: newLeads,
            contacted: leads.filter(l => l.status === 'CONTACTED').length,
            qualified: leads.filter(l => l.status === 'QUALIFIED').length,
            converted: convertedLeads
        };

        return {
            totalLeads,
            newLeads,
            convertedLeads,
            openOpportunitiesCount: openOpportunities.length,
            closedWonCount: closedWon.length,
            pipelineValue,
            forecastValue,
            winRate,
            stagesDistribution,
            leadFunnel,
            recentLeads: leads.slice(0, 5),
            recentOpportunities: opportunities.slice(0, 5)
        };
    }
};
