import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { AccountForm } from '@/features/accounting/components/AccountForm';
import { redirect } from 'next/navigation';

export default async function NewAccountPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const accounts = await accountingService.getAccounts(supabase);

    return <AccountForm parentAccounts={accounts} />;
}
