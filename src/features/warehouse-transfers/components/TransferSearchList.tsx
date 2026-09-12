'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ExternalLink, Calendar, Clock, Truck, PackageCheck, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

export interface TransferRow {
    id: string;
    number: string | null;
    from: string;
    to: string;
    status: string;
    created_at?: string | null;
}

const STATUS_MAP: Record<string, { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }> = {
    DRAFT: { label: 'Borrador', className: 'bg-slate-50 text-slate-500', Icon: Clock },
    IN_TRANSIT: { label: 'En Tránsito', className: 'bg-amber-50 text-amber-600', Icon: Truck },
    RECEIVED: { label: 'Recibido', className: 'bg-emerald-50 text-emerald-600', Icon: PackageCheck },
    CANCELLED: { label: 'Anulado', className: 'bg-rose-50 text-rose-600', Icon: XCircle },
};

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('es-CO', {
            day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Bogota',
        });
    } catch {
        return dateStr;
    }
}

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_MAP[status] ?? { label: status, className: 'bg-slate-50 text-slate-500', Icon: AlertCircle };
    const { Icon } = cfg;
    return (
        <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold', cfg.className)}>
            <Icon className="h-3 w-3" />
            {cfg.label}
        </span>
    );
}

const STATUS_CHIPS: { key: string; label: string; active: string }[] = [
    { key: 'ALL', label: 'Todos', active: 'bg-slate-900 text-white' },
    { key: 'DRAFT', label: 'Borrador', active: 'bg-slate-500 text-white' },
    { key: 'IN_TRANSIT', label: 'En Tránsito', active: 'bg-amber-500 text-white' },
    { key: 'RECEIVED', label: 'Recibido', active: 'bg-emerald-500 text-white' },
    { key: 'CANCELLED', label: 'Anulado', active: 'bg-rose-500 text-white' },
];

export function TransferSearchList({ rows }: { rows: TransferRow[] }) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const counts = useMemo(() => {
        const c: Record<string, number> = { ALL: rows.length };
        rows.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
        return c;
    }, [rows]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return rows.filter((r) => {
            if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
            if (!q) return true;
            return (
                (r.number ?? '').toLowerCase().includes(q) ||
                r.from.toLowerCase().includes(q) ||
                r.to.toLowerCase().includes(q)
            );
        });
    }, [rows, search, statusFilter]);

    return (
        <div>
            {/* Barra de búsqueda + filtros por estado */}
            <div className="px-5 py-3 border-b border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por número, bodega origen o destino..."
                            className="w-full h-10 pl-9 pr-3 text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-300"
                        />
                    </div>
                    {/* Chips de estado */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {STATUS_CHIPS.map((chip) => {
                            const isActive = statusFilter === chip.key;
                            const count = counts[chip.key] ?? 0;
                            return (
                                <button
                                    key={chip.key}
                                    type="button"
                                    onClick={() => setStatusFilter(chip.key)}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all',
                                        isActive ? chip.active : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                    )}
                                >
                                    {chip.label}
                                    <span className={cn('tabular-nums', isActive ? 'opacity-80' : 'text-slate-400')}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                {(search || statusFilter !== 'ALL') && (
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
                    </p>
                )}
            </div>

            {filtered.length === 0 ? (
                <div className="py-14 text-center flex flex-col items-center justify-center gap-2">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center">
                        <Search className="h-5 w-5 text-slate-300" />
                    </div>
                    <p className="text-xs text-slate-400 font-bold">
                        {search ? `Sin coincidencias para “${search}”` : 'No hay traslados en este estado'}
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full" role="table">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/60">
                                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">TR #</th>
                                <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Origen</th>
                                <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Destino</th>
                                <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                                <th className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fecha</th>
                                <th className="px-5 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((r) => (
                                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-4">
                                        <span className="text-xs font-bold text-slate-900 font-mono">{r.number ?? '—'}</span>
                                    </td>
                                    <td className="px-4 py-4 max-w-[140px]">
                                        <p className="text-xs font-bold text-slate-900 truncate leading-snug">{r.from}</p>
                                    </td>
                                    <td className="px-4 py-4 max-w-[140px]">
                                        <p className="text-xs font-bold text-slate-900 truncate leading-snug">{r.to}</p>
                                    </td>
                                    <td className="px-4 py-4">
                                        <StatusBadge status={r.status} />
                                    </td>
                                    <td className="hidden md:table-cell px-4 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                            <Calendar className="h-3 w-3 text-slate-300 shrink-0" />
                                            <span className="text-[10px] text-slate-400">{formatDate(r.created_at)}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <Button
                                            asChild
                                            variant="ghost"
                                            className="h-8 px-3 rounded-xl text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1.5 uppercase tracking-wide"
                                        >
                                            <Link href={`/inventory/transfers/${r.id}`}>
                                                <ExternalLink className="h-3 w-3" />
                                                Ver detalle
                                            </Link>
                                        </Button>
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
