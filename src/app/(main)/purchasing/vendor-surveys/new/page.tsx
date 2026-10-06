import { redirect } from 'next/navigation';
import { ClipboardList } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
import { getPartiesLightCached } from '@/shared/lib/cachedLookups';
import { VendorSurveyForm } from '@/features/purchasing/components/VendorSurveyForm';
import { PageHeader } from '@/shared/components/ui/page-header';

export const metadata = { title: 'Nueva encuesta a proveedor — GVM Corp' };

interface PageProps {
    searchParams: Promise<Record<string, string>>;
}

export default async function NewVendorSurveyPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const sp = await searchParams;

    const { data: utRow } = await supabase
        .from('user_tenants').select('tenant_id').eq('user_id', user.id).maybeSingle();
    const tenantId = utRow?.tenant_id as string | undefined;

    // Solo proveedores: la encuesta mide la experiencia de quien vende a GVM.
    // Cargador paginado (igual que compras): una consulta directa con .limit()
    // se corta en 1.000 filas por el tope de PostgREST.
    const allParties = tenantId
        ? await getPartiesLightCached(tenantId, 'vendor')
        : await partyService.getAllPartiesLight(supabase, 'vendor');

    const parties = (allParties ?? [])
        .filter((p): p is typeof p & { id: string } => !!p.id)
        .map(p => ({ id: p.id, legal_name: p.legal_name, doc_number: p.doc_number ?? null }));

    return (
        <div className="page-container">
            <div className="space-y-6 pb-16 animate-in fade-in duration-500">
                <PageHeader
                    title="Nueva encuesta a proveedor"
                    description="Una encuesta por persona. Para un mismo proveedor puedes registrar varias, una por cada decisor."
                    icon={ClipboardList}
                    breadcrumbs={[
                        { label: 'Inicio', href: '/dashboard' },
                        { label: 'Compras', href: '/purchasing/orders' },
                        { label: 'Encuestas a proveedores', href: '/purchasing/vendor-surveys' },
                        { label: 'Nueva' },
                    ]}
                />

                <VendorSurveyForm parties={parties ?? []} defaultPartyId={sp.party_id} />
            </div>
        </div>
    );
}
