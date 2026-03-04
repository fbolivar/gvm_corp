import { SupabaseClient } from '@supabase/supabase-js';

export type ContractType = 'SERVICE' | 'PURCHASE' | 'LEASE' | 'EMPLOYMENT' | 'CONSULTING' | 'OTHER';
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'SUSPENDED';

export interface Contract {
    id: string;
    tenant_id: string;
    title: string;
    contract_number: string | null;
    contract_type: ContractType;
    status: ContractStatus;
    party_id: string | null;
    start_date: string;
    end_date: string | null;
    auto_renew: boolean;
    value: number;
    currency: string;
    signed_by: string | null;
    signed_at: string | null;
    description: string | null;
    notes: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    party?: { legal_name: string; nit: string } | null;
}

export interface ContractAmendment {
    id: string;
    contract_id: string;
    amendment_number: number;
    description: string;
    effective_date: string;
    value_change: number;
    created_by: string | null;
    created_at: string;
}

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
    SERVICE:    'Servicios',
    PURCHASE:   'Compraventa',
    LEASE:      'Arrendamiento',
    EMPLOYMENT: 'Laboral',
    CONSULTING: 'Consultoría',
    OTHER:      'Otro',
};

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
    DRAFT:      'Borrador',
    ACTIVE:     'Activo',
    EXPIRED:    'Vencido',
    TERMINATED: 'Terminado',
    SUSPENDED:  'Suspendido',
};

export const CONTRACT_STATUS_COLORS: Record<ContractStatus, string> = {
    DRAFT:      'bg-slate-100 text-slate-500',
    ACTIVE:     'bg-emerald-100 text-emerald-700',
    EXPIRED:    'bg-rose-100 text-rose-700',
    TERMINATED: 'bg-slate-100 text-slate-400',
    SUSPENDED:  'bg-amber-100 text-amber-700',
};

export const CONTRACT_TYPE_COLORS: Record<ContractType, string> = {
    SERVICE:    'bg-blue-100 text-blue-700',
    PURCHASE:   'bg-violet-100 text-violet-700',
    LEASE:      'bg-teal-100 text-teal-700',
    EMPLOYMENT: 'bg-indigo-100 text-indigo-700',
    CONSULTING: 'bg-orange-100 text-orange-700',
    OTHER:      'bg-slate-100 text-slate-500',
};

/** Returns days until expiration (negative = already expired) */
export function daysUntilExpiry(contract: Contract): number | null {
    if (!contract.end_date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(contract.end_date);
    return Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export const contractService = {
    async getAll(client: SupabaseClient): Promise<Contract[]> {
        const { data, error } = await client
            .from('contracts')
            .select('*, party:parties(legal_name, nit)')
            .order('created_at', { ascending: false });
        if (error) { console.error('[contracts] getAll:', error.message); return []; }
        return (data ?? []) as Contract[];
    },

    async getById(client: SupabaseClient, id: string): Promise<Contract> {
        const { data, error } = await client
            .from('contracts')
            .select('*, party:parties(legal_name, nit)')
            .eq('id', id)
            .single();
        if (error) { console.error('[contracts] getById:', error.message); return {} as Contract; }
        return data as Contract;
    },

    async getAmendments(client: SupabaseClient, contractId: string): Promise<ContractAmendment[]> {
        const { data, error } = await client
            .from('contract_amendments')
            .select('*')
            .eq('contract_id', contractId)
            .order('amendment_number', { ascending: true });
        if (error) { console.error('[contracts] getAmendments:', error.message); return []; }
        return (data ?? []) as ContractAmendment[];
    },

    async create(
        client: SupabaseClient,
        payload: Omit<Contract, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'party' | 'created_by'>
    ): Promise<Contract> {
        const { data: tenantRow } = await client.from('tenants').select('id').limit(1).single();
        const { data: { user } } = await client.auth.getUser();
        const { data, error } = await client
            .from('contracts')
            .insert({ ...payload, tenant_id: tenantRow?.id, created_by: user?.id })
            .select('*, party:parties(legal_name, nit)')
            .single();
        if (error) throw error;
        return data as Contract;
    },

    async updateStatus(client: SupabaseClient, id: string, status: ContractStatus): Promise<void> {
        const { error } = await client.from('contracts').update({ status }).eq('id', id);
        if (error) throw error;
    },

    async addAmendment(
        client: SupabaseClient,
        contractId: string,
        amendment: { description: string; effective_date: string; value_change?: number }
    ): Promise<ContractAmendment> {
        const { data: { user } } = await client.auth.getUser();
        // Get next amendment number
        const { data: existing } = await client
            .from('contract_amendments')
            .select('amendment_number')
            .eq('contract_id', contractId)
            .order('amendment_number', { ascending: false })
            .limit(1);
        const nextNum = (existing?.[0]?.amendment_number ?? 0) + 1;
        const { data, error } = await client
            .from('contract_amendments')
            .insert({
                contract_id: contractId,
                amendment_number: nextNum,
                description: amendment.description,
                effective_date: amendment.effective_date,
                value_change: amendment.value_change ?? 0,
                created_by: user?.id,
            })
            .select()
            .single();
        if (error) throw error;
        return data as ContractAmendment;
    },
};
