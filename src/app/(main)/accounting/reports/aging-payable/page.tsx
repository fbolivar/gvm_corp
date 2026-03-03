import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { AgingChart } from '@/features/accounting/components/charts/AgingChart';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    Clock,
    Calendar,
    ArrowRight,
    AlertCircle,
    CheckCircle2,
    Truck,
    User,
    Search,
    TrendingUp,
    ShieldAlert,
    ChevronRight
} from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"

export default async function AgingPayablePage({
    searchParams
}: {
    searchParams: Promise<{ startDate?: string, endDate?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const today = new Date();

    // Fetch Pending Vendor Bills (Cuentas por pagar)
    const { data: bills, error } = await supabase
        .from('documents')
        .select('id, number, doc_type, total, status, issue_date, due_date, party_id, party:parties(legal_name, doc_number)')
        .eq('doc_type', 'VENDOR_BILL')
        .gt('total', 0)
        .order('issue_date', { ascending: true });

    if (error) throw error;

    const [tenant] = await Promise.all([settingsService.getTenantInfo(supabase)]);

    // Aging classification
    const agingData = {
        current: { label: 'Vigente', range: 'A tiempo', amount: 0, count: 0, color: 'text-blue-500', bg: 'bg-blue-50' },
        overdue30: { label: '30-60 días', range: 'Vencido 30-60', amount: 0, count: 0, color: 'text-orange-500', bg: 'bg-orange-50' },
        overdue60: { label: '60-90 días', range: 'Vencido 60-90', amount: 0, count: 0, color: 'text-rose-500', bg: 'bg-rose-50' },
        overdue90: { label: 'Inmediato', range: '90+ días', amount: 0, count: 0, color: 'text-slate-900', bg: 'bg-slate-100' },
    };

    const classifiedBills = (bills || []).map(bill => {
        const rawDueDate = (bill as any).due_date || bill.issue_date;
        const dueDate = new Date(rawDueDate);
        const diffTime = today.getTime() - dueDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let category: keyof typeof agingData = 'current';
        if (diffDays > 90) category = 'overdue90';
        else if (diffDays > 60) category = 'overdue60';
        else if (diffDays > 30) category = 'overdue30';
        else category = 'current';

        const balance = Number(bill.total) || 0;
        agingData[category].amount += balance;
        agingData[category].count += 1;

        return {
            ...bill,
            daysOverdue: diffDays,
            category,
            party: Array.isArray(bill.party) ? bill.party[0] : bill.party
        };
    });

    const totalPayable = classifiedBills.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
    const criticalAmount = agingData.overdue90.amount + agingData.overdue60.amount;

    const fmt = (n: number) => `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    const agingBuckets = [
        { label: 'Vigente', amount: agingData.current.amount, count: agingData.current.count, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: '30-60 días', amount: agingData.overdue30.amount, count: agingData.overdue30.count, color: 'text-orange-500', bg: 'bg-orange-50' },
        { label: '60-90 días', amount: agingData.overdue60.amount, count: agingData.overdue60.count, color: 'text-rose-500', bg: 'bg-rose-50' },
        { label: 'Inmediato', amount: agingData.overdue90.amount, count: agingData.overdue90.count, color: 'text-slate-900', bg: 'bg-slate-100' },
    ];
    const topCreditors = Object.entries(
        classifiedBills.reduce((acc: Record<string, number>, bill) => {
            const name = bill.party?.legal_name || 'Sin nombre';
            acc[name] = (acc[name] || 0) + (Number(bill.total) || 0);
            return acc;
        }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, amount]) => ({ name, amount }));

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header */}
            <VisualReportHeader
                title="Cuentas por Pagar"
                subtitle={`Pasivos Exigibles (Corte: ${today.toISOString().split('T')[0]})`}
                tenant={tenant}
            />

            {/* Total Balance Strip */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-1">
                <div className="flex items-center gap-12">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">Total Pasivos Operacionales</span>
                        <div className="flex items-baseline gap-4">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                                {fmt(totalPayable)}
                            </h2>
                            <span className="text-xl font-black text-slate-300 uppercase italic tracking-widest">Saldo CxP</span>
                        </div>
                    </div>
                    {criticalAmount > 0 && (
                        <div className="hidden lg:flex items-center gap-4 px-6 py-4 bg-orange-50 rounded-3xl border border-orange-100 italic transition-transform hover:scale-105 cursor-help shadow-sm">
                            <ShieldAlert className="h-5 w-5 text-orange-500" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none">Compromisos Vencidos</span>
                                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mt-0.5">{fmt(criticalAmount)} pendientes de pago urgente</span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <ReportingFilters />
                </div>
            </div>

            {/* Aging Chart */}
            <AgingChart buckets={agingBuckets} topDebtors={topCreditors} title="Distribución Pasivos por Vencimiento" />

            {/* Aging Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {Object.entries(agingData).map(([key, data]) => (
                    <Card key={key} className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all relative overflow-hidden">
                        <div className={cn("absolute top-0 right-0 w-2 h-full opacity-30", data.color.replace('text', 'bg'))} />
                        <div className="space-y-6">
                            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shadow-inner", data.bg, data.color)}>
                                <Clock className="h-6 w-6" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-900 uppercase italic tracking-tight">{data.label}</h4>
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{data.range}</p>
                            </div>
                            <div className="pt-2">
                                <p className={cn("text-2xl font-black italic tracking-tighter", data.color)}>{fmt(data.amount)}</p>
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">{data.count} Facturas</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Detailed Table */}
            <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">Calendario de Pagos</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Control de Obligaciones por Vencimiento</p>
                    </div>
                    <Button variant="ghost" className="text-blue-600 text-[10px] font-black uppercase tracking-widest gap-2">
                        Ver Prioridades <ArrowRight className="h-3 w-3" />
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-10 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Factura Compra</th>
                                <th className="px-10 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Proveedor</th>
                                <th className="px-10 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado Mora</th>
                                <th className="px-10 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Deuda</th>
                                <th className="px-10 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {classifiedBills.map((bill) => (
                                <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110">
                                                <Truck className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-900 tracking-tight italic">{bill.number}</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Vence: {bill.due_date}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <User className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs font-black text-slate-800 uppercase italic tracking-tight">{bill.party?.legal_name || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-center">
                                        <div className={cn(
                                            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black italic uppercase",
                                            bill.daysOverdue > 0 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                                        )}>
                                            {bill.daysOverdue > 0 ? `${bill.daysOverdue} días` : 'Al día'}
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <span className="text-sm font-black text-slate-900 tabular-nums italic">{fmt(Number(bill.total))}</span>
                                    </td>
                                    <td className="px-10 py-6 text-center">
                                        <Badge className={cn(
                                            "border-none text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-md shadow-sm",
                                            agingData[bill.category as keyof typeof agingData].bg,
                                            agingData[bill.category as keyof typeof agingData].color
                                        )}>
                                            {agingData[bill.category as keyof typeof agingData].label}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}

                            {classifiedBills.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-10 py-20 text-center">
                                        <CheckCircle2 className="h-12 w-12 text-blue-200 mx-auto mb-4" />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sin deudas pendientes con proveedores</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Treasury Advisory */}
            <div className="bg-slate-100 p-10 rounded-[2.5rem] flex flex-col lg:flex-row items-center justify-between gap-10 border border-slate-200 shadow-inner">
                <div className="flex items-center gap-8">
                    <div className="h-14 w-14 bg-white rounded-[2rem] flex items-center justify-center text-slate-900 shadow-premium border border-white">
                        <TrendingUp className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-2xl font-black tracking-tight uppercase leading-tight text-slate-900">Proyección de Flujo Saliente</h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-xl">
                            Este reporte permite anticipar las necesidades de caja para cumplir con obligaciones comerciales.
                            Mantener las cuentas por pagar al día optimiza el cupo de crédito y la relación con proveedores clave de <span className="text-blue-600 font-bold">{tenant?.name}</span>.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <Button variant="outline" className="h-16 rounded-[2rem] border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest px-12 hover:bg-slate-900 hover:text-white transition-all shadow-premium group">
                        Programar Pagos <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Garantía de Liquidez v3</span>
                </div>
            </div>
        </div>
    );
}
