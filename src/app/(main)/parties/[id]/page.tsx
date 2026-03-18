import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
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
        if (!party) notFound();

        // Fetch price lists
        const { data: priceLists } = await supabase
            .from('price_lists')
            .select('id, name')
            .order('name');

        // Fetch team members as salespeople
        const { data: salespeople } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .order('full_name');

        return (
            <div className="pb-20">
                <EditPartyClient
                    party={party}
                    priceLists={priceLists || []}
                    salespeople={salespeople || []}
                />
            </div>
        );
    } catch (e) {
        notFound();
    }
}
