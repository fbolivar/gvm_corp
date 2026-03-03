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
        treasuryService.getTransactions(supabase, { limit: 20 }),
        settingsService.getTenantInfo(supabase),
        supabase.from('documents').select('id,total,status,due_date').eq('doc_type', 'INVOICE').neq('status', 'SENT'),
        supabase.from('documents').select('id,total,status,due_date').eq('doc_type', 'VENDOR_BILL').neq('status', 'SENT')
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

                <Card className="rounded-[4rem] bg-slate-950 text-white p-10 flex flex-col justify-between items-start shadow-active group border border-slate-800 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    <div className="absolute -bottom-10 -right-10 opacity-[0.05] group-hover:scale-125 group-hover:rotate-12 transition-transform duration-1000">
                        <Activity className="h-56 w-56 text-white" />
                    </div>
                    <div className="space-y-4 relative z-10 w-full">
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm">
                                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
                                <span className="text-[9px] font-black text-emerald-400/90 uppercase tracking-[0.4em] italic">Capital de Trabajo Real</span>
                            </div>
                            <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10 text-[9px] font-black uppercase tracking-widest px-3 py-1">
                                V3 RADAR
                            </Badge>
                        </div>
                        <h2 className="text-5xl lg:text-6xl font-black text-white tracking-tighter italic leading-none group-hover:scale-105 origin-left transition-transform duration-500">
                            <span className="text-2xl text-slate-500 mr-2">$</span>
                            {totalLiquidity.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                        </h2>
                    </div>
                    <Button variant="ghost" asChild className="h-14 mt-8 px-8 rounded-2xl text-slate-950 bg-white hover:bg-slate-200 font-black text-[10px] uppercase tracking-[0.3em] gap-3 shadow-premium group/btn w-full md:w-auto relative z-10 overflow-hidden">
                        <Link href="/treasury/reconcile">
                            <Clock className="h-5 w-5 group-hover/btn:-rotate-90 transition-transform duration-500" /> Ejecutar Conciliación IA
                        </Link>
                    </Button>
                </Card>

                <div className="bg-slate-50 rounded-[3rem] p-8 border border-slate-100 flex flex-col justify-between group hover:bg-indigo-50 transition-colors">
                    <div className="h-12 w-12 rounded-2xl bg-white shadow-premium flex items-center justify-center text-indigo-600 mb-4">
                        <ArrowUpRight className="h-6 w-6" />
                    </div>
                    <div className="space-y-1 text-center lg:text-left">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cartera Activa</p>
                        <h4 className="text-2xl font-black text-indigo-600 tracking-tighter italic">$245M+</h4>
                    </div>
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
                        <Card key={account.id} className="rounded-[4rem] bg-white hover:bg-slate-950 hover:text-white border-none shadow-premium hover:shadow-active transition-all duration-700 group overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-12 opacity-0 group-hover:opacity-[0.05] pointer-events-none group-hover:scale-150 transition-all duration-1000">
                                {account.type === 'BANK' ? <Landmark className="h-48 w-48 text-white" /> : <Wallet className="h-48 w-48 text-white" />}
                            </div>
                            <CardContent className="p-10 space-y-10 relative z-10">
                                <div className="flex items-center justify-between">
                                    <div className={cn(
                                        "h-20 w-20 rounded-[2rem] flex items-center justify-center shadow-active transition-all group-hover:rotate-12 group-hover:scale-110 duration-700",
                                        account.type === 'BANK' ? "bg-indigo-600 text-white shadow-indigo-600/30" : "bg-emerald-600 text-white shadow-emerald-600/30"
                                    )}>
                                        {account.type === 'BANK' ? <Landmark className="h-10 w-10" /> : <Wallet className="h-10 w-10" />}
                                    </div>
                                    <Badge variant="outline" className="text-[9px] font-black text-slate-400 group-hover:text-white/50 uppercase tracking-[0.3em] border-slate-200 group-hover:border-white/10 italic px-4 py-2 rounded-full">
                                        ESTADO: ACTIVO
                                    </Badge>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-3xl font-black text-slate-900 group-hover:text-white tracking-tighter italic leading-tight transition-colors truncate">{account.name}</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1 bg-slate-100 group-hover:bg-white/10 rounded-lg max-w-fit">
                                            <span className="text-[10px] font-bold text-slate-500 group-hover:text-white/70 tracking-widest truncate">{account.bank_name || 'Efectivo Caja Central'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-slate-100 group-hover:border-white/10 transition-colors">
                                    <p className="text-[10px] font-black text-slate-400 group-hover:text-white/40 uppercase tracking-[0.4em] mb-2">Flujo Disponible</p>
                                    <div className="text-4xl font-black text-slate-900 group-hover:text-white tracking-tighter font-mono italic leading-none transition-colors group-hover:scale-105 origin-left duration-500">
                                        <span className="text-xl text-slate-300 group-hover:text-white/30 mr-1">$</span>
                                        {account.balance?.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                    </div>
                                    <div className="flex items-center gap-3 mt-6">
                                        <Badge className="bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 border border-emerald-200 group-hover:border-emerald-500/30 text-[9px] px-4 py-1.5 font-black uppercase tracking-[0.3em] rounded-full shadow-sm">Auditado Radar</Badge>
                                        <ShieldCheck className="h-4 w-4 text-emerald-500 group-hover:text-emerald-400 animate-pulse" />
                                    </div>
                                </div>
                            </CardContent>

                            <Button variant="ghost" className="absolute top-6 right-6 h-14 w-14 rounded-full bg-slate-100 text-slate-400 group-hover:text-white group-hover:bg-white/10 transition-all shadow-premium hover:scale-110 active:scale-95 z-20" asChild>
                                <Link href={`/treasury/accounts/${account.id}`}>
                                    <ArrowUpRight className="h-6 w-6 group-hover:rotate-45 transition-transform duration-500" />
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
