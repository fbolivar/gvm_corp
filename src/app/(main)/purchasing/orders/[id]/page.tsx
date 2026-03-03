import { createClient } from '@/lib/supabase/server';
import { purchaseOrderService } from '@/features/purchasing/services/purchaseOrderService';
import { POActionButtons } from '@/features/purchasing/components/POActionButtons';
import { POStatus } from '@/features/purchasing/types';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Building2,
    Warehouse,
    Calendar,
    CalendarClock,
    Package,
    ClipboardList,
    CheckCircle2,
    Clock,
    XCircle,
    FileText,
    User,
    Send,
    Truck,
    PackageCheck,
    AlertCircle,
    MessageSquare,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Detalle Orden de Compra — GVM Corp' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCOP(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(amount);
}

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

const STATUS_MAP: Record<POStatus, StatusConfig> = {
    DRAFT: {
        label: 'Borrador',
        badge: 'bg-slate-100 text-slate-600 border-slate-200',
        header: 'bg-slate-950',
        accent: 'bg-slate-500',
        accentText: 'text-slate-300',
        Icon: Clock,
    },
    PENDING_APPROVAL: {
        label: 'Pendiente Aprobación',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        header: 'bg-amber-950',
        accent: 'bg-amber-500',
        accentText: 'text-amber-300',
        Icon: Send,
    },
    APPROVED: {
        label: 'Aprobada',
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        header: 'bg-indigo-950',
        accent: 'bg-indigo-500',
        accentText: 'text-indigo-300',
        Icon: CheckCircle2,
    },
    PARTIALLY_RECEIVED: {
        label: 'Parcialmente Recibida',
        badge: 'bg-sky-50 text-sky-700 border-sky-200',
        header: 'bg-sky-950',
        accent: 'bg-sky-400',
        accentText: 'text-sky-300',
        Icon: Truck,
    },
    RECEIVED: {
        label: 'Recibida',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        header: 'bg-emerald-950',
        accent: 'bg-emerald-400',
        accentText: 'text-emerald-300',
        Icon: PackageCheck,
    },
    CANCELLED: {
        label: 'Anulada',
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        header: 'bg-rose-950',
        accent: 'bg-rose-500',
        accentText: 'text-rose-300',
        Icon: XCircle,
    },
};

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: POStatus }) {
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

// ─── Info Pill ─────────────────────────────────────────────────────────────────

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
                <p className={cn('text-[8px] font-black uppercase tracking-[0.3em] leading-none mb-0.5 opacity-70', accentText)}>
                    {label}
                </p>
                <p className="text-[11px] font-black text-white/90 leading-none">{value}</p>
            </div>
        </div>
    );
}

// ─── Financial Card ────────────────────────────────────────────────────────────

function FinancialCard({
    label,
    value,
    highlight = false,
}: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div
            className={cn(
                'rounded-[2rem] p-8 flex flex-col gap-3',
                highlight
                    ? 'bg-slate-950 text-white shadow-active'
                    : 'bg-white shadow-premium'
            )}
        >
            <p
                className={cn(
                    'text-[9px] font-black uppercase tracking-[0.35em] leading-none',
                    highlight ? 'text-white/40' : 'text-slate-400'
                )}
            >
                {label}
            </p>
            <p
                className={cn(
                    'font-black tracking-tighter leading-none font-mono',
                    highlight ? 'text-3xl text-white' : 'text-2xl text-slate-900'
                )}
            >
                {value}
            </p>
        </div>
    );
}

// ─── Metadata Row ──────────────────────────────────────────────────────────────

function MetaRow({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start gap-4 py-4 border-b border-slate-50 last:border-0">
            <div className="h-8 w-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-4 w-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 leading-none mb-1">
                    {label}
                </p>
                <p className="text-sm font-black text-slate-800 leading-snug break-words">{value}</p>
            </div>
        </div>
    );
}

// ─── Timeline Step ─────────────────────────────────────────────────────────────

const TIMELINE_STEPS: Array<{ key: POStatus; label: string }> = [
    { key: 'DRAFT', label: 'Borrador' },
    { key: 'PENDING_APPROVAL', label: 'Aprobación' },
    { key: 'APPROVED', label: 'Aprobada' },
    { key: 'PARTIALLY_RECEIVED', label: 'Recibiendo' },
    { key: 'RECEIVED', label: 'Recibida' },
];

const STEP_ORDER: Record<POStatus, number> = {
    DRAFT: 0,
    PENDING_APPROVAL: 1,
    APPROVED: 2,
    PARTIALLY_RECEIVED: 3,
    RECEIVED: 4,
    CANCELLED: -1,
};

function StatusTimeline({ status }: { status: POStatus }) {
    const isCancelled = status === 'CANCELLED';
    const currentIndex = STEP_ORDER[status] ?? 0;

    return (
        <div className="bg-white rounded-[2.5rem] shadow-premium p-8">
            <div className="flex items-center gap-3 mb-8">
                <div className="h-8 w-8 bg-slate-950 rounded-xl flex items-center justify-center shadow-active">
                    <ClipboardList className="h-4 w-4 text-amber-400" />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                    Flujo de la Orden
                </h3>
            </div>

            {isCancelled ? (
                <div className="flex items-center gap-4 bg-rose-50 border border-rose-100 rounded-2xl px-6 py-4">
                    <XCircle className="h-5 w-5 text-rose-500 shrink-0" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">
                            Orden Anulada
                        </p>
                        <p className="text-xs text-rose-500 font-medium mt-0.5">
                            Esta orden fue cancelada y no puede procesarse.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="relative flex items-center justify-between gap-2">
                    {/* Connector line */}
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-100 z-0 mx-8" />

                    {TIMELINE_STEPS.map((step, idx) => {
                        const isCompleted = idx < currentIndex;
                        const isCurrent = idx === currentIndex;
                        const isFuture = idx > currentIndex;

                        return (
                            <div
                                key={step.key}
                                className="relative z-10 flex flex-col items-center gap-2 flex-1"
                            >
                                <div
                                    className={cn(
                                        'h-10 w-10 rounded-2xl flex items-center justify-center border-2 transition-all',
                                        isCompleted
                                            ? 'bg-slate-900 border-slate-900 shadow-active'
                                            : isCurrent
                                                ? 'bg-amber-500 border-amber-500 shadow-active ring-4 ring-amber-100'
                                                : 'bg-white border-slate-200 shadow-sm'
                                    )}
                                >
                                    {isCompleted ? (
                                        <CheckCircle2 className="h-4 w-4 text-amber-400" />
                                    ) : isCurrent ? (
                                        <span className="h-3 w-3 rounded-full bg-white" />
                                    ) : (
                                        <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                                    )}
                                </div>
                                <p
                                    className={cn(
                                        'text-[8px] font-black uppercase tracking-widest text-center leading-snug max-w-[60px]',
                                        isCurrent
                                            ? 'text-amber-600'
                                            : isCompleted
                                                ? 'text-slate-700'
                                                : isFuture
                                                    ? 'text-slate-300'
                                                    : 'text-slate-400'
                                    )}
                                >
                                    {step.label}
                                </p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function PurchaseOrderDetailPage({
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

    let po;
    try {
        po = await purchaseOrderService.getOrderById(supabase, id);
    } catch {
        redirect('/purchasing/orders');
    }

    if (!po) redirect('/purchasing/orders');

    const cfg = STATUS_MAP[po.status] ?? STATUS_MAP.DRAFT;
    const supplierName =
        (po.supplier as { legal_name?: string } | undefined)?.legal_name ?? 'Sin proveedor';
    const supplierDoc =
        (po.supplier as { doc_number?: string } | undefined)?.doc_number;
    const warehouseName =
        (po.warehouse as { name?: string } | undefined)?.name ?? 'No asignada';
    const approverEmail =
        (po.approved_by_user as { email?: string } | undefined)?.email;

    const subtotal = Number(po.subtotal) || 0;
    const taxTotal = Number(po.tax_total) || 0;
    const total = Number(po.total) || 0;

    const lineCount = po.lines?.length ?? 0;
    const totalQty = po.lines?.reduce((s, l) => s + Number(l.qty), 0) ?? 0;
    const totalReceived = po.lines?.reduce((s, l) => s + Number(l.qty_received ?? 0), 0) ?? 0;

    return (
        <div className="page-container space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-6 duration-700">

            {/* ── Back nav ────────────────────────────────────────────────────── */}
            <div>
                <Link
                    href="/purchasing/orders"
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-2xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 font-black text-[10px] uppercase tracking-widest transition-all"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver a Órdenes
                </Link>
            </div>

            {/* ── Premium Dark Header ─────────────────────────────────────────── */}
            <div
                className={cn(
                    'relative group overflow-hidden rounded-[2.5rem] p-10 text-white shadow-active border border-white/5',
                    cfg.header
                )}
            >
                {/* Background watermark */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                    <ClipboardList className="h-64 w-64" />
                </div>

                <div className="relative z-10 flex flex-col xl:flex-row xl:items-end justify-between gap-8">
                    <div className="space-y-6">
                        {/* Eyebrow */}
                        <div className="flex items-center gap-3">
                            <div className={cn('h-1.5 w-8 rounded-full', cfg.accent)} />
                            <span
                                className={cn(
                                    'text-[10px] font-black uppercase tracking-[0.3em]',
                                    cfg.accentText
                                )}
                            >
                                Orden de Compra · Adquisiciones
                            </span>
                        </div>

                        {/* PO Number + Status */}
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-4">
                                <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                                    {po.po_number ?? '—'}
                                </h1>
                                <StatusBadge status={po.status} />
                            </div>
                            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">
                                Orden de suministro · Gestión de inventario
                            </p>
                        </div>

                        {/* Info pills */}
                        <div className="flex flex-wrap gap-3">
                            <InfoPill
                                icon={Building2}
                                label="Proveedor"
                                value={supplierName}
                                accentText={cfg.accentText}
                            />
                            <InfoPill
                                icon={Warehouse}
                                label="Bodega destino"
                                value={warehouseName}
                                accentText={cfg.accentText}
                            />
                            <InfoPill
                                icon={Calendar}
                                label="Fecha orden"
                                value={formatDate(po.order_date)}
                                accentText={cfg.accentText}
                            />
                            {po.expected_delivery && (
                                <InfoPill
                                    icon={CalendarClock}
                                    label="Entrega esperada"
                                    value={formatDate(po.expected_delivery)}
                                    accentText={cfg.accentText}
                                />
                            )}
                        </div>
                    </div>

                    {/* Right: stats + actions */}
                    <div className="flex flex-col items-start xl:items-end gap-6 shrink-0">
                        {/* Stats row */}
                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-3xl font-black text-white leading-none">{lineCount}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">
                                    Líneas
                                </p>
                            </div>
                            <div className="h-10 w-px bg-white/10" />
                            <div className="text-center">
                                <p className="text-3xl font-black text-white leading-none">{totalQty}</p>
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">
                                    Unidades
                                </p>
                            </div>
                            {totalReceived > 0 && (
                                <>
                                    <div className="h-10 w-px bg-white/10" />
                                    <div className="text-center">
                                        <p className={cn('text-3xl font-black leading-none', cfg.accentText)}>
                                            {totalReceived}
                                        </p>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-1">
                                            Recibidas
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Action buttons */}
                        <POActionButtons orderId={po.id!} status={po.status} />
                    </div>
                </div>
            </div>

            {/* ── Info Grid (4 cards) ─────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Proveedor */}
                <div className="bg-white rounded-[2.5rem] shadow-premium p-8 flex items-start gap-4 group hover:shadow-lg transition-shadow">
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-slate-900 transition-colors">
                        <Building2 className="h-5 w-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.35em] leading-none mb-2">
                            Proveedor
                        </p>
                        <p className="text-sm font-black text-slate-900 leading-snug truncate">{supplierName}</p>
                        {supplierDoc && (
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                NIT {supplierDoc}
                            </p>
                        )}
                    </div>
                </div>

                {/* Bodega */}
                <div className="bg-white rounded-[2.5rem] shadow-premium p-8 flex items-start gap-4 group hover:shadow-lg transition-shadow">
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-slate-900 transition-colors">
                        <Warehouse className="h-5 w-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.35em] leading-none mb-2">
                            Bodega destino
                        </p>
                        <p className="text-sm font-black text-slate-900 leading-snug">{warehouseName}</p>
                    </div>
                </div>

                {/* Fecha orden */}
                <div className="bg-white rounded-[2.5rem] shadow-premium p-8 flex items-start gap-4 group hover:shadow-lg transition-shadow">
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-slate-900 transition-colors">
                        <Calendar className="h-5 w-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.35em] leading-none mb-2">
                            Fecha orden
                        </p>
                        <p className="text-sm font-black text-slate-900 leading-snug">
                            {formatDate(po.order_date)}
                        </p>
                    </div>
                </div>

                {/* Entrega esperada */}
                <div className="bg-white rounded-[2.5rem] shadow-premium p-8 flex items-start gap-4 group hover:shadow-lg transition-shadow">
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-slate-900 transition-colors">
                        <CalendarClock className="h-5 w-5 text-slate-500 group-hover:text-amber-400 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.35em] leading-none mb-2">
                            Entrega esperada
                        </p>
                        <p className="text-sm font-black text-slate-900 leading-snug">
                            {po.expected_delivery ? formatDate(po.expected_delivery) : 'Sin especificar'}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Financial Summary ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <FinancialCard label="Subtotal" value={formatCOP(subtotal)} />
                <FinancialCard label="IVA" value={formatCOP(taxTotal)} />
                <FinancialCard label="Total orden" value={formatCOP(total)} highlight />
            </div>

            {/* ── Lines Table ─────────────────────────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 px-1">
                    <div className="h-8 w-8 bg-slate-950 rounded-xl flex items-center justify-center shadow-active">
                        <Package className="h-4 w-4 text-amber-400" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                        Líneas de la Orden
                    </h2>
                    <span className="h-6 min-w-6 px-2 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center">
                        {lineCount}
                    </span>
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-premium overflow-hidden">
                    {po.lines.length === 0 ? (
                        <div className="py-20 flex flex-col items-center gap-4 text-center px-8">
                            <div className="h-16 w-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center shadow-inner text-slate-200">
                                <Package className="h-8 w-8" />
                            </div>
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                                Sin líneas en esta orden
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full" role="table">
                                <thead>
                                    <tr className="border-b border-slate-50 bg-slate-50/60">
                                        <th scope="col" className="px-8 py-6 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] w-12">
                                            #
                                        </th>
                                        <th scope="col" className="px-4 py-6 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                            Producto
                                        </th>
                                        <th scope="col" className="px-4 py-6 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                            SKU
                                        </th>
                                        <th scope="col" className="px-4 py-6 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                            Cantidad
                                        </th>
                                        <th scope="col" className="px-4 py-6 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                            Recibido
                                        </th>
                                        <th scope="col" className="px-4 py-6 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                            Pendiente
                                        </th>
                                        <th scope="col" className="px-4 py-6 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                            Costo Unit.
                                        </th>
                                        <th scope="col" className="px-4 py-6 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                            IVA %
                                        </th>
                                        <th scope="col" className="px-8 py-6 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                            Subtotal
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {po.lines.map((line, idx) => {
                                        const qty = Number(line.qty);
                                        const received = Number(line.qty_received ?? 0);
                                        const pending = Math.max(0, qty - received);
                                        const unitCost = Number(line.unit_cost);
                                        const taxRate = Number(line.tax_rate ?? 0.19);
                                        const lineSubtotal = qty * unitCost * (1 + taxRate);
                                        const pct = qty > 0 ? Math.round((received / qty) * 100) : 0;
                                        const fullyReceived = received >= qty;

                                        return (
                                            <tr
                                                key={(line as { id?: string }).id ?? idx}
                                                className="hover:bg-slate-50/60 transition-colors group/row"
                                            >
                                                {/* # */}
                                                <td className="px-8 py-5">
                                                    <span className="h-7 w-7 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center group-hover/row:bg-slate-900 group-hover/row:text-amber-400 transition-colors">
                                                        {idx + 1}
                                                    </span>
                                                </td>

                                                {/* Producto */}
                                                <td className="px-4 py-5 max-w-[200px]">
                                                    <p className="text-sm font-black text-slate-900 leading-snug truncate">
                                                        {line.product?.name ?? 'Producto desconocido'}
                                                    </p>
                                                </td>

                                                {/* SKU */}
                                                <td className="px-4 py-5">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 rounded-lg px-2.5 py-1">
                                                        {line.product?.sku ?? '—'}
                                                    </span>
                                                </td>

                                                {/* Cantidad */}
                                                <td className="px-4 py-5 text-right">
                                                    <span className="text-sm font-black text-slate-900 font-mono">
                                                        {qty}
                                                    </span>
                                                </td>

                                                {/* Recibido */}
                                                <td className="px-4 py-5 text-right">
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span
                                                            className={cn(
                                                                'text-sm font-black font-mono',
                                                                fullyReceived
                                                                    ? 'text-emerald-600'
                                                                    : received > 0
                                                                        ? 'text-sky-600'
                                                                        : 'text-slate-400'
                                                            )}
                                                        >
                                                            {received}
                                                        </span>
                                                        {qty > 0 && (
                                                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={cn(
                                                                        'h-full rounded-full transition-all',
                                                                        fullyReceived
                                                                            ? 'bg-emerald-500'
                                                                            : 'bg-sky-400'
                                                                    )}
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Pendiente */}
                                                <td className="px-4 py-5 text-right">
                                                    <span
                                                        className={cn(
                                                            'text-sm font-black font-mono',
                                                            pending === 0 ? 'text-slate-300' : 'text-amber-600'
                                                        )}
                                                    >
                                                        {pending}
                                                    </span>
                                                </td>

                                                {/* Costo Unit. */}
                                                <td className="px-4 py-5 text-right">
                                                    <span className="text-sm font-black text-slate-700 font-mono tracking-tight">
                                                        {formatCOP(unitCost)}
                                                    </span>
                                                </td>

                                                {/* IVA % */}
                                                <td className="px-4 py-5 text-right">
                                                    <span className="text-[11px] font-black text-slate-500 bg-slate-50 rounded-lg px-2.5 py-1">
                                                        {Math.round(taxRate * 100)}%
                                                    </span>
                                                </td>

                                                {/* Subtotal línea */}
                                                <td className="px-8 py-5 text-right">
                                                    <span className="text-sm font-black text-slate-900 font-mono tracking-tight">
                                                        {formatCOP(lineSubtotal)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>

                                {/* Footer totals */}
                                <tfoot>
                                    <tr className="border-t-2 border-slate-100 bg-slate-50/60">
                                        <td colSpan={3} className="px-8 py-5">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                                Totales
                                            </span>
                                        </td>
                                        <td className="px-4 py-5 text-right">
                                            <span className="text-sm font-black text-slate-900 font-mono">
                                                {totalQty}
                                            </span>
                                        </td>
                                        <td className="px-4 py-5 text-right">
                                            <span className="text-sm font-black text-emerald-600 font-mono">
                                                {totalReceived}
                                            </span>
                                        </td>
                                        <td className="px-4 py-5 text-right">
                                            <span className="text-sm font-black text-amber-600 font-mono">
                                                {Math.max(0, totalQty - totalReceived)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-5" />
                                        <td className="px-4 py-5" />
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-base font-black text-slate-900 font-mono tracking-tight">
                                                {formatCOP(total)}
                                            </span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bottom row: Metadata + Timeline ────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Metadata card */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-premium p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-8 w-8 bg-slate-950 rounded-xl flex items-center justify-center shadow-active">
                            <FileText className="h-4 w-4 text-amber-400" />
                        </div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                            Metadatos
                        </h3>
                    </div>

                    <div className="divide-y divide-slate-50">
                        <MetaRow
                            icon={Calendar}
                            label="Creado el"
                            value={formatDateTime(po.created_at)}
                        />
                        {approverEmail && (
                            <MetaRow
                                icon={User}
                                label="Aprobado por"
                                value={approverEmail}
                            />
                        )}
                        {po.approved_at && (
                            <MetaRow
                                icon={CheckCircle2}
                                label="Aprobado el"
                                value={formatDateTime(po.approved_at)}
                            />
                        )}
                        {po.notes && (
                            <MetaRow
                                icon={MessageSquare}
                                label="Notas"
                                value={po.notes}
                            />
                        )}
                        {!approverEmail && !po.approved_at && !po.notes && (
                            <div className="py-6 text-center">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                    Sin metadatos adicionales
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Timeline */}
                <div className="lg:col-span-3">
                    <StatusTimeline status={po.status} />

                    {/* Quick note for actionable statuses */}
                    {(po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED') && (
                        <div className="mt-4 flex items-start gap-4 bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-4">
                            <PackageCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                    Lista para recibir mercancía
                                </p>
                                <p className="text-xs text-emerald-600 font-medium mt-0.5">
                                    Use el botón{' '}
                                    <span className="font-black">Recibir</span> para registrar
                                    la entrada de productos al inventario.
                                </p>
                            </div>
                        </div>
                    )}
                    {po.status === 'DRAFT' && (
                        <div className="mt-4 flex items-start gap-4 bg-amber-50 border border-amber-100 rounded-2xl px-6 py-4">
                            <Send className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                                    Borrador pendiente de envío
                                </p>
                                <p className="text-xs text-amber-600 font-medium mt-0.5">
                                    Envíe la orden a aprobación para continuar el flujo de compras.
                                </p>
                            </div>
                        </div>
                    )}
                    {po.status === 'PENDING_APPROVAL' && (
                        <div className="mt-4 flex items-start gap-4 bg-indigo-50 border border-indigo-100 rounded-2xl px-6 py-4">
                            <Clock className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                                    Esperando aprobación
                                </p>
                                <p className="text-xs text-indigo-600 font-medium mt-0.5">
                                    Un aprobador debe revisar y autorizar esta orden antes de proceder.
                                </p>
                            </div>
                        </div>
                    )}
                    {po.status === 'RECEIVED' && (
                        <div className="mt-4 flex items-start gap-4 bg-emerald-50 border border-emerald-100 rounded-2xl px-6 py-4">
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                    Recepción completada
                                </p>
                                <p className="text-xs text-emerald-600 font-medium mt-0.5">
                                    Todos los ítems han sido recibidos en bodega. El inventario fue actualizado.
                                </p>
                            </div>
                        </div>
                    )}
                    {po.status === 'CANCELLED' && (
                        <div className="mt-4 flex items-start gap-4 bg-rose-50 border border-rose-100 rounded-2xl px-6 py-4">
                            <XCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-rose-700">
                                    Orden cancelada
                                </p>
                                <p className="text-xs text-rose-600 font-medium mt-0.5">
                                    Esta orden fue anulada y no generará movimientos en el inventario.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
