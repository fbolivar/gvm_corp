import { CalendarPlus } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/page-header';
import { getPartiesLightCached } from '@/shared/lib/cachedLookups';
import { partyService } from '@/features/parties/services/partyService';
import { loadVisitPageContext } from '@/features/crm/services/visitPageContext';
import { visitService } from '@/features/crm/services/visitService';
import { VisitForm } from '@/features/crm/components/VisitForm';
import { MANAGEMENT_TYPES, type ManagementType } from '@/features/crm/types/visits';

export const metadata = { title: 'Nueva visita — GVM Corp' };

interface PageProps { searchParams: Promise<Record<string, string | undefined>> }

export default async function NewVisitPage({ searchParams }: PageProps) {
    const sp = await searchParams;
    const { supabase, userId, tenantId, isManager, today } = await loadVisitPageContext();

    // Solo clientes; cargador paginado (PostgREST corta en 1.000 filas).
    const allParties = tenantId
        ? await getPartiesLightCached(tenantId, 'customer')
        : await partyService.getAllPartiesLight(supabase, 'customer');
    const parties = (allParties ?? [])
        .filter((p): p is typeof p & { id: string } => !!p.id)
        .map(p => ({ id: p.id, legal_name: p.legal_name, doc_number: p.doc_number ?? null }));

    const salespeople = await visitService.getSalespeople(supabase, userId);

    // Precarga desde una alerta o desde la cartera; se valida contra el catálogo.
    const defaults = {
        party_id: sp.party_id && parties.some(p => p.id === sp.party_id) ? sp.party_id : undefined,
        management_type: sp.management_type && sp.management_type in MANAGEMENT_TYPES ? (sp.management_type as ManagementType) : undefined,
        priority: sp.priority && ['1', '2', '3'].includes(sp.priority) ? (Number(sp.priority) as 1 | 2 | 3) : undefined,
    };

    return (
        <div className="page-container space-y-6 pb-16 animate-in fade-in duration-500">
            <PageHeader
                title="Nueva visita"
                description="Elige el cliente y verás su ficha comercial al instante."
                icon={CalendarPlus}
                breadcrumbs={[{ label: 'Inicio', href: '/dashboard' }, { label: 'CRM', href: '/crm' }, { label: 'Visitas', href: '/crm/visits' }, { label: 'Nueva' }]}
            />
            <VisitForm parties={parties} salespeople={salespeople} currentUserId={userId} isManager={isManager} today={today} defaults={defaults} />
        </div>
    );
}
