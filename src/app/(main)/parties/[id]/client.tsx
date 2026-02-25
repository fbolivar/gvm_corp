'use client'

import { PartyForm } from '@/features/parties/components/PartyForm';
import { updatePartyAction } from '@/features/parties/actions';
import { Party } from "@/features/parties/types";

import { toast } from 'sonner';

export default function EditPartyClient({ party }: { party: Party }) {

    const handleSubmit = async (data: Party) => {
        // IMPORTANT: We must pass the ID.
        // PartyForm data might allow editing ID? No. 
        // We use the ID from the prop or data.id if present.
        const id = party.id!;
        const result = await updatePartyAction(id, data);
        if (result?.error) {
            toast.error(`Error: ${result.error}`);
        }
    };

    return <PartyForm initialData={party} onSubmit={handleSubmit} />;
}
