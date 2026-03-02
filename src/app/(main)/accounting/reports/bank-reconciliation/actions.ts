'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function toggleReconciled(transactionId: string, current: boolean) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('treasury_transactions')
        .update({
            is_reconciled: !current,
            reconciled_at: !current ? new Date().toISOString() : null,
        })
        .eq('id', transactionId);

    if (error) throw new Error(error.message);
    revalidatePath('/accounting/reports/bank-reconciliation');
}
