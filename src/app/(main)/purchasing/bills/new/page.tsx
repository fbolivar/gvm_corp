import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
import { productService } from '@/features/products/services/productService';
import { documentService } from '@/features/documents/services/documentService';
import NewBillClient from './client';
import { FileCheck, Sparkles } from 'lucide-react';
import { redirect } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';

export default async function NewBillPage(props: { searchParams: Promise<{ orderId?: string }> }) {
    const searchParams = await props.searchParams;
    const orderId = searchParams.orderId;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [partiesRes, productsRes, orderRes, tenant] = await Promise.all([
        partyService.getParties(supabase, { page: 1, per_page: 500, role: 'vendor', search: '' } as any),
        productService.getProducts(supabase, { page: 1, per_page: 500 }),
        orderId ? documentService.getDocumentById(supabase, orderId) : Promise.resolve(null),
        settingsService.getTenantInfo(supabase)
    ]);

    const parties = partiesRes.data;
    const products = productsRes.data;
    const initialOrder = orderRes;

    let initialData = {
        doc_type: 'VENDOR_BILL',
        status: 'DRAFT',
        currency: 'COP',
        issue_date: new Date().toISOString().split('T')[0],
        lines: [],
        total: 0,
        subtotal: 0,
        taxes: 0
    };

    if (initialOrder) {
        initialData = {
            ...initialData,
            party_id: initialOrder.party_id,
            parent_id: initialOrder.id,
            currency: initialOrder.currency || 'COP',
            subtotal: initialOrder.subtotal,
            taxes: initialOrder.taxes,
            total: initialOrder.total,
            notes_internal: `Convertido desde OC #${initialOrder.number}`,
            notes_public: initialOrder.notes_public,
            lines: initialOrder.lines?.map((line: any) => ({
                product_id: line.product_id,
                description: line.description,
                qty: line.qty,
                unit_price: line.unit_price,
                line_total: line.line_total,
                tax_config: line.tax_config,
            })) || []
        } as any;
    }

    return (
        <div className="page-container space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 🏎️ PREMIUM HEADER INDUSTRIAL V3 */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active border border-white/5">
                {/* Decorative Layers */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-6 transition-all duration-1000">
                    <FileCheck className="h-96 w-96" />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 rotate-6 group-hover:rotate-0 transition-transform">
                                <FileCheck className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-400">Auditoría de Pasivos v3.0</span>
                                <div className="h-1 w-12 bg-emerald-500/30 rounded-full mt-1.5" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight mb-2">
                                Registro de <br /><span className="text-slate-500">Obligación</span>
                            </h1>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{tenant?.name || 'SISTEMA'}</span>
                                </div>
                                <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.4em]">
                                    {initialOrder ? `CONVERTIDA DESDE OC #${initialOrder.number}` : 'CARGA DE GASTO / FACTURA'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto">
                <NewBillClient
                    parties={parties || []}
                    products={products || []}
                    initialData={initialData as any}
                />
            </div>
        </div>
    );
}
