import type { SupabaseClient } from '@supabase/supabase-js';
import type { PartyContact, PartyAddress, DirectoryRow, AddressKind } from '../types/directory';

const CONTACT_COLS = 'id, party_id, name, role, phone, mobile, email, is_primary, notes, created_at, updated_at';
const ADDRESS_COLS = 'id, party_id, label, kind, address, city, phone, notes, is_primary, created_at, updated_at';

/** Limpia un término para usarlo en un `.or()` de PostgREST (coma/paréntesis son sintaxis). */
function sanitize(term: string): string {
    return term.replace(/[,()*%]/g, ' ').trim();
}

interface PartyEmbed {
    legal_name?: string | null;
    trade_name?: string | null;
    nit?: string | null;
    city?: string | null;
}

export const directoryService = {
    async listContacts(client: SupabaseClient, partyId: string): Promise<PartyContact[]> {
        const { data } = await client
            .from('party_contacts')
            .select(CONTACT_COLS)
            .eq('party_id', partyId)
            .order('is_primary', { ascending: false })
            .order('name', { ascending: true });
        return (data ?? []) as PartyContact[];
    },

    async listAddresses(client: SupabaseClient, partyId: string): Promise<PartyAddress[]> {
        const { data } = await client
            .from('party_addresses')
            .select(ADDRESS_COLS)
            .eq('party_id', partyId)
            .order('is_primary', { ascending: false })
            .order('label', { ascending: true });
        return (data ?? []) as PartyAddress[];
    },

    /**
     * Directorio global: busca contactos por nombre/cargo/teléfono/email, y también
     * por el nombre/NIT del cliente (resolviendo los party_id que coincidan). RLS
     * limita todo al tenant del usuario.
     */
    async searchDirectory(client: SupabaseClient, rawTerm: string, limit = 300): Promise<DirectoryRow[]> {
        let q = client
            .from('party_contacts')
            .select(`${CONTACT_COLS}, party:parties(legal_name, trade_name, nit, city)`)
            .order('name', { ascending: true })
            .limit(limit);

        const term = sanitize(rawTerm ?? '');
        if (term) {
            const parts = [
                `name.ilike.%${term}%`,
                `role.ilike.%${term}%`,
                `phone.ilike.%${term}%`,
                `mobile.ilike.%${term}%`,
                `email.ilike.%${term}%`,
            ];
            // Clientes cuyo nombre/NIT coincide → incluir sus contactos.
            const { data: parties } = await client
                .from('parties')
                .select('id')
                .or(`legal_name.ilike.%${term}%,trade_name.ilike.%${term}%,nit.ilike.%${term}%`)
                .limit(100);
            const ids = (parties ?? []).map((p: { id: string }) => p.id);
            if (ids.length > 0) parts.push(`party_id.in.(${ids.join(',')})`);
            q = q.or(parts.join(','));
        }

        const { data } = await q;
        return (data ?? []).map((r: Record<string, unknown>) => {
            const party = (r.party ?? {}) as PartyEmbed;
            return {
                id: r.id as string,
                party_id: r.party_id as string,
                name: r.name as string,
                role: (r.role as string | null) ?? null,
                phone: (r.phone as string | null) ?? null,
                mobile: (r.mobile as string | null) ?? null,
                email: (r.email as string | null) ?? null,
                is_primary: Boolean(r.is_primary),
                notes: (r.notes as string | null) ?? null,
                created_at: r.created_at as string,
                updated_at: r.updated_at as string,
                party_name: party.trade_name || party.legal_name || 'Cliente',
                party_nit: party.nit ?? null,
                party_city: party.city ?? null,
            } as DirectoryRow;
        });
    },
};

export { ADDRESS_KINDS } from '../types/directory';
export type { AddressKind };
