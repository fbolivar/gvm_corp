import { createClient } from '@/lib/supabase/server';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { productService } from '@/features/products/services/productService';
import { redirect } from 'next/navigation';
import NewTransferClient from './client';
import { ArrowLeftRight } from 'lucide-react';
import { settingsService } from '@/features/settings/services/settingsService';

export const metadata = { title: 'Nuevo Traslado — GVM Corp' };

export default async function NewTransferPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [warehouses, { data: products }, tenant] = await Promise.all([
        inventoryService.getWarehouses(supabase),
        productService.getProducts(supabase, { page: 1, per_page: 5000 }),
        settingsService.getTenantInfo(supabase),
    ]);

    return (
        <div className="page-container space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* ── PREMIUM INDUSTRIAL HEADER ───────────────────────────────── */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active border border-white/5">
                {/* Decorative watermark */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-6 transition-all duration-1000">
                    <ArrowLeftRight className="h-96 w-96" />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-12">
                    <div className="space-y-6">
                        {/* Eyebrow */}
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 rotate-6 group-hover:rotate-0 transition-transform">
                                <ArrowLeftRight className="h-6 w-6" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">
                                    Protocolo de Logística Interna v1.0
                                </span>
                                <div className="h-1 w-12 bg-indigo-500/30 rounded-full mt-1.5" />
                            </div>
                        </div>

                        {/* Title */}
                        <div className="space-y-4">
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight mb-2">
                                Nuevo Traslado <br />
                                <span className="text-slate-500">entre Bodegas</span>
                            </h1>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                                        {tenant?.name ?? 'SISTEMA'}
                                    </span>
                                </div>
                                <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.4em]">
                                    Sincronización de Inventario • 2026
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Form ────────────────────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto">
                <NewTransferClient
                    warehouses={warehouses ?? []}
                    products={products ?? []}
                />
            </div>
        </div>
    );
}
