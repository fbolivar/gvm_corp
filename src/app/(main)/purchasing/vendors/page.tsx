
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

    // Forzar rol vendor en esta página
    const { data: parties, count } = await partyService.getParties(supabase, {
        page,
        per_page: 20,
        search,
        role: 'vendor'
    });

    const tenant = await settingsService.getTenantInfo(supabase);

    // Obtener métricas para los proveedores mostrados
    const partyIds = parties.map(p => p.id).filter(Boolean) as string[];
    const metricsResult = await purchasingService.getVendorMetrics(supabase, partyIds);

    const metricsMap = metricsResult.reduce((acc, m) => {
        acc[m.party_id] = m;
        return acc;
    }, {} as any);

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <VisualReportHeader
                title="Directorio de Proveedores"
                subtitle="Gestión de Alianzas y KPIs de Cumplimiento"
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
