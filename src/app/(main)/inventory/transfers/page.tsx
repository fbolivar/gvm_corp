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
import { TransferSearchList } from '@/features/warehouse-transfers/components/TransferSearchList';
import { DocumentExportButton } from '@/features/sales/components/DocumentExportButton';
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
    RefreshCw,
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
            timeZone: 'America/Bogota',
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

    // Cargamos los traslados por separado para distinguir un ERROR real (que antes se
    // ocultaba con un `.catch(() => [])` mostrando "Sin Traslados" en silencio) de una
    // lista legítimamente vacía. Si falla, se avisa al usuario en vez de fingir vacío.
    let transfers: TransferWithDetails[] = [];
    let loadError: string | null = null;
    try {
        transfers = await transferService.getTransfers(supabase);
    } catch (err: unknown) {
        loadError = err instanceof Error ? err.message : 'Error desconocido al cargar traslados';
        console.error('[TransfersPage] getTransfers falló:', err);
    }

    const [stats, tenant] = await Promise.all([
        transferService.getStats(supabase).catch(() => defaultStats),
        settingsService.getTenantInfo(supabase),
    ]);

    const company = {
        name: tenant?.name || 'GVM S.A.S',
        nit: tenant?.nit ? `${tenant.nit}${tenant.dv ? `-${tenant.dv}` : ''}` : null,
        address: [tenant?.address, tenant?.city].filter(Boolean).join(', ') || null,
        phone: tenant?.phone ?? null,
        logoUrl: tenant?.logo_url ?? null,
    };

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
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <VisualReportHeader
                        title="Traslados entre Bodegas"
                        subtitle="Movimiento y trazabilidad de mercancía entre ubicaciones"
                        tenant={tenant}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                        asChild
                        className="h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs gap-2"
                    >
                        <Link href="/inventory/transfers/new">
                            <Plus className="h-3.5 w-3.5" /> Nuevo Traslado
                        </Link>
                    </Button>
                    <DocumentExportButton
                        source="transfers"
                        company={company}
                        opts={{
                            title: 'TRASLADOS ENTRE BODEGAS',
                            partyLabel: 'Origen',
                            docLabel: 'Destino',
                            warehouseLabel: 'Observaciones',
                            fileLabel: 'Traslados',
                            sheetName: 'Traslados',
                            statusLabels: {},
                        }}
                    />
                </div>
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
                        Listado de Traslados ({loadError ? '—' : transfers.length})
                    </span>
                </div>

                <CardContent className="p-0">
                    {loadError ? (
                        <div className="py-16 px-6 text-center flex flex-col items-center justify-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center">
                                <AlertCircle className="h-6 w-6 text-rose-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">
                                    No se pudieron cargar los traslados
                                </h3>
                                <p className="text-xs text-slate-400 mt-1 max-w-md">
                                    Ocurrió un error al consultar la información. Tus traslados NO se
                                    han perdido — vuelve a intentar en unos segundos.
                                </p>
                                <p className="text-[10px] text-slate-300 mt-2 font-mono break-all">
                                    {loadError}
                                </p>
                            </div>
                            {/* Enlace nativo = recarga completa (evita el router-cache del cliente) */}
                            <a
                                href="/inventory/transfers"
                                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold mt-2 transition-colors"
                            >
                                <RefreshCw className="h-3.5 w-3.5" /> Reintentar
                            </a>
                        </div>
                    ) : transfers.length === 0 ? (
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
                        <TransferSearchList
                            rows={transfers.map((t: TransferWithDetails) => ({
                                id: t.id!,
                                number: t.transfer_number ?? null,
                                legalized_number: t.legalized_number ?? null,
                                from: (t.from_warehouse as { name?: string } | undefined)?.name ?? '—',
                                to: (t.to_warehouse as { name?: string } | undefined)?.name ?? '—',
                                status: t.status as string,
                                created_at: t.created_at,
                            }))}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
