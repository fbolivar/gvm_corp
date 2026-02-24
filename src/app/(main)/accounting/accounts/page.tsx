import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { AccountList } from '@/features/accounting/components/AccountList';

export default async function AccountsPage() {
    const supabase = await createClient();
    const accounts = await accountingService.getAccounts(supabase);

    return (
        <div className="container mx-auto py-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Plan Único de Cuentas (PUC)</h1>
            </div>
            <AccountList accounts={accounts} />
        </div>
    );
}
