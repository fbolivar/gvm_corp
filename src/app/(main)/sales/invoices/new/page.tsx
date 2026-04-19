import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
import { productService } from '@/features/products/services/productService';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import NewInvoiceClient from './client';
import { Receipt } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function NewInvoicePage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [parties, products, warehouses] = await Promise.all([
        partyService.getAllPartiesLight(supabase, 'customer'),
        productService.getAllActiveProductsLight(supabase),
        inventoryService.getWarehouses(supabase),
    ]);

    return (
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Nueva Factura</h1>
                    <div className="flex items-center gap-4">
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Facturación de Venta</p>
                        <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full">
                            <Receipt className="h-3 w-3 text-blue-600" />
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Comercial</span>
                        </div>
                    </div>
                </div>
            </div>
            <NewInvoiceClient parties={parties || []} products={products || []} warehouses={warehouses || []} />
        </div>
    );
}
