import { createClient } from '@/lib/supabase/server';
import { recurringInvoiceService } from '@/features/sales/services/recurringInvoiceService';
import { RecurringInvoiceList } from '@/features/sales/components/RecurringInvoiceList';
import { Button } from '@/shared/components/ui/button';
import { Plus, Activity, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';

export const metadata = { title: 'Facturas Recurrentes — GVM Corp' };

export default async function RecurringInvoicesPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    let items: Awaited<ReturnType<typeof recurringInvoiceService.getAll>> = [];
    let tenant = null;

    try {
        [items, tenant] = await Promise.all([
            recurringInvoiceService.getAll(supabase),
            settingsService.getTenantInfo(supabase),
        ]);
    } catch {
        tenant = await settingsService.getTenantInfo(supabase);
    }

    const active = items.filter(i => i.status === 'ACTIVE').length;
    const paused = items.filter(i => i.status === 'PAUSED').length;
    const nextRun = items
        .filter(i => i.status === 'ACTIVE')
        .sort((a, b) => a.next_run_date.localeCompare(b.next_run_date))[0]?.next_run_date ?? '—';

    const kpis = [
        { label: 'Activas', value: active, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Pausadas', value: paused, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Próxima Ejecución', value: nextRun, icon: CheckCircle, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    ];

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Facturas Recurrentes"
                subtitle="Ventas — Facturación Automatizada por Frecuencia"
                tenant={tenant}
            />

            <div className="flex gap-2">
                <Button asChild className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold gap-2">
                    <Link href="/sales/recurring/new">
                        <Plus className="h-3.5 w-3.5" /> Nueva Recurrencia
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

            {/* List */}
            <RecurringInvoiceList initialItems={items} />
        </div>
    );
}
