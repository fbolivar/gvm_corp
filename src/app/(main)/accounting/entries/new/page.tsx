import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { partyService } from '@/features/parties/services/partyService';
import { dimensionService } from '@/features/accounting/services/dimensionService';
import { JournalEntryForm } from '@/features/accounting/components/JournalEntryForm';
import { redirect } from 'next/navigation';

export default async function NewEntryPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [accounts, parties, dimensionOptions] = await Promise.all([
        accountingService.getAccounts(supabase),
        partyService.getAllPartiesLight(supabase, 'all'),
        dimensionService.getDimensionOptions(supabase),
    ]);

    const dimensions = dimensionOptions.map(d => ({
        dimension: { id: d.dimension.id, code: d.dimension.code, name: d.dimension.name },
        values: d.values.map(v => ({ id: v.id, code: v.code, name: v.name })),
    }));

    return (
        <div className="page-container py-12">
            <JournalEntryForm
                accounts={accounts || []}
                parties={parties || []}
                dimensions={dimensions}
            />
        </div>
    );
}
