import { createClient } from '@/lib/supabase/server';
import { productService } from '@/features/products/services/productService';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { Button } from '@/shared/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import NewMovementClient from './client';

export default async function NewMovementPage() {
    const supabase = await createClient();

    const { data: products } = await productService.getProducts(supabase, { status: 'ACTIVE', page: 1, per_page: 1000 });
    const warehouses = await inventoryService.getWarehouses(supabase);

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nuevo Movimiento</h1>
                    <p className="text-xs text-slate-400 mt-1">Registrar entrada o salida de inventario</p>
                </div>
                <Button variant="outline" asChild className="h-9 rounded-xl border-slate-200 text-xs font-semibold">
                    <Link href="/inventory" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Volver
                    </Link>
                </Button>
            </div>

            <div className="max-w-4xl mx-auto">
                <NewMovementClient products={products || []} warehouses={warehouses} />
            </div>
        </div>
    );
}
