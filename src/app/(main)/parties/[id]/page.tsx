import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
import { updatePartyAction } from '@/features/parties/actions'; // We need a client wrapper for action...
// Wait, we can't pass server action directly to client component prop if checking types logic?
// Yes we can.

import EditPartyClient from './client';
import { notFound } from 'next/navigation';

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditPartyPage({ params }: PageProps) {
    const supabase = await createClient();
    const { id } = await params;

    try {
        const party = await partyService.getPartyById(supabase, id);

        if (!party) {
            notFound();
        }

        return (
            <div className="container mx-auto py-6 max-w-2xl">
                <h1 className="text-2xl font-bold mb-4">Editar Tercero</h1>
                <EditPartyClient party={party} />
            </div>
        );
    } catch (e) {
        notFound();
    }
}
