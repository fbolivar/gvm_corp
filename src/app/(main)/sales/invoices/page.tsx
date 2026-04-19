import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { SalesInvoiceList } from '@/features/sales/components/SalesInvoiceList';
import { Button } from '@/shared/components/ui/button';
import { Plus, Banknote, Activity, ShieldCheck, RefreshCw, FileDigit } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/shared/components/ui/page-header';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';

export const metadata = { title: 'Facturas — GVM Corp' };

export default async function InvoicesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data } = await documentService.getDocuments(supabase, {
        page: 1,
        per_page: 50,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'INVOICE' as any
    });

    const invoices = data || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalInvoiced = invoices.reduce((acc: number, inv: any) => acc + (Number(inv.total) || 0), 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendingCollection = invoices.filter((inv: any) => inv.status !== 'PAID').length;

    const kpis = [
        { label: 'Volumen Facturado', value: `$${totalInvoiced.toLocaleString('es-CO')}`, icon: Banknote, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Facturas por Cobrar', value: pendingCollection, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Flujo Esperado', value: '88.4%', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    return (
        <div className="page-container">
            <div className="space-y-6 pb-16 animate-in fade-in duration-500">
                <PageHeader
                    title="Facturas de venta"
                    description="Documentos fiscales emitidos y por emitir."
                    icon={FileDigit}
                    breadcrumbs={[
                        { label: 'Inicio', href: '/dashboard' },
                        { label: 'Ventas', href: '/sales' },
                        { label: 'Facturas' },
                    ]}
                    actions={
                        <>
                            <Button asChild className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold gap-2">
                                <Link href="/sales/invoices/new">
                                    <Plus className="h-3.5 w-3.5" /> Nueva factura
                                </Link>
                            </Button>
                            <Button variant="outline" asChild className="h-9 rounded-xl text-xs font-semibold gap-2">
                                <Link href="/sales/recurring">
                                    <RefreshCw className="h-3.5 w-3.5" /> Recurrentes
                                </Link>
                            </Button>
                            <Button variant="outline" asChild className="h-9 rounded-xl text-xs font-semibold gap-2">
                                <Link href="/sales">Dashboard Ventas</Link>
                            </Button>
                        </>
                    }
                />

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
                        <SalesInvoiceList invoices={invoices} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
