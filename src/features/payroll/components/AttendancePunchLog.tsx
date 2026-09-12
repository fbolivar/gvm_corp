"use client"

import { useMemo, useState } from "react";
import { MapPin, ScanLine, Search } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import type { AttendanceRecord } from "../services/attendanceService";

/**
 * Reporte de marcaciones: una fila por jornada, con la sede donde se autenticó
 * el carnet en la entrada y en la salida.
 *
 * El tablero mensual muestra puntos por día y sirve para ver ausencias de un
 * vistazo, pero no dice DÓNDE marcó cada quien. Esta tabla es la traza.
 */

export interface PunchRow extends AttendanceRecord {
    employee_name: string;
    check_in_terminal_name?: string | null;
    check_out_terminal_name?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
    PRESENT: 'A tiempo',
    LATE: 'Tarde',
    ABSENT: 'Ausente',
    HOLIDAY: 'Festivo',
};

const STATUS_STYLES: Record<string, string> = {
    PRESENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    LATE: 'bg-amber-50 text-amber-700 border-amber-200',
    ABSENT: 'bg-rose-50 text-rose-700 border-rose-200',
    HOLIDAY: 'bg-slate-100 text-slate-600 border-slate-200',
};

/** Hora en formato local de Bogotá. Los timestamps se guardan en UTC. */
function fmtTime(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Bogota',
    });
}

/** Fecha de solo día: se arma con componentes locales para no correrla un día. */
function fmtDay(value: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

function TerminalTag({ name }: { name?: string | null }) {
    if (!name) {
        return (
            <span className="text-[11px] text-slate-400 italic" title="Registro manual o anterior a la traza por sede">
                Sin terminal
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
            <MapPin className="h-3 w-3 text-indigo-500 shrink-0" />
            {name}
        </span>
    );
}

export function AttendancePunchLog({ rows }: { rows: PunchRow[] }) {
    const [query, setQuery] = useState('');
    const [terminal, setTerminal] = useState('');

    const terminals = useMemo(() => {
        const names = new Set<string>();
        rows.forEach(r => {
            if (r.check_in_terminal_name) names.add(r.check_in_terminal_name);
            if (r.check_out_terminal_name) names.add(r.check_out_terminal_name);
        });
        return [...names].sort();
    }, [rows]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return rows.filter(r => {
            const matchName = !q || r.employee_name.toLowerCase().includes(q);
            const matchTerminal =
                !terminal ||
                r.check_in_terminal_name === terminal ||
                r.check_out_terminal_name === terminal;
            return matchName && matchTerminal;
        });
    }, [rows, query, terminal]);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 flex flex-wrap items-center gap-3">
                <ScanLine className="h-4 w-4 text-indigo-500" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex-1">
                    Marcaciones del mes — dónde se autenticó cada carnet
                </span>

                <div className="relative">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Buscar empleado..."
                        className="h-9 w-52 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-xs text-slate-700 outline-none focus:border-indigo-300"
                    />
                </div>

                {terminals.length > 0 && (
                    <select
                        value={terminal}
                        onChange={e => setTerminal(e.target.value)}
                        className="h-9 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-slate-600 outline-none focus:border-indigo-300"
                    >
                        <option value="">Todas las sedes</option>
                        {terminals.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                )}
            </div>

            {filtered.length === 0 ? (
                <p className="px-6 py-10 text-center text-xs text-slate-500">
                    No hay marcaciones que coincidan con el filtro.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px]">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/60">
                                {['Empleado', 'Fecha', 'Entrada', 'Sede de entrada', 'Salida', 'Sede de salida', 'Estado'].map(h => (
                                    <th
                                        key={h}
                                        className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(r => (
                                <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                    <td className="px-4 py-3 text-xs font-bold text-slate-900 max-w-[220px] truncate">
                                        {r.employee_name}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-600 tabular-nums whitespace-nowrap">
                                        {fmtDay(r.work_date)}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 tabular-nums">
                                        {fmtTime(r.check_in)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <TerminalTag name={r.check_in_terminal_name} />
                                    </td>
                                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 tabular-nums">
                                        {fmtTime(r.check_out)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <TerminalTag name={r.check_out_terminal_name} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={cn(
                                                'inline-flex px-2 py-0.5 rounded-lg border text-[10px] font-bold',
                                                STATUS_STYLES[r.status] ?? STATUS_STYLES.HOLIDAY,
                                            )}
                                        >
                                            {STATUS_LABELS[r.status] ?? r.status}
                                            {r.status === 'LATE' && r.late_minutes > 0 && ` · ${r.late_minutes} min`}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
