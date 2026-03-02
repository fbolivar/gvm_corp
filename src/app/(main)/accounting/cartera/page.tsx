import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { Card, CardContent } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
    CreditCard,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    TrendingDown,
    Clock,
    AlertCircle,
    ShieldCheck,
    Brain,
    Bot,
    Inbox,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";

export default async function CarteraPage() {
    const supabase = await createClient();

    let receivables: any[] = [];
    let payables: any[] = [];
    let error: string | null = null;
    let pendingPaymentReports = 0;

    try {
        const [rRes, pRes] = await Promise.all([
            documentService.getDocuments(supabase, { type: 'INVOICE', page: 1, per_page: 20 }),
            documentService.getDocuments(supabase, { type: 'VENDOR_BILL', page: 1, per_page: 20 })
        ]);
        receivables = rRes.data || [];
        payables = pRes.data || [];

        // Identificar facturas gestionadas por IA
        const docIds = receivables.map(d => d.id);
        if (docIds.length > 0) {
            const { data: actions } = await supabase
                .from('collection_actions')
                .select('document_id')
                .in('document_id', docIds);
            const managedIds = new Set(actions?.map(a => a.document_id) || []);
            receivables = receivables.map(r => ({
                ...r,
                is_ai_managed: managedIds.has(r.id)
            }));
        }

        // Pending payment reports count
        const { count } = await supabase
            .from('payment_reports')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'PENDING');
        pendingPaymentReports = count ?? 0;
    } catch (err: any) {
        console.error("Error fetching cartera data:", err);
        error = err.message || "Error al cargar datos de cartera";
    }

    const totalAR = receivables.reduce((acc, doc) => acc + (Number(doc.total) || 0), 0);
    const totalAP = payables.reduce((acc, doc) => acc + (Number(doc.total) || 0), 0);

    const formatCurrency = (val: number) =>
        `$${val.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;

    return (
        <div className="space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 🛡️ MASTER COMMAND HEADER */}
            <div className="bg-slate-900 rounded-[4rem] p-12 md:p-20 text-white shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <CreditCard className="h-80 w-80 text-white" />
                </div>

                <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-2 w-12 bg-indigo-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Financial Control Matrix v3.0</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter italic uppercase leading-[0.8]">
                            Gestión de <br /><span className="text-slate-500">Cartera</span>
                        </h1>
                        <div className="flex items-center gap-4">
                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">Auditando Cuentas por Cobrar & Pagar</p>
                            <div className="flex items-center gap-2 bg-indigo-500/10 px-4 py-1.5 rounded-xl border border-indigo-500/20">
                                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic leading-none">Status: Sincronizado</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <Button variant="outline" asChild className="h-20 px-10 rounded-[2rem] border-none bg-white/5 hover:bg-white/10 text-white font-black hover:scale-105 transition-all backdrop-blur-md">
                            <Link href="/reports/aging" className="flex items-center gap-4">
                                <Clock className="h-6 w-6 text-indigo-400" />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] uppercase tracking-widest opacity-40 italic">Audit Log</span>
                                    <span className="text-xs uppercase tracking-widest">Morosidad (Aging)</span>
                                </div>
                            </Link>
                        </Button>
                        <Button asChild className="h-20 px-12 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-active transition-all hover:scale-105 active:scale-95 border-none">
                            <Link href="/accounting/cartera/ai" className="flex items-center gap-4">
                                <Bot className="h-6 w-6" />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] uppercase tracking-widest opacity-60 italic text-indigo-200">Autonomous Unit</span>
                                    <span className="text-xs uppercase tracking-widest">Portfolio AI Agent</span>
                                </div>
                            </Link>
                        </Button>
                        <Button variant="outline" asChild className="h-20 px-10 rounded-[2rem] border-none bg-white/5 hover:bg-white/10 text-white font-black hover:scale-105 transition-all backdrop-blur-md relative">
                            <Link href="/accounting/cartera/cobros" className="flex items-center gap-4">
                                <Inbox className="h-6 w-6 text-amber-400" />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] uppercase tracking-widest opacity-40 italic">Recaudo</span>
                                    <span className="text-xs uppercase tracking-widest">Comprobantes de Pago</span>
                                </div>
                                {pendingPaymentReports > 0 && (
                                    <span className="absolute -top-2 -right-2 h-6 min-w-6 px-1.5 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none shadow-lg">
                                        {pendingPaymentReports}
                                    </span>
                                )}
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-10 bg-rose-50 border border-rose-100 rounded-[3rem] flex items-center gap-6 text-rose-600 shadow-premium animate-bounce">
                    <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center text-rose-500 shadow-sm shrink-0">
                        <AlertCircle className="h-8 w-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Protocolo de Interrupción Detectado</p>
                        <p className="text-xl font-black italic tracking-tighter uppercase leading-none mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* 📊 PROTOCOL SUMMARY GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <Card className="rounded-[4rem] border-none bg-white shadow-premium p-12 group overflow-hidden relative">
                    <div className="absolute -right-8 -top-8 opacity-[0.03] group-hover:scale-125 transition-transform duration-1000">
                        <TrendingUp className="h-40 w-40 text-slate-900" />
                    </div>
                    <div className="space-y-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Activos Circulantes (AR)</span>
                        </div>
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter italic leading-none">{formatCurrency(totalAR)}</h2>
                        <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-widest">+5.2% VELOCIDAD</Badge>
                    </div>
                </Card>

                <Card className="rounded-[4rem] border-none bg-white shadow-premium p-12 group overflow-hidden relative">
                    <div className="absolute -right-8 -top-8 opacity-[0.03] group-hover:scale-125 transition-transform duration-1000">
                        <TrendingDown className="h-40 w-40 text-slate-900" />
                    </div>
                    <div className="space-y-6 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-rose-500" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Obligaciones (AP)</span>
                        </div>
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter italic leading-none">{formatCurrency(totalAP)}</h2>
                        <Badge className="bg-rose-50 text-rose-600 border-none font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-widest">3 ALERTAS HOY</Badge>
                    </div>
                </Card>

                <Card className="rounded-[4rem] border-none bg-slate-900 shadow-active p-12 col-span-1 md:col-span-2 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 h-64 w-64 bg-primary/20 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse-slow" />
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Balance Operativo Neto</span>
                            <h2 className="text-7xl font-black text-white tracking-tighter italic leading-none transition-all group-hover:scale-105 origin-left">{formatCurrency(totalAR - totalAP)}</h2>
                        </div>
                        <div className="flex items-center gap-6 mt-10">
                            <div className="flex -space-x-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-10 w-10 rounded-2xl bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-black text-slate-500 shadow-xl group-hover:translate-x-2 transition-transform">
                                        ID-{i}
                                    </div>
                                ))}
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Cola de Desembolsos Pendiente</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* 📋 OPERATIONAL LEDGER */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">

                {/* CUENTAS POR COBRAR (RECEIVABLES) */}
                <div className="space-y-10 group/sec">
                    <div className="flex items-center justify-between px-6">
                        <div className="flex items-center gap-6">
                            <div className="h-1 w-12 bg-indigo-600 rounded-full" />
                            <div className="space-y-1">
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">Receivables</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Facturación por Recaudar</p>
                            </div>
                        </div>
                        <Button variant="ghost" className="h-14 px-8 rounded-2xl text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 border-none group-hover/sec:gap-4 transition-all" asChild>
                            <Link href="/sales/invoices">Expandir Ledger <ArrowUpRight className="h-4 w-4" /></Link>
                        </Button>
                    </div>

                    <Card className="rounded-[4rem] border-none bg-white shadow-premium overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="border-slate-50 hover:bg-transparent">
                                    <TableHead className="py-10 pl-14 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] italic">Sujeto / Referencia</TableHead>
                                    <TableHead className="py-10 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] italic text-right">Impacto</TableHead>
                                    <TableHead className="py-10 pr-14 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] italic text-right">Efectividad</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {receivables?.map((doc) => (
                                    <TableRow key={doc.id} className="hover:bg-slate-50/80 transition-all border-b border-slate-50 group/row">
                                        <TableCell className="py-10 pl-14">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-lg font-black text-slate-900 uppercase italic tracking-tighter group-hover/row:text-primary transition-colors">{doc.party?.legal_name || 'IDENT_ERROR'}</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-slate-950 px-2 py-0.5 rounded-md shadow-sm">
                                                        <span className="text-[9px] font-black text-white font-mono">{doc.number}</span>
                                                    </div>
                                                    {doc.is_ai_managed && (
                                                        <div className="flex items-center gap-1.5 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                                                            <Brain className="h-2.5 w-2.5 text-indigo-500" />
                                                            <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest italic">AI Managed</span>
                                                        </div>
                                                    )}
                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Protocolo Comercial</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-10 text-right">
                                            <span className="text-2xl font-black text-slate-900 italic tracking-tighter font-mono">{formatCurrency(Number(doc.total))}</span>
                                        </TableCell>
                                        <TableCell className="py-10 pr-14 text-right">
                                            <div className="flex flex-col items-end gap-2">
                                                <Badge variant="outline" className="bg-slate-50 border-none font-black text-[8px] px-3 py-1.5 rounded-lg text-slate-500 uppercase tracking-widest shadow-inner">
                                                    {doc.due_date || 'INMEDIATO'}
                                                </Badge>
                                                <div className="h-1 w-16 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 w-full animate-progress-fast" />
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </div>

                {/* CUENTAS POR PAGAR (PAYABLES) */}
                <div className="space-y-10 group/sec">
                    <div className="flex items-center justify-between px-6">
                        <div className="flex items-center gap-6">
                            <div className="h-1 w-12 bg-rose-600 rounded-full" />
                            <div className="space-y-1">
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">Payables</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Obligaciones de Tesorería</p>
                            </div>
                        </div>
                        <Button variant="ghost" className="h-14 px-8 rounded-2xl text-rose-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 border-none group-hover/sec:gap-4 transition-all" asChild>
                            <Link href="/purchasing/bills">Expandir Ledger <ArrowDownRight className="h-4 w-4" /></Link>
                        </Button>
                    </div>

                    <Card className="rounded-[4rem] border-none bg-white shadow-premium overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="border-slate-50 hover:bg-transparent">
                                    <TableHead className="py-10 pl-14 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] italic">Sujeto / Referencia</TableHead>
                                    <TableHead className="py-10 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] italic text-right">Impacto</TableHead>
                                    <TableHead className="py-10 pr-14 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] italic text-right">Efectividad</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payables?.map((doc) => (
                                    <TableRow key={doc.id} className="hover:bg-slate-50/80 transition-all border-b border-slate-50 group/row">
                                        <TableCell className="py-10 pl-14">
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-lg font-black text-slate-900 uppercase italic tracking-tighter group-hover/row:text-rose-600 transition-colors uppercase">{doc.party?.legal_name || 'IDENT_ERROR'}</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-slate-950 px-2 py-0.5 rounded-md shadow-sm">
                                                        <span className="text-[9px] font-black text-white font-mono">{doc.number}</span>
                                                    </div>
                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Protocolo Proveedor</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-10 text-right">
                                            <span className="text-2xl font-black text-rose-600 italic tracking-tighter font-mono">{formatCurrency(Number(doc.total))}</span>
                                        </TableCell>
                                        <TableCell className="py-10 pr-14 text-right">
                                            <div className="flex flex-col items-end gap-2">
                                                <div className="flex items-center gap-2 text-rose-500 font-black italic">
                                                    <AlertCircle className="h-3 w-3" />
                                                    <span className="text-[9px] uppercase tracking-widest leading-none">{doc.due_date || 'EXPIRADO'}</span>
                                                </div>
                                                <div className="h-1 w-16 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-rose-500 w-[70%] animate-pulse" />
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </div>

            </div>
        </div>
    );
}
