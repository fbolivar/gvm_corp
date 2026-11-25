'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Plus, AlertTriangle, Video, Building2, MapPin, CalendarDays } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { formatLocalDate } from '@/shared/lib/dateFmt';
import { isFollowupDue, isOverdue } from '../utils/visitStats';
import { STATUS_BADGE } from './VisitList';
import { PRIORITY_DOT, PRIORITY_LABELS, VISIT_STATUSES, type CrmVisit, type VisitStatus } from '../types/visits';
import type { Salesperson } from '../services/visitService';

/**
 * Vista de calendario mensual del planeador de visitas.
 *
 * Es la vista "dinámica" que pidió el cliente: cada visita es una ficha de color
 * por estado sobre el día planeado; se navega mes a mes (URL `?month=YYYY-MM`,
 * para compartir/volver), se filtra por estado y comercial igual que la lista, y
 * al tocar un día vacío se crea una visita con esa fecha ya puesta.
 *
 * Fechas: `planned_date` es date-only de Bogotá. El grid se arma con instantes
 * UTC (mismo truco que `weekRange`) para no correr un día por zona horaria.
 */

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const MS_DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Días (YYYY-MM-DD) del grid del mes, empezando en lunes y cubriendo semanas completas. */
function buildMonthGrid(month: string): string[] {
    const [y, m] = month.split('-').map(Number);
    const first = Date.UTC(y, m - 1, 1);
    const dow = (new Date(first).getUTCDay() + 6) % 7; // lunes = 0
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const weeks = Math.ceil((dow + daysInMonth) / 7);
    const start = first - dow * MS_DAY;
    return Array.from({ length: weeks * 7 }, (_, i) => iso(new Date(start + i * MS_DAY)));
}

/** Mes vecino 'YYYY-MM' (offset en meses). */
function shiftMonth(month: string, offset: number): string {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + offset, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function MeetingIcon({ type }: { type: CrmVisit['meeting_type'] }) {
    if (type === 'VIRTUAL') return <Video className="h-3 w-3 shrink-0" />;
    if (type === 'OFICINA') return <Building2 className="h-3 w-3 shrink-0" />;
    return <MapPin className="h-3 w-3 shrink-0" />;
}

interface Props {
    month: string;               // 'YYYY-MM' del mes mostrado
    visits: CrmVisit[];          // visitas con planned_date dentro del mes
    salespeople: Salesperson[];
    isManager: boolean;
    today: string;               // 'YYYY-MM-DD' Bogotá
}

const selectCls = 'h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-700 outline-none focus:border-indigo-300';

export function VisitCalendar({ month, visits, salespeople, isManager, today }: Props) {
    const router = useRouter();
    const sp = useSearchParams();
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const go = (params: Record<string, string>) => {
        const next = new URLSearchParams(sp.toString());
        next.set('view', 'calendar');
        for (const [k, v] of Object.entries(params)) { if (v) next.set(k, v); else next.delete(k); }
        router.push(`/crm/visits?${next.toString()}`);
    };

    const grid = useMemo(() => buildMonthGrid(month), [month]);
    const byDay = useMemo(() => {
        const map = new Map<string, CrmVisit[]>();
        for (const v of visits) {
            const key = v.planned_date?.slice(0, 10);
            if (!key) continue;
            (map.get(key) ?? map.set(key, []).get(key)!).push(v);
        }
        // Dentro de un día: primero por prioridad, luego las abiertas antes que las cerradas.
        for (const list of map.values()) list.sort((a, b) => a.priority - b.priority);
        return map;
    }, [visits]);

    const monthLabel = formatLocalDate(`${month}-01`, { month: 'long', year: 'numeric' });
    const todayMonth = today.slice(0, 7);

    const Chip = ({ v }: { v: CrmVisit }) => (
        <Link
            href={`/crm/visits/${v.id}`}
            title={`${v.is_internal ? v.title : v.party_name} — ${VISIT_STATUSES[v.status]}`}
            className={cn(
                'group/chip flex items-center gap-1 rounded-md border px-1.5 py-[3px] text-[10px] font-semibold leading-tight hover:brightness-95 transition',
                STATUS_BADGE[v.status],
                // Prioridad Alta: resaltar la ficha completa (anillo rojo + negrita) sin
                // perder el color de estado adentro.
                v.priority === 1 && 'ring-2 ring-red-500/70 font-bold shadow-sm',
            )}
        >
            <span
                className={cn('h-2 w-2 rounded-full shrink-0 ring-1 ring-white/80', PRIORITY_DOT[v.priority])}
                title={`Prioridad ${PRIORITY_LABELS[v.priority]}`}
            />
            <MeetingIcon type={v.meeting_type} />
            <span className="truncate">{v.is_internal ? v.title : v.party_name}</span>
        </Link>
    );

    const DayCell = ({ day }: { day: string }) => {
        const inMonth = day.slice(0, 7) === month;
        const isToday = day === today;
        const dow = (new Date(day + 'T00:00:00Z').getUTCDay() + 6) % 7;
        const isWeekend = dow >= 5;
        const dayVisits = byDay.get(day) ?? [];
        const hasAlert = dayVisits.some(v => isOverdue(v, today) || isFollowupDue(v, today));
        const isOpen = expanded.has(day);
        const shown = isOpen ? dayVisits : dayVisits.slice(0, 3);
        const extra = dayVisits.length - shown.length;

        return (
            <div className={cn(
                'group relative flex min-h-[104px] flex-col gap-1 rounded-xl border p-1.5 transition',
                inMonth ? 'bg-white border-slate-100' : 'bg-slate-50/60 border-slate-50',
                isWeekend && inMonth && 'bg-slate-50/40',
                isToday && 'ring-2 ring-indigo-400 border-indigo-200',
            )}>
                <div className="flex items-center justify-between">
                    <span className={cn(
                        'flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold tabular-nums',
                        isToday ? 'bg-indigo-600 text-white' : inMonth ? 'text-slate-600' : 'text-slate-300',
                    )}>
                        {Number(day.slice(8, 10))}
                    </span>
                    <div className="flex items-center gap-1">
                        {hasAlert && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                        <Link
                            href={`/crm/visits/new?date=${day}`}
                            title="Planear visita este día"
                            className="flex h-5 w-5 items-center justify-center rounded-md text-slate-300 opacity-0 transition hover:bg-indigo-50 hover:text-indigo-600 group-hover:opacity-100"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    {shown.map(v => <Chip key={v.id} v={v} />)}
                    {extra > 0 && (
                        <button
                            type="button"
                            onClick={() => setExpanded(prev => { const n = new Set(prev); n.add(day); return n; })}
                            className="rounded-md px-1.5 py-[3px] text-left text-[10px] font-bold text-indigo-600 hover:bg-indigo-50"
                        >
                            +{extra} más
                        </button>
                    )}
                    {isOpen && dayVisits.length > 3 && (
                        <button
                            type="button"
                            onClick={() => setExpanded(prev => { const n = new Set(prev); n.delete(day); return n; })}
                            className="rounded-md px-1.5 py-[3px] text-left text-[10px] font-bold text-slate-400 hover:bg-slate-50"
                        >
                            ver menos
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Controles: navegación de mes + filtros (mismos de la lista) */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
                    <button type="button" onClick={() => go({ month: shiftMonth(month, -1) })}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-indigo-700 hover:shadow-sm" aria-label="Mes anterior">
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => go({ month: todayMonth })}
                        className={cn('h-9 px-3 rounded-lg text-xs font-bold', month === todayMonth ? 'text-slate-400' : 'text-indigo-700 hover:bg-white hover:shadow-sm')}>
                        Hoy
                    </button>
                    <button type="button" onClick={() => go({ month: shiftMonth(month, 1) })}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-indigo-700 hover:shadow-sm" aria-label="Mes siguiente">
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
                <h2 className="text-sm font-black capitalize text-slate-800 px-1">{monthLabel}</h2>

                <select value={sp.get('status') ?? ''} onChange={e => go({ status: e.target.value })} className={cn(selectCls, 'ml-auto')}>
                    <option value="">Todos los estados</option>
                    {Object.entries(VISIT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <select value={sp.get('priority') ?? ''} onChange={e => go({ priority: e.target.value })} className={selectCls}>
                    <option value="">Todas las prioridades</option>
                    {([1, 2, 3] as const).map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                </select>
                {isManager && (
                    <select value={sp.get('salesperson') ?? ''} onChange={e => go({ salesperson: e.target.value })} className={selectCls}>
                        <option value="">Todos los comerciales</option>
                        {salespeople.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                )}
            </div>

            {/* Leyenda de estados */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {(Object.keys(VISIT_STATUSES) as VisitStatus[]).map(k => (
                    <span key={k} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className={cn('h-2.5 w-2.5 rounded-sm border', STATUS_BADGE[k])} />
                        {VISIT_STATUSES[k]}
                    </span>
                ))}
                <span className="ml-auto text-[11px] text-slate-400">{visits.length} visita{visits.length === 1 ? '' : 's'} este mes</span>
            </div>

            {/* Leyenda del semáforo de prioridad (Alta=rojo, Media=amarillo, Baja=verde) */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[11px] font-semibold text-slate-500">Prioridad:</span>
                {([1, 2, 3] as const).map(p => (
                    <span key={p} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className={cn('h-2.5 w-2.5 rounded-full ring-1 ring-white', PRIORITY_DOT[p])} />
                        {PRIORITY_LABELS[p]}
                    </span>
                ))}
            </div>

            {/* ===== Grid de calendario (tablet/desktop) ===== */}
            <div className="hidden sm:block">
                <div className="grid grid-cols-7 gap-1 mb-1">
                    {WEEKDAYS.map(d => (
                        <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {grid.map(day => <DayCell key={day} day={day} />)}
                </div>
            </div>

            {/* ===== Agenda por día (móvil) ===== */}
            <div className="sm:hidden space-y-2">
                {grid.filter(d => d.slice(0, 7) === month && (byDay.get(d)?.length ?? 0) > 0).length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-slate-200 px-6 py-10 text-center">
                        <CalendarDays className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-600">No hay visitas en {monthLabel}.</p>
                        <p className="text-xs text-slate-400 mt-1">Toca «Nueva visita» para planear la primera.</p>
                    </div>
                ) : (
                    grid.filter(d => d.slice(0, 7) === month && (byDay.get(d)?.length ?? 0) > 0).map(day => (
                        <div key={day} className={cn('rounded-2xl border bg-white p-3', day === today ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-slate-100')}>
                            <div className="flex items-center justify-between mb-2">
                                <span className={cn('text-xs font-bold capitalize', day === today ? 'text-indigo-600' : 'text-slate-700')}>
                                    {formatLocalDate(day, { weekday: 'long', day: '2-digit', month: 'short' })}
                                </span>
                                <Link href={`/crm/visits/new?date=${day}`} className="text-indigo-600"><Plus className="h-4 w-4" /></Link>
                            </div>
                            <div className="space-y-1">
                                {(byDay.get(day) ?? []).map(v => <Chip key={v.id} v={v} />)}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
