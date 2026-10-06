import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Target } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/page-header';
import { loadVisitPageContext } from '@/features/crm/services/visitPageContext';
import { visitService } from '@/features/crm/services/visitService';
import { accountService } from '@/features/crm/services/accountService';
import { prevMonthKey } from '@/features/crm/utils/accountSummary';
import { TargetsEditor } from '@/features/crm/components/TargetsEditor';

export const metadata = { title: 'Metas comerciales — GVM Corp' };

interface PageProps { searchParams: Promise<Record<string, string | undefined>> }

const monthLabel = (p: string) => new Date(Date.UTC(Number(p.slice(0, 4)), Number(p.slice(5, 7)) - 1, 1))
    .toLocaleDateString('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function nextMonthKey(p: string) {
    const y = Number(p.slice(0, 4)); const m = Number(p.slice(5, 7));
    return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

export default async function TargetsPage({ searchParams }: PageProps) {
    const sp = await searchParams;
    const { supabase, userId, isManager, today } = await loadVisitPageContext();
    if (!isManager) notFound();

    const period = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.period ?? '') ? (sp.period as string) : today.slice(0, 7);
    const prev = prevMonthKey(`${period}-15`);

    const [team, current, previous, prevPerf] = await Promise.all([
        visitService.getSalespeople(supabase, userId),
        accountService.getTargets(supabase, period),
        accountService.getTargets(supabase, prev),
        accountService.teamPerformance(supabase, userId, prev, today),
    ]);
    const prevSales = Object.fromEntries(prevPerf.map(m => [m.id, m.sales.achieved]));

    return (
        <div className="page-container space-y-6 pb-16 animate-in fade-in duration-500">
            <PageHeader
                title="Metas comerciales"
                description="Meta mensual de venta y de visitas por comercial. La venta lograda se calcula sola con los pedidos facturados de su cartera."
                icon={Target}
                breadcrumbs={[{ label: 'Inicio', href: '/dashboard' }, { label: 'CRM', href: '/crm' }, { label: 'Metas' }]}
                actions={
                    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs font-bold">
                        <Link href={`/crm/targets?period=${prev}`} className="h-9 px-3 inline-flex items-center rounded-lg text-slate-500 hover:text-indigo-700">‹</Link>
                        <span className="h-9 px-3 inline-flex items-center bg-white rounded-lg shadow-sm text-indigo-700 capitalize">{monthLabel(period)}</span>
                        <Link href={`/crm/targets?period=${nextMonthKey(period)}`} className="h-9 px-3 inline-flex items-center rounded-lg text-slate-500 hover:text-indigo-700">›</Link>
                    </div>
                }
            />
            <TargetsEditor key={period} period={period} team={team} current={current} previous={previous} prevSales={prevSales} />
        </div>
    );
}
