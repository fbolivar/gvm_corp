import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { treasuryService } from '@/features/treasury/services/treasuryService';
import { ReportingFilters } from '@/features/accounting/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import {
    Banknote,
    CheckCircle2,
    AlertCircle,
    History,
    ArrowRightLeft,
    TrendingUp,
    ShieldCheck,
    Search,
    Calendar,
    Filter
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function BankReconciliationPage({
    searchParams
}: {
    searchParams: any
}) {
    const supabase = await createClient();
    const filters = await searchParams;

    // Resolve Tenant
    const tenant = await settingsService.getTenantInfo(supabase);

    // Fetch Accounts
    const accounts = await treasuryService.getAccounts(supabase);
    const selectedAccountId = filters.account_id || accounts[0]?.id;
    const selectedAccount = accounts.find(a => a.id === selectedAccountId);

    // Fetch Transactions for Reconcilation Analysis
    const { data: transactions, error } = await supabase
        .from('treasury_transactions')
        .select('*, party:parties(legal_name)')
        .eq('account_id', selectedAccountId)
        .order('date', { ascending: false })
        .limit(50);

    const reconciled = transactions?.filter(t => t.is_reconciled) || [];
    const pending = transactions?.filter(t => !t.is_reconciled) || [];

    const stats = {
        total: transactions?.length || 0,
        reconciledCount: reconciled.length,
        pendingCount: pending.length,
        reconciledAmount: reconciled.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        pendingAmount: pending.reduce((sum, t) => sum + Math.abs(t.amount), 0),
        completeness: transactions?.length ? (reconciled.length / transactions.length) * 100 : 0
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20">
            {/* 🏎️ RECONCILIATION DASHBOARD HEADER */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[4rem] p-12 text-white shadow-active border border-white/5">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                    <History className="h-48 w-48 text-indigo-500" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Control de Integridad Bancaria</span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter italic uppercase leading-tight">
                            Conciliación<br />
                            <span className="text-indigo-400">Bancaria Maestro</span>
                        </h1>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.3em] flex items-center gap-2">
                            {selectedAccount?.name} // {selectedAccount?.bank_name} // {selectedAccount?.account_number}
                        </p>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-6 text-center md:text-right">
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-md">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Nivel de Coincidencia</p>
                            <p className="text-5xl font-black italic text-white tracking-tighter">{stats.completeness.toFixed(1)}%</p>
                            <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                                <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${stats.completeness}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 📊 KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="rounded-[3rem] border-none bg-emerald-500/10 shadow-sm overflow-hidden group">
                    <CardContent className="p-10 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-emerald-600/50 uppercase tracking-widest">Partidas Conciliadas</p>
                            <h3 className="text-3xl font-black italic text-emerald-900">{stats.reconciledCount}</h3>
                            <p className="text-xs font-bold text-emerald-700/60 uppercase">{stats.reconciledAmount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
                        </div>
                        <CheckCircle2 className="h-12 w-12 text-emerald-500 opacity-20 group-hover:opacity-40 transition-opacity" />
                    </CardContent>
                </Card>

                <Card className="rounded-[3rem] border-none bg-amber-500/10 shadow-sm overflow-hidden group">
                    <CardContent className="p-10 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-amber-600/50 uppercase tracking-widest">Partidas Pendientes</p>
                            <h3 className="text-3xl font-black italic text-amber-900">{stats.pendingCount}</h3>
                            <p className="text-xs font-bold text-amber-700/60 uppercase">{stats.pendingAmount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</p>
                        </div>
                        <AlertCircle className="h-12 w-12 text-amber-500 opacity-20 group-hover:opacity-40 transition-opacity" />
                    </CardContent>
                </Card>

                <Card className="rounded-[3rem] border-none bg-indigo-500/10 shadow-sm overflow-hidden group">
                    <CardContent className="p-10 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-indigo-600/50 uppercase tracking-widest">Saldo en Libros</p>
                            <h3 className="text-3xl font-black italic text-indigo-900">
                                {selectedAccount?.balance.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
                            </h3>
                            <p className="text-xs font-bold text-indigo-700/60 uppercase">Efectivo Disponible</p>
                        </div>
                        <Banknote className="h-12 w-12 text-indigo-500 opacity-20 group-hover:opacity-40 transition-opacity" />
                    </CardContent>
                </Card>
            </div>

            {/* 📋 TRANSACTION MASTER TABLE */}
            <Card className="rounded-[3.5rem] border-none shadow-premium bg-white overflow-hidden group">
                <CardHeader className="p-12 border-b border-slate-50 flex flex-row items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-6">
                        <div className="h-14 w-14 bg-slate-950 rounded-2xl flex items-center justify-center shadow-active rotate-3 group-hover:rotate-0 transition-all">
                            <ArrowRightLeft className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-black italic tracking-tighter uppercase">Bitácora de Conciliación</CardTitle>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Comparativa de Movimientos de Tesorería vs Banco</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="h-12 w-12 rounded-xl bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer">
                            <Search className="h-5 w-5" />
                        </div>
                        <div className="h-12 px-6 rounded-xl bg-slate-950 text-white flex items-center gap-3 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-900 transition-all">
                            <Filter className="h-4 w-4" /> Filtros
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-50 hover:bg-transparent">
                                <TableHead className="pl-12 py-8 text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha Operativa</TableHead>
                                <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tercero / Concepto</TableHead>
                                <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Referencia</TableHead>
                                <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Monto</TableHead>
                                <TableHead className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</TableHead>
                                <TableHead className="pr-12 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Auditado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions?.map((t) => (
                                <TableRow key={t.id} className="group/row transition-all hover:bg-indigo-50/30 border-slate-50">
                                    <TableCell className="pl-12 py-8">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 group-hover/row:bg-white transition-colors">
                                                <Calendar className="h-4 w-4" />
                                            </div>
                                            <span className="text-sm font-black text-slate-900 italic">
                                                {format(new Date(t.date), 'MMM dd, yyyy', { locale: es }).toUpperCase()}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{t.party?.legal_name || 'MOVIMIENTO INTERNO'}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[200px]">{t.description}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="rounded-lg border-slate-100 bg-slate-50 text-[9px] font-black text-slate-500 px-3 uppercase truncate max-w-[120px]">
                                            {t.reference_number || 'S/R'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={cn(
                                            "text-lg font-black italic tracking-tighter",
                                            t.amount >= 0 ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                            {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={cn(
                                            "rounded-full px-4 py-1.5 font-black text-[9px] tracking-widest uppercase border-none",
                                            t.is_reconciled
                                                ? "bg-emerald-500/10 text-emerald-600"
                                                : "bg-amber-500/10 text-amber-600 animate-pulse"
                                        )}>
                                            {t.is_reconciled ? 'Conciliado' : 'Pendiente'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-12">
                                        <div className="flex items-center justify-end gap-3 text-slate-300">
                                            {t.is_reconciled ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black uppercase text-slate-400">Verificado</span>
                                                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black uppercase text-slate-300">Esperando Banco</span>
                                                    <TrendingUp className="h-5 w-5 opacity-20" />
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {(!transactions || transactions.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-32 text-center opacity-30">
                                        <History className="h-16 w-16 mx-auto mb-6" />
                                        <p className="text-xs font-black uppercase tracking-[0.4em]">No hay movimientos registrados en este periodo</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* 🛡️ SECURITY AUDIT FOOTER */}
            <div className="bg-slate-100 rounded-[3rem] p-10 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="p-3 bg-white rounded-2xl shadow-sm">
                        <ShieldCheck className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Sello de Integridad Financiera</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Última Auditoría en Tiempo Real: {format(new Date(), "HH:mm:ss")}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">&copy; 2026 GVM ERP INTEGRAL // FACTORY V3</p>
                </div>
            </div>
        </div>
    );
}
