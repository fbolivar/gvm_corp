import { SupabaseClient } from '@supabase/supabase-js';
import { Party, PartyFilters } from '../types';

export const partyService = {
    /**
     * Retorna todos los terceros del rol indicado paginando internamente
     * en lotes de 1000 (Supabase PostgREST tope default ~1000 filas).
     * Pensado para poblar comboboxes con búsqueda en formularios.
     */
    async getAllPartiesLight(
        client: SupabaseClient,
        role: 'customer' | 'vendor' | 'all' = 'all'
    ): Promise<Party[]> {
        const pageSize = 1000;
        let offset = 0;
        const all: Record<string, unknown>[] = [];
        while (true) {
            let q = client
                .from('parties')
                .select('id, legal_name, trade_name, doc_number, nit, email, phone, is_customer, is_vendor, party_type');
            if (role === 'customer') q = q.eq('is_customer', true);
            else if (role === 'vendor') q = q.eq('is_vendor', true);
            const { data, error } = await q
                .order('legal_name')
                .range(offset, offset + pageSize - 1);
            if (error) {
                console.error('[parties] getAllPartiesLight:', error.message);
                break;
            }
            if (!data || data.length === 0) break;
            all.push(...data);
            if (data.length < pageSize) break;
            offset += pageSize;
        }
        return all as unknown as Party[];
    },

    /**
     * Obtiene una lista paginada de terceros con filtros.
     */
    async getParties(client: SupabaseClient, filters: PartyFilters) {
        let query = client.from('parties').select('*', { count: 'exact' });

        if (filters.search) {
            query = query.or(`legal_name.ilike.%${filters.search}%,doc_number.ilike.%${filters.search}%`);
        }

        if (filters.type) {
            query = query.eq('party_type', filters.type);
        }

        if (filters.role === 'customer') {
            query = query.eq('is_customer', true);
        } else if (filters.role === 'vendor') {
            query = query.eq('is_vendor', true);
        }

        const from = (filters.page - 1) * filters.per_page;
        const to = from + filters.per_page - 1;

        const { data, error, count } = await query
            .range(from, to)
            .order('created_at', { ascending: false });

        if (error) { console.error('[parties] getParties:', error.message); return { data: [] as Party[], count: 0 }; }
        return { data: data as Party[], count };
    },

    /**
     * Obtiene un tercero por su ID.
     */
    async getPartyById(client: SupabaseClient, id: string) {
        const { data, error } = await client
            .from('parties')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Party;
    },

    /**
     * Crea un nuevo tercero.
     */
    async createParty(client: SupabaseClient, party: Party) {
        // Asegurar tenancy se maneja por RLS o explícitamente si se requiere
        // En este caso asumimos RLS injecta el tenant_id o el usuario lo envía si es admin
        const { data, error } = await client
            .from('parties')
            .insert(party)
            .select()
            .single();

        if (error) throw error;
        return data as Party;
    },

    /**
     * Actualiza un tercero existente.
     */
    async updateParty(client: SupabaseClient, id: string, party: Partial<Party>) {
        const { data, error } = await client
            .from('parties')
            .update(party)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Party;
    },

    /**
     * Valida si un NIT ya existe en el sistema para el tenant actual.
     */
    async validateNit(client: SupabaseClient, nit: string) {
        const { data, error } = await client
            .from('parties')
            .select('id, legal_name')
            .eq('nit', nit)
            .maybeSingle();

        if (error) throw error;
        return data;
    }
};
