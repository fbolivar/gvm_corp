
import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
import { purchasingService } from '@/features/purchasing/services/purchasingService';
import { PartyList } from '@/features/parties/components/PartyList';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/shared/components/ui/page-header';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import Link from 'next/link';

export default async function VendorsPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const page = Number(params.page) || 1;
    const search = (params.search as string) || '';

    const { data: parties, count } = await partyService.getParties(supabase, {
        page,
        per_page: 20,
        search,
        role: 'vendor'
    });

    const partyIds = parties.map(p => p.id).filter(Boolean) as string[];
    const metricsResult = await purchasingService.getVendorMetrics(supabase, partyIds);

    const metricsMap = metricsResult.reduce((acc, m) => {
        acc[m.party_id] = m;
        return acc;
    }, {} as Record<string, typeof metricsResult[number]>);

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <PageHeader
                title="Proveedores"
                description="Directorio de proveedores activos."
                icon={Building2}
                breadcrumbs={[
                    { label: 'Inicio', href: '/dashboard' },
                    { label: 'Compras', href: '/purchasing/vendors' },
                    { label: 'Proveedores' },
                ]}
                actions={
                    <Button asChild className="h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs gap-2">
                        <Link href="/parties/new?role=vendor">
                            <Plus className="h-3.5 w-3.5" /> Nuevo proveedor
                        </Link>
                    </Button>
                }
            />

            <PartyList
                initialData={parties}
                totalCount={count || 0}
                currentPage={page}
                perPage={20}
                vendorMetrics={metricsMap}
            />
        </div>
    );
}
