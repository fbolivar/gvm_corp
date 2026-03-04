import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
import { productService } from '@/features/products/services/productService';
import NewQuotationClient from './client';
import { FileText } from 'lucide-react';
import { redirect } from 'next/navigation';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function NewQuotationPage({ searchParams }: PageProps) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const params = await searchParams;
    const preSelectedProductId = (params?.productId as string) || undefined;

    const [{ data: parties }, { data: products }] = await Promise.all([
        partyService.getParties(supabase, { page: 1, per_page: 500, role: 'customer' }),
        productService.getProducts(supabase, { page: 1, per_page: 500 }),
    ]);

    return (
        <div className="space-y-8 pb-16 animate-in fade-in duration-500 max-w-5xl mx-auto px-4 md:px-0">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
                <div className="space-y-2">
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Nueva Cotizacion</h1>
                    <div className="flex items-center gap-3">
                        <p className="text-slate-400 font-semibold text-xs uppercase tracking-wide">Crear Propuesta Comercial</p>
                        <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-0.5 rounded-full">
                            <FileText className="h-3 w-3 text-amber-600" />
                            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Ventas</span>
                        </div>
                    </div>
                </div>
            </div>
            <NewQuotationClient
                parties={parties || []}
                products={products || []}
                preSelectedProductId={preSelectedProductId}
            />
        </div>
    );
}
