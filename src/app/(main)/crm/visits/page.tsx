import Link from 'next/link';
import { Plus, CalendarCheck, LayoutDashboard } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { PageHeader } from '@/shared/components/ui/page-header';
import { loadVisitPageContext } from '@/features/crm/services/visitPageContext';
import { visitService } from '@/features/crm/services/visitService';
import { VisitList } from '@/features/crm/components/VisitList';
import { monthRange, weekRange } from '@/features/crm/utils/visitStats';
import type { VisitStatus } from '@/features/crm/types/visits';

export const metadata = { title: 'Planeador de visitas — GVM Corp' };

interface PageProps { searchParams: Promise<Record<string, string | undefined>> }

export default async function VisitsPage({ searchParams }: PageProps) {
    const sp = await searchParams;
    const { supabase, userId, isManager, today } = await loadVisitPageContext();

    const range = (['week', 'month', 'all'].includes(sp.range ?? '') ? sp.range : 'week') as 'week' | 'month' | 'all';
    const period = range === 'week' ? weekRange(today)
        : range === 'month' ? monthRange(today)
        : {};

    // Un comercial solo ve lo suyo; el gerente elige a quién mirar.
    const salespersonId = isManager ? (sp.salesperson || undefined) : userId;

    const [visits, salespeople] = await Promise.all([
        visitService.list(supabase, { ...period, salespersonId, status: (sp.status as VisitStatus | undefined) ?? '' }),
        visitService.getSalespeople(supabase, userId),
    ]);

    return (
        <div className="page-container space-y-6 pb-16 animate-in fade-in duration-500">
            <PageHeader
                title={isManager ? 'Planeador de visitas' : 'Mi planeador de visitas'}
                description="Planea, agenda y registra el resultado de cada visita a clientes."
                icon={CalendarCheck}
                breadcrumbs={[{ label: 'Inicio', href: '/dashboard' }, { label: 'CRM', href: '/crm' }, { label: 'Visitas' }]}
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" className="h-11 px-4 rounded-xl text-xs font-bold gap-2">
                            <Link href="/crm/visits/board"><LayoutDashboard className="h-4 w-4" /> {isManager ? 'Tablero' : 'Mi avance'}</Link>
                        </Button>
                        <Button asChild className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold gap-2">
                            <Link href="/crm/visits/new"><Plus className="h-4 w-4" /> Nueva visita</Link>
                        </Button>
                    </div>
                }
            />

            <VisitList visits={visits} salespeople={salespeople} isManager={isManager} today={today} range={range} />
        </div>
    );
}
