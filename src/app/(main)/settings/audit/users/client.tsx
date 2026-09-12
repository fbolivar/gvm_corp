'use client';

import { useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    Calendar,
    Download,
    Users,
    Activity,
    PlusCircle,
    PencilLine,
    Trash2,
    Boxes,
    ExternalLink,
    AlertTriangle,
    Loader2,
    RefreshCw,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { UserActivity } from '@/features/settings/services/auditService';
import UserActivityChart from './UserActivityChart';

interface Props {
    activity: UserActivity[];
    loadError: string | null;
    from?: string;
    to?: string;
}

const labelClass = 'text-[10px] font-black text-slate-400 uppercase tracking-widest';

function fmtDateTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Bogota',
        });
    } catch {
        return iso;
    }
}

function rangeQuery(from?: string, to?: string, extra?: Record<string, string>): string {
    const p = new URLSearchParams(extra);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    return p.toString();
}

// CSV del resumen (dataset pequeño: una fila por usuario) — client-side.
function csvCell(v: unknown): string {
    const s = v === null || v === undefined ? '' : String(v);
    return `"${s.replace(/"/g, '""')}"`;
}

function StatCard({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    color: string;
}) {
    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-3">
            <div className="flex items-center justify-between">
                <span className={labelClass}>{label}</span>
                <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center', color)}>
                    <Icon className="h-4 w-4" />
                </div>
            </div>
            <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
        </div>
    );
}

export default function UserActivityClient({ activity, loadError, from, to }: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const [localFrom, setLocalFrom] = useState(from ?? '');
    const [localTo, setLocalTo] = useState(to ?? '');
    const [pending, setPending] = useState(false);

    const applyRange = (nextFrom: string, nextTo: string) => {
        const qs = rangeQuery(nextFrom || undefined, nextTo || undefined);
        setPending(true);
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };

    const totalEvents = useMemo(
        () => activity.reduce((sum, a) => sum + a.total, 0),
        [activity]
    );

    const exportSummaryCsv = () => {
        const headers = [
            'Usuario',
            'Rol',
            'Email',
            'Total',
            'Creó',
            'Editó',
            'Eliminó',
            'Entidades',
            'Primera actividad',
            'Última actividad',
        ];
        const lines = activity.map((a) =>
            [
                csvCell(a.actor_name),
                csvCell(a.actor_role ?? ''),
                csvCell(a.actor_email ?? ''),
                csvCell(a.total),
                csvCell(a.inserts),
                csvCell(a.updates),
                csvCell(a.deletes),
                csvCell(a.entities),
                csvCell(fmtDateTime(a.first_at)),
                csvCell(fmtDateTime(a.last_at)),
            ].join(',')
        );
        const csv = '﻿' + [headers.map(csvCell).join(','), ...lines].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'actividad_por_usuario.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loadError) {
        return (
            <div className="bg-white rounded-3xl border border-rose-200 shadow-sm p-8 flex flex-col items-center gap-3 text-center">
                <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-rose-400" />
                </div>
                <p className="text-[12px] font-black text-slate-800">
                    No se pudo cargar la actividad por usuario
                </p>
                <p className="text-[10px] font-mono text-slate-400 break-all max-w-md">{loadError}</p>
                <button
                    onClick={() => router.refresh()}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                    <RefreshCw className="h-3.5 w-3.5" /> Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatCard
                    icon={Users}
                    label="Usuarios con Actividad"
                    value={activity.length}
                    color="bg-indigo-50 text-indigo-600"
                />
                <StatCard
                    icon={Activity}
                    label="Total de Eventos"
                    value={totalEvents.toLocaleString('es-CO')}
                    color="bg-emerald-50 text-emerald-600"
                />
            </div>

            {/* Filtros por fecha + export */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <span className={labelClass}>Rango de Fechas</span>
                        {pending && <Loader2 className="h-3.5 w-3.5 text-indigo-400 animate-spin" />}
                        {(localFrom || localTo) && (
                            <button
                                onClick={() => {
                                    setLocalFrom('');
                                    setLocalTo('');
                                    applyRange('', '');
                                }}
                                className="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-colors"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                    <button
                        onClick={exportSummaryCsv}
                        disabled={activity.length === 0}
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                    >
                        <Download className="h-3.5 w-3.5" /> Exportar Resumen CSV
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
                    <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none z-10" />
                        <input
                            type="date"
                            value={localFrom}
                            onChange={(e) => {
                                setLocalFrom(e.target.value);
                                applyRange(e.target.value, localTo);
                            }}
                            className="w-full h-10 pl-9 pr-3 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>
                    <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none z-10" />
                        <input
                            type="date"
                            value={localTo}
                            onChange={(e) => {
                                setLocalTo(e.target.value);
                                applyRange(localFrom, e.target.value);
                            }}
                            className="w-full h-10 pl-9 pr-3 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>
                </div>
            </div>

            {/* Gráfica de barras (Top usuarios) */}
            {activity.length > 0 && (
                <div className={cn('transition-opacity', pending && 'opacity-60')}>
                    <UserActivityChart activity={activity} />
                </div>
            )}

            {/* Tabla */}
            <div className={cn('bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-opacity', pending && 'opacity-60')}>
                {activity.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                            <Users className="h-7 w-7 text-slate-300" />
                        </div>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                            Sin actividad en el rango
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px] text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className={cn(labelClass, 'px-6 py-4')}>Usuario</th>
                                    <th className={cn(labelClass, 'px-4 py-4 text-right')}>Total</th>
                                    <th className={cn(labelClass, 'px-4 py-4 text-right')}>Creó</th>
                                    <th className={cn(labelClass, 'px-4 py-4 text-right')}>Editó</th>
                                    <th className={cn(labelClass, 'px-4 py-4 text-right')}>Eliminó</th>
                                    <th className={cn(labelClass, 'px-4 py-4 text-right')}>Entid.</th>
                                    <th className={cn(labelClass, 'px-4 py-4')}>Última actividad</th>
                                    <th className={cn(labelClass, 'px-6 py-4 text-right')}>Detalle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {activity.map((a) => (
                                    <tr key={a.actor_user_id} className="hover:bg-slate-50/70 transition-colors">
                                        {/* Usuario */}
                                        <td className="px-6 py-4 align-top min-w-[200px]">
                                            <p className="text-[12px] font-black text-slate-800 leading-snug">{a.actor_name}</p>
                                            {a.actor_role && (
                                                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">{a.actor_role}</p>
                                            )}
                                        </td>
                                        {/* Total */}
                                        <td className="px-4 py-4 align-top text-right">
                                            <span className="text-[13px] font-black text-slate-900 tabular-nums">{a.total.toLocaleString('es-CO')}</span>
                                        </td>
                                        {/* Creó */}
                                        <td className="px-4 py-4 align-top text-right">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 tabular-nums">
                                                <PlusCircle className="h-3 w-3" /> {a.inserts.toLocaleString('es-CO')}
                                            </span>
                                        </td>
                                        {/* Editó */}
                                        <td className="px-4 py-4 align-top text-right">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 tabular-nums">
                                                <PencilLine className="h-3 w-3" /> {a.updates.toLocaleString('es-CO')}
                                            </span>
                                        </td>
                                        {/* Eliminó */}
                                        <td className="px-4 py-4 align-top text-right">
                                            <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold tabular-nums', a.deletes > 0 ? 'text-rose-600' : 'text-slate-300')}>
                                                <Trash2 className="h-3 w-3" /> {a.deletes.toLocaleString('es-CO')}
                                            </span>
                                        </td>
                                        {/* Entidades */}
                                        <td className="px-4 py-4 align-top text-right">
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 tabular-nums">
                                                <Boxes className="h-3 w-3" /> {a.entities}
                                            </span>
                                        </td>
                                        {/* Última */}
                                        <td className="px-4 py-4 align-top whitespace-nowrap">
                                            <span className="text-[10px] font-bold text-slate-500">{fmtDateTime(a.last_at)}</span>
                                        </td>
                                        {/* Detalle */}
                                        <td className="px-6 py-4 align-top text-right whitespace-nowrap">
                                            <div className="inline-flex items-center gap-3">
                                                <a
                                                    href={`/api/audit/export?${rangeQuery(from, to, { actor: a.actor_user_id })}`}
                                                    className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-800 transition-colors"
                                                    title="Descargar detalle de este usuario en CSV"
                                                >
                                                    <Download className="h-3 w-3" /> CSV
                                                </a>
                                                <a
                                                    href={`/settings/audit?${rangeQuery(from, to, { actor: a.actor_user_id })}`}
                                                    className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition-colors"
                                                >
                                                    Ver <ExternalLink className="h-3 w-3" />
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
