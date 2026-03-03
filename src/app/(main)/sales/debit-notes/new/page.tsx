import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { productService } from '@/features/products/services/productService';
import { FilePlus2 } from 'lucide-react';
import { redirect } from 'next/navigation';
import CreditNoteFormClient from '../../credit-notes/new/client';

export default async function NewDebitNotePage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: invoiceData } = await documentService.getDocuments(supabase, {
        page: 1,
        per_page: 200,
        type: 'INVOICE' as any,
    });

    const eligibleInvoices = (invoiceData || []).filter((inv: any) =>
        ['ACCEPTED', 'SIGNED', 'SENT', 'DRAFT'].includes(inv.status)
    );

    const { data: products } = await productService.getProducts(supabase, {
        page: 1,
        per_page: 500,
    });

    return (
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">
                        Nueva Nota Debito
                    </h1>
                    <div className="flex items-center gap-4">
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
                            Cargo Adicional Post-Facturacion
                        </p>
                        <div className="flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-full">
                            <FilePlus2 className="h-3 w-3 text-amber-600" />
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                                ND — DIAN
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <CreditNoteFormClient
                invoices={eligibleInvoices.filter((i: { id?: string }) => i.id) as any}
                products={(products || []).filter((p: { id?: string }) => p.id) as any}
                noteType="DEBIT_NOTE"
            />
        </div>
    );
}
