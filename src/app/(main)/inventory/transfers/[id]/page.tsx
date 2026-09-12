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
    Pencil,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { TransferDetailActions } from '@/features/warehouse-transfers/components/TransferDetailActions';
import { formatLocalDate } from '@/shared/lib/dateFmt';
import { TransferQuickNav, type TransferNavSibling } from '@/features/warehouse-transfers/components/TransferQuickNav';
import { PrintWarehouseEntryButton } from '@/features/warehouse-transfers/components/PrintWarehouseEntryButton';
import { TransferPdfButton } from '@/features/warehouse-transfers/components/TransferPdfButton';
import { settingsService } from '@/features/settings/services/settingsService';
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
            timeZone: 'America/Bogota',
        });
    } catch {
        return dateStr;
    }
}

function formatDateTime(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try {
        return new Date(dateStr).toLocaleString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Bogota',
        });
    } catch {
        return dateStr;
    }
}

// IVA del producto según su categoría (IVA_0 / IVA_5 / IVA_19 → 0 / 5 / 19)
function ivaRateFromCategory(cat: string | null | undefined): number {
    if (!cat) return 0;
    const m = /(\d+)/.exec(cat);
    return m ? Number(m[1]) : 0;
}

function fmtMoney(value: number): string {
    return `$${Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
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

    const tenant = await settingsService.getTenantInfo(supabase);
    const company = {
        name: tenant?.name ?? 'GVM S.A.S',
        nit: tenant?.nit, dv: tenant?.dv,
        address: tenant?.address, city: tenant?.city, department: tenant?.department,
        phone: tenant?.phone, email: tenant?.email, logo_url: tenant?.logo_url,
    };

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

    // Renglones recibidos (lote a lote), del más reciente al más antiguo.
    const receipts = [...(transfer.receipts ?? [])].sort(
        (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime(),
    );

    const totalLines = transfer.lines.length;
    const totalQty = transfer.lines.reduce((s, l) => s + Number(l.qty), 0);
    const receivedQty = transfer.lines.reduce(
        (s, l) => s + Number(l.qty_received ?? 0),
        0
    );

    // ── Costo e IVA por línea (segregado según la categoría de IVA del producto) ──
    const costTotal = transfer.lines.reduce((s, l) => {
        const prod = (l as { product?: { cost?: number } }).product;
        return s + (Number(prod?.cost ?? 0) * Number(l.qty));
    }, 0);
    const ivaTotal = transfer.lines.reduce((s, l) => {
        const prod = (l as { product?: { cost?: number; tax_category?: string } }).product;
        const base = Number(prod?.cost ?? 0) * Number(l.qty);
        return s + base * (ivaRateFromCategory(prod?.tax_category) / 100);
    }, 0);

    // ── Trazabilidad: quién creó / envió / recibió ────────────────────────────
    const t = transfer as TransferWithDetails & {
        created_by?: string | null;
        transferred_by?: string | null;
        received_by?: string | null;
    };
    const traceIds = [t.created_by, t.transferred_by, t.received_by].filter(Boolean) as string[];
    const userNames: Record<string, string> = {};
    if (traceIds.length > 0) {
        const { data: profs } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', traceIds);
        profs?.forEach((p: { id: string; full_name: string | null; email: string | null }) => {
            userNames[p.id] = p.full_name || p.email || '—';
        });
    }
    const createdByName = t.created_by ? (userNames[t.created_by] ?? '—') : '—';
    const sentByName = t.transferred_by ? (userNames[t.transferred_by] ?? '—') : '—';
    const receivedByName = t.received_by ? (userNames[t.received_by] ?? '—') : '—';

    // ── Hermanos para navegación anterior/siguiente ───────────────────────────
    const { data: siblingRows } = await supabase
        .from('warehouse_transfers')
        .select('id, transfer_number, from_warehouse:warehouses!from_warehouse_id(name), to_warehouse:warehouses!to_warehouse_id(name)')
        .order('transfer_number', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(500);
    const siblings: TransferNavSibling[] = (siblingRows ?? []).map((r) => {
        const fw = (r as { from_warehouse?: { name?: string } | { name?: string }[] | null }).from_warehouse;
        const tw = (r as { to_warehouse?: { name?: string } | { name?: string }[] | null }).to_warehouse;
        const fn = (Array.isArray(fw) ? fw[0]?.name : fw?.name) ?? '—';
        const tn = (Array.isArray(tw) ? tw[0]?.name : tw?.name) ?? '—';
        return { id: r.id as string, number: (r.transfer_number as string) ?? null, route: `${fn} → ${tn}` };
    });

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

            {/* ── Navegación anterior/siguiente ────────────────────────────── */}
            {siblings.length > 1 && (
                <TransferQuickNav currentId={transfer.id!} siblings={siblings} />
            )}

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
                                            Costo Unit.
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-4 py-3 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                                        >
                                            IVA
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                                        >
                                            Valor IVA
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                                        >
                                            Qty
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-4 py-3 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                                        >
                                            % Part.
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                                        >
                                            Recibido
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-4 py-3 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                                        >
                                            % Recib.
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
                                                product?: { name: string; sku: string; tax_category?: string | null; cost?: number | null };
                                            }
                                        ) => {
                                            const qty = Number(line.qty);
                                            const received = Number(line.qty_received ?? 0);
                                            const pending = Math.max(0, qty - received);
                                            const pct = qty > 0 ? Math.min(100, (received / qty) * 100) : 0;
                                            const partPct = totalQty > 0 ? (qty / totalQty) * 100 : 0;
                                            const unitCost = Number(line.product?.cost ?? 0);
                                            const ivaRate = ivaRateFromCategory(line.product?.tax_category);
                                            const ivaAmount = unitCost * qty * (ivaRate / 100);

                                            return (
                                                <tr
                                                    key={line.id ?? line.product_id}
                                                    className="hover:bg-slate-50/50 transition-colors"
                                                >
                                                    {/* Product name */}
                                                    <td className="px-6 py-4 max-w-[220px]">
                                                        <div>
                                                            <p className="text-xs font-bold text-slate-900 leading-snug truncate">
                                                                {line.product?.name ?? line.description ?? 'Producto desconocido'}
                                                            </p>
                                                            {!line.product?.name && line.description && (
                                                                <span className="inline-block mt-0.5 text-[8px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                                                    Solicitud · sin producto
                                                                </span>
                                                            )}
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

                                                    {/* Costo unitario */}
                                                    <td className="px-4 py-4 text-right">
                                                        <span className="text-xs text-slate-600 tabular-nums font-mono">
                                                            {line.product ? fmtMoney(unitCost) : '—'}
                                                        </span>
                                                    </td>

                                                    {/* IVA % */}
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                                                            {line.product ? `${ivaRate}%` : '—'}
                                                        </span>
                                                    </td>

                                                    {/* Valor IVA */}
                                                    <td className="px-4 py-4 text-right">
                                                        <span className={cn(
                                                            'text-xs tabular-nums font-mono',
                                                            ivaAmount > 0 ? 'text-slate-900 font-semibold' : 'text-slate-300'
                                                        )}>
                                                            {line.product ? fmtMoney(ivaAmount) : '—'}
                                                        </span>
                                                    </td>

                                                    {/* Qty ordered */}
                                                    <td className="px-4 py-4 text-right">
                                                        <span className="text-sm font-bold text-slate-900 tabular-nums font-mono">
                                                            {qty.toLocaleString('es-CO')}
                                                        </span>
                                                    </td>

                                                    {/* % Participación */}
                                                    <td className="px-4 py-4 text-center">
                                                        <span className="text-xs font-black text-indigo-600 tabular-nums">
                                                            {partPct.toFixed(1)}%
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

                                                    {/* % Recibido */}
                                                    <td className="px-4 py-4 text-center">
                                                        <span
                                                            className={cn(
                                                                'text-xs font-black tabular-nums',
                                                                pct >= 100 ? 'text-emerald-600' : pct > 0 ? 'text-amber-600' : 'text-slate-300'
                                                            )}
                                                        >
                                                            {pct.toFixed(0)}%
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
                                        <td className="px-4 py-3 text-right text-xs font-black text-slate-900 tabular-nums font-mono">
                                            {fmtMoney(costTotal)}
                                        </td>
                                        <td className="px-4 py-3"></td>
                                        <td className="px-4 py-3 text-right text-xs font-black text-slate-900 tabular-nums font-mono">
                                            {fmtMoney(ivaTotal)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-black text-slate-900 tabular-nums font-mono">
                                            {totalQty.toLocaleString('es-CO')}
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs font-black text-indigo-600 tabular-nums">
                                            100%
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-black text-emerald-600 tabular-nums font-mono">
                                            {receivedQty.toLocaleString('es-CO')}
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs font-black text-emerald-600 tabular-nums">
                                            {(totalQty > 0 ? (receivedQty / totalQty) * 100 : 0).toFixed(0)}%
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

            {/* ── Detalle de lo recibido (lote por lote) ────────────────────── */}
            {receipts.length > 0 && (
                <Card className="rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-3">
                        <PackageCheck className="h-4 w-4 text-emerald-500" />
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Mercancía recibida ({receipts.length} renglón{receipts.length === 1 ? '' : 'es'})
                        </span>
                    </div>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[680px]">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/60">
                                        {['Código', 'Referencia', 'Lote', 'Vence', 'Cantidad', 'Recibido por', 'Fecha'].map(h => (
                                            <th
                                                key={h}
                                                className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider whitespace-nowrap"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {receipts.map(r => {
                                        const line = transfer.lines.find(l => l.id === r.transfer_line_id);
                                        return (
                                            <tr key={r.id} className="border-b border-slate-50 last:border-0">
                                                <td className="px-4 py-3 text-[11px] font-mono font-bold text-slate-500">
                                                    {line?.product?.sku ?? '—'}
                                                </td>
                                                <td className="px-4 py-3 text-xs font-bold text-slate-900">
                                                    {line?.product?.name ?? line?.description ?? 'Producto'}
                                                </td>
                                                <td className="px-4 py-3 text-xs font-mono font-bold text-indigo-600">
                                                    {r.lot_number ?? 'Sin lote'}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-600 tabular-nums">
                                                    {formatLocalDate(r.expiration_date)}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-black text-emerald-600 tabular-nums font-mono">
                                                    {Number(r.qty).toLocaleString('es-CO')}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-600">
                                                    {r.receiver?.full_name ?? '—'}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
                                                    {formatDate(r.received_at)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

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
                        <MetaField label="Solicitado / Creado por" value={createdByName} />
                        <MetaField label="Bodega Origen" value={fromName} />
                        <MetaField label="Bodega Destino" value={toName} />
                        <MetaField label="Fecha de Creación" value={formatDateTime(transfer.created_at)} />
                        <MetaField label="Enviado por" value={sentByName} />
                        <MetaField label="Recibido por" value={receivedByName} />
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
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <TransferPdfButton transfer={transfer} company={company} />
                    <PrintWarehouseEntryButton transferId={transfer.id!} />
                    {isDraft && (
                        <Button
                            asChild
                            variant="outline"
                            className="h-11 px-5 rounded-2xl border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-black text-[10px] uppercase tracking-widest gap-2 transition-all"
                        >
                            <Link href={`/inventory/transfers/${transfer.id}/edit`}>
                                <Pencil className="h-3.5 w-3.5" />
                                Editar Borrador
                            </Link>
                        </Button>
                    )}
                </div>
                <TransferDetailActions transfer={transfer} />
            </div>
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
