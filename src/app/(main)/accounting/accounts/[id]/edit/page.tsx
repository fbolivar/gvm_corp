import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { AccountForm } from '@/features/accounting/components/AccountForm';
import { redirect, notFound } from 'next/navigation';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EditAccountPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [account, accounts] = await Promise.all([
        accountingService.getAccountById(supabase, id),
        accountingService.getAccounts(supabase),
    ]);

    if (!account) notFound();

    // Exclude self and children from parent options
    const parentOptions = accounts.filter(a => a.id !== id);

    return <AccountForm account={account} parentAccounts={parentOptions} />;
}
