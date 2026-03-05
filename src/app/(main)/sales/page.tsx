import { createClient } from '@/lib/supabase/server';
import { crmService } from '@/features/crm/services/crmService';
import { documentService } from '@/features/documents/services/documentService';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import {
    Users,
    FileText,
    ShoppingCart,
    ArrowRight,
    TrendingUp,
    AlertCircle,
    Plus,
    Receipt,
    BarChart3,
    DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/shared/lib/utils";
import { redirect } from 'next/navigation';
import { Badge } from '@/shared/components/ui/badge';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { settingsService } from '@/features/settings/services/settingsService';

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

    const [, tenant] = await Promise.all([
        (async () => {
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
                const msg = err instanceof Error ? err.message : 'Error al cargar datos comerciales';
                console.error('Error fetching sales data:', msg);
                error = msg;
            }
        })(),
        settingsService.getTenantInfo(supabase),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalRevenue = invoices.reduce((acc: number, inv: any) => acc + (Number(inv.total) || 0), 0);

    const stats = [
        { title: 'Prospectos', count: leads.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', link: '/crm/leads', desc: 'Oportunidades registradas' },
        { title: 'Cotizaciones', count: quotes.length, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50', link: '/sales/quotations', desc: 'Propuestas en proceso' },
        { title: 'Pedidos', count: orders.length, icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-50', link: '/sales/orders', desc: 'Compromisos de entrega' },
    ];

    const actions = [
        { link: '/crm/leads/new', icon: Users, label: 'Nuevo Lead', bg: 'bg-blue-50', text: 'text-blue-600' },
        { link: '/sales/quotations/new', icon: FileText, label: 'Cotizar', bg: 'bg-amber-50', text: 'text-amber-600' },
        { link: '/sales/orders/new', icon: ShoppingCart, label: 'Nuevo Pedido', bg: 'bg-emerald-50', text: 'text-emerald-600' },
        { link: '/sales/invoices/new', icon: Receipt, label: 'Facturar', bg: 'bg-indigo-600', text: 'text-white' },
    ];

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Ventas"
                subtitle="Embudo Comercial y Facturación"
                tenant={tenant}
            />

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p className="text-xs font-medium">{error}</p>
                </div>
            )}

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
                <Button asChild className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold gap-2">
                    <Link href="/sales/orders/new">
                        <Plus className="h-3.5 w-3.5" /> Nueva Venta
                    </Link>
                </Button>
                <Button variant="outline" asChild className="h-9 rounded-xl text-xs font-semibold gap-2">
                    <Link href="/sales/invoices">
                        <Receipt className="h-3.5 w-3.5" /> Historial Recaudos
                    </Link>
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.map((stat) => (
                    <Link key={stat.title} href={stat.link}>
                        <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", stat.bg)}>
                                        <stat.icon className={cn("h-5 w-5", stat.color)} />
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] font-semibold">
                                        {stat.count}
                                    </Badge>
                                </div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.title}</p>
                                <p className="text-xl font-bold text-slate-900 mt-0.5">{stat.count}</p>
                                <p className="text-[10px] text-slate-400 mt-1">{stat.desc}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Operations + Recent Invoices */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Quick Operations */}
                    <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                <Plus className="h-4 w-4 text-indigo-600" />
                                Acciones Rápidas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                {actions.map((a) => (
                                    <Button
                                        key={a.label}
                                        asChild
                                        variant="ghost"
                                        className={cn(
                                            "h-20 rounded-xl flex flex-col items-center justify-center gap-2 border border-slate-100",
                                            a.bg === 'bg-indigo-600'
                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 border-indigo-600 hover:text-white'
                                                : `${a.bg} ${a.text} hover:opacity-80`
                                        )}
                                    >
                                        <Link href={a.link}>
                                            <a.icon className="h-5 w-5" />
                                            <span className="text-[10px] font-semibold uppercase tracking-wider">{a.label}</span>
                                        </Link>
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Invoices */}
                    <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                    <Receipt className="h-4 w-4 text-indigo-600" />
                                    Facturación Reciente
                                </CardTitle>
                                <Button variant="ghost" asChild className="h-8 rounded-lg text-[10px] font-semibold text-indigo-600 gap-1">
                                    <Link href="/sales/invoices">
                                        Ver todo <ArrowRight className="h-3 w-3" />
                                    </Link>
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-2">
                                {invoices.slice(0, 5).map((inv) => (
                                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 bg-white rounded-lg flex items-center justify-center border border-slate-100">
                                                <Receipt className="h-4 w-4 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-900">{inv.party?.legal_name || 'Consumidor Final'}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-slate-400 font-medium">#{inv.number}</span>
                                                    <span className="text-[10px] text-slate-400">{inv.issue_date}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-sm font-bold text-slate-900">
                                            ${Number(inv.total).toLocaleString('es-CO')}
                                        </p>
                                    </div>
                                ))}
                                {invoices.length === 0 && (
                                    <div className="py-12 text-center">
                                        <Receipt className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sin facturas registradas</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Revenue Card */}
                    <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <BarChart3 className="h-3.5 w-3.5 text-indigo-600" />
                                Facturación Total
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-baseline gap-1">
                                <span className="text-indigo-600 font-bold text-lg">$</span>
                                <span className="text-2xl font-bold text-slate-900">
                                    {totalRevenue.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                                <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                        <TrendingUp className="h-3.5 w-3.5" />
                                    </div>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Rendimiento</span>
                                </div>
                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-600 w-[75%] rounded-full" />
                                </div>
                                <p className="text-[10px] text-slate-400">
                                    <span className="text-indigo-600 font-semibold">+12.5%</span> sobre periodo anterior
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Clients */}
                    <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                        <CardContent className="p-5 space-y-4">
                            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                <Users className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Top Clientes</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">Identifica los clientes de mayor rentabilidad</p>
                            </div>
                            <Button variant="outline" asChild className="w-full h-9 rounded-xl text-xs font-semibold gap-2">
                                <Link href="/crm/leads">
                                    <DollarSign className="h-3.5 w-3.5" /> Analizar Clientes <ArrowRight className="h-3 w-3 ml-auto" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Invoice Count */}
                    <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                <Receipt className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Facturas Emitidas</p>
                                <p className="text-xl font-bold text-slate-900">{invoices.length}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
