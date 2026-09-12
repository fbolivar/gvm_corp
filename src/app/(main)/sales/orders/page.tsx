import { createClient } from '@/lib/supabase/server';
import { fetchAllRows } from '@/shared/lib/fetchAllRows';
import { documentService } from '@/features/documents/services/documentService';
import { settingsService } from '@/features/settings/services/settingsService';
import { SalesOrderList } from '@/features/sales/components/SalesOrderList';
import { SalesOrderFiltersBar } from '@/features/sales/components/SalesOrderFiltersBar';
import { DocumentExportButton } from '@/features/sales/components/DocumentExportButton';
import { Button } from '@/shared/components/ui/button';
import { Plus, ShoppingCart, Clock, PackageCheck, DollarSign, FileBarChart } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/shared/components/ui/page-header';
import { Card, CardContent } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';

export const metadata = { title: 'Pedidos — GVM Corp' };

const PER_PAGE = 100;

interface PageProps {
    searchParams: Promise<Record<string, string>>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const sp = await searchParams;
    const page    = Math.max(1, Number(sp.page) || 1);
    const search  = sp.search?.trim() || undefined;
    const rawStatus = sp.status?.trim() || undefined;
    // Los pedidos anulados conservan su consecutivo y quedaban en la lista: tras
    // el incidente de duplicados del 2026-08-31 la primera pantalla eran 24 filas
    // ANULADO seguidas. Por defecto se ocultan; siguen a un clic con el filtro
    // "Anulado", y "Todos (incluye anulados)" muestra la lista completa.
    const showAll = rawStatus === 'ALL';
    const status  = showAll ? undefined : rawStatus;
    const hideVoided = !status;
    const from    = sp.from?.trim() || undefined;
    const to      = sp.to?.trim() || undefined;
    const warehouse = sp.warehouse?.trim() || undefined;

    const { data: orders, count } = await documentService.getDocuments(supabase, {
        page,
        per_page: PER_PAGE,
        type: 'SALES_ORDER' as never,
        search,
        status: status as never,
        hide_voided: hideVoided,
        warehouse_id: warehouse,
        start_date: from,
        end_date: to,
    });

    // Bodegas para el filtro
    const { data: warehousesData } = await supabase
        .from('warehouses')
        .select('id, name')
        .order('name');
    const warehouses = (warehousesData ?? []) as { id: string; name: string }[];

    const tenant = await settingsService.getTenantInfo(supabase);
    const company = {
        name: tenant?.name || 'GVM S.A.S',
        nit: tenant?.nit ? `${tenant.nit}${tenant.dv ? `-${tenant.dv}` : ''}` : null,
        address: [tenant?.address, tenant?.city].filter(Boolean).join(', ') || null,
        phone: tenant?.phone ?? null,
        logoUrl: tenant?.logo_url ?? null,
    };

    // KPIs del total real (sin paginación) — query rápida sin select de columnas
    // Los KPIs miden actividad real: un pedido anulado no es un pedido. Incluirlos
    // inflaba "Total Pedidos" y hundía el % de cumplimiento.
    const { count: totalCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('doc_type', 'SALES_ORDER')
        .neq('status', 'VOIDED');

    const { count: pendingCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('doc_type', 'SALES_ORDER')
        .in('status', ['DRAFT', 'SENT']);

    const { count: completedCount } = await supabase
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('doc_type', 'SALES_ORDER')
        .eq('status', 'ACCEPTED');

    // Paginado: PostgREST corta en 1.000 filas en silencio, así que un
    // `.limit(5000)` haría que este KPI se quedara corto sin avisar en cuanto
    // haya más de mil pedidos pendientes.
    const pendingVolData = await fetchAllRows<{ total: number | null }>(
        ({ from, to }) => supabase
            .from('documents')
            .select('total')
            .eq('doc_type', 'SALES_ORDER')
            .in('status', ['DRAFT', 'SENT'])
            .order('id')
            .range(from, to),
        { label: 'orders:volumen-pendiente' },
    );

    const totalVolumePending = pendingVolData.reduce((acc, d) => acc + Number(d.total || 0), 0);
    const total = totalCount ?? 0;
    const fulfillment = total > 0 ? Math.round(((completedCount ?? 0) / total) * 100) : 0;
    const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

    const kpis = [
        { label: 'Total Pedidos',     value: (totalCount ?? 0).toLocaleString('es-CO'), icon: ShoppingCart, color: 'text-slate-600',   bg: 'bg-slate-100' },
        { label: 'En Proceso',        value: (pendingCount ?? 0).toLocaleString('es-CO'), icon: Clock,       color: 'text-amber-600',   bg: 'bg-amber-50' },
        { label: 'Cumplimiento',      value: `${fulfillment}%`,                            icon: PackageCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Volumen Pendiente', value: `$${totalVolumePending.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ];

    return (
        <div className="page-container">
            <div className="space-y-6 pb-16 animate-in fade-in duration-500">
                <PageHeader
                    title="Pedidos de venta"
                    description="Compromisos de entrega con clientes."
                    icon={FileBarChart}
                    breadcrumbs={[
                        { label: 'Inicio', href: '/dashboard' },
                        { label: 'Ventas', href: '/sales' },
                        { label: 'Pedidos' },
                    ]}
                    actions={
                        <>
                            <Button asChild className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold gap-2">
                                <Link href="/sales/orders/new">
                                    <Plus className="h-3.5 w-3.5" /> Nuevo pedido
                                </Link>
                            </Button>
                            <DocumentExportButton
                                source="documents"
                                docType="SALES_ORDER"
                                filters={{ search, status, hide_voided: hideVoided, warehouse_id: warehouse, start_date: from, end_date: to }}
                                company={company}
                                opts={{
                                    title: 'PEDIDOS DE VENTA', partyLabel: 'Cliente', fileLabel: 'Pedidos', sheetName: 'Pedidos',
                                    showInvoice: true,
                                    statusLabels: { DRAFT: 'Borrador', SENT: 'Confirmado', ACCEPTED: 'Facturado', VOIDED: 'Anulado', REJECTED: 'Rechazado' },
                                }}
                            />
                            <Button variant="outline" asChild className="h-9 rounded-xl text-xs font-semibold gap-2">
                                <Link href="/sales">Dashboard Ventas</Link>
                            </Button>
                        </>
                    }
                />

                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {kpis.map((kpi) => (
                        <div key={kpi.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-3">
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

                {/* Filtros */}
                <SalesOrderFiltersBar
                    defaultSearch={search}
                    defaultStatus={rawStatus}
                    defaultWarehouse={warehouse}
                    defaultFrom={from}
                    defaultTo={to}
                    warehouses={warehouses}
                />

                {/* Listado */}
                <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <ShoppingCart className="h-4 w-4 text-slate-400" />
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                {count?.toLocaleString('es-CO') ?? 0} pedidos encontrados
                            </span>
                        </div>
                        {totalPages > 1 && (
                            <span className="text-[10px] text-slate-400">
                                Página {page} de {totalPages}
                            </span>
                        )}
                    </div>
                    <CardContent className="p-0">
                        <SalesOrderList
                            orders={orders}
                            page={page}
                            totalPages={totalPages}
                            baseParams={{ search, status, warehouse, from, to }}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
