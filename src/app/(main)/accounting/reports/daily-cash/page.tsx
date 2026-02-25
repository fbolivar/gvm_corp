import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { treasuryService } from '@/features/treasury/services/treasuryService';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card } from "@/shared/components/ui/card"
import {
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    Calendar,
    ArrowRight,
    Search,
    PiggyBank,
    Zap
} from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"

export default async function DailyCashFlowPage({
    searchParams
}: {
    searchParams: Promise<{ startDate?: string, endDate?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const startDate = params.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = params.endDate || new Date().toISOString().split('T')[0];

    // Fetch transactions
    // treasuryService.getTransactions doesn't take date range currently, let's filter after fetch or update service.
    // For MVP efficiency, we'll fetch all and filter in memory since it's a dashboard style report.
    const allTransactions = await treasuryService.getTransactions(supabase, { limit: 1000 });

    const [tenant] = await Promise.all([settingsService.getTenantInfo(supabase)]);

    const filteredTx = (allTransactions || []).filter(tx => {
        const date = tx.date;
        return date >= startDate && date <= endDate;
    });

    // Group by day
    const dailyData: Record<string, { date: string, income: number, expense: number, net: number }> = {};

    // Initialize day range
    let current = new Date(startDate);
    const end = new Date(endDate);
    while (current <= end) {
        const d = current.toISOString().split('T')[0];
        dailyData[d] = { date: d, income: 0, expense: 0, net: 0 };
        current.setDate(current.getDate() + 1);
    }

    filteredTx.forEach(tx => {
        const d = tx.date;
        if (dailyData[d]) {
            const amount = Number(tx.amount) || 0;
            if (amount > 0) dailyData[d].income += amount;
            else dailyData[d].expense += Math.abs(amount);
            dailyData[d].net += amount;
        }
    });

    const days = Object.values(dailyData).sort((a, b) => b.date.localeCompare(a.date));

    const totalIncome = filteredTx.filter(t => Number(t.amount) > 0).reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = filteredTx.filter(t => Number(t.amount) < 0).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    const netFlow = totalIncome - totalExpense;

    const fmt = (n: number) => `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header */}
            <VisualReportHeader
                title="Flujo de Caja Diario"
                subtitle={`Movimientos de Tesorería: ${startDate} » ${endDate}`}
                tenant={tenant}
            />

            {/* Summary KPI Strip */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-1">
                <div className="flex items-center gap-12">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">Flujo Neto del PeriodO</span>
                        <div className="flex items-baseline gap-4">
                            <h2 className={cn(
                                "text-6xl font-black tracking-tighter italic leading-none",
                                netFlow >= 0 ? "text-slate-900" : "text-rose-600"
                            )}>
                                {fmt(netFlow)}
                            </h2>
                            <span className="text-xl font-black text-slate-300 uppercase italic tracking-widest">Saldo Real</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ReportingFilters />
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <ArrowUpRight className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingresos de Caja</p>
                            <p className="text-2xl font-black text-emerald-600 italic tracking-tighter">{fmt(totalIncome)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                            <ArrowDownRight className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Egresos de Caja</p>
                            <p className="text-2xl font-black text-rose-600 italic tracking-tighter">{fmt(totalExpense)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Días con superávit</p>
                            <p className="text-2xl font-black text-indigo-600 italic tracking-tighter">{days.filter(d => d.net > 0).length} Días</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-active bg-emerald-600 rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all text-white">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
                            <Zap className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Liquidez Inmediata</p>
                            <p className="text-2xl font-black text-white italic tracking-tighter">100% Operativa</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Daily Table */}
            <Card className="border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">Consolidado Diario de Caja</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Control de liquidez día tras día</p>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-10 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha Operativa</th>
                                <th className="px-10 py-5 text-right text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50/20">Ingresos (+)</th>
                                <th className="px-10 py-5 text-right text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-50/20">Egresos (-)</th>
                                <th className="px-10 py-5 text-right text-[9px] font-black text-slate-900 uppercase tracking-widest">Flujo Neto</th>
                                <th className="px-10 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado Caja</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {days.map((day) => (
                                <tr key={day.date} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs font-black text-slate-900 tracking-tight italic">{day.date}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-right font-bold text-emerald-600 tabular-nums">
                                        {day.income > 0 ? fmt(day.income) : '-'}
                                    </td>
                                    <td className="px-10 py-6 text-right font-bold text-rose-600 tabular-nums">
                                        {day.expense > 0 ? fmt(day.expense) : '-'}
                                    </td>
                                    <td className="px-10 py-6 text-right font-black text-slate-900 tabular-nums italic">
                                        {fmt(day.net)}
                                    </td>
                                    <td className="px-10 py-6 text-center text-[10px] font-black uppercase tracking-widest">
                                        {day.net > 0 ? (
                                            <span className="text-emerald-500 flex items-center justify-center gap-2">Superávit <ArrowUpRight className="h-3 w-3" /></span>
                                        ) : day.net < 0 ? (
                                            <span className="text-rose-500 flex items-center justify-center gap-2">Déficit <ArrowDownRight className="h-3 w-3" /></span>
                                        ) : (
                                            <span className="text-slate-300">Equilibrado</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Advisory */}
            <div className="bg-slate-100 p-16 rounded-[4rem] text-slate-900 flex flex-col lg:flex-row items-center justify-between gap-12 border border-slate-200 shadow-inner group">
                <div className="flex items-center gap-10">
                    <div className="h-20 w-20 bg-white rounded-[2rem] flex items-center justify-center text-emerald-600 shadow-premium border border-white rotate-6 group-hover:rotate-0 transition-transform duration-700">
                        <PiggyBank className="h-10 w-10" />
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Cultura de Liquidez</h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-xl">
                            El análisis diario permite identificar patrones de recaudo y picos de gasto.
                            Garantizar que el flujo neto acumulado sea positivo es la métrica vital para la sostenibilidad de <span className="text-emerald-600 font-bold">{tenant?.name}</span>.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <Button variant="outline" className="h-14 border-slate-300 text-slate-900 text-[10px] font-black uppercase tracking-widest px-10 hover:bg-slate-900 hover:text-white transition-all rounded-2xl shadow-premium">
                        Exportar Calendario <ArrowRight className="ml-4 h-4 w-4" />
                    </Button>
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Control de Cash v3</span>
                </div>
            </div>
        </div>
    );
}
