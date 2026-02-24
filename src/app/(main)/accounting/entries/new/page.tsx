import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { partyService } from '@/features/parties/services/partyService';
import { JournalEntryForm } from '@/features/accounting/components/JournalEntryForm';
import { redirect } from 'next/navigation';

export default async function NewEntryPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [accounts, partiesRes] = await Promise.all([
        accountingService.getAccounts(supabase),
        partyService.getParties(supabase, { page: 1, per_page: 500, role: 'all' })
    ]);

    const parties = partiesRes.data;

    return (
        <div className="page-container py-12">
            <JournalEntryForm
                accounts={accounts || []}
                parties={parties || []}
            />
        </div>
    );
}
