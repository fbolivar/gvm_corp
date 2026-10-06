import { notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/page-header';
import { getPartiesLightCached } from '@/shared/lib/cachedLookups';
import { partyService } from '@/features/parties/services/partyService';
import { loadVisitPageContext } from '@/features/crm/services/visitPageContext';
import { visitService } from '@/features/crm/services/visitService';
import { VisitForm } from '@/features/crm/components/VisitForm';

export const metadata = { title: 'Editar visita — GVM Corp' };

interface PageProps { params: Promise<{ id: string }> }

export default async function EditVisitPage({ params }: PageProps) {
    const { id } = await params;
    const { supabase, userId, tenantId, isManager, today } = await loadVisitPageContext();

    const visit = await visitService.getById(supabase, id);
    if (!visit) notFound();
    // Las visitas de otros comerciales no existen para quien no es gerente.
    if (!isManager && visit.salesperson_id !== userId) notFound();

    const allParties = tenantId
        ? await getPartiesLightCached(tenantId, 'customer')
        : await partyService.getAllPartiesLight(supabase, 'customer');
    const parties = (allParties ?? [])
        .filter((p): p is typeof p & { id: string } => !!p.id)
        .map(p => ({ id: p.id, legal_name: p.legal_name, doc_number: p.doc_number ?? null }));

    const salespeople = await visitService.getSalespeople(supabase, userId);

    return (
        <div className="page-container space-y-6 pb-16 animate-in fade-in duration-500">
            <PageHeader
                title="Editar planeación"
                description={visit.is_internal ? visit.title ?? '' : visit.party_name ?? ''}
                icon={Pencil}
                breadcrumbs={[{ label: 'Inicio', href: '/dashboard' }, { label: 'CRM', href: '/crm' }, { label: 'Visitas', href: '/crm/visits' }, { label: 'Detalle', href: `/crm/visits/${id}` }, { label: 'Editar' }]}
            />
            <VisitForm parties={parties} salespeople={salespeople} currentUserId={userId} isManager={isManager} today={today} visit={visit} />
        </div>
    );
}
