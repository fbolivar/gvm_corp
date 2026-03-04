
import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
import { purchasingService } from '@/features/purchasing/services/purchasingService';
import { PartyList } from '@/features/parties/components/PartyList';
import { redirect } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';

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

    const tenant = await settingsService.getTenantInfo(supabase);

    const partyIds = parties.map(p => p.id).filter(Boolean) as string[];
    const metricsResult = await purchasingService.getVendorMetrics(supabase, partyIds);

    const metricsMap = metricsResult.reduce((acc, m) => {
        acc[m.party_id] = m;
        return acc;
    }, {} as Record<string, typeof metricsResult[number]>);

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Directorio de Proveedores"
                subtitle="Gestion de alianzas y KPIs de cumplimiento"
                tenant={tenant}
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
