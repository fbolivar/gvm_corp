import Link from 'next/link';
import { Heart, Building2, CalendarCheck, UserPlus, Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { PageHeader } from '@/shared/components/ui/page-header';
import { loadVisitPageContext } from '@/features/crm/services/visitPageContext';
import { visitService } from '@/features/crm/services/visitService';
import { accountService } from '@/features/crm/services/accountService';
import { deriveAlerts, attainment } from '@/features/crm/utils/accountSummary';
import { isFollowupDue, isOverdue } from '@/features/crm/utils/visitStats';
import { AccountAlerts } from '@/features/crm/components/AccountAlerts';
import { TeamPerformanceBoard } from '@/features/crm/components/TeamPerformanceBoard';
import { cn } from '@/shared/lib/utils';

export const metadata = { title: 'CRM — GVM Corp' };

interface PageProps { searchParams: Promise<Record<string, string | undefined>> }

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

/**
 * Centro de mando del CRM. Gerencia: metas del equipo + alertas de toda la
 * cartera. Comercial: su meta, sus alertas y accesos directos.
 */
export default async function CRMHome({ searchParams }: PageProps) {
    const sp = await searchParams;
    const { supabase, userId, userName, isManager, today } = await loadVisitPageContext();
    const period = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.period ?? '') ? (sp.period as string) : today.slice(0, 7);

    const [accounts, visits, team] = await Promise.all([
        accountService.listAccounts(supabase, today, isManager ? undefined : userId),
        visitService.list(supabase, { salespersonId: isManager ? undefined : userId }),
        isManager ? accountService.teamPerformance(supabase, userId, period, today) : Promise.resolve([]),
    ]);
    const alerts = deriveAlerts(accounts);
    const overdue = visits.filter(v => isOverdue(v, today) || isFollowupDue(v, today));
    const names = isManager ? new Map((await visitService.getSalespeople(supabase, userId)).map(s => [s.id, s.name])) : undefined;

    // Meta propia del comercial (misma regla que el tablero del gerente).
    let mine: ReturnType<typeof attainment> | null = null;
    if (!isManager) {
        const [t] = (await accountService.getTargets(supabase, period)).filter(x => x.salesperson_id === userId);
        const monthSales = accounts.reduce((s, a) => s + (period === today.slice(0, 7) ? a.sales_month : 0), 0);
        mine = attainment(t?.target_amount ?? 0, monthSales, period, today);
    }

    return (
        <div className="page-container space-y-8 pb-16 animate-in fade-in duration-500">
            <PageHeader
                title="CRM"
                description={isManager ? 'Cartera, metas y seguimiento del equipo comercial.' : 'Tu cartera, tu meta y lo que toca hacer hoy.'}
                icon={Heart}
                breadcrumbs={[{ label: 'Inicio', href: '/dashboard' }, { label: 'CRM' }]}
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" className="h-11 px-4 rounded-xl text-xs font-bold gap-2">
                            <Link href="/crm/accounts"><Building2 className="h-4 w-4" /> {isManager ? 'Cartera' : 'Mis clientes'}</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 px-4 rounded-xl text-xs font-bold gap-2">
                            <Link href="/crm/visits"><CalendarCheck className="h-4 w-4" /> Visitas</Link>
                        </Button>
                        <Button asChild className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold gap-2">
                            <Link href="/crm/visits/new"><Plus className="h-4 w-4" /> Nueva visita</Link>
                        </Button>
                    </div>
                }
            />

            {isManager ? (
                <TeamPerformanceBoard team={team} period={period} isManager />
            ) : mine && (
                <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Kpi label="Mi meta del mes" value={mine.target > 0 ? cop.format(mine.target) : 'Sin meta'} />
                    <Kpi label="Mi venta del mes" value={cop.format(mine.achieved)} tone="indigo" />
                    <Kpi label="Cumplimiento" value={mine.attainment_pct === null ? '—' : `${Math.round(mine.attainment_pct)} %`} sub={`esperado a hoy ${mine.expected_pct} %`}
                        tone={mine.status === 'ADELANTE' ? 'emerald' : mine.status === 'ATRASADO' ? 'rose' : 'slate'} />
                    <Kpi label="Mis clientes" value={String(accounts.length)} sub={`${accounts.filter(a => a.account_status.startsWith('ACTIVO')).length} activos`} />
                </section>
            )}

            <AccountAlerts alerts={alerts} overdueVisits={overdue} salespersonNames={names} currentUserName={userName} />

            <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Shortcut href="/crm/accounts" icon={Building2} title={isManager ? 'Cartera de clientes' : 'Mis clientes'} desc="Semáforo por cuenta: crecimiento, caída, sin compra, inactivos." />
                <Shortcut href="/crm/visits" icon={CalendarCheck} title="Planeador de visitas" desc="Planea, registra resultados y compromisos." />
                <Shortcut href="/crm/leads" icon={UserPlus} title="Prospectos" desc="Solo clientes nuevos de verdad (granja o distribuidor que aún no es tercero)." />
            </section>
        </div>
    );
}

function Kpi({ label, value, sub, tone = 'slate' }: { label: string; value: string; sub?: string; tone?: 'slate' | 'indigo' | 'emerald' | 'rose' }) {
    const tones = { slate: 'text-slate-900', indigo: 'text-indigo-600', emerald: 'text-emerald-600', rose: 'text-rose-600' };
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className={cn('text-2xl font-bold tracking-tight mt-1 truncate', tones[tone])}>{value}</p>
            {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
        </div>
    );
}

function Shortcut({ href, icon: Icon, title, desc }: { href: string; icon: typeof Building2; title: string; desc: string }) {
    return (
        <Link href={href} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex gap-3 hover:border-indigo-200 transition-all">
            <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Icon className="h-5 w-5" /></div>
            <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{title}</p>
                <p className="text-xs text-slate-500">{desc}</p>
            </div>
        </Link>
    );
}
