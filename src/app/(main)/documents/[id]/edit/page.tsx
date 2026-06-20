import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { partyService } from '@/features/parties/services/partyService';
import { productService } from '@/features/products/services/productService';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { getPartiesLightCached, getProductsLightCached } from '@/shared/lib/cachedLookups';
import EditDocumentClient from './client';
import { redirect, notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditDocumentPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    let document;
    try {
        document = await documentService.getDocumentById(supabase, id);
    } catch {
        notFound();
    }
    if (!document) notFound();

    // Solo se editan borradores; si no, volver al detalle
    if (document.status !== 'DRAFT') {
        redirect(`/documents/${id}`);
    }

    const { data: utRow } = await supabase
        .from('user_tenants').select('tenant_id').eq('user_id', user.id).maybeSingle();
    const tenantId = utRow?.tenant_id as string | undefined;

    const [parties, products, warehouses] = await Promise.all([
        tenantId ? getPartiesLightCached(tenantId, 'all') : partyService.getAllPartiesLight(supabase, 'all'),
        tenantId ? getProductsLightCached(tenantId) : productService.getAllActiveProductsLight(supabase),
        inventoryService.getWarehouses(supabase),
    ]);

    return (
        <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Editar documento</h1>
                    <div className="flex items-center gap-4">
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
                            {document.number ? `#${document.number}` : 'Borrador'} · Solo borradores son editables
                        </p>
                        <div className="flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-full">
                            <Pencil className="h-3 w-3 text-amber-600" />
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Edición</span>
                        </div>
                    </div>
                </div>
            </div>

            <EditDocumentClient
                documentId={id}
                parties={parties || []}
                products={products || []}
                warehouses={warehouses || []}
                tenantId={tenantId}
                initialData={document}
            />
        </div>
    );
}
