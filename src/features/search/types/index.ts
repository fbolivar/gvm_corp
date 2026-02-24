
export type SearchResultCategory = 'PRODUCT' | 'PARTY' | 'DOCUMENT' | 'COMMAND' | 'LEAD' | 'TICKET' | 'ACCOUNT' | 'HELP';

export interface SearchResult {
    id: string;
    title: string;
    subtitle?: string;
    category: SearchResultCategory;
    link?: string;
    icon?: string; // Lucide icon name or type
    metadata?: any;
    suggestion?: string; // For "Did you mean?"
}

export interface CommandDefinition {
    id: string;
    title: string;
    description: string;
    icon: string;
    action: () => void;
}
