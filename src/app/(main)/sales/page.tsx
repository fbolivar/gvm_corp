import { createClient } from '@/lib/supabase/server';
import { crmService } from '@/features/crm/services/crmService';
import { documentService } from '@/features/documents/services/documentService';
import { Button } from '@/shared/components/ui/button';
import { PageHeader } from '@/shared/components/ui/page-header';
import { EmptyState } from '@/shared/components/ui/empty-state';
import {
    Users,
    FileText,
    ShoppingCart,
    ArrowRight,
    AlertCircle,
    Plus,
    Receipt,
    BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/shared/lib/utils";
import { redirect } from 'next/navigation';

export const metadata = { title: 'Ventas — GVM Corp' };

export default async function SalesDashboard() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let leads: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let quotes: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orders: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let invoices: any[] = [];
    let error: string | null = null;

    try {
        const [leadsRes, quotesResult, ordersResult, invoicesResult] = await Promise.allSettled([
            crmService.getLeads(supabase),
            documentService.getDocuments(supabase, { page: 1, per_page: 50, type: 'QUOTATION' }),
            documentService.getDocuments(supabase, { page: 1, per_page: 50, type: 'SALES_ORDER' }),
            documentService.getDocuments(supabase, { page: 1, per_page: 50, type: 'INVOICE' })
        ]);

        if (leadsRes.status === 'fulfilled') leads = leadsRes.value || [];
        if (quotesResult.status === 'fulfilled') quotes = quotesResult.value.data || [];
        if (ordersResult.status === 'fulfilled') orders = ordersResult.value.data || [];
        if (invoicesResult.status === 'fulfilled') invoices = invoicesResult.value.data || [];
    } catch (err: unknown) {
        error = err instanceof Error ? err.message : 'Error al cargar datos comerciales';
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalRevenue = invoices.reduce((acc: number, inv: any) => acc + (Number(inv.total) || 0), 0);

    const stats = [
        { title: 'Prospectos', count: leads.length, icon: Users, tint: 'bg-sky-50 text-sky-600', link: '/crm/leads', desc: 'Oportunidades registradas' },
        { title: 'Cotizaciones', count: quotes.length, icon: FileText, tint: 'bg-amber-50 text-amber-600', link: '/sales/quotations', desc: 'Propuestas en proceso' },
        { title: 'Pedidos', count: orders.length, icon: ShoppingCart, tint: 'bg-emerald-50 text-emerald-600', link: '/sales/orders', desc: 'Compromisos de entrega' },
    ];

    const actions = [
        { link: '/crm/leads/new', icon: Users, label: 'Nuevo Lead' },
        { link: '/sales/quotations/new', icon: FileText, label: 'Cotizar' },
        { link: '/sales/orders/new', icon: ShoppingCart, label: 'Nuevo Pedido' },
        { link: '/sales/invoices/new', icon: Receipt, label: 'Facturar', primary: true },
    ];

    return (
        <div className="page-container">
            <PageHeader
                title="Ventas"
                description="Embudo comercial, cotizaciones, pedidos y facturación."
                icon={ShoppingCart}
                breadcrumbs={[
                    { label: 'Inicio', href: '/dashboard' },
                    { label: 'Ventas' },
                ]}
                actions={
                    <>
                        <Button asChild variant="outline">
                            <Link href="/sales/invoices">
                                <Receipt className="h-4 w-4 mr-1.5" />
                                Facturas
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href="/sales/orders/new">
                                <Plus className="h-4 w-4 mr-1.5" />
                                Nueva venta
                            </Link>
                        </Button>
                    </>
                }
            />

            {error && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-3 text-rose-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {stats.map((stat) => (
                    <Link key={stat.title} href={stat.link} className="block group">
                        <div className="surface-card p-5 hover:shadow-md hover:border-slate-300 transition-all">
                            <div className="flex items-start justify-between mb-3">
                                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", stat.tint)}>
                                    <stat.icon className="h-5 w-5" />
                                </div>
                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
                            </div>
                            <p className="kpi-label">{stat.title}</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{stat.count}</p>
                            <p className="text-caption mt-1">{stat.desc}</p>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                    {/* Quick Actions */}
                    <div className="surface-card p-5">
                        <h2 className="text-h3 mb-4">Acciones rápidas</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {actions.map((a) => (
                                <Link
                                    key={a.label}
                                    href={a.link}
                                    className={cn(
                                        "h-20 rounded-lg flex flex-col items-center justify-center gap-1.5 border transition-all",
                                        a.primary
                                            ? "bg-slate-900 text-white border-slate-900 hover:bg-slate-800"
                                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                    )}
                                >
                                    <a.icon className="h-5 w-5" />
                                    <span className="text-xs font-medium">{a.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Recent Invoices */}
                    <div className="surface-card">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <h2 className="text-h3">Facturación reciente</h2>
                            <Button variant="ghost" asChild size="sm">
                                <Link href="/sales/invoices" className="text-sm">
                                    Ver todo <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                </Link>
                            </Button>
                        </div>
                        <div className="p-2">
                            {invoices.length === 0 ? (
                                <EmptyState
                                    icon={Receipt}
                                    title="Sin facturas registradas"
                                    description="Las facturas emitidas aparecerán aquí."
                                />
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {invoices.slice(0, 5).map((inv) => (
                                        <Link
                                            key={inv.id}
                                            href={`/documents/${inv.id}`}
                                            className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-slate-50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-9 w-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                                                    <Receipt className="h-4 w-4 text-slate-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-900 truncate">{inv.party?.legal_name || 'Consumidor final'}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs text-slate-500">#{inv.number}</span>
                                                        <span className="text-xs text-slate-400">·</span>
                                                        <span className="text-xs text-slate-500">{inv.issue_date}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-sm font-semibold text-slate-900 tabular-nums shrink-0 ml-3">
                                                ${Number(inv.total).toLocaleString('es-CO')}
                                            </p>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="surface-card p-5">
                        <p className="kpi-label">Facturación total</p>
                        <p className="text-metric mt-1">
                            ${totalRevenue.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-caption mt-1">Suma de facturas emitidas</p>
                    </div>

                    <div className="surface-card p-5">
                        <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                            <Users className="h-5 w-5 text-slate-700" />
                        </div>
                        <h3 className="text-h3">Análisis de clientes</h3>
                        <p className="text-sm text-slate-500 mt-1">Identifica los clientes de mayor rentabilidad.</p>
                        <Button variant="outline" asChild className="w-full mt-4">
                            <Link href="/crm/leads">
                                <BarChart3 className="h-4 w-4 mr-1.5" />
                                Analizar
                            </Link>
                        </Button>
                    </div>

                    <div className="surface-card p-5 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <Receipt className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="kpi-label">Facturas emitidas</p>
                            <p className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">{invoices.length}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
