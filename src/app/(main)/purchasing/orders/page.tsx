import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { purchaseOrderService } from '@/features/purchasing/services/purchaseOrderService';
import { POActionButtons } from '@/features/purchasing/components/POActionButtons';
import { PurchaseOrderWithDetails, POStatus } from '@/features/purchasing/types';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
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
    Send,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/shared/lib/utils';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';

export const metadata = { title: 'Ordenes de Compra — GVM Corp' };

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

const STATUS_MAP: Record<POStatus, { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }> = {
    DRAFT: { label: 'Borrador', className: 'bg-slate-50 text-slate-500', Icon: Clock },
    PENDING_APPROVAL: { label: 'Pend. Aprobacion', className: 'bg-amber-50 text-amber-600', Icon: Send },
    APPROVED: { label: 'Aprobada', className: 'bg-blue-50 text-blue-600', Icon: CheckCircle2 },
    PARTIALLY_RECEIVED: { label: 'Parcial', className: 'bg-indigo-50 text-indigo-600', Icon: Truck },
    RECEIVED: { label: 'Recibida', className: 'bg-emerald-50 text-emerald-600', Icon: PackageCheck },
    CANCELLED: { label: 'Anulada', className: 'bg-rose-50 text-rose-600', Icon: XCircle },
};

function StatusBadge({ status }: { status: POStatus }) {
    const cfg = STATUS_MAP[status] ?? { label: status, className: 'bg-slate-50 text-slate-500', Icon: AlertCircle };
    const { Icon } = cfg;
    return (
        <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold', cfg.className)}>
            <Icon className="h-3 w-3" />
            {cfg.label}
        </span>
    );
}

export default async function PurchaseOrdersPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const defaultStats = { total: 0, pendingApproval: 0, inTransit: 0, totalCommitted: 0 };

    const [orders, stats, tenant] = await Promise.all([
        purchaseOrderService.getOrders(supabase).catch((): PurchaseOrderWithDetails[] => []),
        purchaseOrderService.getStats(supabase).catch(() => defaultStats),
        settingsService.getTenantInfo(supabase),
    ]);

    const kpis = [
        { label: 'Total Ordenes', value: stats.total, icon: ClipboardList, color: 'text-slate-600', bg: 'bg-slate-100' },
        { label: 'Pend. Aprobacion', value: stats.pendingApproval, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'En Transito', value: stats.inTransit, icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Total Comprometido', value: formatCOP(stats.totalCommitted), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <VisualReportHeader
                    title="Ordenes de Compra"
                    subtitle="Gestion, aprobacion y trazabilidad de adquisiciones"
                    tenant={tenant}
                />
                <Button asChild className="h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs gap-2">
                    <Link href="/purchasing/orders/new">
                        <Plus className="h-3.5 w-3.5" /> Nueva OC
                    </Link>
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", kpi.bg, kpi.color)}>
                            <kpi.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                            <p className="text-sm font-bold text-slate-900 font-mono tabular-nums truncate">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-3">
                    <ClipboardList className="h-4 w-4 text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Listado de Ordenes ({orders.length})
                    </span>
                </div>
                <CardContent className="p-0">
                    {orders.length === 0 ? (
                        <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center">
                                <ShoppingBag className="h-6 w-6 text-slate-300" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Sin Ordenes</h3>
                                <p className="text-xs text-slate-400 mt-1">No hay ordenes de compra registradas</p>
                            </div>
                            <Button asChild className="h-9 px-4 rounded-xl bg-amber-600 text-white text-xs mt-2">
                                <Link href="/purchasing/orders/new">
                                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Crear primera OC
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full" role="table">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/60">
                                        <th scope="col" className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">OC #</th>
                                        <th scope="col" className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Proveedor</th>
                                        <th scope="col" className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fecha</th>
                                        <th scope="col" className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                                        <th scope="col" className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                                        <th scope="col" className="px-5 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {orders.map((order: PurchaseOrderWithDetails) => {
                                        const supplier = order.supplier as { legal_name?: string; doc_number?: string } | undefined;
                                        return (
                                            <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-5 py-4">
                                                    <span className="text-xs font-bold text-slate-900 font-mono">
                                                        {order.po_number ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 max-w-[160px] md:max-w-[220px]">
                                                    <p className="text-xs font-bold text-slate-900 truncate leading-snug">
                                                        {supplier?.legal_name ?? 'Sin proveedor'}
                                                    </p>
                                                    {supplier?.doc_number && (
                                                        <p className="text-[10px] text-slate-400 mt-0.5">NIT {supplier.doc_number}</p>
                                                    )}
                                                </td>
                                                <td className="hidden md:table-cell px-4 py-4">
                                                    <div className="flex items-center gap-1.5 text-slate-500">
                                                        <Calendar className="h-3 w-3 text-slate-300 shrink-0" />
                                                        <span className="text-[10px] text-slate-400">{formatDate(order.order_date)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <StatusBadge status={order.status} />
                                                </td>
                                                <td className="px-4 py-4 text-right">
                                                    <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                                                        {formatCOP(Number(order.total) || 0)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <POActionButtons orderId={order.id!} status={order.status} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
