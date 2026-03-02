import { createClient } from '@/lib/supabase/server';
import { productService } from '@/features/products/services/productService';
import { partyService } from '@/features/parties/services/partyService';
import NewDocumentClient from './client';

export default async function NewDocumentPage() {
    const supabase = await createClient();

    // Fetch active products and parties using existing services
    const productsResponse = await productService.getProducts(supabase, { status: 'ACTIVE', page: 1, per_page: 1000 });
    const partiesResponse = await partyService.getParties(supabase, { role: 'all', page: 1, per_page: 1000 });

    const products = productsResponse.data;
    const parties = partiesResponse.data;

    return (
        <div className="container mx-auto py-6 max-w-4xl">
            <h1 className="text-2xl font-bold mb-4">Nueva Factura / Documento</h1>
            <NewDocumentClient products={products} parties={parties} />
        </div>
    );
}
