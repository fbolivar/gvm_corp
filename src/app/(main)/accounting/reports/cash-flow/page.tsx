import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    ArrowLeftRight,
    TrendingUp,
    TrendingDown,
    Building2,
    Landmark,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Info,
    ArrowRight,
    Wallet
} from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"

interface CashFlowSection {
    title: string;
    subtitle: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    borderColor: string;
    items: { label: string; amount: number; isInflow: boolean }[];
    total: number;
}

async function getCashFlowData(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, startDate: string, endDate: string) {
    // Actividades de Operación: ingresos y egresos de tesorería
    const { data: transactions } = await supabase
        .from('treasury_transactions')
        .select('type, amount, description, concept')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

    const txns = transactions || [];

    // Classify transactions into cash flow categories
    const receipts = txns.filter((t: { type: string }) => t.type === 'RECEIPT');
    const payments = txns.filter((t: { type: string }) => t.type === 'PAYMENT');
    const transfers = txns.filter((t: { type: string }) => t.type === 'TRANSFER');

    // Operating Activities
    const operatingInflows = receipts.reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
    const operatingOutflows = payments.reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
    const operatingNet = operatingInflows - operatingOutflows;

    // Get account balances for beginning/ending cash
    const { data: accounts } = await supabase
        .from('treasury_accounts')
        .select('name, type, balance');

    const totalCash = (accounts || []).reduce((sum: number, a: { balance: number }) => sum + a.balance, 0);
    const bankAccounts = (accounts || []).filter((a: { type: string }) => a.type === 'BANK');
    const cashAccounts = (accounts || []).filter((a: { type: string }) => a.type === 'CASH');

    // Get document-based info for more detail
    const { data: invoicesPaid } = await supabase
        .from('documents')
        .select('total')
        .eq('doc_type', 'INVOICE')
        .eq('status', 'SENT')
        .gte('issue_date', startDate)
        .lte('issue_date', endDate);

    const { data: billsPaid } = await supabase
        .from('documents')
        .select('total')
        .eq('doc_type', 'BILL')
        .eq('status', 'SENT')
        .gte('issue_date', startDate)
        .lte('issue_date', endDate);

    const invoicesTotal = (invoicesPaid || []).reduce((sum: number, d: { total: number }) => sum + d.total, 0);
    const billsTotal = (billsPaid || []).reduce((sum: number, d: { total: number }) => sum + d.total, 0);

    // Get payroll totals
    const { data: payrollDocs } = await supabase
        .from('documents')
        .select('total')
        .eq('doc_type', 'PAYROLL')
        .gte('issue_date', startDate)
        .lte('issue_date', endDate);

    const payrollTotal = (payrollDocs || []).reduce((sum: number, d: { total: number }) => sum + d.total, 0);

    return {
        operating: {
            inflows: operatingInflows,
            outflows: operatingOutflows,
            net: operatingNet,
            invoicesCollected: invoicesTotal,
            billsPaid: billsTotal,
            payroll: payrollTotal,
        },
        totalCash,
        bankAccounts: bankAccounts.length,
        cashAccounts: cashAccounts.length,
        accountDetails: accounts || [],
        transactionCount: txns.length,
        transferCount: transfers.length,
    };
}

export default async function CashFlowPage({
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

    const [data, tenant] = await Promise.all([
        getCashFlowData(supabase, startDate, endDate),
        settingsService.getTenantInfo(supabase)
    ]);

    const sections: CashFlowSection[] = [
        {
            title: "Actividades de Operación",
            subtitle: "Operating Activities",
            icon: Building2,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            borderColor: "border-indigo-100",
            items: [
                { label: "Cobros a clientes (facturas)", amount: data.operating.invoicesCollected, isInflow: true },
                { label: "Recaudos de tesorería", amount: data.operating.inflows, isInflow: true },
                { label: "Pagos a proveedores", amount: data.operating.billsPaid, isInflow: false },
                { label: "Pagos de nómina", amount: data.operating.payroll, isInflow: false },
                { label: "Egresos de tesorería", amount: data.operating.outflows, isInflow: false },
            ],
            total: data.operating.net,
        },
        {
            title: "Actividades de Inversión",
            subtitle: "Investing Activities",
            icon: TrendingUp,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            borderColor: "border-emerald-100",
            items: [
                { label: "Adquisición de activos fijos", amount: 0, isInflow: false },
                { label: "Venta de activos", amount: 0, isInflow: true },
                { label: "Inversiones financieras", amount: 0, isInflow: false },
            ],
            total: 0,
        },
        {
            title: "Actividades de Financiamiento",
            subtitle: "Financing Activities",
            icon: Landmark,
            color: "text-violet-600",
            bg: "bg-violet-50",
            borderColor: "border-violet-100",
            items: [
                { label: "Préstamos bancarios recibidos", amount: 0, isInflow: true },
                { label: "Pago de deudas financieras", amount: 0, isInflow: false },
                { label: "Aportes de socios", amount: 0, isInflow: true },
                { label: "Distribución de dividendos", amount: 0, isInflow: false },
            ],
            total: 0,
        }
    ];

    const netCashChange = sections.reduce((sum, s) => sum + s.total, 0);
    const isPositive = netCashChange >= 0;

    const fmt = (n: number) => `$${Math.abs(n).toLocaleString('es-CO')}`;

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header */}
            <VisualReportHeader
                title="Estado de Flujo de Efectivo"
                subtitle={`${startDate} » ${endDate}`}
                tenant={tenant}
            />

            {/* Summary Strip */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-1">
                <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em] leading-none mb-3">Variación Neta del Efectivo</span>
                        <div className="flex items-center gap-4">
                            <h2 className={cn(
                                "text-5xl font-black tracking-tighter italic leading-none",
                                isPositive ? 'text-emerald-600' : 'text-rose-600'
                            )}>
                                {isPositive ? '+' : '-'}{fmt(netCashChange)}
                            </h2>
                            <Badge className={cn(
                                "h-8 px-4 rounded-full border-none font-black text-[10px] tracking-widest flex items-center gap-2",
                                isPositive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            )}>
                                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {isPositive ? 'INCREMENTO' : 'DECREMENTO'}
                            </Badge>
                        </div>
                    </div>
                </div>
                <ReportingFilters />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                        <DollarSign className="h-24 w-24 text-slate-900" />
                    </div>
                    <div className="space-y-4 relative z-10">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Actual de Caja</p>
                            <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{fmt(data.totalCash)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <ArrowUpRight className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Entradas</p>
                            <p className="text-2xl font-black text-emerald-600 italic tracking-tighter">{fmt(data.operating.inflows)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                            <ArrowDownRight className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Salidas</p>
                            <p className="text-2xl font-black text-rose-600 italic tracking-tighter">{fmt(data.operating.outflows)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-slate-900 rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all text-white relative overflow-hidden">
                    <div className="absolute -bottom-6 -right-6 opacity-10 pointer-events-none">
                        <ArrowLeftRight className="h-32 w-32" />
                    </div>
                    <div className="space-y-4 relative z-10">
                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
                            <ArrowLeftRight className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Transacciones</p>
                            <p className="text-2xl font-black text-white italic tracking-tighter">{data.transactionCount}</p>
                            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-1">{data.transferCount} transferencias</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Cash Flow Sections */}
            <div className="space-y-10">
                {sections.map((section, idx) => (
                    <Card key={section.title} className={cn("border shadow-premium bg-white rounded-[3rem] overflow-hidden", section.borderColor)}>
                        {/* Section Header */}
                        <div className={cn("px-10 py-8 flex items-center gap-5 border-b", section.borderColor, section.bg)}>
                            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", section.bg, section.color)}>
                                <section.icon className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-black text-slate-900 tracking-tight italic">{section.title}</h3>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">{section.subtitle}</p>
                            </div>
                            <Badge className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-5 py-2 rounded-full border-none",
                                section.total >= 0
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-rose-50 text-rose-600"
                            )}>
                                {section.total >= 0 ? '+' : '-'}{fmt(section.total)}
                            </Badge>
                        </div>

                        {/* Items Table */}
                        <div className="divide-y divide-slate-50">
                            {section.items.map((item, i) => (
                                <div key={i} className="px-10 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "h-8 w-8 rounded-lg flex items-center justify-center",
                                            item.isInflow ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"
                                        )}>
                                            {item.isInflow ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{item.label}</span>
                                    </div>
                                    <span className={cn(
                                        "text-sm font-black italic tabular-nums",
                                        item.isInflow ? "text-emerald-600" : "text-rose-600",
                                        item.amount === 0 && "text-slate-300"
                                    )}>
                                        {item.isInflow ? '+' : '-'}{fmt(item.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Section Total */}
                        <div className={cn("px-10 py-6 flex items-center justify-between border-t", section.borderColor, section.bg)}>
                            <span className="text-xs font-black text-slate-900 uppercase tracking-widest italic">
                                Flujo Neto • {section.title}
                            </span>
                            <span className={cn(
                                "text-xl font-black italic tracking-tighter",
                                section.total >= 0 ? "text-emerald-600" : "text-rose-600"
                            )}>
                                {section.total >= 0 ? '+' : '-'}{fmt(section.total)}
                            </span>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Grand Total Bar */}
            <div className={cn(
                "rounded-[3rem] p-10 shadow-active relative overflow-hidden",
                isPositive ? "bg-slate-900 text-white" : "bg-rose-900 text-white"
            )}>
                <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
                    <DollarSign className="h-48 w-48" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em]">Variación Neta Total del Efectivo</p>
                        <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter">
                            {isPositive ? '+' : '-'}{fmt(netCashChange)}
                        </h2>
                        <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                            Operación + Inversión + Financiamiento • Periodo {startDate} a {endDate}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Saldo Final de Caja</p>
                            <p className="text-3xl font-black italic tracking-tighter">{fmt(data.totalCash)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Accounts Detail */}
            <Card className="border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
                <div className="px-10 py-8 bg-slate-50 border-b border-slate-100">
                    <h3 className="text-lg font-black text-slate-900 italic tracking-tight">Detalle de Cuentas</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Saldo actual por cuenta bancaria y caja</p>
                </div>
                <div className="divide-y divide-slate-50">
                    {data.accountDetails.map((acc: { name: string; type: string; balance: number }, i: number) => (
                        <div key={i} className="px-10 py-5 flex items-center justify-between hover:bg-slate-50/30 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center",
                                    acc.type === 'BANK' ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                                )}>
                                    {acc.type === 'BANK' ? <Landmark className="h-5 w-5" /> : <DollarSign className="h-5 w-5" />}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900">{acc.name}</p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{acc.type === 'BANK' ? 'Cuenta Bancaria' : 'Caja'}</p>
                                </div>
                            </div>
                            <span className="text-lg font-black text-slate-900 italic tabular-nums">{fmt(acc.balance)}</span>
                        </div>
                    ))}
                    {data.accountDetails.length === 0 && (
                        <div className="px-10 py-16 text-center">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No hay cuentas configuradas</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Footnote */}
            <div className="bg-slate-50 p-12 rounded-[3.5rem] border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="flex items-center gap-8">
                    <div className="h-16 w-16 bg-white rounded-3xl flex items-center justify-center text-slate-300 shadow-premium border border-slate-50">
                        <Info className="h-8 w-8" />
                    </div>
                    <div className="space-y-1">
                        <h5 className="text-slate-900 font-black text-sm uppercase italic tracking-tight">Método: Directo</h5>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                            Estado preparado bajo el método directo conforme a NIC 7 / NIIF para el periodo seleccionado.
                        </p>
                    </div>
                </div>
                <Button variant="outline" className="h-14 rounded-2xl border-slate-200 text-[10px] font-black uppercase tracking-widest px-8 hover:bg-white hover:shadow-premium transition-all">
                    Exportar Informe <ArrowRight className="ml-3 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
