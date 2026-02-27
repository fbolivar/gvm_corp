
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
        let { data: dbResults, error } = await client
            .rpc('perform_global_search', {
                search_query: normalizedQuery,
                category_filter: categoryFilter === 'HELP' ? 'NONE' : categoryFilter
            });

        if (error) {
            console.error('Search RPC error (using fallback):', error.message);

            // Fallback: search in common tables if RPC is missing or fails
            const fallbackResults: SearchResult[] = [];

            if (!categoryFilter || categoryFilter === 'PRODUCT') {
                const { data: prods } = await client.from('products').select('id, name, sku').ilike('name', `%${normalizedQuery}%`).limit(3);
                prods?.forEach(p => fallbackResults.push({ id: p.id, title: p.name, subtitle: p.sku, category: 'PRODUCT', link: `/inventory?search=${p.sku}` }));
            }
            if (!categoryFilter || categoryFilter === 'PARTY') {
                const { data: parties } = await client.from('parties').select('id, legal_name, doc_number').ilike('legal_name', `%${normalizedQuery}%`).limit(3);
                parties?.forEach(p => fallbackResults.push({ id: p.id, title: p.legal_name, subtitle: p.doc_number, category: 'PARTY', link: `/parties/${p.id}` }));
            }

            dbResults = fallbackResults;
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
