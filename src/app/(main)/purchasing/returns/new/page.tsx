import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PurchaseReturnForm } from '@/features/purchasing/components/PurchaseReturnForm';

export default async function NewPurchaseReturnPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Get vendor bills eligible for a return (POSTED, PARTIAL, or PAID with remaining balance)
    const { data: vendorBills } = await supabase
        .from('documents')
        .select(`
            id,
            number,
            total,
            balance,
            party_id,
            parties(legal_name, trade_name)
        `)
        .eq('doc_type', 'VENDOR_BILL')
        .in('status', ['POSTED', 'PARTIAL', 'PAID'])
        .order('created_at', { ascending: false });

    return (
        <div className="page-container space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PurchaseReturnForm vendorBills={(vendorBills ?? []) as any} />
        </div>
    );
}
