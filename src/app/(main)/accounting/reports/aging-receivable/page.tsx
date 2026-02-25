import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    Clock,
    Calendar,
    ArrowRight,
    AlertCircle,
    CheckCircle2,
    Layers,
    User,
    ChevronRight,
    Search,
    TrendingDown
} from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"

export default async function AgingReceivablePage({
    searchParams
}: {
    searchParams: Promise<{ startDate?: string, endDate?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Aging report usually doesn't need a date range for the "past", it's a snapshot "as of today"
    // but the filters might still be used for other purposes. We'll use "today" as reference.
    const today = new Date();

    // Fetch Pending Invoices (Ventas por cobrar)
    const { data: invoices, error } = await supabase
        .from('documents')
        .select('*, party:parties(legal_name, doc_number)')
        .eq('doc_type', 'INVOICE')
        .gt('balance', 0)
        .order('due_date', { ascending: true });

    if (error) throw error;

    const [tenant] = await Promise.all([settingsService.getTenantInfo(supabase)]);

    // Aging classification
    const agingData = {
        current: { label: 'Corriente', range: '0-30 días', amount: 0, count: 0, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        overdue30: { label: '30-60 días', range: '31-60 días', amount: 0, count: 0, color: 'text-amber-500', bg: 'bg-amber-50' },
        overdue60: { label: '60-90 días', range: '61-90 días', amount: 0, count: 0, color: 'text-orange-500', bg: 'bg-orange-50' },
        overdue90: { label: '90+ días', range: 'Más de 90 días', amount: 0, count: 0, color: 'text-rose-500', bg: 'bg-rose-50' },
    };

    const classifiedInvoices = (invoices || []).map(inv => {
        const dueDate = new Date(inv.due_date);
        const diffTime = today.getTime() - dueDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let category: keyof typeof agingData = 'current';
        if (diffDays > 90) category = 'overdue90';
        else if (diffDays > 60) category = 'overdue60';
        else if (diffDays > 30) category = 'overdue30';
        else category = 'current';

        const balance = Number(inv.balance) || 0;
        agingData[category].amount += balance;
        agingData[category].count += 1;

        return {
            ...inv,
            daysOverdue: diffDays,
            category
        };
    });

    const totalReceivable = classifiedInvoices.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0);
    const criticalAmount = agingData.overdue90.amount + agingData.overdue60.amount;
    const criticalPercent = totalReceivable > 0 ? (criticalAmount / totalReceivable) * 100 : 0;

    const fmt = (n: number) => `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header */}
            <VisualReportHeader
                title="Cartera por Edades"
                subtitle={`Cuentas por Cobrar (As of ${today.toISOString().split('T')[0]})`}
                tenant={tenant}
            />

            {/* Total Balance Strip */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-1">
                <div className="flex items-center gap-12">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">Total Cartera Pendiente</span>
                        <div className="flex items-baseline gap-4">
                            <h2 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none">
                                {fmt(totalReceivable)}
                            </h2>
                            <span className="text-xl font-black text-slate-300 uppercase italic tracking-widest">Activo Exigible</span>
                        </div>
                    </div>
                    {criticalPercent > 20 && (
                        <div className="hidden lg:flex items-center gap-4 px-6 py-4 bg-rose-50 rounded-3xl border border-rose-100 animate-pulse">
                            <AlertCircle className="h-5 w-5 text-rose-500" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none">Alerta de Riesgo</span>
                                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mt-0.5">{criticalPercent.toFixed(1)}% de cartera vencida &gt; 60 días</span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <ReportingFilters />
                </div>
            </div>

            {/* Aging Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {Object.entries(agingData).map(([key, data]) => (
                    <Card key={key} className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all relative overflow-hidden">
                        <div className={cn("absolute top-0 right-0 w-2 h-full opacity-20", data.color.replace('text', 'bg'))} />
                        <div className="space-y-6">
                            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", data.bg, data.color)}>
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
            <Card className="border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">Composición de la Cartera</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Desglose Individual de Facturas Vencidas</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-10 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
                                <th className="px-10 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                                <th className="px-10 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Días Vencim.</th>
                                <th className="px-10 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Original</th>
                                <th className="px-10 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Saldo Pendiente</th>
                                <th className="px-10 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {classifiedInvoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                                                <Layers className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-900 tracking-tight italic">{inv.number}</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Vence: {inv.due_date}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                                <User className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs font-black text-slate-800 uppercase italic tracking-tight">{inv.party?.legal_name || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-center">
                                        <div className={cn(
                                            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black italic",
                                            inv.daysOverdue > 0 ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                                        )}>
                                            {inv.daysOverdue > 0 ? `${inv.daysOverdue} días de mora` : 'Al día'}
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <span className="text-xs font-bold text-slate-400 tabular-nums line-through decoration-slate-200">{fmt(Number(inv.total))}</span>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <span className="text-sm font-black text-slate-900 tabular-nums italic">{fmt(Number(inv.balance))}</span>
                                    </td>
                                    <td className="px-10 py-6 text-center">
                                        <Badge className={cn(
                                            "border-none text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-md",
                                            agingData[inv.category as keyof typeof agingData].bg,
                                            agingData[inv.category as keyof typeof agingData].color
                                        )}>
                                            {agingData[inv.category as keyof typeof agingData].label}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}

                            {classifiedInvoices.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-10 py-20 text-center">
                                        <CheckCircle2 className="h-12 w-12 text-emerald-200 mx-auto mb-4" />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">¡Excelente! No hay cartera pendiente de cobro</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Recovery Advisory */}
            <div className="bg-slate-900 p-16 rounded-[4rem] text-white flex flex-col lg:flex-row items-center justify-between gap-12 shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                    <TrendingDown className="h-48 w-48" />
                </div>
                <div className="flex items-center gap-10 relative z-10">
                    <div className="h-20 w-20 bg-white/10 rounded-[2rem] flex items-center justify-center text-white border border-white/10 shadow-inner rotate-6 group-hover:rotate-0 transition-transform duration-700">
                        <AlertCircle className="h-10 w-10 text-rose-400" />
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-white">Estrategia de Recaudo</h4>
                        <p className="text-sm text-white/40 leading-relaxed font-medium max-w-xl">
                            La salud financiera de <span className="text-amber-400 font-black uppercase">{tenant?.name}</span> depende de la rotación de cartera.
                            Las cuentas con mora superior a 60 días requieren gestión de cobro inmediata para evitar deterioro de activos.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3 relative z-10">
                    <Button variant="outline" className="h-14 bg-white/5 border-white/10 text-white text-[10px] font-black uppercase tracking-widest px-10 hover:bg-white hover:text-slate-900 transition-all rounded-2xl shadow-active">
                        Generar Cartas de Cobro <ArrowRight className="ml-4 h-4 w-4" />
                    </Button>
                    <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">Protección de Flujo de Efectivo v3</p>
                </div>
            </div>
        </div>
    );
}
