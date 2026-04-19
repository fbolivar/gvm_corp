import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { VendorBillList } from '@/features/purchasing/components/VendorBillList';
import { Button } from "@/shared/components/ui/button"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Plus, FileCheck, Banknote, TrendingDown, Receipt } from "lucide-react"
import Link from "next/link"
import { redirect } from 'next/navigation';
import { PageHeader } from '@/shared/components/ui/page-header';
import { cn } from "@/shared/lib/utils"

export default async function VendorBillsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [billsResult] = await Promise.all([
        documentService.getDocuments(supabase, {
            page: 1,
            per_page: 50,
            type: 'VENDOR_BILL'
        }),
    ]);

    const bills = billsResult.data || [];
    const totalAP = bills.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    const pendingCount = bills.filter(b => b.status === 'DRAFT').length;

    const kpis = [
        { label: 'Total Facturas', value: bills.length, icon: FileCheck, color: 'text-slate-600', bg: 'bg-slate-100' },
        { label: 'Pend. Auditoria', value: pendingCount, icon: Banknote, color: 'text-rose-600', bg: 'bg-rose-50' },
        { label: 'Pasivo Total', value: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(totalAP), icon: TrendingDown, color: 'text-amber-600', bg: 'bg-amber-50' },
    ];

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <PageHeader
                title="Facturas de compra"
                description="Cuentas por pagar a proveedores."
                icon={Receipt}
                breadcrumbs={[
                    { label: 'Inicio', href: '/dashboard' },
                    { label: 'Compras', href: '/purchasing/bills' },
                    { label: 'Facturas' },
                ]}
                actions={
                    <Button asChild className="h-9 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs gap-2">
                        <Link href="/purchasing/bills/new">
                            <Plus className="h-3.5 w-3.5" /> Nueva factura
                        </Link>
                    </Button>
                }
            />

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
                        </div>
                    </div>
                ))}
            </div>

            {/* Bills list */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-3">
                    <Banknote className="h-4 w-4 text-slate-400" />
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Listado de Obligaciones ({bills.length})
                    </span>
                </div>
                <CardContent className="p-0">
                    <VendorBillList bills={bills} />
                </CardContent>
            </Card>
        </div>
    );
}
