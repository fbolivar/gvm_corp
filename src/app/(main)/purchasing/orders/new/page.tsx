import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
import { productService } from '@/features/products/services/productService';
import NewOrderClient from './client';
import { ShoppingBag } from 'lucide-react';
import { redirect } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';

export default async function NewOrderPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: parties } = await partyService.getParties(supabase, { page: 1, per_page: 500, role: 'vendor', search: '' } as any);
    const { data: products } = await productService.getProducts(supabase, { page: 1, per_page: 500 });
    const tenant = await settingsService.getTenantInfo(supabase);

    return (
        <div className="page-container space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 🏎️ PREMIUM HEADER INDUSTRIAL V3 */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[4rem] p-12 md:p-20 text-white shadow-active border border-white/5">
                {/* Decorative Layers */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-6 transition-all duration-1000">
                    <ShoppingBag className="h-96 w-96" />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 rotate-6 group-hover:rotate-0 transition-transform">
                                <ShoppingBag className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-amber-400">Protocolo de Adquisición v3.0</span>
                                <div className="h-1 w-12 bg-amber-500/30 rounded-full mt-1.5" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-6xl md:text-8xl font-black tracking-tighter italic uppercase leading-[0.85] mb-2">
                                Nueva <br /><span className="text-slate-500">Orden de Compra</span>
                            </h1>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">{tenant?.name || 'SISTEMA'}</span>
                                </div>
                                <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.4em]">Sincronización de Inventario • 2026</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto">
                <NewOrderClient parties={parties || []} products={products || []} />
            </div>
        </div>
    );
}
