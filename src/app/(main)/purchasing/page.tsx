import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
    ShoppingBag,
    Users,
    Plus,
    TrendingDown,
    ChevronRight,
    ShieldCheck,
    PackageCheck,
    Calendar,
    FileText,
} from "lucide-react"
import Link from "next/link"
import { documentService } from '@/features/documents/services/documentService';
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { settingsService, type TenantInfo } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';

export default async function PurchasingDashboard() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    let orders: Record<string, unknown>[] = [];
    let bills: Record<string, unknown>[] = [];
    let latestVendors: Record<string, unknown>[] = [];
    let tenant: TenantInfo | null = null;

    try {
        const [ordersResult, billsResult, vendorsResult, tenantInfo] = await Promise.all([
            documentService.getDocuments(supabase, { page: 1, per_page: 50, type: 'PURCHASE_ORDER' }),
            documentService.getDocuments(supabase, { page: 1, per_page: 50, type: 'VENDOR_BILL' }),
            import('@/features/parties/services/partyService').then(m => m.partyService.getParties(supabase, { page: 1, per_page: 5, role: 'vendor' })),
            settingsService.getTenantInfo(supabase)
        ]);

        orders = (ordersResult.data || []) as Record<string, unknown>[];
        bills = (billsResult.data || []) as Record<string, unknown>[];
        latestVendors = (vendorsResult.data || []) as Record<string, unknown>[];
        tenant = tenantInfo;
    } catch (err: unknown) {
        console.error("Error fetching purchasing data:", err);
    }

    const totalAP = bills
        .filter(doc => doc.status === 'SENT' || doc.status === 'DRAFT')
        .reduce((acc, doc) => acc + (Number(doc.total) || 0), 0);
    const pendingOrdersCount = orders.filter(o => o.status === 'SENT' || o.status === 'DRAFT').length;
    const receivedOrdersCount = orders.filter(o => o.status === 'ACCEPTED').length;
    const receptionRate = orders.length > 0 ? Math.round((receivedOrdersCount / orders.length) * 100) : 100;

    const kpis = [
        { label: 'Ordenes Activas', value: orders.length, icon: ShoppingBag, color: 'text-amber-600', bg: 'bg-amber-50', desc: `${pendingOrdersCount} pendientes` },
        { label: 'Tasa Recepcion', value: `${receptionRate}%`, icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50', desc: 'Cumplimiento logistico' },
        { label: 'Cuentas x Pagar', value: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalAP), icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50', desc: 'Saldo obligaciones' },
    ];

    const statusConfig: Record<string, { label: string; className: string }> = {
        DRAFT: { label: 'Borrador', className: 'bg-slate-50 text-slate-500' },
        SENT: { label: 'Enviada', className: 'bg-blue-50 text-blue-600' },
        ACCEPTED: { label: 'Recibida', className: 'bg-emerald-50 text-emerald-600' },
        CANCELLED: { label: 'Anulada', className: 'bg-rose-50 text-rose-600' },
    };

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <VisualReportHeader
                    title="Cadena de Suministros"
                    subtitle="Ordenes de compra, proveedores y cuentas por pagar"
                    tenant={tenant}
                />
                <div className="flex gap-3">
                    <Button variant="outline" asChild className="h-9 px-4 rounded-xl text-xs gap-2">
                        <Link href="/purchasing/vendors">
                            <Users className="h-3.5 w-3.5" /> Proveedores
                        </Link>
                    </Button>
                    <Button asChild className="h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs gap-2">
                        <Link href="/purchasing/orders/new">
                            <Plus className="h-3.5 w-3.5" /> Nueva OC
                        </Link>
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", kpi.bg, kpi.color)}>
                            <kpi.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                            <p className="text-sm font-bold text-slate-900 font-mono tabular-nums truncate">{kpi.value}</p>
                            <p className="text-[10px] text-slate-400">{kpi.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid gap-6 lg:grid-cols-12 items-start">
                {/* Vendors sidebar */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-900">Proveedores Recientes</h2>
                        <Button variant="ghost" size="sm" asChild className="h-8 px-3 rounded-lg text-xs text-slate-500 hover:text-slate-900 gap-1">
                            <Link href="/purchasing/vendors">
                                Ver todos <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {latestVendors.map((vendor) => (
                            <Card key={String(vendor.id)} className="rounded-2xl border border-slate-100 shadow-sm hover:border-amber-100 transition-colors">
                                <CardContent className="p-4 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                            <Users className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-900 leading-snug truncate">{String(vendor.legal_name)}</p>
                                            <p className="text-[10px] text-slate-400 truncate">NIT: {String(vendor.doc_number ?? '—')}</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="icon" asChild className="h-8 w-8 rounded-lg shrink-0">
                                        <Link href={`/parties/${String(vendor.id)}`}>
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Button variant="outline" asChild className="w-full h-9 rounded-xl text-xs gap-2">
                        <Link href="/purchasing/bills/new">
                            <FileText className="h-3.5 w-3.5" /> Cargar Gasto Directo
                        </Link>
                    </Button>
                </div>

                {/* Orders list */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-900">Ordenes de Compra</h2>
                        <Button variant="ghost" size="sm" asChild className="h-8 px-3 rounded-lg text-xs text-slate-500 hover:text-slate-900 gap-1">
                            <Link href="/purchasing/orders">
                                Ver historial <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    </div>

                    <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-3">
                            <PackageCheck className="h-4 w-4 text-slate-400" />
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                Ultimas Ordenes ({orders.length})
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
                                        <p className="text-xs text-slate-400 mt-1">Crea tu primera orden de compra</p>
                                    </div>
                                    <Button asChild className="h-9 px-4 rounded-xl bg-amber-600 text-white text-xs mt-2">
                                        <Link href="/purchasing/orders/new">Nueva OC</Link>
                                    </Button>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {orders.slice(0, 5).map((order) => {
                                        const party = order.party as { legal_name?: string } | null;
                                        const status = String(order.status ?? 'DRAFT');
                                        const config = statusConfig[status] || statusConfig.DRAFT;

                                        return (
                                            <Link
                                                key={String(order.id)}
                                                href={`/purchasing/orders/${String(order.id)}`}
                                                className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors block"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                                        <ShoppingBag className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs font-bold text-slate-900 font-mono">#{String(order.number)}</span>
                                                            <Badge className={cn("border-none text-[10px] font-semibold px-2.5 py-0.5 rounded-lg", config.className)}>
                                                                {config.label}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                                            {party?.legal_name || 'Proveedor no vinculado'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 shrink-0">
                                                    <div className="text-right">
                                                        <p className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                                                            ${Number(order.total).toLocaleString('es-CO')}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 justify-end mt-0.5">
                                                            <Calendar className="h-3 w-3 text-slate-300" />
                                                            <span className="text-[10px] text-slate-400">{String(order.issue_date)}</span>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
