import { createClient } from '@/lib/supabase/server';
import NewPartyClient from './client';

export default async function NewPartyPage() {
    const supabase = await createClient();

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
            <NewPartyClient
                priceLists={priceLists || []}
                salespeople={salespeople || []}
            />
        </div>
    );
}
