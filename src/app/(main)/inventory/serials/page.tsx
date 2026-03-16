import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SerialListClient } from '@/features/inventory/components/SerialListClient';
import { serialService } from '@/features/inventory/services/serialService';

export default async function SerialsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [serials, stats, products, warehouses] = await Promise.all([
        serialService.getSerials(supabase),
        serialService.getStats(supabase),
        supabase.from('products').select('id, name, sku').eq('status', 'ACTIVE').order('name'),
        supabase.from('warehouses').select('id, name').order('name'),
    ]);

    return (
        <div className="page-container space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SerialListClient
                serials={serials}
                stats={stats}
                products={(products.data ?? []) as { id: string; name: string; sku: string }[]}
                warehouses={(warehouses.data ?? []) as { id: string; name: string }[]}
            />
        </div>
    );
}
