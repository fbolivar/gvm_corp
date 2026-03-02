import { createClient } from '@/lib/supabase/server';
import { treasuryService } from '@/features/treasury/services/treasuryService';
import { Button } from "@/shared/components/ui/button";
import { Wallet, CheckCircle, Clock, Landmark, Activity, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { settingsService } from '@/features/settings/services/settingsService';
import { Badge } from "@/shared/components/ui/badge";

export default async function ReconcileIndexPage() {
    const supabase = await createClient();
    const [accounts, tenant, statementsRes] = await Promise.all([
        treasuryService.getAccounts(supabase),
        settingsService.getTenantInfo(supabase),
        supabase
            .from('bank_statements')
            .select('id, status, start_date, end_date, opening_balance, closing_balance, account_id, created_at, account:treasury_accounts(name)')
            .order('created_at', { ascending: false })
            .limit(20),
    ]);

    const allStatements       = statementsRes.data ?? [];
    const pendingStatements   = allStatements.filter(s => s.status === 'DRAFT');
    const completedStatements = allStatements.filter(s => s.status === 'COMPLETED').slice(0, 5);

    // Filter only for BANK accounts
    const bankAccounts = accounts.filter(acc => acc.type === 'BANK');

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* 💎 PREMIUM HEADER INDUSTRIAL V3 */}
            <VisualReportHeader
                title="Consola de Conciliación Bancaria"
                subtitle="Sincronización de Registros & Verificación de Extractos"
                tenant={tenant}
            />

            {/* 🏦 NODOS FINANCIEROS (Bank Accounts) */}
            <div className="space-y-8">
                <div className="flex items-center gap-4 px-1">
                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
                        <Landmark className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                        <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase italic">Nodos de Dispersión Bancaria</h2>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Seleccione una cuenta para iniciar protocolo de cruce</p>
                    </div>
                </div>

                <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
                    {bankAccounts.map((account) => (
                        <Card key={account.id} className="group bg-white rounded-[3rem] border-none shadow-premium p-8 hover:translate-y-[-8px] transition-all duration-700 overflow-hidden relative border border-slate-50">
                            <div className="absolute right-0 top-0 p-8 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform">
                                <Landmark className="h-24 w-24 text-slate-900" />
                            </div>

                            <CardContent className="p-0 space-y-8">
                                <div className="flex justify-between items-start">
                                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm group-hover:rotate-6 transition-transform">
                                        <Wallet className="h-7 w-7" />
                                    </div>
                                    <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[8px] px-3 py-1 uppercase tracking-widest rounded-full">Operativo</Badge>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter group-hover:text-indigo-600 transition-colors">
                                        {account.name}
                                    </h3>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">{account.bank_name || 'ENTIDAD BANCARIA'} • {account.account_number}</p>
                                </div>

                                <div className="pt-2">
                                    <span className="text-3xl font-black text-slate-900 font-mono tracking-tighter italic">${account.balance?.toLocaleString()}</span>
                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Saldo Contable en Libros</p>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button className="flex-1 bg-slate-900 hover:bg-primary text-white font-black text-[10px] uppercase tracking-widest h-14 rounded-2xl shadow-active transition-all" asChild>
                                        <Link href={`/treasury/reconcile/${account.id}/new`}>
                                            Lanzar Cruce
                                        </Link>
                                    </Button>
                                    <Button variant="outline" className="h-14 w-14 rounded-2xl border-slate-100 bg-white text-slate-400 hover:text-slate-900 shadow-sm transition-all" asChild title="Historial">
                                        <Link href={`/treasury/reconcile/${account.id}/history`}>
                                            <Activity className="h-6 w-6" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {bankAccounts.length === 0 && (
                        <div className="col-span-full py-32 text-center bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[3rem]">
                            <div className="mx-auto w-20 h-20 rounded-[2rem] bg-white flex items-center justify-center mb-6 shadow-sm border border-slate-50">
                                <Wallet className="h-10 w-10 text-slate-200" />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">Cero Nodos Detectados</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2 mb-8">Primero configure sus cuentas bancarias en tesorería.</p>
                            <Button className="bg-slate-900 hover:bg-primary text-white font-black text-[10px] uppercase tracking-widest h-14 px-10 rounded-2xl shadow-active" asChild>
                                <Link href="/treasury/accounts/new">Registrar Cuenta</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* 📊 PROTOCOLO DE ESTADO */}
            <div className="grid gap-10 md:grid-cols-2">
                <Card className="rounded-[3rem] bg-white border-none shadow-premium p-10 relative overflow-hidden group hover:translate-y-[-4px] transition-all border border-slate-50">
                    <div className="absolute right-0 top-0 p-10 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform">
                        <Clock className="h-24 w-24 text-amber-500" />
                    </div>
                    <CardHeader className="p-0 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm">
                                <Clock className="h-6 w-6" />
                            </div>
                            <CardTitle className="text-lg font-black text-slate-900 uppercase italic tracking-tight">Pendientes de Conciliar</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 space-y-3">
                        {pendingStatements.length === 0 ? (
                            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100/50 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No se detectaron borradores de conciliación activos en el sistema.</p>
                            </div>
                        ) : (
                            pendingStatements.map((s: any) => (
                                <Link key={s.id} href={`/treasury/reconcile/${s.account_id}/match/${s.id}`} className="flex items-center justify-between p-5 bg-amber-50/50 rounded-2xl border border-amber-100/50 hover:bg-amber-50 transition-colors group">
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-black text-slate-900 uppercase italic">{s.account?.name ?? 'Cuenta'}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.start_date} → {s.end_date}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge className="bg-amber-100 text-amber-700 border-none text-[8px] font-black uppercase tracking-widest rounded-full px-3">Borrador</Badge>
                                        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
                                    </div>
                                </Link>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card className="rounded-[3rem] bg-white border-none shadow-premium p-10 relative overflow-hidden group hover:translate-y-[-4px] transition-all border border-slate-50">
                    <div className="absolute right-0 top-0 p-10 opacity-[0.02] pointer-events-none group-hover:scale-110 transition-transform">
                        <CheckCircle className="h-24 w-24 text-emerald-500" />
                    </div>
                    <CardHeader className="p-0 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm">
                                <CheckCircle className="h-6 w-6" />
                            </div>
                            <CardTitle className="text-lg font-black text-slate-900 uppercase italic tracking-tight">Últimas Completadas</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 space-y-3">
                        {completedStatements.length === 0 ? (
                            <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100/50 text-center">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Historial de conciliación vacío. Inicie un nuevo protocolo para ver registros.</p>
                            </div>
                        ) : (
                            completedStatements.map((s: any) => (
                                <div key={s.id} className="flex items-center justify-between p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-black text-slate-900 uppercase italic">{s.account?.name ?? 'Cuenta'}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.start_date} → {s.end_date}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="text-xs font-black text-emerald-700 italic">${Number(s.closing_balance).toLocaleString()}</p>
                                        <Badge className="bg-emerald-100 text-emerald-700 border-none text-[8px] font-black uppercase tracking-widest rounded-full px-3">Completada</Badge>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 🔒 PROTOCOLO DE PRIVACIDAD */}
            <div className="flex items-center justify-center gap-6 opacity-30 pt-10">
                <div className="h-px bg-slate-300 flex-1" />
                <div className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Protocolo de Verificación Bancaria SSL/V3</span>
                </div>
                <div className="h-px bg-slate-300 flex-1" />
            </div>
        </div>
    );
}
