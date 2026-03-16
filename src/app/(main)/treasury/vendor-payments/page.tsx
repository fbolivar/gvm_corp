import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { VendorPaymentFileGenerator } from '@/features/treasury/components/VendorPaymentFileGenerator';
import { FileOutput } from 'lucide-react';

export default async function VendorPaymentsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Get pending vendor bills with party info
    const { data: pendingBills } = await supabase
        .from('documents')
        .select(`
            id, number, total, balance, issue_date, due_date, currency,
            party:parties(id, legal_name, trade_name, doc_type, doc_number, bank_name, bank_account_type, bank_account_number)
        `)
        .eq('doc_type', 'VENDOR_BILL')
        .in('status', ['POSTED', 'PARTIAL'])
        .gt('balance', 0)
        .order('due_date', { ascending: true });

    return (
        <div className="page-container space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 p-10 text-white shadow-active">
                <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none">
                    <FileOutput className="h-48 w-48" />
                </div>
                <div className="relative z-10 space-y-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Tesoreria</span>
                    <h1 className="text-3xl font-black tracking-tight uppercase">Pagos a Proveedores</h1>
                    <p className="text-white/40 text-xs font-bold">Genera archivos planos para pagos masivos (ACH)</p>
                </div>
            </div>

            <VendorPaymentFileGenerator pendingBills={(pendingBills ?? []) as any} />
        </div>
    );
}
