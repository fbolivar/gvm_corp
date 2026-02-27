import { SupabaseClient } from '@supabase/supabase-js';
import { Lead, LeadStatus, Opportunity, OpportunityStage } from '../types';

export const crmService = {
    async getLeads(client: SupabaseClient, filters?: any) {
        let query = client.from('leads').select('*').order('created_at', { ascending: false });

        if (filters?.status) {
            query = query.eq('status', filters.status);
        }

        const { data, error } = await query;
        if (error) throw error;
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

        if (error) throw error;
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

    async updateStage(client: SupabaseClient, id: string, stage: OpportunityStage) {
        const { data, error } = await client
            .from('crm_opportunities')
            .update({ stage, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Opportunity;
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
