import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
import { productService } from '@/features/products/services/productService';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import NewOrderClient from './client';
import { ShoppingCart } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function NewOrderPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [parties, products, warehouses, ut] = await Promise.all([
        partyService.getAllPartiesLight(supabase, 'customer'),
        productService.getAllActiveProductsLight(supabase),
        inventoryService.getWarehouses(supabase),
        supabase.from('user_tenants').select('tenant_id').eq('user_id', user.id).maybeSingle(),
    ]);
    const tenantId = ut?.data?.tenant_id as string | undefined;

    // Comerciales = profiles del tenant (que pueden vender)
    const { data: tenantUsers } = tenantId
        ? await supabase.from('user_tenants').select('user_id').eq('tenant_id', tenantId)
        : { data: [] as { user_id: string }[] };
    const userIds = (tenantUsers || []).map((u: { user_id: string }) => u.user_id);
    const { data: profiles } = userIds.length > 0
        ? await supabase.from('profiles').select('id, full_name, email, signature_url, commercial_code').in('id', userIds)
        : { data: [] as Array<{ id: string; full_name: string | null; email: string | null; signature_url: string | null; commercial_code: string | null }> };
    const commercials = (profiles || [])
        .filter(p => p.full_name || p.email)
        .map(p => ({
            user_id: p.id,
            full_name: p.full_name || p.email || 'Sin nombre',
            signature_url: p.signature_url,
            commercial_code: p.commercial_code,
        }));

    return (
        <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Nuevo Pedido</h1>
                    <div className="flex items-center gap-4">
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Crear Pedido de Venta</p>
                        <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full">
                            <ShoppingCart className="h-3 w-3 text-emerald-600" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ventas</span>
                        </div>
                    </div>
                </div>
            </div>
            <NewOrderClient
                parties={parties || []}
                products={products || []}
                warehouses={warehouses || []}
                tenantId={tenantId}
                commercials={commercials}
            />
        </div>
    );
}
