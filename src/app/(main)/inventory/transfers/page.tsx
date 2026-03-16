import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { transferService } from '@/features/warehouse-transfers/services/transferService';
import { TransferWithDetails, TransferStatus } from '@/features/warehouse-transfers/types';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import {
    ArrowLeftRight,
    Plus,
    Clock,
    Truck,
    PackageCheck,
    XCircle,
    AlertCircle,
    Calendar,
    ExternalLink,
    LayoutGrid,
} from 'lucide-react';

export const metadata = { title: 'Traslados entre Bodegas — GVM Corp' };

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

// ─── Status map ────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<
    TransferStatus,
    { label: string; className: string; Icon: React.ComponentType<{ className?: string }> }
> = {
    DRAFT: {
        label: 'Borrador',
        className: 'bg-slate-50 text-slate-500',
        Icon: Clock,
    },
    IN_TRANSIT: {
        label: 'En Tránsito',
        className: 'bg-amber-50 text-amber-600',
        Icon: Truck,
    },
    RECEIVED: {
        label: 'Recibido',
        className: 'bg-emerald-50 text-emerald-600',
        Icon: PackageCheck,
    },
    CANCELLED: {
        label: 'Anulado',
        className: 'bg-rose-50 text-rose-600',
        Icon: XCircle,
    },
};

// ─── Components ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TransferStatus }) {
    const cfg = STATUS_MAP[status] ?? {
        label: status,
        className: 'bg-slate-50 text-slate-500',
        Icon: AlertCircle,
    };
    const { Icon } = cfg;
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold',
                cfg.className
            )}
        >
            <Icon className="h-3 w-3" />
            {cfg.label}
        </span>
    );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function TransfersPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const defaultStats = { total: 0, drafts: 0, inTransit: 0, received: 0, cancelled: 0 };

    const [transfers, stats, tenant] = await Promise.all([
        transferService.getTransfers(supabase).catch((): TransferWithDetails[] => []),
        transferService.getStats(supabase).catch(() => defaultStats),
        settingsService.getTenantInfo(supabase),
    ]);

    const kpis = [
        {
            label: 'Total Traslados',
            value: stats.total,
            icon: LayoutGrid,
            color: 'text-slate-600',
            bg: 'bg-slate-100',
        },
        {
            label: 'Borradores',
            value: stats.drafts,
            icon: Clock,
            color: 'text-slate-500',
            bg: 'bg-slate-50',
        },
        {
            label: 'En Tránsito',
            value: stats.inTransit,
            icon: Truck,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
        },
        {
            label: 'Recibidos',
            value: stats.received,
            icon: PackageCheck,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
        },
    ];

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">

            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <VisualReportHeader
                    title="Traslados entre Bodegas"
                    subtitle="Movimiento y trazabilidad de mercancía entre ubicaciones"
                    tenant={tenant}
                />
                <Button
                    asChild
                    className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs gap-2 shrink-0"
                >
                    <Link href="/inventory/transfers/new">
                        <Plus className="h-3.5 w-3.5" /> Nuevo Traslado
                    </Link>
                </Button>
            </div>

            {/* ── KPI Cards ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <div
                        key={i}
                        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-3"
                    >
                        <div
                            className={cn(
                                'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                                kpi.bg,
                                kpi.color
                            )}
                        >
                            <kpi.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                {kpi.label}
                            </p>
                            <p className="text-sm font-bold text-slate-900 font-mono tabular-nums truncate">
                                {kpi.value}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Table ─────────────────────────────────────────────────────── */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-3">
                    <ArrowLeftRight className="h-4 w-4 text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Listado de Traslados ({transfers.length})
                    </span>
                </div>

                <CardContent className="p-0">
                    {transfers.length === 0 ? (
                        <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center">
                                <ArrowLeftRight className="h-6 w-6 text-slate-300" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Sin Traslados</h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    No hay traslados de bodega registrados
                                </p>
                            </div>
                            <Button
                                asChild
                                className="h-9 px-4 rounded-xl bg-indigo-600 text-white text-xs mt-2"
                            >
                                <Link href="/inventory/transfers/new">
                                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Crear primer traslado
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full" role="table">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/60">
                                        <th
                                            scope="col"
                                            className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                                        >
                                            TR #
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                                        >
                                            Origen
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                                        >
                                            Destino
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                                        >
                                            Estado
                                        </th>
                                        <th
                                            scope="col"
                                            className="hidden md:table-cell px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                                        >
                                            Fecha
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-5 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                                        >
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {transfers.map((transfer: TransferWithDetails) => {
                                        const fromName =
                                            (transfer.from_warehouse as { name?: string } | undefined)
                                                ?.name ?? '—';
                                        const toName =
                                            (transfer.to_warehouse as { name?: string } | undefined)
                                                ?.name ?? '—';
                                        return (
                                            <tr
                                                key={transfer.id}
                                                className="hover:bg-slate-50/50 transition-colors"
                                            >
                                                {/* TR Number */}
                                                <td className="px-5 py-4">
                                                    <span className="text-xs font-bold text-slate-900 font-mono">
                                                        {transfer.transfer_number ?? '—'}
                                                    </span>
                                                </td>

                                                {/* Origin */}
                                                <td className="px-4 py-4 max-w-[140px]">
                                                    <p className="text-xs font-bold text-slate-900 truncate leading-snug">
                                                        {fromName}
                                                    </p>
                                                </td>

                                                {/* Destination */}
                                                <td className="px-4 py-4 max-w-[140px]">
                                                    <p className="text-xs font-bold text-slate-900 truncate leading-snug">
                                                        {toName}
                                                    </p>
                                                </td>

                                                {/* Status */}
                                                <td className="px-4 py-4">
                                                    <StatusBadge status={transfer.status as TransferStatus} />
                                                </td>

                                                {/* Date (hidden on mobile) */}
                                                <td className="hidden md:table-cell px-4 py-4">
                                                    <div className="flex items-center gap-1.5 text-slate-500">
                                                        <Calendar className="h-3 w-3 text-slate-300 shrink-0" />
                                                        <span className="text-[10px] text-slate-400">
                                                            {formatDate(transfer.created_at)}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-5 py-4 text-right">
                                                    <Button
                                                        asChild
                                                        variant="ghost"
                                                        className="h-8 px-3 rounded-xl text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1.5 uppercase tracking-wide"
                                                    >
                                                        <Link href={`/inventory/transfers/${transfer.id}`}>
                                                            <ExternalLink className="h-3 w-3" />
                                                            Ver detalle
                                                        </Link>
                                                    </Button>
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
