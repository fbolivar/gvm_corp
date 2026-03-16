import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PriceListManager } from '@/features/pricing/components/PriceListManager';
import { Tags } from 'lucide-react';

export default async function PricingSettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: priceLists } = await supabase
        .from('price_lists')
        .select('*, items:price_list_items(count)')
        .order('name', { ascending: true });

    const { data: products } = await supabase
        .from('products')
        .select('id, name, sku, selling_price')
        .eq('status', 'ACTIVE')
        .order('name', { ascending: true });

    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900 to-indigo-800 p-10 text-white shadow-active">
                <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none">
                    <Tags className="h-48 w-48" />
                </div>
                <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-8 bg-indigo-400 rounded-full" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-indigo-300">
                            Configuracion
                        </span>
                    </div>
                    <h1 className="text-3xl font-black tracking-tight uppercase leading-tight">
                        Listas de Precios
                    </h1>
                    <p className="text-white/40 text-xs font-bold">
                        Precios diferenciados por cliente y volumen
                    </p>
                </div>
            </div>

            <PriceListManager
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                priceLists={(priceLists ?? []) as any}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                products={(products ?? []) as any}
            />
        </div>
    );
}
