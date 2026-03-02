import { createClient } from '@/lib/supabase/server';
import { productService } from '@/features/products/services/productService';
import EditProductClient from './client';
import { notFound } from 'next/navigation';

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: PageProps) {
    const supabase = await createClient();
    const { id } = await params;

    try {
        const [product, movements] = await Promise.all([
            productService.getProductById(supabase, id),
            // Import Dinámico para evitar deps circulares si las hubiera, aunque aquí es page server
            import('@/features/inventory/services/inventoryService').then(m => m.inventoryService.getMovements(supabase, id))
        ]);

        if (!product) {
            notFound();
        }

        return (
            <div className="pb-20">
                <EditProductClient product={product} movements={movements || []} />
            </div>
        );
    } catch (e) {
        notFound();
    }
}
