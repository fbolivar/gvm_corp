'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, MapPin, Video, Building2, Briefcase, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { formatLocalDate } from '@/shared/lib/dateFmt';
import { isFollowupDue, isOverdue } from '../utils/visitStats';
import { MANAGEMENT_TYPES, VISIT_STATUSES, type CrmVisit, type VisitStatus } from '../types/visits';
import type { Salesperson } from '../services/visitService';

/**
 * Lista del planeador: filtros en la URL (para compartir/volver) y tarjetas
 * que en el celular se leen de arriba abajo sin tabla.
 */

export const STATUS_BADGE: Record<VisitStatus, string> = {
    PENDIENTE: 'bg-slate-100 text-slate-600 border-slate-200',
    AGENDADA: 'bg-sky-50 text-sky-700 border-sky-200',
    REALIZADA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REPROGRAMADA: 'bg-amber-50 text-amber-700 border-amber-200',
    NO_REALIZADA: 'bg-rose-50 text-rose-700 border-rose-200',
};

const PRIORITY_DOT: Record<number, string> = { 1: 'bg-rose-500', 2: 'bg-amber-400', 3: 'bg-slate-300' };

export function StatusBadge({ status }: { status: VisitStatus }) {
    return (
        <span className={cn('inline-flex px-2 py-0.5 rounded-lg border text-[10px] font-bold whitespace-nowrap', STATUS_BADGE[status])}>
            {VISIT_STATUSES[status]}
        </span>
    );
}

function MeetingIcon({ type }: { type: CrmVisit['meeting_type'] }) {
    if (type === 'VIRTUAL') return <Video className="h-3 w-3" />;
    if (type === 'OFICINA') return <Building2 className="h-3 w-3" />;
    return <MapPin className="h-3 w-3" />;
}

interface Props {
    visits: CrmVisit[];
    salespeople: Salesperson[];
    isManager: boolean;
    today: string;
    range: 'week' | 'month' | 'all';
}

const selectCls = 'h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none focus:border-indigo-300';

export function VisitList({ visits, salespeople, isManager, today, range }: Props) {
    const router = useRouter();
    const sp = useSearchParams();

    const setParam = (key: string, value: string) => {
        const next = new URLSearchParams(sp.toString());
        if (value) next.set(key, value); else next.delete(key);
        router.push(`/crm/visits?${next.toString()}`);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                    {([['week', 'Esta semana'], ['month', 'Este mes'], ['all', 'Todas']] as const).map(([k, t]) => (
                        <button key={k} type="button" onClick={() => setParam('range', k)}
                            className={cn('h-9 px-3 rounded-lg text-xs font-bold transition-all', range === k ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500')}>
                            {t}
                        </button>
                    ))}
                </div>
                <select value={sp.get('status') ?? ''} onChange={e => setParam('status', e.target.value)} className={selectCls}>
                    <option value="">Todos los estados</option>
                    {Object.entries(VISIT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {isManager && (
                    <select value={sp.get('salesperson') ?? ''} onChange={e => setParam('salesperson', e.target.value)} className={selectCls}>
                        <option value="">Todos los comerciales</option>
                        {salespeople.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                )}
                <span className="text-[11px] text-slate-400 ml-auto">{visits.length} visita{visits.length === 1 ? '' : 's'}</span>
            </div>

            {visits.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-slate-600">No hay visitas en este rango.</p>
                    <p className="text-xs text-slate-400 mt-1">Planea la primera con el botón «Nueva visita».</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {visits.map(v => {
                        const overdue = isOverdue(v, today);
                        const due = isFollowupDue(v, today);
                        return (
                            <Link key={v.id} href={`/crm/visits/${v.id}`}
                                className={cn('bg-white rounded-2xl border shadow-sm p-4 flex gap-3 hover:border-indigo-200 transition-all',
                                    overdue || due ? 'border-amber-200' : 'border-slate-100')}>
                                <div className="flex flex-col items-center pt-1 gap-2 shrink-0">
                                    <span className={cn('h-2.5 w-2.5 rounded-full', PRIORITY_DOT[v.priority])} title={`Prioridad ${v.priority}`} />
                                </div>
                                <div className="min-w-0 flex-1 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-bold text-slate-900 truncate flex-1 min-w-0">
                                            {v.is_internal ? <span className="inline-flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5 text-slate-400" />{v.title}</span> : v.party_name}
                                        </p>
                                        <StatusBadge status={v.status} />
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2">{v.objective}</p>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                                        <span className="font-semibold text-slate-700 tabular-nums">{formatLocalDate(v.planned_date, { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                                        <span className="inline-flex items-center gap-1"><MeetingIcon type={v.meeting_type} />{MANAGEMENT_TYPES[v.management_type]}</span>
                                        {isManager && <span className="text-indigo-600 font-semibold">{v.salesperson_name}</span>}
                                        {v.party_city && <span>{v.party_city}</span>}
                                    </div>
                                    {(overdue || due) && (
                                        <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                                            <AlertTriangle className="h-3 w-3" />
                                            {overdue ? 'Fecha planeada vencida' : `Seguimiento pendiente desde ${formatLocalDate(v.next_followup_date)}`}
                                        </p>
                                    )}
                                </div>
                                <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 self-center" />
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
