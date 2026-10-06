import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { PageHeader } from '@/shared/components/ui/page-header';
import { loadVisitPageContext } from '@/features/crm/services/visitPageContext';
import { visitService } from '@/features/crm/services/visitService';
import { VisitsBoard } from '@/features/crm/components/VisitsBoard';
import { monthRange, weekRange } from '@/features/crm/utils/visitStats';

export const metadata = { title: 'Tablero de visitas — GVM Corp' };

interface PageProps { searchParams: Promise<Record<string, string | undefined>> }

export default async function VisitsBoardPage({ searchParams }: PageProps) {
    const sp = await searchParams;
    const { supabase, userId, isManager, today } = await loadVisitPageContext();

    const range = (['week', 'month', 'year'].includes(sp.range ?? '') ? sp.range : 'month') as 'week' | 'month' | 'year';
    const period = range === 'week' ? weekRange(today)
        : range === 'month' ? monthRange(today)
        : { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };

    // El gerente ve a todo el equipo; el comercial ve su propio avance.
    const visits = await visitService.list(supabase, { ...period, salespersonId: isManager ? undefined : userId });

    return (
        <div className="page-container space-y-6 pb-16 animate-in fade-in duration-500">
            <PageHeader
                title={isManager ? 'Tablero de visitas' : 'Mi avance de visitas'}
                description="Avance del equipo comercial: planeado vs. realizado, cuentas críticas y seguimientos vencidos."
                icon={LayoutDashboard}
                breadcrumbs={[{ label: 'Inicio', href: '/dashboard' }, { label: 'CRM', href: '/crm' }, { label: 'Visitas', href: '/crm/visits' }, { label: 'Tablero' }]}
                actions={
                    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                        {([['week', 'Semana'], ['month', 'Mes'], ['year', 'Año']] as const).map(([k, t]) => (
                            <Link key={k} href={`/crm/visits/board?range=${k}`}
                                className={cn('h-9 px-3 rounded-lg text-xs font-bold inline-flex items-center transition-all', range === k ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500')}>
                                {t}
                            </Link>
                        ))}
                    </div>
                }
            />
            <VisitsBoard visits={visits} today={today} />
        </div>
    );
}
