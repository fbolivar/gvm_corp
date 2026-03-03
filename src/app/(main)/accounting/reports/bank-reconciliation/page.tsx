import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    Banknote,
    ArrowRight,
    CheckCircle2,
    Clock,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Building2,
    Hash,
} from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import Link from 'next/link';
import { ReconcileButton } from './ReconcileButton';

const PERIOD_OPTIONS = [
    { label: 'Ene', month: 1 }, { label: 'Feb', month: 2 }, { label: 'Mar', month: 3 },
    { label: 'Abr', month: 4 }, { label: 'May', month: 5 }, { label: 'Jun', month: 6 },
    { label: 'Jul', month: 7 }, { label: 'Ago', month: 8 }, { label: 'Sep', month: 9 },
    { label: 'Oct', month: 10 }, { label: 'Nov', month: 11 }, { label: 'Dic', month: 12 },
];

export default async function BankReconciliationPage({
    searchParams
}: {
    searchParams: Promise<{ month?: string; year?: string; account?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const now = new Date();
    const year  = parseInt(params.year  ?? String(now.getFullYear()), 10);
    const month = parseInt(params.month ?? String(now.getMonth() + 1), 10);
    const periodLabel = `${PERIOD_OPTIONS[month - 1].label} ${year}`;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay   = new Date(year, month, 0).getDate();
    const endDate   = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    const tenant = await settingsService.getTenantInfo(supabase);

    // Fetch bank accounts
    const { data: accounts } = await supabase
        .from('treasury_accounts')
        .select('id, name, bank_name, account_number, balance, type')
        .order('name');

    const accts = accounts ?? [];
    const selectedAccountId = params.account ?? accts[0]?.id ?? null;
    const selectedAccount   = accts.find(a => a.id === selectedAccountId) ?? accts[0] ?? null;

    // Fetch transactions for selected account in period
    let txQuery = supabase
        .from('treasury_transactions')
        .select('*, party:parties(legal_name)')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

    if (selectedAccountId) {
        txQuery = txQuery.eq('account_id', selectedAccountId);
    }

    const { data: transactions } = await txQuery;
    const txs = transactions ?? [];

    // KPIs
    const reconciled   = txs.filter(t => t.is_reconciled);
    const pending      = txs.filter(t => !t.is_reconciled);
    const totalInflow  = txs.filter(t => ['RECEIPT', 'TRANSFER_IN'].includes(t.transaction_type))
        .reduce((s, t) => s + Number(t.amount), 0);
    const totalOutflow = txs.filter(t => ['PAYMENT', 'TRANSFER_OUT'].includes(t.transaction_type))
        .reduce((s, t) => s + Number(t.amount), 0);
    const pendingAmt   = pending.reduce((s, t) => s + Number(t.amount), 0);
    const reconciledPct = txs.length > 0 ? ((reconciled.length / txs.length) * 100).toFixed(0) : '100';

    const fmt = (n: number) =>
        `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    const TYPE_CONFIG: Record<string, { label: string; cls: string }> = {
        RECEIPT:      { label: 'Ingreso',   cls: 'bg-emerald-50 text-emerald-700' },
        PAYMENT:      { label: 'Egreso',    cls: 'bg-rose-50 text-rose-600' },
        TRANSFER_IN:  { label: 'Transf. +', cls: 'bg-sky-50 text-sky-600' },
        TRANSFER_OUT: { label: 'Transf. -', cls: 'bg-indigo-50 text-indigo-600' },
    };

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            <VisualReportHeader
                title="Conciliación Bancaria"
                subtitle={`Cruce extracto vs libros · ${periodLabel}`}
                tenant={tenant}
            />

            {/* Account Selector + Period */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">
                        Saldo en Libros
                    </span>
                    <div className="flex items-baseline gap-4">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                            {fmt(Number(selectedAccount?.balance ?? 0))}
                        </h2>
                        <span className="text-lg font-black text-slate-300 uppercase italic tracking-widest">
                            {selectedAccount?.bank_name ?? selectedAccount?.name ?? 'Cuenta'}
                        </span>
                    </div>
                    {selectedAccount?.account_number && (
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">
                            {selectedAccount.account_number}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-3 items-end">
                    {/* Account pills */}
                    <div className="flex flex-wrap gap-2">
                        {accts.map(a => (
                            <Link key={a.id} href={`?account=${a.id}&month=${month}&year=${year}`}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                                    a.id === selectedAccountId
                                        ? "bg-slate-900 text-white border-slate-900"
                                        : "bg-white text-slate-400 border-slate-100 hover:border-slate-300"
                                )}>
                                {a.name}
                            </Link>
                        ))}
                    </div>
                    {/* Month tabs */}
                    <div className="flex flex-wrap gap-1 bg-slate-100 p-1.5 rounded-2xl">
                        {PERIOD_OPTIONS.map(p => (
                            <Link key={p.month} href={`?account=${selectedAccountId}&month=${p.month}&year=${year}`}
                                className={cn(
                                    "px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                    month === p.month ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}>
                                {p.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ingresos</p>
                            <p className="text-xl font-black text-emerald-600 italic">{fmt(totalInflow)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                            <TrendingDown className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Egresos</p>
                            <p className="text-xl font-black text-rose-500 italic">{fmt(totalOutflow)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Conciliadas</p>
                            <p className="text-xl font-black text-indigo-600 italic">{reconciled.length} / {txs.length}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pendientes</p>
                            <p className="text-xl font-black text-amber-600 italic">{fmt(pendingAmt)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-active bg-slate-900 rounded-[2.5rem] p-8 text-white">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
                            <Banknote className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">% Conciliado</p>
                            <p className="text-xl font-black text-white italic">{reconciledPct}%</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Transactions Table */}
            <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">
                            Movimientos del Periodo
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            {startDate} – {endDate} · {txs.length} movimientos
                        </p>
                    </div>
                    {pending.length > 0 && (
                        <div className="flex items-center gap-2 bg-amber-50 px-5 py-2.5 rounded-2xl">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">{pending.length} sin conciliar</span>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-8 py-5 text-left   text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                <th className="px-8 py-5 text-left   text-[9px] font-black text-slate-400 uppercase tracking-widest">Descripción</th>
                                <th className="px-8 py-5 text-left   text-[9px] font-black text-slate-400 uppercase tracking-widest">Referencia</th>
                                <th className="px-8 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                <th className="px-8 py-5 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">Monto</th>
                                <th className="px-8 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {txs.map(tx => {
                                const cfg      = TYPE_CONFIG[tx.transaction_type] ?? { label: tx.transaction_type, cls: 'bg-slate-50 text-slate-500' };
                                const isInflow = ['RECEIPT', 'TRANSFER_IN'].includes(tx.transaction_type);
                                const party    = tx.party as any;

                                return (
                                    <tr key={tx.id} className={cn(
                                        "hover:bg-slate-50/50 transition-colors group",
                                        !tx.is_reconciled && "bg-amber-50/20"
                                    )}>
                                        <td className="px-8 py-4">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{tx.date}</span>
                                        </td>
                                        <td className="px-8 py-4 max-w-[220px]">
                                            <p className="text-xs font-black text-slate-800 italic truncate">{tx.description ?? '—'}</p>
                                            {party?.legal_name && (
                                                <p className="text-[9px] text-slate-400 font-bold">{party.legal_name}</p>
                                            )}
                                        </td>
                                        <td className="px-8 py-4">
                                            {tx.reference_number ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Hash className="h-3 w-3 text-slate-300" />
                                                    <span className="text-[9px] font-mono text-slate-400">{tx.reference_number}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] text-slate-200 font-bold">—</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                            <Badge className={cn("border-none text-[8px] font-black uppercase tracking-[0.15em] px-2.5 py-0.5 rounded-md", cfg.cls)}>
                                                {cfg.label}
                                            </Badge>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <span className={cn(
                                                "text-sm font-black tabular-nums italic",
                                                isInflow ? "text-emerald-600" : "text-rose-500"
                                            )}>
                                                {isInflow ? '+' : '-'}{fmt(Number(tx.amount))}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                            <ReconcileButton
                                                transactionId={tx.id}
                                                isReconciled={tx.is_reconciled ?? false}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}

                            {txs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-10 py-20 text-center">
                                        <Banknote className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                                            Sin movimientos en el periodo
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {txs.length > 0 && (
                    <div className="px-10 py-6 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{reconciled.length} conciliadas</span>
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{pending.length} pendientes · {fmt(pendingAmt)}</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <span className="text-[9px] font-black text-emerald-500 block">Ingresos</span>
                                <span className="text-sm font-black text-emerald-600 italic">{fmt(totalInflow)}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] font-black text-rose-500 block">Egresos</span>
                                <span className="text-sm font-black text-rose-500 italic">{fmt(totalOutflow)}</span>
                            </div>
                            <div className="text-right border-l border-slate-200 pl-6">
                                <span className="text-[9px] font-black text-slate-400 block">Neto</span>
                                <span className="text-lg font-black text-slate-900 italic">{fmt(totalInflow - totalOutflow)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            <div className="bg-slate-100 p-10 rounded-[2.5rem] flex flex-col lg:flex-row items-center justify-between gap-10 border border-slate-200">
                <div className="flex items-center gap-8">
                    <div className="h-14 w-14 bg-white rounded-[2rem] flex items-center justify-center text-indigo-600 shadow-premium border border-white">
                        <Building2 className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-2xl font-black tracking-tight uppercase leading-tight text-slate-900">
                            Proceso de Conciliación
                        </h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-xl">
                            Marca cada transacción como conciliada al cruzarla con el extracto bancario.{' '}
                            Restan <span className="font-black text-slate-900">{pending.length} movimientos</span> por conciliar
                            ({fmt(pendingAmt)}) en {periodLabel}.
                        </p>
                    </div>
                </div>
                <Button variant="outline" className="h-12 rounded-[2rem] border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest px-12 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-premium group shrink-0">
                    Importar Extracto <ArrowRight className="ml-4 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
}
