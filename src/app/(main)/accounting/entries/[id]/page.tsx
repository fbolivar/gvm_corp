import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { EntryDetail } from '@/features/accounting/components/EntryDetail';
import { notFound, redirect } from 'next/navigation';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EntryDetailPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    try {
        // We need a specific getEntryById in accountingService or use a generic one if available
        // Let's check accountingService for getEntryById or similar. 
        // I'll assume getEntryById exists or use the list with a filter for now.
        // Actually I'll use a query here directly if I'm not sure, but better check the service again.

        const { data: entry, error } = await supabase
            .from('journal_entries')
            .select(`
                *,
                lines:journal_lines(
                    *,
                    account:chart_accounts(code, name),
                    party:parties(legal_name)
                )
            `)
            .eq('id', id)
            .single();

        if (error || !entry) {
            notFound();
        }

        return (
            <div className="page-container py-12">
                <EntryDetail entry={entry} />
            </div>
        );
    } catch (error) {
        notFound();
    }
}
