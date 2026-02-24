
import { SupabaseClient } from '@supabase/supabase-js';
import { SearchResult } from '../types';
import { sectionsEs } from '../../help/data/docs-es';

export const globalSearchService = {
    async search(client: SupabaseClient, query: string): Promise<SearchResult[]> {
        if (!query || query.length < 2) return [];

        let normalizedQuery = query.trim();
        let categoryFilter: string | null = null;

        // Detect prefix filtering (p: products, c: parties, d: documents, l: leads, t: treasury, s: tickets, h: help)
        const prefixMatch = normalizedQuery.match(/^([pcdltsh]):\s?(.*)/i);
        if (prefixMatch) {
            const prefix = prefixMatch[1].toLowerCase();
            normalizedQuery = prefixMatch[2].trim();

            const prefixMap: Record<string, string> = {
                'p': 'PRODUCT',
                'c': 'PARTY',
                'd': 'DOCUMENT',
                'l': 'LEAD',
                't': 'ACCOUNT',
                's': 'TICKET',
                'h': 'HELP'
            };

            categoryFilter = prefixMap[prefix] || null;
        }

        if (normalizedQuery.length < 2) return [];

        // 1. Database Search (Consolidated RPC)
        const { data: dbResults, error } = await client
            .rpc('perform_global_search', {
                search_query: normalizedQuery,
                category_filter: categoryFilter === 'HELP' ? 'NONE' : categoryFilter // If help, we don't need DB results or we wait for local
            });

        if (error) {
            console.error('Search error:', error);
        }

        const consolidatedDbResults: SearchResult[] = (dbResults as any[]) || [];

        // 2. Local Documentation Search (Filtered if necessary)
        let helpResults: SearchResult[] = [];
        if (!categoryFilter || categoryFilter === 'HELP') {
            helpResults = sectionsEs
                .filter(section => {
                    const searchString = `
                        ${section.title} 
                        ${section.content.description} 
                        ${section.content.features.join(' ')} 
                        ${section.content.workflow?.map(w => w.title + ' ' + w.description).join(' ') || ''} 
                        ${section.content.tips?.join(' ') || ''}
                    `.toLowerCase();
                    return searchString.includes(normalizedQuery.toLowerCase());
                })
                .slice(0, 3)
                .map(section => ({
                    id: `help-${section.id}`,
                    title: section.title,
                    subtitle: section.content.description,
                    category: 'HELP' as const,
                    link: `/help?section=${section.id}`,
                    metadata: section
                }));
        }

        return [
            ...consolidatedDbResults,
            ...helpResults
        ];
    }
};
