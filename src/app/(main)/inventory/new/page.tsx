import { createClient } from '@/lib/supabase/server';
import { productService } from '@/features/products/services/productService';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeft, Box } from 'lucide-react';
import Link from 'next/link';
import NewMovementClient from './client';

export default async function NewMovementPage() {
    const supabase = await createClient();

    const { data: products } = await productService.getProducts(supabase, { status: 'active', page: 1, per_page: 1000 });
    const warehouses = await inventoryService.getWarehouses(supabase);

    return (
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="space-y-2">
                    <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 italic">Registro</h1>
                    <div className="flex items-center gap-4">
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Nueva Operación Logística</p>
                        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1 rounded-full">
                            <Box className="h-3 w-3 text-white" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest italic">Kardex Activo</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <Button variant="outline" asChild className="h-14 px-8 rounded-[1.5rem] border-none bg-white shadow-premium text-slate-500 font-black hover:bg-slate-50 transition-all active:scale-95">
                        <Link href="/inventory" className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Volver al Panel
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto">
                <NewMovementClient products={products || []} warehouses={warehouses} />
            </div>
        </div>
    );
}
