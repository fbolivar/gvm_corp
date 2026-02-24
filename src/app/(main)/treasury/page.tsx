import { createClient } from '@/lib/supabase/server';
import { treasuryService } from '@/features/treasury/services/treasuryService';
import { Button } from "@/shared/components/ui/button";
import {
    Plus,
    Wallet,
    ArrowUpCircle,
    ArrowDownCircle,
    Clock,
    Landmark,
    ArrowRightLeft,
    TrendingUp,
    Search,
    Cpu,
    Target,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    ChevronRight,
    Zap,
    ShieldCheck
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

    // Auth protection
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [accounts, transactions, tenant, ar, ap] = await Promise.all([
        treasuryService.getAccounts(supabase),
        treasuryService.getTransactions(supabase),
        settingsService.getTenantInfo(supabase),
        supabase.from('documents').select('*').eq('doc_type', 'INVOICE').neq('status', 'SENT'),
        supabase.from('documents').select('*').eq('doc_type', 'VENDOR_BILL').neq('status', 'SENT')
    ]);

    const totalLiquidity = accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
    const arData = ar.data || [];
    const apData = ap.data || [];

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* 💎 PREMIUM HEADER INDUSTRIAL V3 */}
            <VisualReportHeader
                title="Centro de Control de Tesorería"
                subtitle="Gestión de Liquidez & Protocolos Bancarios"
                tenant={tenant}
            />

            {/* 📊 ACCESO RÁPIDO & ACCIONES */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="rounded-[3rem] bg-slate-900 text-white p-8 space-y-8 shadow-active relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Landmark className="h-24 w-24" />
                    </div>
                    <div className="space-y-4 relative z-10">
                        <h3 className="text-xl font-black italic uppercase tracking-tighter">Gestión de Liquidez</h3>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                            Control centralizado de cuentas bancarias y flujo de caja operativo.
                        </p>
                    </div>
                    <div className="flex gap-3 relative z-10">
                        <Button asChild className="h-14 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-black text-[10px] uppercase tracking-widest gap-2 flex-1 shadow-active">
                            <Link href="/treasury/new?type=RECEIPT">
                                <Plus className="h-5 w-5" /> Recibo (Ingreso)
                            </Link>
                        </Button>
                        <Button asChild className="h-14 px-8 rounded-2xl bg-rose-600 hover:bg-rose-500 font-black text-[10px] uppercase tracking-widest gap-2 flex-1 shadow-active">
                            <Link href="/treasury/new?type=PAYMENT">
                                <Plus className="h-5 w-5" /> Pago (Egreso)
                            </Link>
                        </Button>
                    </div>
                </Card>

                <Card className="rounded-[3rem] bg-white p-10 flex flex-col justify-between items-start shadow-premium group border border-slate-50 relative overflow-hidden">
                    <div className="absolute -bottom-10 -right-10 opacity-[0.03] group-hover:scale-110 transition-transform">
                        <Activity className="h-40 w-40 text-slate-900" />
                    </div>
                    <div className="space-y-2 relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disponibilidad en Cuentas</span>
                        </div>
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter italic leading-none">
                            ${totalLiquidity.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                        </h2>
                    </div>
                    <Button variant="ghost" asChild className="h-12 mt-6 px-6 rounded-xl text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-black text-[9px] uppercase tracking-widest gap-2">
                        <Link href="/treasury/reconcile">
                            <Clock className="h-4 w-4" /> Ejecutar Conciliación
                        </Link>
                    </Button>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-[3rem] p-8 border border-slate-100 flex flex-col justify-between group hover:bg-indigo-50 transition-colors">
                        <div className="h-12 w-12 rounded-2xl bg-white shadow-premium flex items-center justify-center text-indigo-600 mb-4">
                            <ArrowUpRight className="h-6 w-6" />
                        </div>
                        <div className="space-y-1 text-center lg:text-left">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cartera Activa</p>
                            <h4 className="text-2xl font-black text-indigo-600 tracking-tighter italic">$245M+</h4>
                        </div>
                    </div>
                    <Link href="/treasury/test-reconciliation" className="bg-slate-950 rounded-[3rem] p-8 border border-white/5 flex flex-col justify-between group hover:bg-indigo-900 transition-all shadow-active overflow-hidden relative">
                        <Zap className="absolute -bottom-4 -right-4 h-24 w-24 text-white/5 rotate-12" />
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center text-indigo-400 mb-4">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div className="space-y-1 relative z-10">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Integrity Lab</p>
                            <h4 className="text-xl font-black text-white tracking-tighter italic uppercase group-hover:text-indigo-400">Validación V3</h4>
                        </div>
                    </Link>
                </div>
            </div>

            {/* 📊 LIQUIDITY & BREAK-EVEN PULSE */}
            <LiquidityReport ar={arData} ap={apData} totalLiquidity={totalLiquidity} />

            {/* 🏦 NODOS FINANCIEROS (Bank Accounts) */}
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
                    <div className="space-y-2 text-center md:text-left">
                        <div className="flex items-center gap-3 justify-center md:justify-start">
                            <Cpu className="h-5 w-5 text-indigo-500" />
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">Nodos de Dispersión</h2>
                        </div>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest pl-1">Protocolos de Tesorería Activos</p>
                    </div>
                    <Button variant="ghost" className="h-12 text-slate-400 hover:bg-slate-100 font-black uppercase text-[10px] tracking-[0.3em] px-8 rounded-full border border-slate-100" asChild>
                        <Link href="/treasury/accounts/new">
                            <Plus className="h-4 w-4 mr-3" /> Vincular Recurso
                        </Link>
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {accounts.map((account) => (
                        <Card key={account.id} className="rounded-[3.5rem] bg-white border-none shadow-premium hover:shadow-active transition-all group overflow-hidden relative border border-slate-50">
                            <CardContent className="p-10 space-y-8 relative z-10">
                                <div className="flex items-center justify-between">
                                    <div className={cn(
                                        "h-16 w-16 rounded-[1.5rem] flex items-center justify-center shadow-premium transition-transform group-hover:rotate-6 duration-700",
                                        account.type === 'BANK' ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                                    )}>
                                        {account.type === 'BANK' ? <Landmark className="h-8 w-8" /> : <Wallet className="h-8 w-8" />}
                                    </div>
                                    <Badge variant="outline" className="text-[10px] font-black text-slate-300 uppercase tracking-widest border-none italic">
                                        ESTADO: ACTIVO
                                    </Badge>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic leading-tight group-hover:text-primary transition-colors">{account.name}</h3>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">{account.bank_name || 'Efectivo Caja'}</span>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-slate-100/50">
                                    <div className="text-4xl font-black text-slate-900 tracking-tighter font-mono italic leading-none">
                                        ${account.balance?.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                    </div>
                                    <div className="flex items-center gap-2 mt-4">
                                        <Badge className="bg-emerald-500 text-white border-none text-[8px] px-2.5 py-0.5 font-black uppercase tracking-widest rounded-full shadow-sm">Auditado</Badge>
                                        <Zap className="h-3 w-3 text-emerald-400" />
                                    </div>
                                </div>
                            </CardContent>

                            <Button variant="ghost" className="absolute top-4 right-4 h-12 w-12 rounded-2xl text-slate-200 hover:text-primary hover:bg-slate-50 transition-all opacity-0 group-hover:opacity-100" asChild>
                                <Link href={`/treasury/accounts/${account.id}`}>
                                    <ChevronRight className="h-6 w-6" />
                                </Link>
                            </Button>
                        </Card>
                    ))}
                </div>
            </div>

            {/* 🧾 HISTORIAL DE MOVIMIENTOS (Modern Table) */}
            <div className="space-y-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-4">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-active">
                            <ArrowRightLeft className="h-7 w-7" />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase leading-none">Flujo Operativo</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Protocolo de Movimientos Consolidado</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative group flex-1 md:flex-none">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                            <input
                                placeholder="Ref / Tercero / Concepto..."
                                className="h-16 pl-14 pr-10 rounded-full border-none bg-white shadow-premium text-[10px] font-black uppercase tracking-widest w-full md:w-80 focus:ring-2 focus:ring-indigo-100 transition-all"
                            />
                        </div>
                        <Button variant="outline" className="h-16 w-16 rounded-full bg-white shadow-premium border-none text-slate-400 hover:text-slate-900">
                            <Search className="h-6 w-6" />
                        </Button>
                    </div>
                </div>

                <TreasuryTransactionTable transactions={transactions} tenant={tenant} />
            </div>
        </div>
    );
}
