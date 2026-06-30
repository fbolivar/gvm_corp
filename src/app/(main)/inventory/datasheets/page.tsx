import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getProductsLightCached } from '@/shared/lib/cachedLookups';
import { productService } from '@/features/products/services/productService';
import { PageHeader } from '@/shared/components/ui/page-header';
import { FileText } from 'lucide-react';
import { DatasheetsManager } from '@/features/inventory/components/DatasheetsManager';

export const metadata = { title: 'Fichas técnicas — GVM Corp' };

export default async function DatasheetsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: ut } = await supabase
        .from('user_tenants').select('tenant_id').eq('user_id', user.id).maybeSingle();
    const tenantId = ut?.tenant_id as string | undefined;

    const products = tenantId
        ? await getProductsLightCached(tenantId)
        : await productService.getAllActiveProductsLight(supabase);

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <PageHeader
                title="Fichas técnicas"
                description="Documentos técnicos por producto (uso interno)."
                icon={FileText}
                breadcrumbs={[
                    { label: 'Inicio', href: '/dashboard' },
                    { label: 'Inventario', href: '/inventory' },
                    { label: 'Fichas técnicas' },
                ]}
            />
            <DatasheetsManager
                products={(products || []).filter(p => !!p.id).map(p => ({ id: p.id!, name: p.name, sku: p.sku }))}
            />
        </div>
    );
}
