import Link from 'next/link';
import { Plus, CalendarCheck, LayoutDashboard } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { PageHeader } from '@/shared/components/ui/page-header';
import { loadVisitPageContext } from '@/features/crm/services/visitPageContext';
import { visitService } from '@/features/crm/services/visitService';
import { VisitList } from '@/features/crm/components/VisitList';
import { VisitCalendar } from '@/features/crm/components/VisitCalendar';
import { VisitViewSwitch } from '@/features/crm/components/VisitViewSwitch';
import { VisitKpisDashboard } from '@/features/crm/components/VisitKpisDashboard';
import { monthRange, weekRange } from '@/features/crm/utils/visitStats';
import type { VisitStatus } from '@/features/crm/types/visits';

export const metadata = { title: 'Planeador de visitas — GVM Corp' };

interface PageProps { searchParams: Promise<Record<string, string | undefined>> }

export default async function VisitsPage({ searchParams }: PageProps) {
    const sp = await searchParams;
    const { supabase, userId, isManager, today } = await loadVisitPageContext();

    // Vista por defecto: para gerencia, el panel de KPIs (seguimiento del equipo);
    // para un comercial, su calendario. Un comercial nunca ve la vista de KPIs.
    const requested = (['kpis', 'calendar', 'list'].includes(sp.view ?? '') ? sp.view : undefined) as 'kpis' | 'calendar' | 'list' | undefined;
    let view = requested ?? (isManager ? 'kpis' : 'calendar');
    if (view === 'kpis' && !isManager) view = 'calendar';

    const month = /^\d{4}-\d{2}$/.test(sp.month ?? '') ? (sp.month as string) : today.slice(0, 7);

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

            <VisitViewSwitch view={view} isManager={isManager} />

            {view === 'kpis'
                ? <VisitKpisDashboard supabase={supabase} userId={userId} today={today} month={month} isManager={isManager} />
                : await renderPlanner({ sp, supabase, userId, isManager, today, view: view as 'calendar' | 'list', month })}
        </div>
    );
}

/** Calendario o lista del planeador. Trae los datos solo cuando esa vista está activa. */
async function renderPlanner({
    sp, supabase, userId, isManager, today, view, month,
}: {
    sp: Record<string, string | undefined>;
    supabase: Awaited<ReturnType<typeof loadVisitPageContext>>['supabase'];
    userId: string; isManager: boolean; today: string;
    view: 'calendar' | 'list'; month: string;
}) {
    // Un comercial solo ve lo suyo; el gerente elige a quién mirar.
    const salespersonId = isManager ? (sp.salesperson || undefined) : userId;
    const status = (sp.status as VisitStatus | undefined) ?? '';
    const priorityNum = Number(sp.priority);
    const priority = ([1, 2, 3].includes(priorityNum) ? priorityNum : undefined) as 1 | 2 | 3 | undefined;

    const range = (['week', 'month', 'all'].includes(sp.range ?? '') ? sp.range : 'week') as 'week' | 'month' | 'all';
    const period = view === 'calendar'
        ? monthRange(`${month}-15`)
        : range === 'week' ? weekRange(today)
            : range === 'month' ? monthRange(today)
                : {};

    const [visits, salespeople] = await Promise.all([
        visitService.list(supabase, { ...period, salespersonId, status, priority }),
        visitService.getSalespeople(supabase, userId),
    ]);

    return view === 'calendar'
        ? <VisitCalendar month={month} visits={visits} salespeople={salespeople} isManager={isManager} today={today} />
        : <VisitList visits={visits} salespeople={salespeople} isManager={isManager} today={today} range={range} />;
}
