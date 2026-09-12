'use client';

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { UserActivity } from '@/features/settings/services/auditService';

const COLORS = {
    inserts: '#10b981', // Creó (emerald)
    updates: '#f59e0b', // Editó (amber)
    deletes: '#ef4444', // Eliminó (rose)
};

const TOP_N = 12;

interface ChartRow {
    name: string;
    full: string;
    role: string | null;
    inserts: number;
    updates: number;
    deletes: number;
    total: number;
}

/** Nombre corto para el eje: primeras dos palabras del nombre completo. */
function shortName(full: string): string {
    const parts = full.trim().split(/\s+/);
    return parts.length <= 2 ? full : parts.slice(0, 2).join(' ');
}

interface TooltipProps {
    active?: boolean;
    payload?: Array<{ payload: ChartRow }>;
}

function ChartTooltip({ active, payload }: TooltipProps) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-slate-950 border border-white/10 rounded-2xl px-4 py-3 shadow-active backdrop-blur-xl text-white space-y-1.5 min-w-[180px]">
            <p className="text-[10px] font-black uppercase tracking-widest">{d.full}</p>
            {d.role && (
                <p className="text-[8px] font-black uppercase tracking-widest text-indigo-300">{d.role}</p>
            )}
            <div className="pt-1 space-y-1">
                <Row color={COLORS.inserts} label="Creó" value={d.inserts} />
                <Row color={COLORS.updates} label="Editó" value={d.updates} />
                <Row color={COLORS.deletes} label="Eliminó" value={d.deletes} />
                <div className="flex items-center justify-between pt-1 border-t border-white/10">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Total</span>
                    <span className="text-[11px] font-black tabular-nums">{d.total.toLocaleString('es-CO')}</span>
                </div>
            </div>
        </div>
    );
}

function Row({ color, label, value }: { color: string; label: string; value: number }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-white/70">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                {label}
            </span>
            <span className="text-[10px] font-black tabular-nums">{value.toLocaleString('es-CO')}</span>
        </div>
    );
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
        </span>
    );
}

export default function UserActivityChart({ activity }: { activity: UserActivity[] }) {
    if (activity.length === 0) return null;

    // Top N por total (activity ya viene ordenado desc por total desde el RPC).
    const data: ChartRow[] = activity.slice(0, TOP_N).map((a) => ({
        name: shortName(a.actor_name),
        full: a.actor_name,
        role: a.actor_role,
        inserts: a.inserts,
        updates: a.updates,
        deletes: a.deletes,
        total: a.total,
    }));

    // Altura dinámica: ~38px por barra + margen.
    const height = Math.max(220, data.length * 38 + 40);
    const hiddenCount = activity.length - data.length;

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3 flex-wrap">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <BarChart3 className="h-4 w-4 text-indigo-600" />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Actividad por Usuario
                    {activity.length > TOP_N && (
                        <span className="text-slate-400"> — Top {TOP_N}</span>
                    )}
                </h3>
                <div className="ml-auto flex items-center gap-4">
                    <LegendItem color={COLORS.inserts} label="Creó" />
                    <LegendItem color={COLORS.updates} label="Editó" />
                    <LegendItem color={COLORS.deletes} label="Eliminó" />
                </div>
            </div>

            <div style={{ height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis
                            type="number"
                            tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={140}
                            tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="inserts" stackId="a" fill={COLORS.inserts} animationDuration={900} />
                        <Bar dataKey="updates" stackId="a" fill={COLORS.updates} animationDuration={900} />
                        <Bar dataKey="deletes" stackId="a" fill={COLORS.deletes} radius={[0, 6, 6, 0]} animationDuration={900} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {hiddenCount > 0 && (
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
                    + {hiddenCount} usuario{hiddenCount === 1 ? '' : 's'} más en la tabla inferior
                </p>
            )}
        </div>
    );
}
