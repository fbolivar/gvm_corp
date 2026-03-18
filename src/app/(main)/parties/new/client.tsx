'use client'

import { createPartyAction } from '@/features/parties/actions';
import { PartyForm } from '@/features/parties/components/PartyForm';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface Props {
    priceLists: { id: string; name: string }[]
    salespeople: { id: string; full_name: string; email: string }[]
}

export default function NewPartyClient({ priceLists, salespeople }: Props) {
    const router = useRouter();

    const handleSubmit = async (data: any) => {
        const result = await createPartyAction(data);
        if (result?.error) {
            toast.error(result.error);
            throw new Error(result.error);
        }

        toast.success('Tercero creado exitosamente', {
            description: 'El registro ha sido guardado correctamente en el sistema',
            duration: 4000,
        });
        router.push('/parties');
    };

    return (
        <PartyForm
            onSubmit={handleSubmit}
            priceLists={priceLists}
            salespeople={salespeople}
        />
    );
}
