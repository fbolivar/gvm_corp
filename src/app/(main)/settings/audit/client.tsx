'use client';

import { useState, useMemo } from 'react';
import {
    Search,
    Filter,
    Calendar,
    ChevronDown,
    ChevronRight,
    Users,
    Activity,
    Clock,
    AlertTriangle,
    Database,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditLog {
    id: string;
    actor_user_id: string;
    actor_name: string;
    action: string;
    entity: string;
    entity_id: string;
    payload: unknown;
    created_at: string;
}

interface Props {
    logs: AuditLog[];
    totalCount: number;
    uniqueUsers: number;
    mostRecent: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const labelClass = 'text-[10px] font-black text-slate-400 uppercase tracking-widest';

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return iso;
    }
}

function formatTime(iso: string): string {
    try {
        return new Date(iso).toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    } catch {
        return '';
    }
}

function formatRelative(iso: string): string {
    try {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Hace un momento';
        if (mins < 60) return `Hace ${mins} min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `Hace ${hours} h`;
        const days = Math.floor(hours / 24);
        return `Hace ${days} d`;
    } catch {
        return '';
    }
}

// ---------------------------------------------------------------------------
// Action badge config
// ---------------------------------------------------------------------------

type ActionKey = 'INSERT' | 'UPDATE' | 'DELETE' | string;

const ACTION_CONFIG: Record<string, { label: string; className: string }> = {
    INSERT: {
        label: 'INSERTAR',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-black',
    },
    UPDATE: {
        label: 'ACTUALIZAR',
        className: 'bg-amber-50 text-amber-700 border border-amber-200 font-black',
    },
    DELETE: {
        label: 'ELIMINAR',
        className: 'bg-rose-50 text-rose-700 border border-rose-200 font-black',
    },
    SELECT: {
        label: 'CONSULTAR',
        className: 'bg-sky-50 text-sky-700 border border-sky-200 font-black',
    },
    LOGIN: {
        label: 'ACCESO',
        className: 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-black',
    },
    LOGOUT: {
        label: 'SALIDA',
        className: 'bg-slate-100 text-slate-600 border border-slate-200 font-black',
    },
};

function getActionConfig(action: ActionKey) {
    return (
        ACTION_CONFIG[action?.toUpperCase?.()] ?? {
            label: (action ?? 'OTRO').toUpperCase(),
            className: 'bg-slate-100 text-slate-600 border border-slate-200 font-black',
        }
    );
}

// ---------------------------------------------------------------------------
// Entity badge config
// ---------------------------------------------------------------------------

const ENTITY_COLORS: Record<string, string> = {
    documents: 'bg-violet-50 text-violet-700 border border-violet-200',
    products: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
    parties: 'bg-pink-50 text-pink-700 border border-pink-200',
    inventory_movements: 'bg-orange-50 text-orange-700 border border-orange-200',
    purchase_orders: 'bg-teal-50 text-teal-700 border border-teal-200',
    profiles: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    user_tenants: 'bg-blue-50 text-blue-700 border border-blue-200',
    tenants: 'bg-slate-100 text-slate-600 border border-slate-200',
    leads: 'bg-rose-50 text-rose-700 border border-rose-200',
    audit_log: 'bg-amber-50 text-amber-700 border border-amber-200',
};

function getEntityClass(entity: string) {
    return (
        ENTITY_COLORS[entity?.toLowerCase?.()] ??
        'bg-slate-100 text-slate-600 border border-slate-200'
    );
}

function formatEntityLabel(entity: string): string {
    return (entity ?? 'Desconocido')
        .replace(/_/g, ' ')
        .toUpperCase();
}

// ---------------------------------------------------------------------------
// Unique entity options derived from logs
// ---------------------------------------------------------------------------

function getEntityOptions(logs: AuditLog[]): string[] {
    const set = new Set(logs.map((l) => l.entity).filter(Boolean));
    return Array.from(set).sort();
}

// ---------------------------------------------------------------------------
// Stats Card
// ---------------------------------------------------------------------------

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    color,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    sub?: string;
    color: string;
}) {
    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <span className={labelClass}>{label}</span>
                <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center', color)}>
                    <Icon className="h-4 w-4" />
                </div>
            </div>
            <div className="space-y-0.5">
                <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
                {sub && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{sub}</p>}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Payload viewer
// ---------------------------------------------------------------------------

function PayloadViewer({ payload }: { payload: unknown }) {
    if (!payload) {
        return (
            <p className="text-[10px] text-slate-400 italic px-4 py-3">
                Sin datos adicionales
            </p>
        );
    }

    let formatted: string;
    try {
        formatted = JSON.stringify(payload, null, 2);
    } catch {
        formatted = String(payload);
    }

    return (
        <pre className="bg-slate-950 text-emerald-400 text-[10px] font-mono p-4 rounded-2xl overflow-x-auto leading-relaxed max-h-64 overflow-y-auto">
            {formatted}
        </pre>
    );
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;

export default function AuditLogClient({ logs, totalCount, uniqueUsers, mostRecent }: Props) {
    const [search, setSearch] = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [page, setPage] = useState(1);

    const entityOptions = useMemo(() => getEntityOptions(logs), [logs]);

    const actionOptions = useMemo(() => {
        const set = new Set(logs.map((l) => l.action).filter(Boolean));
        return Array.from(set).sort();
    }, [logs]);

    // Client-side filtering
    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return logs.filter((log) => {
            if (q) {
                const haystack = [
                    log.action,
                    log.entity,
                    log.entity_id,
                    log.actor_name,
                    log.actor_user_id,
                ]
                    .join(' ')
                    .toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            if (entityFilter && log.entity !== entityFilter) return false;
            if (actionFilter && log.action?.toUpperCase() !== actionFilter.toUpperCase()) return false;
            if (dateFrom) {
                const logDate = new Date(log.created_at);
                if (logDate < new Date(dateFrom)) return false;
            }
            if (dateTo) {
                const logDate = new Date(log.created_at);
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                if (logDate > toDate) return false;
            }
            return true;
        });
    }, [logs, search, entityFilter, actionFilter, dateFrom, dateTo]);

    const paginated = useMemo(
        () => filtered.slice(0, page * PAGE_SIZE),
        [filtered, page]
    );

    const hasMore = paginated.length < filtered.length;

    const toggleRow = (id: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const clearFilters = () => {
        setSearch('');
        setEntityFilter('');
        setActionFilter('');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    const hasActiveFilters =
        search || entityFilter || actionFilter || dateFrom || dateTo;

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    icon={Activity}
                    label="Total de Eventos"
                    value={totalCount.toLocaleString('es-CO')}
                    sub={`${filtered.length.toLocaleString('es-CO')} con filtros activos`}
                    color="bg-indigo-50 text-indigo-600"
                />
                <StatCard
                    icon={Users}
                    label="Usuarios Activos"
                    value={uniqueUsers}
                    sub="Usuarios distintos con actividad"
                    color="bg-emerald-50 text-emerald-600"
                />
                <StatCard
                    icon={Clock}
                    label="Evento Mas Reciente"
                    value={mostRecent ? formatRelative(mostRecent) : '—'}
                    sub={mostRecent ? `${formatDate(mostRecent)} ${formatTime(mostRecent)}` : 'Sin datos'}
                    color="bg-amber-50 text-amber-600"
                />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <span className={labelClass}>Filtros de Busqueda</span>
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-colors"
                        >
                            Limpiar todo
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Search */}
                    <div className="relative lg:col-span-2">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <Input
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Buscar por accion, entidad, usuario, ID..."
                            className="pl-9 h-10 text-[11px] font-bold border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-indigo-100 placeholder:text-slate-300"
                        />
                    </div>

                    {/* Entity filter */}
                    <div className="relative">
                        <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none z-10" />
                        <select
                            value={entityFilter}
                            onChange={(e) => {
                                setEntityFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full h-10 pl-9 pr-4 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                        >
                            <option value="">Todas las Entidades</option>
                            {entityOptions.map((e) => (
                                <option key={e} value={e}>
                                    {formatEntityLabel(e)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Action filter */}
                    <div className="relative">
                        <Database className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none z-10" />
                        <select
                            value={actionFilter}
                            onChange={(e) => {
                                setActionFilter(e.target.value);
                                setPage(1);
                            }}
                            className="w-full h-10 pl-9 pr-4 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                        >
                            <option value="">Todas las Acciones</option>
                            {actionOptions.map((a) => (
                                <option key={a} value={a}>
                                    {a.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date From */}
                    <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none z-10" />
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => {
                                setDateFrom(e.target.value);
                                setPage(1);
                            }}
                            className="w-full h-10 pl-9 pr-3 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    {/* Date To */}
                    <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none z-10" />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => {
                                setDateTo(e.target.value);
                                setPage(1);
                            }}
                            className="w-full h-10 pl-9 pr-3 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    {/* Results counter */}
                    <div className="flex items-center gap-2 lg:col-span-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {filtered.length.toLocaleString('es-CO')} resultados
                            {hasActiveFilters && (
                                <span className="text-indigo-500"> (filtrado)</span>
                            )}
                        </span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Table header */}
                <div className="hidden md:grid grid-cols-[180px_160px_110px_160px_160px_60px] gap-4 px-6 py-4 bg-slate-50 border-b border-slate-100">
                    <span className={labelClass}>Fecha y Hora</span>
                    <span className={labelClass}>Usuario</span>
                    <span className={labelClass}>Accion</span>
                    <span className={labelClass}>Entidad</span>
                    <span className={labelClass}>ID de Entidad</span>
                    <span className={labelClass}>Det.</span>
                </div>

                {/* Empty state */}
                {filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
                            <AlertTriangle className="h-8 w-8 text-slate-300" />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                Sin registros de auditoria
                            </p>
                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                                {hasActiveFilters
                                    ? 'Intenta ampliar los filtros de busqueda'
                                    : 'Aun no hay eventos registrados en el sistema'}
                            </p>
                        </div>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition-colors mt-1"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                )}

                {/* Rows */}
                <div className="divide-y divide-slate-50">
                    {paginated.map((log) => {
                        const isExpanded = expandedRows.has(log.id);
                        const actionCfg = getActionConfig(log.action);
                        const entityClass = getEntityClass(log.entity);
                        const shortId = log.entity_id
                            ? log.entity_id.length > 16
                                ? `${log.entity_id.substring(0, 8)}…`
                                : log.entity_id
                            : '—';

                        return (
                            <div key={log.id} className="group">
                                {/* Main row — desktop layout */}
                                <div
                                    className="hidden md:grid grid-cols-[180px_160px_110px_160px_160px_60px] gap-4 items-center px-6 py-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
                                    onClick={() => toggleRow(log.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && toggleRow(log.id)}
                                    aria-expanded={isExpanded}
                                    aria-label={`Evento de auditoría: ${log.action} en ${log.entity}`}
                                >
                                    {/* Timestamp */}
                                    <div className="space-y-0.5">
                                        <p className="text-[11px] font-black text-slate-800 leading-none">
                                            {formatDate(log.created_at)}
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            {formatTime(log.created_at)}
                                        </p>
                                    </div>

                                    {/* User */}
                                    <div className="space-y-0.5 min-w-0">
                                        <p className="text-[11px] font-black text-slate-800 leading-none truncate">
                                            {log.actor_name}
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest truncate">
                                            {log.actor_user_id
                                                ? `${log.actor_user_id.substring(0, 8)}…`
                                                : 'Sistema'}
                                        </p>
                                    </div>

                                    {/* Action badge */}
                                    <div>
                                        <span
                                            className={cn(
                                                'inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-widest',
                                                actionCfg.className
                                            )}
                                        >
                                            {actionCfg.label}
                                        </span>
                                    </div>

                                    {/* Entity badge */}
                                    <div>
                                        <span
                                            className={cn(
                                                'inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest',
                                                entityClass
                                            )}
                                        >
                                            {formatEntityLabel(log.entity)}
                                        </span>
                                    </div>

                                    {/* Entity ID */}
                                    <div>
                                        <code className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                            {shortId}
                                        </code>
                                    </div>

                                    {/* Expand icon */}
                                    <div className="flex justify-center">
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-indigo-500" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                                        )}
                                    </div>
                                </div>

                                {/* Main row — mobile layout */}
                                <div
                                    className="md:hidden flex items-start justify-between gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
                                    onClick={() => toggleRow(log.id)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && toggleRow(log.id)}
                                >
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span
                                                className={cn(
                                                    'inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-widest',
                                                    actionCfg.className
                                                )}
                                            >
                                                {actionCfg.label}
                                            </span>
                                            <span
                                                className={cn(
                                                    'inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest',
                                                    entityClass
                                                )}
                                            >
                                                {formatEntityLabel(log.entity)}
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-black text-slate-800 truncate">
                                            {log.actor_name}
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            {formatDate(log.created_at)} — {formatTime(log.created_at)}
                                        </p>
                                    </div>
                                    <div className="shrink-0 mt-1">
                                        {isExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-indigo-500" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-slate-300" />
                                        )}
                                    </div>
                                </div>

                                {/* Expanded payload */}
                                {isExpanded && (
                                    <div className="px-6 pb-5 pt-1 bg-slate-50/60 border-t border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex items-center gap-2">
                                            <div className="h-1 w-4 bg-indigo-400 rounded-full" />
                                            <span className={labelClass}>Detalle del Payload</span>
                                        </div>
                                        {/* Full entity ID */}
                                        {log.entity_id && (
                                            <div className="flex items-center gap-2">
                                                <span className={labelClass}>ID Completo:</span>
                                                <code className="text-[10px] font-mono font-bold text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200">
                                                    {log.entity_id}
                                                </code>
                                            </div>
                                        )}
                                        <PayloadViewer payload={log.payload} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Show more */}
                {hasMore && (
                    <div className="px-6 py-5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Mostrando {paginated.length} de {filtered.length} eventos
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => p + 1)}
                            className="h-9 text-[10px] font-black uppercase tracking-widest rounded-xl border-slate-200 hover:border-indigo-400 hover:text-indigo-600 transition-all"
                        >
                            Mostrar mas
                        </Button>
                    </div>
                )}

                {/* End of list */}
                {!hasMore && filtered.length > 0 && (
                    <div className="px-6 py-4 bg-slate-50/40 border-t border-slate-100 text-center">
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                            Fin del registro — {filtered.length.toLocaleString('es-CO')} eventos
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
