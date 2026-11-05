import { createClient } from '@/lib/supabase/server';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { productService } from '@/features/products/services/productService';
import { transferService } from '@/features/warehouse-transfers/services/transferService';
import { settingsService } from '@/features/settings/services/settingsService';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import NewTransferClient from '../../new/client';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { WarehouseTransfer, TransferWithDetails } from '@/features/warehouse-transfers/types';

export const metadata = { title: 'Editar Traslado — GVM Corp' };

export default async function EditTransferPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    let transfer: TransferWithDetails;
    try {
        transfer = await transferService.getTransferById(supabase, id);
    } catch {
        redirect('/inventory/transfers');
    }

    // Solo se pueden editar borradores (aún no mueven inventario).
    if (transfer.status !== 'DRAFT') {
        redirect(`/inventory/transfers/${id}`);
    }

    const [warehouses, products, tenant] = await Promise.all([
        inventoryService.getWarehouses(supabase),
        productService.getAllActiveProductsLight(supabase),
        settingsService.getTenantInfo(supabase),
    ]);

    const initialData: Partial<WarehouseTransfer> = {
        from_warehouse_id: transfer.from_warehouse_id,
        to_warehouse_id: transfer.to_warehouse_id,
        notes: transfer.notes ?? '',
        legalized_number: transfer.legalized_number ?? '',
        lines: transfer.lines.map((l) => ({
            product_id: l.product_id ?? '',
            description: l.description ?? '',
            qty: Number(l.qty),
            qty_received: 0,
            notes: l.notes ?? '',
        })),
    };

    return (
        <div className="page-container space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* ── Back nav ────────────────────────────────────────────────── */}
            <div>
                <Button
                    variant="ghost"
                    asChild
                    className="h-10 px-4 rounded-2xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 font-black text-[10px] uppercase tracking-widest gap-2 transition-all"
                >
                    <Link href={`/inventory/transfers/${id}`}>
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Volver al Traslado
                    </Link>
                </Button>
            </div>

            {/* ── HEADER ──────────────────────────────────────────────────── */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active border border-white/5">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-all duration-1000">
                    <Pencil className="h-96 w-96" />
                </div>

                <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 rotate-6 group-hover:rotate-0 transition-transform">
                            <Pencil className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">
                            Editar Borrador
                        </span>
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                            {transfer.transfer_number ?? 'Traslado'}
                        </h1>
                        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md w-fit">
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                                {tenant?.name ?? 'SISTEMA'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Form ────────────────────────────────────────────────────── */}
            <div className="max-w-5xl mx-auto">
                <NewTransferClient
                    warehouses={warehouses ?? []}
                    products={products ?? []}
                    transferId={id}
                    initialData={initialData}
                />
            </div>
        </div>
    );
}
