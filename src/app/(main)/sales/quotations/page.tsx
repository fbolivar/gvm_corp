import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { SalesQuotationList } from '@/features/sales/components/SalesQuotationList';
import { Button } from '@/shared/components/ui/button';
import { Plus, Target, Zap, Activity, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/shared/components/ui/page-header';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';

export const metadata = { title: 'Cotizaciones — GVM Corp' };

export default async function QuotationsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data } = await documentService.getDocuments(supabase, {
        page: 1,
        per_page: 50,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: 'QUOTATION' as any
    });

    const quotations = data || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalPotential = quotations.reduce((acc: number, q: any) => acc + (Number(q.total) || 0), 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendingCount = quotations.filter((q: any) => q.status === 'DRAFT' || q.status === 'SENT').length;

    const kpis = [
        { label: 'Capital en Oferta', value: `$${totalPotential.toLocaleString('es-CO')}`, icon: Target, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Pendientes de Cierre', value: pendingCount, icon: Zap, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Tasa de Éxito', value: '74.2%', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    return (
        <div className="page-container">
            <div className="space-y-6 pb-16 animate-in fade-in duration-500">
                <PageHeader
                    title="Cotizaciones"
                    description="Propuestas comerciales enviadas a clientes."
                    icon={ClipboardList}
                    breadcrumbs={[
                        { label: 'Inicio', href: '/dashboard' },
                        { label: 'Ventas', href: '/sales' },
                        { label: 'Cotizaciones' },
                    ]}
                    actions={
                        <>
                            <Button asChild className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold gap-2">
                                <Link href="/sales/quotations/new">
                                    <Plus className="h-3.5 w-3.5" /> Nueva cotización
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
                        <SalesQuotationList quotations={quotations} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
