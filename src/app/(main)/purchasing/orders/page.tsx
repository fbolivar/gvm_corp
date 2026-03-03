import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { purchaseOrderService } from '@/features/purchasing/services/purchaseOrderService';
import { POActionButtons } from '@/features/purchasing/components/POActionButtons';
import { PurchaseOrderWithDetails, POStatus } from '@/features/purchasing/types';
import { Button } from '@/shared/components/ui/button';
import {
    ClipboardList,
    Plus,
    ShoppingBag,
    Truck,
    Clock,
    DollarSign,
    PackageCheck,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Calendar,
    ShieldCheck,
    ArrowRight,
    Send,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/shared/lib/utils';

export const metadata = { title: 'Órdenes de Compra — GVM Corp' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCOP(amount: number) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateStr: string | null | undefined) {
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

// ─── Status badge ─────────────────────────────────────────────────────────────

interface StatusConfig {
    label: string;
    className: string;
    Icon: React.ComponentType<{ className?: string }>;
}

const STATUS_MAP: Record<POStatus, StatusConfig> = {
    DRAFT: {
        label: 'Borrador',
        className: 'bg-slate-100 text-slate-600 border-slate-200',
        Icon: Clock,
    },
    PENDING_APPROVAL: {
        label: 'Pend. Aprobación',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        Icon: Send,
    },
    APPROVED: {
        label: 'Aprobada',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
        Icon: CheckCircle2,
    },
    PARTIALLY_RECEIVED: {
        label: 'Parcial',
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        Icon: Truck,
    },
    RECEIVED: {
        label: 'Recibida',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Icon: PackageCheck,
    },
    CANCELLED: {
        label: 'Anulada',
        className: 'bg-rose-50 text-rose-700 border-rose-200',
        Icon: XCircle,
    },
};

function StatusBadge({ status }: { status: POStatus }) {
    const cfg = STATUS_MAP[status] ?? {
        label: status,
        className: 'bg-slate-100 text-slate-500 border-slate-200',
        Icon: AlertCircle,
    };
    const { Icon } = cfg;
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border',
                cfg.className
            )}
        >
            <Icon className="h-3 w-3" />
            {cfg.label}
        </span>
    );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
    label: string;
    value: string | number;
    Icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
}

function KpiCard({ label, value, Icon, iconBg, iconColor }: KpiCardProps) {
    return (
        <div className="relative bg-white rounded-[2.5rem] p-8 shadow-premium overflow-hidden group hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-start gap-5">
                <div className={cn('h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner', iconBg, iconColor)}>
                    <Icon className="h-7 w-7" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">
                        {label}
                    </p>
                    <p className="text-2xl font-black text-slate-900 tracking-tight leading-none truncate">
                        {value}
                    </p>
                </div>
            </div>
            <div className="absolute top-0 right-0 p-5 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <Icon className="h-14 w-14 text-slate-900" />
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PurchaseOrdersPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const defaultStats = { total: 0, pendingApproval: 0, inTransit: 0, totalCommitted: 0 };

    const [orders, stats] = await Promise.all([
        purchaseOrderService.getOrders(supabase).catch((): PurchaseOrderWithDetails[] => []),
        purchaseOrderService.getStats(supabase).catch(() => defaultStats),
    ]);

    const kpis: KpiCardProps[] = [
        {
            label: 'Total Órdenes',
            value: stats.total,
            Icon: ClipboardList,
            iconBg: 'bg-slate-100',
            iconColor: 'text-slate-700',
        },
        {
            label: 'Pendientes Aprobación',
            value: stats.pendingApproval,
            Icon: Clock,
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
        },
        {
            label: 'En Tránsito',
            value: stats.inTransit,
            Icon: Truck,
            iconBg: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
        },
        {
            label: 'Total Comprometido',
            value: formatCOP(stats.totalCommitted),
            Icon: DollarSign,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
        },
    ];

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <ShoppingBag className="h-32 w-32 text-white" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-8 bg-amber-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-amber-400">
                                Compras · Adquisiciones
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                            Órdenes de<br />
                            <span className="text-slate-500">Compra</span>
                        </h1>
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">
                            Gestión · Aprobación · Trazabilidad
                        </p>
                    </div>
                    <Button
                        asChild
                        className="h-14 px-10 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-active transition-all hover:scale-105 active:scale-95 border-none shrink-0"
                    >
                        <Link href="/purchasing/orders/new" className="flex items-center gap-3">
                            <Plus className="h-5 w-5" />
                            <span className="text-[10px] uppercase tracking-[0.2em]">Nueva OC</span>
                        </Link>
                    </Button>
                </div>
            </div>

            {/* ── KPI Cards ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {kpis.map((kpi, i) => (
                    <KpiCard key={i} {...kpi} />
                ))}
            </div>

            {/* ── Table Section ──────────────────────────────────────────────── */}
            <div className="space-y-6">
                <div className="flex items-center px-1 gap-3">
                    <div className="h-8 w-8 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-active">
                        <ClipboardList className="h-4 w-4" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                        Bitácora de Suministros
                    </h2>
                    {orders.length > 0 && (
                        <span className="h-6 min-w-6 px-2 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center">
                            {orders.length}
                        </span>
                    )}
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-premium overflow-hidden">
                    {orders.length === 0 ? (
                        /* Empty state */
                        <div className="py-32 flex flex-col items-center gap-6 text-center px-8">
                            <div className="h-24 w-24 bg-slate-50 rounded-[2rem] flex items-center justify-center shadow-inner text-slate-200">
                                <ShoppingBag className="h-12 w-12" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">
                                    Sin Órdenes
                                </p>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">
                                    No hay órdenes de compra registradas aún.
                                </p>
                            </div>
                            <Button
                                asChild
                                className="h-12 px-8 rounded-2xl bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white font-black text-[10px] uppercase tracking-widest transition-all"
                            >
                                <Link href="/purchasing/orders/new">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Crear primera OC
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full" role="table">
                                <thead>
                                    <tr className="border-b border-slate-50 bg-slate-50/60">
                                        <th scope="col" className="px-8 py-6 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_theme(colors.amber.500)]" />
                                                OC #
                                            </div>
                                        </th>
                                        <th scope="col" className="px-4 py-6 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                            Proveedor
                                        </th>
                                        <th scope="col" className="px-4 py-6 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                            Fecha
                                        </th>
                                        <th scope="col" className="px-4 py-6 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                            Estado
                                        </th>
                                        <th scope="col" className="px-4 py-6 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                            Total
                                        </th>
                                        <th scope="col" className="px-8 py-6 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {orders.map((order: PurchaseOrderWithDetails) => (
                                        <tr
                                            key={order.id}
                                            className="hover:bg-slate-50/60 transition-colors group/row"
                                        >
                                            {/* OC # */}
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-2xl bg-slate-950 flex items-center justify-center text-amber-400 group-hover/row:rotate-6 transition-transform duration-300 shadow-sm shrink-0">
                                                        <ClipboardList className="h-5 w-5" />
                                                    </div>
                                                    <span className="text-sm font-black text-slate-900 tracking-tight italic">
                                                        {order.po_number ?? '—'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Proveedor */}
                                            <td className="px-4 py-5 max-w-[220px]">
                                                <p className="text-sm font-black text-slate-800 truncate group-hover/row:text-amber-600 transition-colors">
                                                    {(order.supplier as { legal_name: string } | undefined)?.legal_name ?? 'Sin proveedor'}
                                                </p>
                                                {(order.supplier as { doc_number?: string } | undefined)?.doc_number && (
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                                                        NIT {(order.supplier as { doc_number: string }).doc_number}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Fecha */}
                                            <td className="px-4 py-5">
                                                <div className="flex items-center gap-2 text-slate-500">
                                                    <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                                                    <span className="text-[11px] font-black uppercase tracking-wider">
                                                        {formatDate(order.order_date)}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Estado */}
                                            <td className="px-4 py-5">
                                                <StatusBadge status={order.status} />
                                            </td>

                                            {/* Total */}
                                            <td className="px-4 py-5 text-right">
                                                <span className="text-lg font-black text-slate-900 font-mono tracking-tighter">
                                                    {formatCOP(Number(order.total) || 0)}
                                                </span>
                                            </td>

                                            {/* Acciones */}
                                            <td className="px-8 py-5">
                                                <POActionButtons
                                                    orderId={order.id!}
                                                    status={order.status}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Audit footer ───────────────────────────────────────────────── */}
            <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white flex flex-col lg:flex-row items-center justify-between gap-10 shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                    <PackageCheck className="h-24 w-24 text-white" />
                </div>
                <div className="flex items-center gap-8 relative z-10 flex-col lg:flex-row text-center lg:text-left">
                    <div className="h-16 w-16 bg-white/10 rounded-[1.5rem] flex items-center justify-center border border-white/10 shadow-inner rotate-12 group-hover:rotate-0 transition-transform duration-700 shrink-0">
                        <ShieldCheck className="h-8 w-8 text-amber-400" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-xl font-black tracking-tight uppercase text-white">
                            Validación de Carga
                        </h4>
                        <p className="text-sm text-white/40 font-medium max-w-xl leading-relaxed">
                            Cada orden de compra genera un compromiso de inventario y financiero.
                            El cierre debe ser validado físicamente en almacén antes de contabilizar.
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="h-12 bg-white/5 border-white/10 text-white text-[10px] font-black uppercase tracking-widest px-8 hover:bg-white hover:text-slate-900 transition-all rounded-2xl relative z-10 shrink-0"
                    asChild
                >
                    <Link href="/purchasing/bills">
                        Protocolo de Recepción
                        <ArrowRight className="ml-3 h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </div>
    );
}
