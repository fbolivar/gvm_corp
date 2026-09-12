'use client'

import { PartyForm } from '@/features/parties/components/PartyForm';
import { updatePartyAction } from '@/features/parties/actions';
import { Party } from "@/features/parties/types";
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Props {
    party: Party
    priceLists: { id: string; name: string }[]
    salespeople: { id: string; full_name: string; email: string }[]
    employeeId?: string | null
}

export default function EditPartyClient({ party, priceLists, salespeople, employeeId }: Props) {
    const router = useRouter();

    const handleSubmit = async (data: Party) => {
        const id = party.id!;
        const result = await updatePartyAction(id, data);
        if (result?.error) {
            toast.error(result.error);
            throw new Error(result.error);
        }

        toast.success('Tercero actualizado exitosamente', {
            description: 'Los cambios han sido guardados correctamente',
            duration: 4000,
        });
        router.push('/parties');
    };

    return (
        <PartyForm
            initialData={party}
            onSubmit={handleSubmit}
            priceLists={priceLists}
            salespeople={salespeople}
            employeeId={employeeId}
        />
    );
}
