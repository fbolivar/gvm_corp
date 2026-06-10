import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
import { productService } from '@/features/products/services/productService';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { purchaseOrderService } from '@/features/purchasing/services/purchaseOrderService';
import { redirect, notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import EditOrderClient from './client';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EditOrderPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const po = await purchaseOrderService.getOrderById(supabase, id).catch(() => null);
    if (!po) notFound();

    // Only DRAFT orders can be edited
    if (po.status !== 'DRAFT') redirect(`/purchasing/orders/${id}`);

    const [parties, products, warehouses] = await Promise.all([
        partyService.getAllPartiesLight(supabase, 'vendor'),
        productService.getAllActiveProductsLight(supabase),
        inventoryService.getWarehouses(supabase),
    ]);

    return (
        <div className="page-container space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="relative group overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active border border-white/5">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
                    <Pencil className="h-96 w-96" />
                </div>
                <div className="relative z-10 flex flex-col gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
                            <Pencil className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-amber-400">
                            Editar Borrador
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                        Editar Orden <br />
                        <span className="text-slate-500">{po.po_number}</span>
                    </h1>
                </div>
            </div>

            <div className="max-w-5xl mx-auto">
                <EditOrderClient
                    orderId={id}
                    poNumber={po.po_number ?? ''}
                    initialData={{
                        supplier_id: po.supplier_id ?? '',
                        warehouse_id: po.warehouse_id ?? undefined,
                        currency: (po.currency as 'COP' | 'USD') ?? 'COP',
                        status: 'DRAFT',
                        order_date: po.order_date ? po.order_date.split('T')[0] : new Date().toISOString().split('T')[0],
                        expected_delivery: po.expected_delivery ? po.expected_delivery.split('T')[0] : undefined,
                        notes: po.notes ?? '',
                        lines: (po.lines ?? []).map((l: any) => ({
                            product_id: l.product_id ?? '',
                            qty: Number(l.qty),
                            unit_cost: Number(l.unit_cost),
                            tax_rate: Number(l.tax_rate),
                            qty_received: Number(l.qty_received ?? 0),
                            notes: l.notes ?? '',
                        })),
                    }}
                    parties={parties || []}
                    products={products || []}
                    warehouses={warehouses || []}
                />
            </div>
        </div>
    );
}
