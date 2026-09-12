'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    Search,
    Filter,
    Calendar,
    ChevronRight,
    Users,
    Activity,
    Clock,
    AlertTriangle,
    Database,
    Download,
    X,
    Copy,
    Check,
    ArrowRight,
    Loader2,
    RefreshCw,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import type { AuditFilters, EnrichedAuditLog } from '@/features/settings/services/auditService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
    logs: EnrichedAuditLog[];
    totalCount: number;
    filteredCount: number;
    loadedCount: number;
    pageLimit: number;
    uniqueUsers: number;
    mostRecent: string | null;
    loadError: string | null;
    initialFilters: AuditFilters;
    actorName?: string | null;
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
            timeZone: 'America/Bogota',
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
            timeZone: 'America/Bogota',
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
// Action / entity badge config
// ---------------------------------------------------------------------------

const ACTION_CONFIG: Record<string, { label: string; className: string }> = {
    INSERT: { label: 'INSERTAR', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-black' },
    UPDATE: { label: 'ACTUALIZAR', className: 'bg-amber-50 text-amber-700 border border-amber-200 font-black' },
    DELETE: { label: 'ELIMINAR', className: 'bg-rose-50 text-rose-700 border border-rose-200 font-black' },
    SELECT: { label: 'CONSULTAR', className: 'bg-sky-50 text-sky-700 border border-sky-200 font-black' },
    LOGIN: { label: 'ACCESO', className: 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-black' },
    LOGOUT: { label: 'SALIDA', className: 'bg-slate-100 text-slate-600 border border-slate-200 font-black' },
};

function getActionConfig(action: string) {
    return (
        ACTION_CONFIG[action?.toUpperCase?.()] ?? {
            label: (action ?? 'OTRO').toUpperCase(),
            className: 'bg-slate-100 text-slate-600 border border-slate-200 font-black',
        }
    );
}

const ENTITY_COLORS: Record<string, string> = {
    documents: 'bg-violet-50 text-violet-700 border border-violet-200',
    document_lines: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200',
    products: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
    parties: 'bg-pink-50 text-pink-700 border border-pink-200',
    inventory_movements: 'bg-orange-50 text-orange-700 border border-orange-200',
    warehouse_transfers: 'bg-amber-50 text-amber-700 border border-amber-200',
    warehouse_transfer_lines: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    purchase_orders: 'bg-teal-50 text-teal-700 border border-teal-200',
    logistics_shipments: 'bg-lime-50 text-lime-700 border border-lime-200',
    employees: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    profiles: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    user_tenants: 'bg-blue-50 text-blue-700 border border-blue-200',
    tenants: 'bg-slate-100 text-slate-600 border border-slate-200',
    leads: 'bg-rose-50 text-rose-700 border border-rose-200',
    audit_log: 'bg-amber-50 text-amber-700 border border-amber-200',
};

function getEntityClass(entity: string) {
    return ENTITY_COLORS[entity?.toLowerCase?.()] ?? 'bg-slate-100 text-slate-600 border border-slate-200';
}

function formatEntityLabel(entity: string): string {
    return (entity ?? 'Desconocido').replace(/_/g, ' ').toUpperCase();
}

// Opciones base para los desplegables (se combinan con lo que aparezca cargado).
const BASE_ENTITY_OPTIONS = [
    'parties',
    'inventory_movements',
    'products',
    'document_lines',
    'documents',
    'warehouse_transfers',
    'warehouse_transfer_lines',
    'logistics_shipments',
    'employees',
    'profiles',
];
const BASE_ACTION_OPTIONS = ['INSERT', 'UPDATE', 'DELETE'];

// ---------------------------------------------------------------------------
// Payload diff helpers
// ---------------------------------------------------------------------------

type Rec = Record<string, unknown> | null;

function getRecords(payload: unknown): { oldRec: Rec; newRec: Rec } {
    if (payload && typeof payload === 'object') {
        const p = payload as Record<string, unknown>;
        if ('old' in p || 'new' in p) {
            return {
                oldRec: (p.old ?? null) as Rec,
                newRec: (p.new ?? null) as Rec,
            };
        }
        return { oldRec: null, newRec: p as Rec };
    }
    return { oldRec: null, newRec: null };
}

function displayValue(v: unknown): string {
    if (v === null || v === undefined || v === '') return '∅';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
}

interface DiffRow {
    key: string;
    before: unknown;
    after: unknown;
    changed: boolean;
}

function buildDiff(oldRec: Rec, newRec: Rec): DiffRow[] {
    const keys = new Set<string>([
        ...(oldRec ? Object.keys(oldRec) : []),
        ...(newRec ? Object.keys(newRec) : []),
    ]);
    const rows: DiffRow[] = [];
    keys.forEach((key) => {
        const before = oldRec ? oldRec[key] : undefined;
        const after = newRec ? newRec[key] : undefined;
        const changed = JSON.stringify(before) !== JSON.stringify(after);
        rows.push({ key, before, after, changed });
    });
    // Cambios primero, luego alfabético
    return rows.sort((a, b) => {
        if (a.changed !== b.changed) return a.changed ? -1 : 1;
        return a.key.localeCompare(b.key);
    });
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
// Copy button
// ---------------------------------------------------------------------------

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            type="button"
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                } catch {
                    /* noop */
                }
            }}
            className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
            aria-label="Copiar"
        >
            {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copiado' : 'Copiar'}
        </button>
    );
}

// ---------------------------------------------------------------------------
// Detail modal — visualización COMPLETA del evento
// ---------------------------------------------------------------------------

function DetailModal({ log, onClose }: { log: EnrichedAuditLog | null; onClose: () => void }) {
    const [showRaw, setShowRaw] = useState(false);

    useEffect(() => {
        setShowRaw(false);
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        if (log) {
            document.addEventListener('keydown', onKey);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [log, onClose]);

    if (!log) return null;

    const actionCfg = getActionConfig(log.action);
    const entityClass = getEntityClass(log.entity);
    const { oldRec, newRec } = getRecords(log.payload);
    const diff = buildDiff(oldRec, newRec);
    const isUpdate = !!oldRec && !!newRec;
    const changedCount = diff.filter((d) => d.changed).length;
    const rawJson = (() => {
        try {
            return JSON.stringify(log.payload, null, 2);
        } catch {
            return String(log.payload);
        }
    })();

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 bg-slate-50/70">
                    <div className="space-y-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-widest', actionCfg.className)}>
                                {actionCfg.label}
                            </span>
                            <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest', entityClass)}>
                                {formatEntityLabel(log.entity)}
                            </span>
                        </div>
                        <p className="text-sm font-black text-slate-800">
                            {formatDate(log.created_at)} — {formatTime(log.created_at)}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="shrink-0 h-9 w-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Meta grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 py-4 border-b border-slate-100">
                    <div className="space-y-1">
                        <span className={labelClass}>Usuario</span>
                        <p className="text-[12px] font-black text-slate-800">{log.actor_name}</p>
                        {log.actor_user_id && (
                            <div className="flex items-center gap-2">
                                <code className="text-[9px] font-mono text-slate-400 truncate">{log.actor_user_id}</code>
                                <CopyButton text={log.actor_user_id} />
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <span className={labelClass}>ID de Entidad</span>
                        {log.entity_id ? (
                            <div className="flex items-center gap-2">
                                <code className="text-[11px] font-mono font-bold text-slate-700 truncate">{log.entity_id}</code>
                                <CopyButton text={log.entity_id} />
                            </div>
                        ) : (
                            <p className="text-[11px] text-slate-300 italic">—</p>
                        )}
                    </div>
                </div>

                {/* Body — diff / record */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="h-1 w-4 bg-indigo-400 rounded-full" />
                            <span className={labelClass}>
                                {isUpdate
                                    ? `Cambios (${changedCount} campo${changedCount === 1 ? '' : 's'})`
                                    : newRec
                                        ? 'Registro creado'
                                        : oldRec
                                            ? 'Registro eliminado'
                                            : 'Detalle'}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowRaw((s) => !s)}
                            className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                            {showRaw ? 'Ver tabla' : 'Ver JSON'}
                        </button>
                    </div>

                    {!log.payload ? (
                        <p className="text-[11px] text-slate-400 italic py-6 text-center">Sin datos adicionales</p>
                    ) : showRaw ? (
                        <pre className="bg-slate-950 text-emerald-400 text-[10px] font-mono p-4 rounded-2xl overflow-x-auto leading-relaxed max-h-[45vh] overflow-y-auto whitespace-pre-wrap break-all">
                            {rawJson}
                        </pre>
                    ) : isUpdate ? (
                        // Vista diff: campo | antes | después
                        <div className="overflow-x-auto rounded-2xl border border-slate-100">
                            <table className="w-full text-[11px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="text-left px-3 py-2 font-black text-slate-400 uppercase tracking-widest text-[9px]">Campo</th>
                                        <th className="text-left px-3 py-2 font-black text-slate-400 uppercase tracking-widest text-[9px]">Antes</th>
                                        <th className="text-left px-3 py-2 font-black text-slate-400 uppercase tracking-widest text-[9px]">Después</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {diff.map((d) => (
                                        <tr key={d.key} className={cn(d.changed ? 'bg-amber-50/40' : 'opacity-60')}>
                                            <td className="px-3 py-2 font-mono font-bold text-slate-600 align-top whitespace-nowrap">
                                                {d.changed && <span className="text-amber-500 mr-1">●</span>}
                                                {d.key}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-rose-600 align-top break-all max-w-[220px]">
                                                {displayValue(d.before)}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-emerald-700 align-top break-all max-w-[220px]">
                                                <span className="inline-flex items-start gap-1">
                                                    {d.changed && <ArrowRight className="h-3 w-3 mt-0.5 text-slate-300 shrink-0" />}
                                                    <span>{displayValue(d.after)}</span>
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        // INSERT / DELETE: tabla de campos del registro
                        <div className="overflow-x-auto rounded-2xl border border-slate-100">
                            <table className="w-full text-[11px]">
                                <tbody className="divide-y divide-slate-50">
                                    {diff.map((d) => (
                                        <tr key={d.key} className="hover:bg-slate-50/60">
                                            <td className="px-3 py-2 font-mono font-bold text-slate-600 align-top whitespace-nowrap w-1/3">
                                                {d.key}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-slate-800 align-top break-all">
                                                {displayValue(newRec ? d.after : d.before)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end">
                    <CopyButton text={rawJson} />
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Client Component
// ---------------------------------------------------------------------------

const PAGE_SIZE = 50;

function buildQueryString(f: AuditFilters): string {
    const p = new URLSearchParams();
    if (f.q) p.set('q', f.q);
    if (f.entity) p.set('entity', f.entity);
    if (f.action) p.set('action', f.action);
    if (f.actor) p.set('actor', f.actor);
    if (f.from) p.set('from', f.from);
    if (f.to) p.set('to', f.to);
    return p.toString();
}

export default function AuditLogClient({
    logs,
    totalCount,
    filteredCount,
    loadedCount,
    pageLimit,
    uniqueUsers,
    mostRecent,
    loadError,
    initialFilters,
    actorName,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Estado local de los filtros (refleja la URL / lo aplicado en servidor).
    const [local, setLocal] = useState<AuditFilters>(initialFilters);
    const [pending, setPending] = useState(false);
    const [page, setPage] = useState(1);
    const [detail, setDetail] = useState<EnrichedAuditLog | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cuando llegan nuevos datos del servidor, reiniciar paginación y "pending".
    useEffect(() => {
        setPage(1);
        setPending(false);
    }, [logs]);

    // Sincronizar estado local si cambian los filtros aplicados (nav atrás, etc.)
    useEffect(() => {
        setLocal(initialFilters);
    }, [initialFilters]);

    const applyFilters = useCallback(
        (next: AuditFilters) => {
            const qs = buildQueryString(next);
            setPending(true);
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        },
        [router, pathname]
    );

    // Cambios inmediatos (selects, fechas)
    const setFilter = (patch: Partial<AuditFilters>) => {
        const next = { ...local, ...patch };
        setLocal(next);
        applyFilters(next);
    };

    // Búsqueda con debounce
    const onSearchChange = (value: string) => {
        const next = { ...local, q: value };
        setLocal(next);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => applyFilters(next), 400);
    };

    const clearFilters = () => {
        setLocal({});
        setPending(true);
        router.replace(pathname, { scroll: false });
    };

    const hasActiveFilters = !!(local.q || local.entity || local.action || local.actor || local.from || local.to);

    const entityOptions = useMemo(() => {
        const set = new Set<string>(BASE_ENTITY_OPTIONS);
        logs.forEach((l) => l.entity && set.add(l.entity));
        return Array.from(set).sort();
    }, [logs]);

    const actionOptions = useMemo(() => {
        const set = new Set<string>(BASE_ACTION_OPTIONS);
        logs.forEach((l) => l.action && set.add(l.action.toUpperCase()));
        return Array.from(set).sort();
    }, [logs]);

    const paginated = useMemo(() => logs.slice(0, page * PAGE_SIZE), [logs, page]);
    const hasMore = paginated.length < logs.length;

    // Link de exportación CSV — respeta EXACTAMENTE los filtros aplicados.
    const exportHref = useMemo(() => {
        const qs = buildQueryString(initialFilters);
        return qs ? `/api/audit/export?${qs}` : '/api/audit/export';
    }, [initialFilters]);

    const truncatedReport = filteredCount > loadedCount;

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    icon={Activity}
                    label="Total de Eventos"
                    value={totalCount.toLocaleString('es-CO')}
                    sub={`${filteredCount.toLocaleString('es-CO')} con filtros actuales`}
                    color="bg-indigo-50 text-indigo-600"
                />
                <StatCard
                    icon={Users}
                    label="Usuarios en Vista"
                    value={uniqueUsers}
                    sub="Usuarios distintos en lo cargado"
                    color="bg-emerald-50 text-emerald-600"
                />
                <StatCard
                    icon={Clock}
                    label="Evento Mas Reciente"
                    value={mounted && mostRecent ? formatRelative(mostRecent) : '—'}
                    sub={mounted && mostRecent ? `${formatDate(mostRecent)} ${formatTime(mostRecent)}` : 'Sin datos'}
                    color="bg-amber-50 text-amber-600"
                />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <span className={labelClass}>Filtros de Busqueda</span>
                        {pending && <Loader2 className="h-3.5 w-3.5 text-indigo-400 animate-spin" />}
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-colors"
                            >
                                Limpiar todo
                            </button>
                        )}
                    </div>

                    {/* Exportar CSV */}
                    <a
                        href={exportHref}
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Exportar CSV
                    </a>
                </div>

                {/* Chip de usuario filtrado (drill-down desde Actividad por Usuario) */}
                {local.actor && (
                    <div className="flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2 w-fit">
                        <Users className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                            Usuario: {actorName ?? local.actor.substring(0, 8)}
                        </span>
                        <button
                            onClick={() => setFilter({ actor: undefined })}
                            className="text-indigo-400 hover:text-indigo-700 transition-colors"
                            aria-label="Quitar filtro de usuario"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Search */}
                    <div className="relative lg:col-span-2">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                        <Input
                            value={local.q ?? ''}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Buscar por accion, entidad, ID de entidad o usuario..."
                            className="pl-9 h-10 text-[11px] font-bold border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-indigo-100 placeholder:text-slate-300"
                        />
                    </div>

                    {/* Entity filter */}
                    <div className="relative">
                        <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none z-10" />
                        <select
                            value={local.entity ?? ''}
                            onChange={(e) => setFilter({ entity: e.target.value || undefined })}
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
                            value={local.action ?? ''}
                            onChange={(e) => setFilter({ action: e.target.value || undefined })}
                            className="w-full h-10 pl-9 pr-4 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-xl appearance-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                        >
                            <option value="">Todas las Acciones</option>
                            {actionOptions.map((a) => (
                                <option key={a} value={a}>
                                    {getActionConfig(a).label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date From */}
                    <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none z-10" />
                        <input
                            type="date"
                            value={local.from ?? ''}
                            onChange={(e) => setFilter({ from: e.target.value || undefined })}
                            className="w-full h-10 pl-9 pr-3 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    {/* Date To */}
                    <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none z-10" />
                        <input
                            type="date"
                            value={local.to ?? ''}
                            onChange={(e) => setFilter({ to: e.target.value || undefined })}
                            className="w-full h-10 pl-9 pr-3 text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>

                    {/* Results counter */}
                    <div className="flex items-center gap-2 lg:col-span-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {filteredCount.toLocaleString('es-CO')} resultados
                            {hasActiveFilters && <span className="text-indigo-500"> (filtrado)</span>}
                        </span>
                    </div>
                </div>

                {/* Aviso de truncado en pantalla (el CSV sí trae todo) */}
                {truncatedReport && (
                    <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                            Mostrando los {pageLimit.toLocaleString('es-CO')} eventos más recientes de{' '}
                            {filteredCount.toLocaleString('es-CO')}. Afina los filtros o usa{' '}
                            <span className="font-black">Exportar CSV</span> para el reporte completo.
                        </p>
                    </div>
                )}
            </div>

            {/* Error de carga */}
            {loadError && (
                <div className="bg-white rounded-3xl border border-rose-200 shadow-sm p-6 flex flex-col items-center gap-3 text-center">
                    <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-rose-400" />
                    </div>
                    <div>
                        <p className="text-[12px] font-black text-slate-800">No se pudo cargar la auditoría</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-1 break-all max-w-md">{loadError}</p>
                    </div>
                    <button
                        onClick={() => router.refresh()}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                    >
                        <RefreshCw className="h-3.5 w-3.5" /> Reintentar
                    </button>
                </div>
            )}

            {/* Table */}
            {!loadError && (
                <div className={cn('bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-opacity', pending && 'opacity-60')}>
                    {/* Empty state */}
                    {logs.length === 0 && (
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

                    {/* Desktop table — scroll horizontal para NO recortar ninguna columna */}
                    {logs.length > 0 && (
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full min-w-[860px] text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className={cn(labelClass, 'px-6 py-4 mb-0')}>Fecha y Hora</th>
                                        <th className={cn(labelClass, 'px-4 py-4 mb-0')}>Usuario</th>
                                        <th className={cn(labelClass, 'px-4 py-4 mb-0')}>Accion</th>
                                        <th className={cn(labelClass, 'px-4 py-4 mb-0')}>Entidad</th>
                                        <th className={cn(labelClass, 'px-4 py-4 mb-0')}>ID de Entidad</th>
                                        <th className={cn(labelClass, 'px-6 py-4 mb-0 text-right')}>Detalle</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {paginated.map((log) => {
                                        const actionCfg = getActionConfig(log.action);
                                        const entityClass = getEntityClass(log.entity);
                                        const shortId = log.entity_id
                                            ? log.entity_id.length > 18
                                                ? `${log.entity_id.substring(0, 10)}…`
                                                : log.entity_id
                                            : '—';

                                        return (
                                            <tr
                                                key={log.id}
                                                className="group cursor-pointer hover:bg-slate-50/80 transition-colors"
                                                onClick={() => setDetail(log)}
                                                tabIndex={0}
                                                onKeyDown={(e) => e.key === 'Enter' && setDetail(log)}
                                                aria-label={`Ver detalle: ${log.action} en ${log.entity}`}
                                            >
                                                {/* Fecha y hora */}
                                                <td className="px-6 py-4 align-top whitespace-nowrap">
                                                    <p className="text-[11px] font-black text-slate-800 leading-none">{formatDate(log.created_at)}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{formatTime(log.created_at)}</p>
                                                </td>
                                                {/* Usuario — nombre completo, sin truncar */}
                                                <td className="px-4 py-4 align-top min-w-[170px]">
                                                    <p className="text-[11px] font-black text-slate-800 leading-snug">{log.actor_name}</p>
                                                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                                                        {log.actor_user_id ? `${log.actor_user_id.substring(0, 8)}…` : 'Sistema'}
                                                    </p>
                                                </td>
                                                {/* Acción */}
                                                <td className="px-4 py-4 align-top whitespace-nowrap">
                                                    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] uppercase tracking-widest', actionCfg.className)}>
                                                        {actionCfg.label}
                                                    </span>
                                                </td>
                                                {/* Entidad */}
                                                <td className="px-4 py-4 align-top whitespace-nowrap">
                                                    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest', entityClass)}>
                                                        {formatEntityLabel(log.entity)}
                                                    </span>
                                                </td>
                                                {/* ID de entidad */}
                                                <td className="px-4 py-4 align-top whitespace-nowrap">
                                                    <code className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                        {shortId}
                                                    </code>
                                                </td>
                                                {/* Detalle */}
                                                <td className="px-6 py-4 align-top text-right whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-500 group-hover:text-indigo-700 transition-colors">
                                                        Ver <ChevronRight className="h-3.5 w-3.5" />
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Mobile list */}
                    <div className="md:hidden divide-y divide-slate-50">
                        {paginated.map((log) => {
                            const actionCfg = getActionConfig(log.action);
                            const entityClass = getEntityClass(log.entity);
                            return (
                                <div
                                    key={log.id}
                                    className="flex items-start justify-between gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
                                    onClick={() => setDetail(log)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && setDetail(log)}
                                >
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-widest', actionCfg.className)}>
                                                {actionCfg.label}
                                            </span>
                                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest', entityClass)}>
                                                {formatEntityLabel(log.entity)}
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-black text-slate-800 leading-snug">{log.actor_name}</p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            {formatDate(log.created_at)} — {formatTime(log.created_at)}
                                        </p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0 mt-1" />
                                </div>
                            );
                        })}
                    </div>

                    {/* Show more */}
                    {hasMore && (
                        <div className="px-6 py-5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Mostrando {paginated.length} de {logs.length} cargados
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

                    {!hasMore && logs.length > 0 && (
                        <div className="px-6 py-4 bg-slate-50/40 border-t border-slate-100 text-center">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                Fin de lo cargado — {logs.length.toLocaleString('es-CO')} eventos
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Detail modal */}
            <DetailModal log={detail} onClose={() => setDetail(null)} />
        </div>
    );
}
