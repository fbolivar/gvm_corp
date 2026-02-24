import { SupabaseClient } from '@supabase/supabase-js';
import { sectionsEs } from '../data/docs-es';
import { sectionsEn } from '../data/docs-en';

export const helpService = {
    async getDocs(language: 'es' | 'en' = 'es') {
        return language === 'es' ? sectionsEs : sectionsEn;
    },

    async searchDocs(query: string, language: 'es' | 'en' = 'es') {
        const sections = language === 'es' ? sectionsEs : sectionsEn;

        if (!query) return sections;

        const normalizedQuery = query.toLowerCase();

        return sections.filter(s =>
            s.title.toLowerCase().includes(normalizedQuery) ||
            s.content.description.toLowerCase().includes(normalizedQuery) ||
            s.content.features.some(f => f.toLowerCase().includes(normalizedQuery)) ||
            (s.content.workflow && s.content.workflow.some(w =>
                w.title.toLowerCase().includes(normalizedQuery) ||
                w.description.toLowerCase().includes(normalizedQuery)
            ))
        );
    },

    async submitTicket(supabase: SupabaseClient, ticket: { subject: string; description: string }) {
        // En un escenario real:
        // const { data, error } = await supabase.from('help_tickets').insert([ticket]).select();
        // if (error) throw error;
        // return data[0];

        // Simulando delay de red
        await new Promise(resolve => setTimeout(resolve, 1000));

        return {
            id: Math.random().toString(36).substr(2, 9).toUpperCase(),
            ...ticket,
            status: 'OPEN',
            created_at: new Date().toISOString()
        };
    }
};
