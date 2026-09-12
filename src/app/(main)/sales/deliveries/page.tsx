import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { settingsService } from '@/features/settings/services/settingsService';
import { DocumentList } from '@/features/documents/components/DocumentList';
import { SalesOrderFiltersBar } from '@/features/sales/components/SalesOrderFiltersBar';
import { DocumentExportButton } from '@/features/sales/components/DocumentExportButton';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { PageHeader } from '@/shared/components/ui/page-header';
import { FileOutput, Truck, PackageCheck, Clock } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cn } from '@/shared/lib/utils';

export const metadata = { title: 'Remisiones — GVM Corp' };

const PER_PAGE = 100;

interface PageProps {
    searchParams: Promise<Record<string, string>>;
}

/**
 * Listado de remisiones (documents con doc_type = DELIVERY_NOTE).
 * Antes las remisiones solo se veían mezcladas en /documents y el redirect que
 * hace convertActions al convertir un pedido apuntaba aquí sin que la ruta
 * existiera (404).
 */
export default async function DeliveriesPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const sp = await searchParams;
    const page = Math.max(1, Number(sp.page) || 1);
    const search = sp.search?.trim() || undefined;
    const status = sp.status?.trim() || undefined;
    const from = sp.from?.trim() || undefined;
    const to = sp.to?.trim() || undefined;
    const warehouse = sp.warehouse?.trim() || undefined;

    const { data: deliveries, count } = await documentService.getDocuments(supabase, {
        page,
        per_page: PER_PAGE,
        type: 'DELIVERY_NOTE' as never,
        search,
        status: status as never,
        warehouse_id: warehouse,
        start_date: from,
        end_date: to,
    });

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

    // KPIs sobre el total real, sin paginación.
    const base = () => supabase.from('documents').select('id', { count: 'exact', head: true }).eq('doc_type', 'DELIVERY_NOTE');
    const [{ count: totalCount }, { count: draftCount }, { count: deliveredCount }] = await Promise.all([
        base(),
        base().eq('status', 'DRAFT'),
        base().in('status', ['SENT', 'ACCEPTED']),
    ]);

    const kpis = [
        { label: 'Total Remisiones', value: (totalCount ?? 0).toLocaleString('es-CO'), icon: FileOutput, color: 'text-slate-600', bg: 'bg-slate-100' },
        { label: 'Borradores', value: (draftCount ?? 0).toLocaleString('es-CO'), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Despachadas', value: (deliveredCount ?? 0).toLocaleString('es-CO'), icon: PackageCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

    return (
        <div className="page-container">
            <div className="space-y-6 pb-16 animate-in fade-in duration-500">
                <PageHeader
                    title="Remisiones"
                    description="Entregas de mercancía a clientes (documento no contable)."
                    icon={Truck}
                    breadcrumbs={[
                        { label: 'Inicio', href: '/dashboard' },
                        { label: 'Ventas', href: '/sales' },
                        { label: 'Remisiones' },
                    ]}
                    actions={
                        <>
                            <DocumentExportButton
                                source="documents"
                                docType="DELIVERY_NOTE"
                                filters={{ search, status, warehouse_id: warehouse, start_date: from, end_date: to }}
                                company={company}
                                opts={{
                                    title: 'REMISIONES', partyLabel: 'Cliente', fileLabel: 'Remisiones', sheetName: 'Remisiones',
                                    statusLabels: { DRAFT: 'Borrador', SENT: 'Despachada', ACCEPTED: 'Entregada', VOIDED: 'Anulada', REJECTED: 'Rechazada' },
                                }}
                            />
                            <Button variant="outline" asChild className="h-11 px-4 rounded-xl text-xs font-semibold gap-2">
                                <Link href="/sales/orders">Pedidos</Link>
                            </Button>
                        </>
                    }
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {kpis.map((kpi) => (
                        <div key={kpi.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-3">
                            <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', kpi.bg, kpi.color)}>
                                <kpi.icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                                <p className="text-sm font-bold text-slate-900 font-mono tabular-nums truncate">{kpi.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <SalesOrderFiltersBar
                    defaultSearch={search}
                    defaultStatus={status}
                    defaultWarehouse={warehouse}
                    defaultFrom={from}
                    defaultTo={to}
                    warehouses={warehouses}
                />

                <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <DocumentList documents={deliveries ?? []} />
                </Card>

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                        {page > 1 && (
                            <Button variant="outline" asChild className="h-11 px-4 rounded-xl text-xs">
                                <Link href={{ pathname: '/sales/deliveries', query: { ...sp, page: page - 1 } }}>Anterior</Link>
                            </Button>
                        )}
                        <span className="text-xs text-slate-400 px-2">Página {page} de {totalPages}</span>
                        {page < totalPages && (
                            <Button variant="outline" asChild className="h-11 px-4 rounded-xl text-xs">
                                <Link href={{ pathname: '/sales/deliveries', query: { ...sp, page: page + 1 } }}>Siguiente</Link>
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
