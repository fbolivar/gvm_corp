import { createClient } from '@/lib/supabase/server';
import { AuditTrail } from '@/shared/components/ui/audit-trail';
import { productService } from '@/features/products/services/productService';
import { getProductTaxPermissionAction } from '@/features/products/actions';
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

        const canEditTax = await getProductTaxPermissionAction();

        const [{ data: priceLists }, { data: items }] = await Promise.all([
            supabase.from('price_lists').select('id, name, is_default').order('is_default', { ascending: false }).order('name'),
            supabase.from('price_list_items').select('price_list_id, unit_price').eq('product_id', id),
        ]);
        const priceItems: Record<string, number> = Object.fromEntries((items ?? []).map((i: { price_list_id: string; unit_price: number }) => [i.price_list_id, Number(i.unit_price)]));

        return (
            <div className="pb-20">
                <EditProductClient product={product} movements={movements || []} canEditTax={canEditTax} priceLists={priceLists || []} priceItems={priceItems} />
                <div className="mt-8">
                    <AuditTrail
                        client={supabase}
                        entity="products"
                        entityId={id}
                        childEntities={[{ table: 'product_lots', fk: 'product_id' }]}
                    />
                </div>
            </div>
        );
    } catch (e) {
        notFound();
    }
}
