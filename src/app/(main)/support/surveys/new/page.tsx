import { redirect } from 'next/navigation';
import { ClipboardList } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { partyService } from '@/features/parties/services/partyService';
import { getPartiesLightCached } from '@/shared/lib/cachedLookups';
import { SurveyForm } from '@/features/support/components/SurveyForm';
import { PageHeader } from '@/shared/components/ui/page-header';

export const metadata = { title: 'Nueva encuesta — GVM Corp' };

interface PageProps {
    searchParams: Promise<Record<string, string>>;
}

export default async function NewSurveyPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const sp = await searchParams;

    const { data: utRow } = await supabase
        .from('user_tenants').select('tenant_id').eq('user_id', user.id).maybeSingle();
    const tenantId = utRow?.tenant_id as string | undefined;

    // Solo clientes: la encuesta mide la experiencia de quien compra.
    // Se usa el cargador paginado (igual que pedidos y facturas): una consulta
    // directa con .limit() se corta en 1.000 filas por el tope de PostgREST y
    // los clientes del final del alfabeto quedan invisibles en el buscador.
    const allParties = tenantId
        ? await getPartiesLightCached(tenantId, 'customer')
        : await partyService.getAllPartiesLight(supabase, 'customer');

    // El formulario solo necesita identificar y buscar al cliente.
    const parties = (allParties ?? [])
        .filter((p): p is typeof p & { id: string } => !!p.id)
        .map(p => ({ id: p.id, legal_name: p.legal_name, doc_number: p.doc_number ?? null }));

    // Para evaluar al comercial se muestran TODOS los miembros del tenant (no solo
    // los roles "comerciales"): el usuario busca y elige a quien atiende la cuenta.
    // get_team_members (SECURITY DEFINER) devuelve el equipo activo con nombre y rol.
    const { data: teamRows } = tenantId
        ? await supabase.rpc('get_team_members', { p_tenant_id: tenantId })
        : { data: [] as Array<{ user_id: string; full_name: string | null; role_name: string | null }> };
    const salespeople = ((teamRows ?? []) as Array<{ user_id: string; full_name: string | null; role_name: string | null }>)
        .map(m => ({ id: m.user_id, name: m.full_name || 'Sin nombre', role: m.role_name ?? null }));

    return (
        <div className="page-container">
            <div className="space-y-6 pb-16 animate-in fade-in duration-500">
                <PageHeader
                    title="Nueva encuesta de satisfacción"
                    description="Una encuesta por persona. Para una misma empresa puedes registrar varias, una por cada decisor."
                    icon={ClipboardList}
                    breadcrumbs={[
                        { label: 'Inicio', href: '/dashboard' },
                        { label: 'Servicio al cliente', href: '/support/tickets' },
                        { label: 'Encuestas', href: '/support/surveys' },
                        { label: 'Nueva' },
                    ]}
                />

                <SurveyForm
                    parties={parties ?? []}
                    salespeople={salespeople}
                    defaultPartyId={sp.party_id}
                />
            </div>
        </div>
    );
}
