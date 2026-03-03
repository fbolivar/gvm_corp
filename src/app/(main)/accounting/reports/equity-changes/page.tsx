import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { settingsService } from '@/features/settings/services/settingsService';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    BookOpen,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Info,
    ArrowRight,
    Building2,
    Users,
    Landmark,
    PiggyBank,
    ArrowUpRight,
    ArrowDownRight,
    Equal
} from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"

interface EquityComponent {
    code: string;
    name: string;
    openingBalance: number;
    increases: number;
    decreases: number;
    closingBalance: number;
    icon: React.ElementType;
    color: string;
    bg: string;
}

export default async function EquityChangesPage({
    searchParams
}: {
    searchParams: Promise<{ startDate?: string, endDate?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const currentYear = new Date().getFullYear();
    const startDate = params.startDate || `${currentYear}-01-01`;
    const endDate = params.endDate || new Date().toISOString().split('T')[0];

    // period start for opening balances
    const prevYearEnd = `${currentYear - 1}-12-31`;

    const [currentBS, prevBS, pnl, tenant] = await Promise.all([
        accountingService.getBalanceSheet(supabase, startDate, endDate),
        accountingService.getBalanceSheet(supabase, `${currentYear - 1}-01-01`, prevYearEnd),
        accountingService.getProfitAndLoss(supabase, startDate, endDate),
        settingsService.getTenantInfo(supabase)
    ]);

    // Group equity accounts by PUC sub-groups
    const equityAccounts = currentBS.equity || [];
    const prevEquityAccounts = prevBS.equity || [];

    // Build map of previous balances
    const prevMap: Record<string, number> = {};
    prevEquityAccounts.forEach((acc: { code: string; balance: number }) => {
        prevMap[acc.code] = acc.balance;
    });

    // Standard equity PUC groups for Colombia
    const equityGroups = [
        { prefix: '31', name: 'Capital Social', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { prefix: '32', name: 'Superávit de Capital', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { prefix: '33', name: 'Reservas', icon: PiggyBank, color: 'text-amber-600', bg: 'bg-amber-50' },
        { prefix: '34', name: 'Revalorización del Patrimonio', icon: Landmark, color: 'text-violet-600', bg: 'bg-violet-50' },
        { prefix: '35', name: 'Dividendos Decretados', icon: Users, color: 'text-rose-600', bg: 'bg-rose-50' },
        { prefix: '36', name: 'Resultados del Ejercicio', icon: DollarSign, color: 'text-sky-600', bg: 'bg-sky-50' },
        { prefix: '37', name: 'Resultados de Ejercicios Anteriores', icon: BookOpen, color: 'text-pink-600', bg: 'bg-pink-50' },
        { prefix: '38', name: 'Superávit por Valorizaciones', icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
    ];

    const components: EquityComponent[] = equityGroups.map(group => {
        const currentAccts = equityAccounts.filter((a: { code: string }) => a.code.startsWith(group.prefix));
        const closingBalance = currentAccts.reduce((sum: number, a: { balance: number }) => sum + a.balance, 0);

        const prevAccts = prevEquityAccounts.filter((a: { code: string }) => a.code.startsWith(group.prefix));
        const openingBalance = prevAccts.reduce((sum: number, a: { balance: number }) => sum + a.balance, 0);

        const change = closingBalance - openingBalance;

        return {
            code: group.prefix,
            name: group.name,
            openingBalance,
            increases: change > 0 ? change : 0,
            decreases: change < 0 ? Math.abs(change) : 0,
            closingBalance,
            icon: group.icon,
            color: group.color,
            bg: group.bg,
        };
    }).filter(c => c.openingBalance !== 0 || c.closingBalance !== 0 || c.increases !== 0 || c.decreases !== 0);

    // Add net income as a separate component
    components.push({
        code: '36',
        name: 'Resultado Neto del Ejercicio Actual',
        openingBalance: 0,
        increases: pnl.netProfit >= 0 ? pnl.netProfit : 0,
        decreases: pnl.netProfit < 0 ? Math.abs(pnl.netProfit) : 0,
        closingBalance: pnl.netProfit,
        icon: DollarSign,
        color: pnl.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600',
        bg: pnl.netProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50',
    });

    const totalOpening = components.reduce((s, c) => s + c.openingBalance, 0);
    const totalIncreases = components.reduce((s, c) => s + c.increases, 0);
    const totalDecreases = components.reduce((s, c) => s + c.decreases, 0);
    const totalClosing = components.reduce((s, c) => s + c.closingBalance, 0);
    const netChange = totalClosing - totalOpening;
    const isPositive = netChange >= 0;

    const fmt = (n: number) => `$${Math.abs(n).toLocaleString('es-CO')}`;

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header */}
            <VisualReportHeader
                title="Estado de Cambios en Patrimonio"
                subtitle={`${startDate} » ${endDate}`}
                tenant={tenant}
            />

            {/* Summary Strip */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-1">
                <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] leading-none mb-3">Variación Neta del Patrimonio</span>
                        <div className="flex items-center gap-4">
                            <h2 className={cn(
                                "text-3xl font-black tracking-tight leading-none",
                                isPositive ? 'text-emerald-600' : 'text-rose-600'
                            )}>
                                {isPositive ? '+' : '-'}{fmt(netChange)}
                            </h2>
                            <Badge className={cn(
                                "h-8 px-4 rounded-full border-none font-black text-[10px] tracking-widest flex items-center gap-2",
                                isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            )}>
                                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {isPositive ? 'CRECIMIENTO' : 'CONTRACCIÓN'}
                            </Badge>
                        </div>
                    </div>
                </div>
                <ReportingFilters />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Patrimonio Inicial</p>
                            <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{fmt(totalOpening)}</p>
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">Cierre {currentYear - 1}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <ArrowUpRight className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Incrementos</p>
                            <p className="text-2xl font-black text-emerald-600 italic tracking-tighter">+{fmt(totalIncreases)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                            <ArrowDownRight className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Disminuciones</p>
                            <p className="text-2xl font-black text-rose-600 italic tracking-tighter">-{fmt(totalDecreases)}</p>
                        </div>
                    </div>
                </Card>

                <Card className={cn(
                    "border-none shadow-active rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all text-white relative overflow-hidden",
                    isPositive ? "bg-slate-900" : "bg-rose-900"
                )}>
                    <div className="absolute -bottom-6 -right-6 opacity-10 pointer-events-none">
                        <BookOpen className="h-32 w-32" />
                    </div>
                    <div className="space-y-4 relative z-10">
                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
                            <Equal className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Patrimonio Final</p>
                            <p className="text-2xl font-black text-white italic tracking-tighter">{fmt(totalClosing)}</p>
                            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-1">Al {endDate}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Table */}
            <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
                {/* Table Header */}
                <div className="bg-slate-50 border-b border-slate-100">
                    <div className="grid grid-cols-12 px-10 py-6">
                        <div className="col-span-4">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Componente</p>
                        </div>
                        <div className="col-span-2 text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Saldo Inicial</p>
                        </div>
                        <div className="col-span-2 text-right">
                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.4em]">Incrementos</p>
                        </div>
                        <div className="col-span-2 text-right">
                            <p className="text-[9px] font-black text-rose-500 uppercase tracking-[0.4em]">Disminuciones</p>
                        </div>
                        <div className="col-span-2 text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Saldo Final</p>
                        </div>
                    </div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-slate-50">
                    {components.map((comp, i) => (
                        <div key={i} className="grid grid-cols-12 px-10 py-5 items-center hover:bg-slate-50/50 transition-colors group">
                            <div className="col-span-4 flex items-center gap-4">
                                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:rotate-6", comp.bg, comp.color)}>
                                    <comp.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900 tracking-tight">{comp.name}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PUC {comp.code}XX</p>
                                </div>
                            </div>
                            <div className="col-span-2 text-right">
                                <span className={cn("text-sm font-black italic tabular-nums", comp.openingBalance === 0 ? "text-slate-300" : "text-slate-700")}>
                                    {fmt(comp.openingBalance)}
                                </span>
                            </div>
                            <div className="col-span-2 text-right">
                                <span className={cn("text-sm font-black italic tabular-nums", comp.increases === 0 ? "text-slate-300" : "text-emerald-600")}>
                                    {comp.increases > 0 ? '+' : ''}{fmt(comp.increases)}
                                </span>
                            </div>
                            <div className="col-span-2 text-right">
                                <span className={cn("text-sm font-black italic tabular-nums", comp.decreases === 0 ? "text-slate-300" : "text-rose-600")}>
                                    {comp.decreases > 0 ? '-' : ''}{fmt(comp.decreases)}
                                </span>
                            </div>
                            <div className="col-span-2 text-right">
                                <span className="text-sm font-black italic tabular-nums text-slate-900">
                                    {fmt(comp.closingBalance)}
                                </span>
                            </div>
                        </div>
                    ))}

                    {components.length === 0 && (
                        <div className="px-10 py-20 text-center">
                            <BookOpen className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No hay movimientos patrimoniales en este periodo</p>
                        </div>
                    )}
                </div>

                {/* Table Footer - Totals */}
                <div className="bg-slate-900 text-white">
                    <div className="grid grid-cols-12 px-10 py-8 items-center">
                        <div className="col-span-4">
                            <p className="text-sm font-black italic uppercase tracking-tight">Total Patrimonio</p>
                        </div>
                        <div className="col-span-2 text-right">
                            <span className="text-lg font-black italic tabular-nums text-white/60">{fmt(totalOpening)}</span>
                        </div>
                        <div className="col-span-2 text-right">
                            <span className="text-lg font-black italic tabular-nums text-emerald-400">+{fmt(totalIncreases)}</span>
                        </div>
                        <div className="col-span-2 text-right">
                            <span className="text-lg font-black italic tabular-nums text-rose-400">-{fmt(totalDecreases)}</span>
                        </div>
                        <div className="col-span-2 text-right">
                            <span className="text-lg font-black italic tabular-nums text-white">{fmt(totalClosing)}</span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Footnote */}
            <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="flex items-center gap-8">
                    <div className="h-14 w-14 bg-white rounded-3xl flex items-center justify-center text-slate-300 shadow-premium border border-slate-50">
                        <Info className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                        <h5 className="text-slate-900 font-black text-sm uppercase tracking-tight">Normativa NIC 1 • NIIF Plenas</h5>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                            Estado preparado conforme a la Sección 6 de NIIF para PYMES y NIC 1 para el periodo fiscal {currentYear}.
                        </p>
                    </div>
                </div>
                <Button variant="outline" className="h-14 rounded-2xl border-slate-200 text-[10px] font-black uppercase tracking-widest px-8 hover:bg-white hover:shadow-premium transition-all">
                    Exportar PDF <ArrowRight className="ml-3 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
