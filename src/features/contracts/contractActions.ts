'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { contractService, ContractStatus, ContractType } from './services/contractService';

interface CreateContractPayload {
    title: string;
    contract_number: string | null;
    contract_type: ContractType;
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
}

export async function createContractAction(
    payload: CreateContractPayload
): Promise<{ id?: string; error?: string }> {
    try {
        const supabase = await createClient();
        const contract = await contractService.create(supabase, {
            ...payload,
            status: 'DRAFT',
        });
        revalidatePath('/contracts');
        return { id: contract.id };
    } catch (err) {
        return { error: String(err) };
    }
}

export async function updateContractStatusAction(
    id: string,
    status: ContractStatus
): Promise<{ error?: string }> {
    try {
        const supabase = await createClient();
        await contractService.updateStatus(supabase, id, status);
        revalidatePath('/contracts');
        revalidatePath(`/contracts/${id}`);
        return {};
    } catch (err) {
        return { error: String(err) };
    }
}

export async function addContractAmendmentAction(
    contractId: string,
    amendment: { description: string; effective_date: string; value_change?: number }
): Promise<{ error?: string }> {
    try {
        const supabase = await createClient();
        await contractService.addAmendment(supabase, contractId, amendment);
        revalidatePath(`/contracts/${contractId}`);
        return {};
    } catch (err) {
        return { error: String(err) };
    }
}
