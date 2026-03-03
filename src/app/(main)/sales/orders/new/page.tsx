import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
import { productService } from '@/features/products/services/productService';
import NewOrderClient from './client';
import { ShoppingCart } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function NewOrderPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: parties } = await partyService.getParties(supabase, { page: 1, per_page: 500, role: 'customer' });
    const { data: products } = await productService.getProducts(supabase, { page: 1, per_page: 500 });

    return (
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Nuevo Pedido</h1>
                    <div className="flex items-center gap-4">
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Crear Pedido de Venta</p>
                        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full">
                            <ShoppingCart className="h-3 w-3 text-emerald-600" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ventas</span>
                        </div>
                    </div>
                </div>
            </div>
            <NewOrderClient parties={parties || []} products={products || []} />
        </div>
    );
}
