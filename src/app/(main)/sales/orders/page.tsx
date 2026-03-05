import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { SalesOrderList } from '@/features/sales/components/SalesOrderList';
import { Button } from '@/shared/components/ui/button';
import { Plus, ShoppingCart, Zap, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
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
    const activeTotal = orders.reduce((acc: number, o: any) => acc + (Number(o.total) || 0), 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inProgressCount = orders.filter((o: any) => o.status === 'SENT' || o.status === 'DRAFT').length;

    const kpis = [
        { label: 'Volumen Pendiente', value: `$${activeTotal.toLocaleString('es-CO')}`, icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Órdenes en Proceso', value: inProgressCount, icon: Zap, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Eficiencia Logística', value: '91.8%', icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Pedidos"
                subtitle="Ventas — Compromisos de Entrega y Despacho"
                tenant={tenant}
            />

            <div className="flex gap-2">
                <Button asChild className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold gap-2">
                    <Link href="/sales/orders/new">
                        <Plus className="h-3.5 w-3.5" /> Nuevo Pedido
                    </Link>
                </Button>
                <Button variant="outline" asChild className="h-9 rounded-xl text-xs font-semibold gap-2">
                    <Link href="/sales">Dashboard Ventas</Link>
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {kpis.map((stat) => (
                    <Card key={stat.label} className="rounded-2xl border border-slate-100 bg-white shadow-sm">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", stat.bg)}>
                                <stat.icon className={cn("h-5 w-5", stat.color)} />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                                <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                            </div>
                            <Badge variant="secondary" className="ml-auto text-[10px] font-semibold">
                                {String(stat.value)}
                            </Badge>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Listing */}
            <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <CardContent className="p-0">
                    <SalesOrderList orders={orders} />
                </CardContent>
            </Card>
        </div>
    );
}
