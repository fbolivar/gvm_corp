import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Gauge } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/page-header';
import { loadVisitPageContext } from '@/features/crm/services/visitPageContext';
import { VisitKpisDashboard } from '@/features/crm/components/VisitKpisDashboard';

export const metadata = { title: 'KPIs de visitas — GVM Corp' };

interface PageProps { searchParams: Promise<Record<string, string | undefined>> }

export default async function VisitKpisPage({ searchParams }: PageProps) {
    const sp = await searchParams;
    const { supabase, userId, isManager, today } = await loadVisitPageContext();
    // Vista de gerencia: seguimiento del equipo comercial completo.
    if (!isManager) notFound();

    const month = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? (sp.month as string) : today.slice(0, 7);

    return (
        <div className="page-container space-y-6 pb-16 animate-in fade-in duration-500">
            <PageHeader
                title="KPIs de visitas"
                description="Seguimiento y cumplimiento de las visitas del equipo comercial y salud de la cartera de clientes."
                icon={Gauge}
                breadcrumbs={[{ label: 'Inicio', href: '/dashboard' }, { label: 'CRM', href: '/crm' }, { label: 'Visitas', href: '/crm/visits' }, { label: 'KPIs' }]}
            />

            <VisitKpisDashboard supabase={supabase} userId={userId} today={today} month={month} isManager={isManager} />

            <p className="text-center">
                <Link href="/crm/visits" className="text-xs font-bold text-indigo-600 hover:underline">← Volver al planeador de visitas</Link>
            </p>
        </div>
    );
}
