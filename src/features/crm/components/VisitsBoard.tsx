import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { formatLocalDate } from '@/shared/lib/dateFmt';
import { byManagementType, byMeetingType, isFollowupDue, isOverdue, statsBySalesperson } from '../utils/visitStats';
import { MANAGEMENT_TYPES, MEETING_TYPES, type CrmVisit } from '../types/visits';
import { StatusBadge } from './VisitList';

/**
 * Tablero de visitas — réplica de la hoja TABLERO del Excel, al día.
 * Server Component: recibe las visitas ya filtradas por período.
 */

const cell = 'px-3 py-2.5 text-xs tabular-nums text-right';

export function VisitsBoard({ visits, today }: { visits: CrmVisit[]; today: string }) {
    const stats = statsBySalesperson(visits, today);
    const totals = stats.reduce((t, s) => ({
        planned: t.planned + s.planned, agendada: t.agendada + s.agendada, realizada: t.realizada + s.realizada,
        reprogramada: t.reprogramada + s.reprogramada, no_realizada: t.no_realizada + s.no_realizada,
        pendiente: t.pendiente + s.pendiente, critical: t.critical + s.critical_accounts, overdue: t.overdue + s.overdue_followups,
    }), { planned: 0, agendada: 0, realizada: 0, reprogramada: 0, no_realizada: 0, pendiente: 0, critical: 0, overdue: 0 });
    const progress = totals.planned ? Math.round((totals.realizada / totals.planned) * 100) : 0;

    const meeting = byMeetingType(visits);
    const management = byManagementType(visits);
    const alerts = visits.filter(v => isOverdue(v, today) || isFollowupDue(v, today))
        .sort((a, b) => a.planned_date.localeCompare(b.planned_date));

    return (
        <div className="space-y-6">
            {/* KPIs generales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Kpi label="Planeadas" value={totals.planned} />
                <Kpi label="Realizadas" value={totals.realizada} sub={`${progress} % de avance`} tone="emerald" />
                <Kpi label="Cuentas críticas (P1)" value={totals.critical} tone="rose" />
                <Kpi label="Vencidas / seguimiento" value={totals.overdue} tone="amber" />
            </div>

            {/* Por comercial */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-3">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Avance por comercial</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                        <thead>
                            <tr className="bg-slate-50/60 border-b border-slate-100">
                                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Comercial</th>
                                {['Planeadas', 'Agendadas', 'Realizadas', 'Reprog.', 'No realiz.', 'Pendientes', '% avance', 'Críticas', 'Vencidas'].map(h => (
                                    <th key={h} className="px-3 py-2.5 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {stats.length === 0 && (
                                <tr><td colSpan={10} className="px-5 py-8 text-center text-xs text-slate-400">Sin visitas en el período.</td></tr>
                            )}
                            {stats.map(s => (
                                <tr key={s.salesperson_id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                    <td className="px-3 py-2.5 text-xs font-bold text-slate-900 whitespace-nowrap">
                                        <Link href={`/crm/visits?range=all&salesperson=${s.salesperson_id}`} className="hover:text-indigo-600">{s.salesperson_name}</Link>
                                    </td>
                                    <td className={cell}>{s.planned}</td>
                                    <td className={cell}>{s.agendada}</td>
                                    <td className={cn(cell, 'font-bold text-emerald-700')}>{s.realizada}</td>
                                    <td className={cell}>{s.reprogramada}</td>
                                    <td className={cell}>{s.no_realizada}</td>
                                    <td className={cell}>{s.pendiente}</td>
                                    <td className={cn(cell, 'font-bold')}>
                                        <span className="inline-flex items-center gap-2">
                                            <span className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden hidden md:inline-block">
                                                <span className="block h-full bg-indigo-500 rounded-full" style={{ width: `${s.progress_pct}%` }} />
                                            </span>
                                            {s.progress_pct} %
                                        </span>
                                    </td>
                                    <td className={cn(cell, s.critical_accounts > 0 && 'font-bold text-rose-600')}>{s.critical_accounts}</td>
                                    <td className={cn(cell, s.overdue_followups > 0 && 'font-bold text-amber-600')}>{s.overdue_followups}</td>
                                </tr>
                            ))}
                        </tbody>
                        {stats.length > 1 && (
                            <tfoot>
                                <tr className="bg-slate-50 border-t border-slate-200 font-bold">
                                    <td className="px-3 py-2.5 text-xs text-slate-700">Total</td>
                                    <td className={cell}>{totals.planned}</td>
                                    <td className={cell}>{totals.agendada}</td>
                                    <td className={cn(cell, 'text-emerald-700')}>{totals.realizada}</td>
                                    <td className={cell}>{totals.reprogramada}</td>
                                    <td className={cell}>{totals.no_realizada}</td>
                                    <td className={cell}>{totals.pendiente}</td>
                                    <td className={cell}>{progress} %</td>
                                    <td className={cn(cell, 'text-rose-600')}>{totals.critical}</td>
                                    <td className={cn(cell, 'text-amber-600')}>{totals.overdue}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Breakdown title="Agenda por tipo de reunión" rows={Object.entries(MEETING_TYPES).map(([k, v]): [string, number] => [v, meeting[k as keyof typeof meeting] ?? 0])} total={visits.length} />
                <Breakdown title="Visitas por tipo de gestión" rows={Object.entries(MANAGEMENT_TYPES).map(([k, v]): [string, number] => [v, management[k as keyof typeof management] ?? 0]).filter(r => r[1] > 0)} total={visits.length} />
            </div>

            {/* Alertas */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Vencidas y seguimientos pendientes</p>
                </div>
                {alerts.length === 0 ? (
                    <p className="px-5 py-8 text-center text-xs text-slate-400">Todo al día.</p>
                ) : (
                    <ul className="divide-y divide-slate-50">
                        {alerts.map(v => (
                            <li key={v.id}>
                                <Link href={`/crm/visits/${v.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 hover:bg-slate-50/60">
                                    <span className="text-xs font-bold text-slate-900 flex-1 min-w-[160px] truncate">{v.is_internal ? v.title : v.party_name}</span>
                                    <span className="text-[11px] text-indigo-600 font-semibold">{v.salesperson_name}</span>
                                    <span className="text-[11px] text-slate-500 tabular-nums">
                                        {isOverdue(v, today) ? `Planeada ${formatLocalDate(v.planned_date)}` : `Seguimiento ${formatLocalDate(v.next_followup_date)}`}
                                    </span>
                                    <StatusBadge status={v.status} />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}

function Kpi({ label, value, sub, tone = 'indigo' }: { label: string; value: number; sub?: string; tone?: 'indigo' | 'emerald' | 'rose' | 'amber' }) {
    const tones = { indigo: 'text-indigo-600', emerald: 'text-emerald-600', rose: 'text-rose-600', amber: 'text-amber-600' };
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className={cn('text-3xl font-bold tracking-tight mt-1', tones[tone])}>{value}</p>
            {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
        </div>
    );
}

function Breakdown({ title, rows, total }: { title: string; rows: [string, number][]; total: number }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
            {rows.length === 0 && <p className="text-xs text-slate-400">Sin datos.</p>}
            {rows.map(([label, n]) => (
                <div key={label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-700 font-semibold">{label}</span>
                        <span className="text-slate-500 tabular-nums">{n}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: total ? `${Math.round((n / total) * 100)}%` : '0%' }} />
                    </div>
                </div>
            ))}
        </div>
    );
}
