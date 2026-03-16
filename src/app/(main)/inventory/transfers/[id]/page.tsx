import { createClient } from '@/lib/supabase/server';
import { transferService } from '@/features/warehouse-transfers/services/transferService';
import { TransferStatus, TransferWithDetails, TransferLine } from '@/features/warehouse-transfers/types';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    ArrowLeftRight,
    Warehouse,
    Calendar,
    Clock,
    Truck,
    PackageCheck,
    XCircle,
    AlertCircle,
    CheckCircle2,
    Send,
    FileText,
    Package,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { TransferDetailActions } from '@/features/warehouse-transfers/components/TransferDetailActions';
import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Detalle Traslado — GVM Corp' };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
}

function formatDateTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateStr;
    }
}

// ─── Status Config ─────────────────────────────────────────────────────────────

interface StatusConfig {
    label: string;
    badge: string;
    header: string;
    accent: string;
    accentText: string;
    Icon: React.ComponentType<{ className?: string }>;
}

const STATUS_MAP: Record<TransferStatus, StatusConfig> = {
    DRAFT: {
        label: 'Borrador',
        badge: 'bg-slate-100 text-slate-600 border-slate-200',
        header: 'bg-slate-950',
        accent: 'bg-slate-500',
        accentText: 'text-slate-300',
        Icon: Clock,
    },
    IN_TRANSIT: {
        label: 'En Tránsito',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        header: 'bg-amber-950',
        accent: 'bg-amber-500',
        accentText: 'text-amber-300',
        Icon: Truck,
    },
    RECEIVED: {
        label: 'Recibido',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        header: 'bg-emerald-950',
        accent: 'bg-emerald-400',
        accentText: 'text-emerald-300',
        Icon: PackageCheck,
    },
    CANCELLED: {
        label: 'Anulado',
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        header: 'bg-rose-950',
        accent: 'bg-rose-500',
        accentText: 'text-rose-300',
        Icon: XCircle,
    },
};

// ─── Components ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TransferStatus }) {
    const cfg = STATUS_MAP[status] ?? {
        label: status,
        badge: 'bg-slate-100 text-slate-500 border-slate-200',
        Icon: AlertCircle,
    };
    const { Icon } = cfg;
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border',
                cfg.badge
            )}
        >
            <Icon className="h-3 w-3" />
            {cfg.label}
        </span>
    );
}

function InfoPill({
    icon: Icon,
    label,
    value,
    accentText,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    accentText: string;
}) {
    return (
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
            <Icon className={cn('h-4 w-4 shrink-0', accentText)} />
            <div>
                <p
                    className={cn(
                        'text-[8px] font-black uppercase tracking-[0.3em] leading-none mb-0.5 opacity-70',
                        accentText
                    )}
                >
                    {label}
                </p>
                <p className="text-[11px] font-black text-white/90 leading-none">{value}</p>
            </div>
        </div>
    );
}

// ─── Timeline Step ─────────────────────────────────────────────────────────────

function TimelineStep({
    label,
    done,
    active,
    Icon,
}: {
    label: string;
    done: boolean;
    active: boolean;
    Icon: React.ComponentType<{ className?: string }>;
}) {
    return (
        <div className="flex flex-col items-center gap-2">
            <div
                className={cn(
                    'h-9 w-9 rounded-xl flex items-center justify-center transition-all',
                    done
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : active
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                        : 'bg-slate-100 text-slate-300'
                )}
            >
                <Icon className="h-4 w-4" />
            </div>
            <span
                className={cn(
                    'text-[9px] font-black uppercase tracking-widest',
                    done ? 'text-emerald-600' : active ? 'text-amber-600' : 'text-slate-300'
                )}
            >
                {label}
            </span>
        </div>
    );
}

function TimelineConnector({ done }: { done: boolean }) {
    return (
        <div
            className={cn(
                'flex-1 h-0.5 self-start mt-[18px] mx-1 rounded-full transition-all',
                done ? 'bg-emerald-400' : 'bg-slate-100'
            )}
        />
    );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function TransferDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    let transfer: TransferWithDetails;
    try {
        transfer = await transferService.getTransferById(supabase, id);
    } catch {
        redirect('/inventory/transfers');
    }

    const status = transfer.status as TransferStatus;
    const cfg = STATUS_MAP[status] ?? STATUS_MAP.DRAFT;

    const fromName =
        (transfer.from_warehouse as { name?: string } | undefined)?.name ?? '—';
    const toName =
        (transfer.to_warehouse as { name?: string } | undefined)?.name ?? '—';

    // Timeline state
    const isDraft = status === 'DRAFT';
    const isInTransit = status === 'IN_TRANSIT';
    const isReceived = status === 'RECEIVED';
    const isCancelled = status === 'CANCELLED';

    const totalLines = transfer.lines.length;
    const totalQty = transfer.lines.reduce((s, l) => s + Number(l.qty), 0);
    const receivedQty = transfer.lines.reduce(
        (s, l) => s + Number(l.qty_received ?? 0),
        0
    );

    return (
        <div className="page-container space-y-8 pb-24 animate-in fade-in slide-in-from-bottom-6 duration-700">

            {/* ── Back nav ────────────────────────────────────────────────── */}
            <div>
                <Button
                    variant="ghost"
                    asChild
                    className="h-10 px-4 rounded-2xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 font-black text-[10px] uppercase tracking-widest gap-2 transition-all"
                >
                    <Link href="/inventory/transfers">
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Volver a Traslados
                    </Link>
                </Button>
            </div>

            {/* ── Hero Header ─────────────────────────────────────────────── */}
            <div
                className={cn(
                    'relative group overflow-hidden rounded-[2.5rem] p-10 text-white shadow-active border border-white/5',
                    cfg.header
                )}
            >
                {/* Watermark */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                    <ArrowLeftRight className="h-80 w-80" />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
                    <div className="space-y-5">
                        {/* Eyebrow */}
                        <div className="flex items-center gap-3">
                            <div className={cn('h-1.5 w-8 rounded-full', cfg.accent)} />
                            <span
                                className={cn(
                                    'text-[10px] font-black uppercase tracking-[0.3em]',
                                    cfg.accentText
                                )}
                            >
                                Traslado de Bodega
                            </span>
                        </div>

                        {/* Title + badge */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-4 flex-wrap">
                                <h1 className="text-3xl font-black tracking-tight uppercase leading-tight">
                                    {transfer.transfer_number ?? '—'}
                                </h1>
                                <StatusBadge status={status} />
                            </div>
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">
                                {fromName} &rarr; {toName}
                            </p>
                        </div>

                        {/* Info pills */}
                        <div className="flex flex-wrap gap-3">
                            <InfoPill
                                icon={Warehouse}
                                label="Bodega Origen"
                                value={fromName}
                                accentText={cfg.accentText}
                            />
                            <InfoPill
                                icon={Warehouse}
                                label="Bodega Destino"
                                value={toName}
                                accentText={cfg.accentText}
                            />
                            <InfoPill
                                icon={Calendar}
                                label="Fecha Creación"
                                value={formatDate(transfer.created_at)}
                                accentText={cfg.accentText}
                            />
                            {transfer.transferred_at && (
                                <InfoPill
                                    icon={Send}
                                    label="Enviado"
                                    value={formatDate(transfer.transferred_at)}
                                    accentText={cfg.accentText}
                                />
                            )}
                            {transfer.received_at && (
                                <InfoPill
                                    icon={PackageCheck}
                                    label="Recibido"
                                    value={formatDate(transfer.received_at)}
                                    accentText={cfg.accentText}
                                />
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 shrink-0">
                        <div className="text-center">
                            <p className="text-3xl font-black text-white leading-none">{totalLines}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">
                                Líneas
                            </p>
                        </div>
                        <div className="h-10 w-px bg-white/10" />
                        <div className="text-center">
                            <p
                                className={cn(
                                    'text-3xl font-black leading-none',
                                    cfg.accentText
                                )}
                            >
                                {totalQty.toLocaleString('es-CO')}
                            </p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">
                                Unidades
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Status Timeline ──────────────────────────────────────────── */}
            {!isCancelled && (
                <Card className="rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <CardContent className="p-8">
                        <div className="flex items-start gap-0">
                            <TimelineStep
                                label="Borrador"
                                done={!isDraft}
                                active={isDraft}
                                Icon={FileText}
                            />
                            <TimelineConnector done={!isDraft} />
                            <TimelineStep
                                label="En Tránsito"
                                done={isReceived}
                                active={isInTransit}
                                Icon={Truck}
                            />
                            <TimelineConnector done={isReceived} />
                            <TimelineStep
                                label="Recibido"
                                done={isReceived}
                                active={false}
                                Icon={CheckCircle2}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Cancelled alert ──────────────────────────────────────────── */}
            {isCancelled && (
                <div className="flex items-start gap-4 bg-rose-50 border border-rose-100 rounded-2xl px-6 py-4">
                    <XCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">
                            Traslado Anulado
                        </p>
                        <p className="text-xs text-rose-500 font-medium mt-0.5">
                            Este traslado fue cancelado y no puede modificarse.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Lines Table ──────────────────────────────────────────────── */}
            <Card className="rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-3">
                    <Package className="h-4 w-4 text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Artículos del Traslado ({transfer.lines.length})
                    </span>
                </div>
                <CardContent className="p-0">
                    {transfer.lines.length === 0 ? (
                        <div className="py-12 text-center">
                            <Package className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-xs text-slate-400">Sin artículos registrados</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full" role="table">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/60">
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                                        >
                                            Producto
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                                        >
                                            SKU
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                                        >
                                            Qty
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                                        >
                                            Recibido
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-6 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                                        >
                                            Pendiente
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {transfer.lines.map(
                                        (
                                            line: TransferLine & {
                                                id?: string;
                                                product?: { name: string; sku: string };
                                            }
                                        ) => {
                                            const qty = Number(line.qty);
                                            const received = Number(line.qty_received ?? 0);
                                            const pending = Math.max(0, qty - received);
                                            const pct = qty > 0 ? Math.min(100, (received / qty) * 100) : 0;

                                            return (
                                                <tr
                                                    key={line.id ?? line.product_id}
                                                    className="hover:bg-slate-50/50 transition-colors"
                                                >
                                                    {/* Product name */}
                                                    <td className="px-6 py-4 max-w-[220px]">
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-900 leading-snug truncate">
                                                                {line.product?.name ?? 'Producto desconocido'}
                                                            </p>
                                                            {/* Progress bar */}
                                                            {isInTransit || isReceived ? (
                                                                <div className="mt-1.5 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={cn(
                                                                            'h-full rounded-full transition-all',
                                                                            pct >= 100
                                                                                ? 'bg-emerald-500'
                                                                                : 'bg-amber-400'
                                                                        )}
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </td>

                                                    {/* SKU */}
                                                    <td className="px-4 py-4">
                                                        <span className="text-[10px] font-mono text-slate-400">
                                                            {line.product?.sku ?? '—'}
                                                        </span>
                                                    </td>

                                                    {/* Qty ordered */}
                                                    <td className="px-4 py-4 text-right">
                                                        <span className="text-sm font-bold text-slate-900 tabular-nums font-mono">
                                                            {qty.toLocaleString('es-CO')}
                                                        </span>
                                                    </td>

                                                    {/* Qty received */}
                                                    <td className="px-4 py-4 text-right">
                                                        <span
                                                            className={cn(
                                                                'text-sm font-bold tabular-nums font-mono',
                                                                received >= qty
                                                                    ? 'text-emerald-600'
                                                                    : received > 0
                                                                    ? 'text-amber-600'
                                                                    : 'text-slate-300'
                                                            )}
                                                        >
                                                            {received.toLocaleString('es-CO')}
                                                        </span>
                                                    </td>

                                                    {/* Pending */}
                                                    <td className="px-6 py-4 text-right">
                                                        <span
                                                            className={cn(
                                                                'text-sm font-bold tabular-nums font-mono',
                                                                pending === 0
                                                                    ? 'text-slate-300'
                                                                    : 'text-rose-500'
                                                            )}
                                                        >
                                                            {pending.toLocaleString('es-CO')}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    )}
                                </tbody>
                                {/* Totals footer */}
                                <tfoot>
                                    <tr className="border-t border-slate-100 bg-slate-50/60">
                                        <td
                                            colSpan={2}
                                            className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider"
                                        >
                                            Totales
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-black text-slate-900 tabular-nums font-mono">
                                            {totalQty.toLocaleString('es-CO')}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-black text-emerald-600 tabular-nums font-mono">
                                            {receivedQty.toLocaleString('es-CO')}
                                        </td>
                                        <td className="px-6 py-3 text-right text-sm font-black text-rose-500 tabular-nums font-mono">
                                            {Math.max(0, totalQty - receivedQty).toLocaleString('es-CO')}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Metadata Card ────────────────────────────────────────────── */}
            <Card className="rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-3">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Información del Traslado
                    </span>
                </div>
                <CardContent className="p-6">
                    <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <MetaField label="Número de Traslado" value={transfer.transfer_number ?? '—'} mono />
                        <MetaField label="Estado" value={STATUS_MAP[status]?.label ?? status} />
                        <MetaField label="Bodega Origen" value={fromName} />
                        <MetaField label="Bodega Destino" value={toName} />
                        <MetaField label="Fecha de Creación" value={formatDateTime(transfer.created_at)} />
                        <MetaField
                            label="Fecha de Envío"
                            value={formatDateTime(transfer.transferred_at)}
                        />
                        <MetaField
                            label="Fecha de Recepción"
                            value={formatDateTime(transfer.received_at)}
                        />
                        {transfer.notes && (
                            <div className="sm:col-span-2 lg:col-span-3">
                                <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                    Observaciones
                                </dt>
                                <dd className="text-sm text-slate-700 font-medium leading-relaxed">
                                    {transfer.notes}
                                </dd>
                            </div>
                        )}
                    </dl>
                </CardContent>
            </Card>

            {/* ── Action Buttons ───────────────────────────────────────────── */}
            <TransferDetailActions transfer={transfer} />
        </div>
    );
}

// ─── MetaField helper ─────────────────────────────────────────────────────────

function MetaField({
    label,
    value,
    mono = false,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div>
            <dt className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                {label}
            </dt>
            <dd
                className={cn(
                    'text-sm font-bold text-slate-900',
                    mono && 'font-mono tracking-tight'
                )}
            >
                {value}
            </dd>
        </div>
    );
}
