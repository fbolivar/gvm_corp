import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { SalesOrderList } from '@/features/sales/components/SalesOrderList';
import { Button } from '@/shared/components/ui/button';
import {
    Plus,
    ShoppingCart,
    Clock,
    PackageCheck,
    DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card, CardContent } from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';

export const metadata = { title: 'Pedidos — GVM Corp' };

export default async function OrdersPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [{ data }, tenant] = await Promise.all([
        documentService.getDocuments(supabase, {
            page: 1,
            per_page: 50,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            type: 'SALES_ORDER' as any
        }),
        settingsService.getTenantInfo(supabase)
    ]);

    const orders = data || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalPending = orders.filter((o: any) => o.status === 'DRAFT' || o.status === 'SENT').reduce((acc: number, o: any) => acc + (Number(o.total) || 0), 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inProgressCount = orders.filter((o: any) => o.status === 'DRAFT' || o.status === 'SENT').length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completedCount = orders.filter((o: any) => o.status === 'ACCEPTED').length;
    const fulfillmentRate = orders.length > 0 ? Math.round((completedCount / orders.length) * 100) : 0;

    const kpis = [
        { label: 'Total Pedidos', value: orders.length, icon: ShoppingCart, color: 'text-slate-600', bg: 'bg-slate-100' },
        { label: 'En Proceso', value: inProgressCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Cumplimiento', value: `${fulfillmentRate}%`, icon: PackageCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Volumen Pendiente', value: `$${totalPending.toLocaleString('es-CO')}`, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ];

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <VisualReportHeader
                    title="Pedidos de Venta"
                    subtitle="Compromisos de entrega, despacho y facturación"
                    tenant={tenant}
                />
                <div className="flex gap-2">
                    <Button asChild className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold gap-2">
                        <Link href="/sales/orders/new">
                            <Plus className="h-3.5 w-3.5" /> Nuevo Pedido
                        </Link>
                    </Button>
                    <Button variant="outline" asChild className="h-9 rounded-xl text-xs font-semibold gap-2">
                        <Link href="/sales">Dashboard Ventas</Link>
                    </Button>
                </div>
            </div>

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

            {/* Listing */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-3">
                    <ShoppingCart className="h-4 w-4 text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Listado de Pedidos ({orders.length})
                    </span>
                </div>
                <CardContent className="p-0">
                    <SalesOrderList orders={orders} />
                </CardContent>
            </Card>
        </div>
    );
}
