import { createClient } from '@/lib/supabase/server';
import { treasuryService } from '@/features/treasury/services/treasuryService';
import { Button } from "@/shared/components/ui/button";
import {
    Plus,
    Wallet,
    ArrowRightLeft,
    Search,
    Landmark,
    ArrowUpRight,
    Clock,
    ShieldCheck,
    TrendingUp,
    TrendingDown,
    DollarSign,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { redirect } from 'next/navigation';
import { TreasuryTransactionTable } from '@/features/treasury/components/TreasuryTransactionTable';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { settingsService } from '@/features/settings/services/settingsService';
import { cn } from "@/shared/lib/utils";
import { LiquidityReport } from '@/features/treasury/components/LiquidityReport';

export default async function TreasuryPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [accounts, transactions, tenant, arResult, apResult] = await Promise.all([
        treasuryService.getAccounts(supabase),
        treasuryService.getTransactions(supabase, { limit: 20 }),
        settingsService.getTenantInfo(supabase),
        supabase.from('documents').select('id,total,status,due_date').eq('doc_type', 'INVOICE').neq('status', 'SENT').then(r => r.data ?? []),
        supabase.from('documents').select('id,total,status,due_date').eq('doc_type', 'VENDOR_BILL').neq('status', 'SENT').then(r => r.data ?? [])
    ]);

    const totalLiquidity = accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
    const arData = arResult as { id: string; total: number; status: string; due_date: string }[];
    const apData = apResult as { id: string; total: number; status: string; due_date: string }[];
    const totalAR = arData.reduce((sum, d) => sum + Number(d.total), 0);
    const totalAP = apData.reduce((sum, d) => sum + Number(d.total), 0);

    const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 0 });

    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in duration-500">

            <VisualReportHeader
                title="Centro de Tesorería"
                subtitle="Gestión de Liquidez & Operaciones Bancarias"
                tenant={tenant}
            />

            {/* ACCIONES RÁPIDAS + SALDO TOTAL */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Acciones */}
                <Card className="rounded-2xl bg-slate-900 text-white p-6 space-y-5 shadow-md relative overflow-hidden">
                    <div className="space-y-1">
                        <h3 className="text-base font-bold">Operaciones</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Registrar ingresos y egresos de tesorería.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button asChild className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs gap-2 flex-1">
                            <Link href="/treasury/new?type=RECEIPT">
                                <Plus className="h-4 w-4" /> Recibo
                            </Link>
                        </Button>
                        <Button asChild className="h-11 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 font-semibold text-xs gap-2 flex-1">
                            <Link href="/treasury/new?type=PAYMENT">
                                <Plus className="h-4 w-4" /> Pago
                            </Link>
                        </Button>
                    </div>
                    <Button variant="ghost" asChild className="h-10 w-full rounded-xl text-white/70 hover:text-white hover:bg-white/10 font-medium text-xs gap-2 border border-white/10">
                        <Link href="/treasury/reconcile">
                            <Clock className="h-4 w-4" /> Conciliación Bancaria
                        </Link>
                    </Button>
                </Card>

                {/* Saldo Total */}
                <Card className="rounded-2xl bg-slate-950 text-white p-6 flex flex-col justify-between shadow-md border border-slate-800">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Capital de Trabajo</span>
                        </div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">
                            <span className="text-lg text-slate-500 mr-1">$</span>
                            {fmt(totalLiquidity)}
                        </h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                            Liquidez disponible en {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </Card>

                {/* KPIs rápidos */}
                <div className="grid grid-cols-2 gap-3">
                    <Card className="rounded-2xl bg-white p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">CxC</span>
                        </div>
                        <p className="text-xl font-bold text-slate-900 tracking-tight">${fmt(totalAR)}</p>
                        <p className="text-[10px] text-emerald-600 font-medium mt-1">{arData.length} doc. pendientes</p>
                    </Card>
                    <Card className="rounded-2xl bg-white p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingDown className="h-4 w-4 text-rose-500" />
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">CxP</span>
                        </div>
                        <p className="text-xl font-bold text-slate-900 tracking-tight">${fmt(totalAP)}</p>
                        <p className="text-[10px] text-rose-600 font-medium mt-1">{apData.length} doc. pendientes</p>
                    </Card>
                </div>
            </div>

            {/* LIQUIDITY & BREAK-EVEN REPORT */}
            <LiquidityReport ar={arData} ap={apData} totalLiquidity={totalLiquidity} />

            {/* CUENTAS BANCARIAS */}
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-lg font-bold text-slate-900">Cuentas de Tesorería</h2>
                        <p className="text-xs text-slate-400">Cuentas bancarias y de caja vinculadas</p>
                    </div>
                    <Button variant="outline" className="h-9 px-4 rounded-xl text-xs font-semibold gap-2" asChild>
                        <Link href="/treasury/accounts/new">
                            <Plus className="h-3.5 w-3.5" /> Nueva Cuenta
                        </Link>
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {accounts.map((account) => (
                        <Link key={account.id} href={`/treasury/accounts/${account.id}`}>
                            <Card className="rounded-2xl bg-white hover:bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer h-full">
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center",
                                            account.type === 'BANK' ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                                        )}>
                                            {account.type === 'BANK' ? <Landmark className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                                        </div>
                                        <Badge variant="outline" className="text-[9px] font-medium text-slate-400 uppercase tracking-wider border-slate-200 px-2 py-0.5 rounded-lg">
                                            {account.type === 'BANK' ? 'Banco' : 'Caja'}
                                        </Badge>
                                    </div>

                                    <div className="space-y-1 min-w-0">
                                        <h3 className="text-sm font-bold text-slate-900 leading-snug truncate">{account.name}</h3>
                                        <p className="text-[11px] text-slate-400 truncate">{account.bank_name || 'Efectivo'}</p>
                                    </div>

                                    <div className="pt-3 border-t border-slate-100">
                                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Saldo</p>
                                        <p className={cn(
                                            "text-xl font-bold tracking-tight",
                                            Number(account.balance) >= 0 ? "text-slate-900" : "text-rose-600"
                                        )}>
                                            ${account.balance?.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>

            {/* HISTORIAL DE MOVIMIENTOS */}
            <div className="space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                            <ArrowRightLeft className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Movimientos Recientes</h2>
                            <p className="text-xs text-slate-400">Últimas 20 transacciones registradas</p>
                        </div>
                    </div>
                </div>

                <TreasuryTransactionTable transactions={transactions} tenant={tenant} />
            </div>
        </div>
    );
}
