'use client'

import { createPartyAction } from '@/features/parties/actions';
import { PartyForm } from '@/features/parties/components/PartyForm';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function NewPartyPage() {
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
        <div className="pb-20">
            <PartyForm onSubmit={handleSubmit} />
        </div>
    );
}
