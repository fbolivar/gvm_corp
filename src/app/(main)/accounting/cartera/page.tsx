import { createClient } from '@/lib/supabase/server';
import { documentService } from '@/features/documents/services/documentService';
import { settingsService } from '@/features/settings/services/settingsService';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    Brain,
    Bot,
    Inbox,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";

export default async function CarteraPage() {
    const supabase = await createClient();

    let receivables: Record<string, unknown>[] = [];
    let payables: Record<string, unknown>[] = [];
    let error: string | null = null;
    let pendingPaymentReports = 0;

    const tenant = await settingsService.getTenantInfo(supabase);

    try {
        const [rRes, pRes] = await Promise.all([
            documentService.getDocuments(supabase, { type: 'INVOICE', page: 1, per_page: 20 }),
            documentService.getDocuments(supabase, { type: 'VENDOR_BILL', page: 1, per_page: 20 })
        ]);
        receivables = rRes.data || [];
        payables = pRes.data || [];

        const docIds = receivables.map(d => d.id as string);
        if (docIds.length > 0) {
            const { data: actions } = await supabase
                .from('collection_actions')
                .select('document_id')
                .in('document_id', docIds);
            const managedIds = new Set(actions?.map(a => a.document_id) || []);
            receivables = receivables.map(r => ({
                ...r,
                is_ai_managed: managedIds.has(r.id as string)
            }));
        }

        const { count } = await supabase
            .from('payment_reports')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'PENDING');
        pendingPaymentReports = count ?? 0;
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error al cargar datos de cartera";
        console.error("Error fetching cartera data:", msg);
        error = msg;
    }

    const totalAR = receivables.reduce((acc, doc) => acc + (Number(doc.total) || 0), 0);
    const totalAP = payables.reduce((acc, doc) => acc + (Number(doc.total) || 0), 0);
    const netBalance = totalAR - totalAP;

    const fmt = (val: number) =>
        `$${val.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;

    return (
        <div className="page-container space-y-8 pb-20 animate-in fade-in duration-500">

            <VisualReportHeader
                title="Gestión de Cartera"
                subtitle="Cuentas por Cobrar & Pagar"
                tenant={tenant}
            />

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 flex-wrap">
                <Button variant="outline" size="sm" asChild className="h-9 px-4 rounded-xl gap-2">
                    <Link href="/accounting/reports/aging-receivable">
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span className="text-xs">Aging CxC</span>
                    </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="h-9 px-4 rounded-xl gap-2">
                    <Link href="/accounting/reports/aging-payable">
                        <TrendingDown className="h-3.5 w-3.5" />
                        <span className="text-xs">Aging CxP</span>
                    </Link>
                </Button>
                <Button size="sm" asChild className="h-9 px-4 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700">
                    <Link href="/accounting/cartera/ai">
                        <Bot className="h-3.5 w-3.5" />
                        <span className="text-xs">Agente AI</span>
                    </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="h-9 px-4 rounded-xl gap-2 relative">
                    <Link href="/accounting/cartera/cobros">
                        <Inbox className="h-3.5 w-3.5" />
                        <span className="text-xs">Comprobantes</span>
                        {pendingPaymentReports > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                {pendingPaymentReports}
                            </span>
                        )}
                    </Link>
                </Button>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cuentas por Cobrar</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{fmt(totalAR)}</p>
                    <p className="text-[10px] text-emerald-500 font-medium mt-1">{receivables.length} facturas activas</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                            <TrendingDown className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cuentas por Pagar</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tracking-tight">{fmt(totalAP)}</p>
                    <p className="text-[10px] text-rose-500 font-medium mt-1">{payables.length} facturas pendientes</p>
                </div>

                <div className={cn(
                    "rounded-2xl p-6 shadow-sm",
                    netBalance >= 0 ? "bg-slate-900 text-white" : "bg-rose-900 text-white"
                )}>
                    <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-3">Balance Neto</p>
                    <p className="text-2xl font-bold text-white tracking-tight">{fmt(netBalance)}</p>
                    <p className="text-[10px] text-white/40 mt-1">
                        {netBalance >= 0 ? 'Posición favorable' : 'Obligaciones superan cobros'}
                    </p>
                </div>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* CxC */}
                <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-1 w-5 bg-emerald-500 rounded-full" />
                                <CardTitle className="text-sm font-bold text-slate-900">Cuentas por Cobrar</CardTitle>
                            </div>
                            <Button variant="ghost" size="sm" asChild className="h-8 text-xs text-indigo-600 gap-1">
                                <Link href="/sales/invoices">Ver todo <ArrowUpRight className="h-3 w-3" /></Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-100 hover:bg-transparent bg-slate-50/50">
                                    <TableHead className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 pl-6">Cliente / Factura</TableHead>
                                    <TableHead className="text-right text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3">Total</TableHead>
                                    <TableHead className="text-right text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 pr-6">Vence</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {receivables.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-10 text-sm text-slate-400">Sin facturas por cobrar</TableCell>
                                    </TableRow>
                                ) : receivables.map((doc) => {
                                    const party = doc.party as { legal_name?: string } | null;
                                    return (
                                        <TableRow key={doc.id as string} className="border-slate-50 hover:bg-indigo-50/20 transition-colors">
                                            <TableCell className="py-3.5 pl-6">
                                                <div>
                                                    <span className="text-xs font-semibold text-slate-800">{party?.legal_name || 'Sin tercero'}</span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-[10px] font-mono text-slate-400">{doc.number as string}</span>
                                                        {(doc.is_ai_managed as boolean) && (
                                                            <div className="flex items-center gap-1 text-indigo-500">
                                                                <Brain className="h-2.5 w-2.5" />
                                                                <span className="text-[8px] font-bold uppercase">AI</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3.5 text-right font-mono text-sm font-bold text-slate-900">
                                                {fmt(Number(doc.total))}
                                            </TableCell>
                                            <TableCell className="py-3.5 text-right pr-6">
                                                <span className="text-[10px] font-medium text-slate-400">{(doc.due_date as string) || 'Inmediato'}</span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* CxP */}
                <Card className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-1 w-5 bg-rose-500 rounded-full" />
                                <CardTitle className="text-sm font-bold text-slate-900">Cuentas por Pagar</CardTitle>
                            </div>
                            <Button variant="ghost" size="sm" asChild className="h-8 text-xs text-rose-600 gap-1">
                                <Link href="/purchasing/bills">Ver todo <ArrowDownRight className="h-3 w-3" /></Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-100 hover:bg-transparent bg-slate-50/50">
                                    <TableHead className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 pl-6">Proveedor / Factura</TableHead>
                                    <TableHead className="text-right text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3">Total</TableHead>
                                    <TableHead className="text-right text-slate-400 font-semibold uppercase text-[10px] tracking-wider py-3 pr-6">Vence</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payables.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-10 text-sm text-slate-400">Sin facturas por pagar</TableCell>
                                    </TableRow>
                                ) : payables.map((doc) => {
                                    const party = doc.party as { legal_name?: string } | null;
                                    return (
                                        <TableRow key={doc.id as string} className="border-slate-50 hover:bg-rose-50/20 transition-colors">
                                            <TableCell className="py-3.5 pl-6">
                                                <div>
                                                    <span className="text-xs font-semibold text-slate-800">{party?.legal_name || 'Sin tercero'}</span>
                                                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">{doc.number as string}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3.5 text-right font-mono text-sm font-bold text-rose-600">
                                                {fmt(Number(doc.total))}
                                            </TableCell>
                                            <TableCell className="py-3.5 text-right pr-6">
                                                <span className="text-[10px] font-medium text-slate-400">{(doc.due_date as string) || 'Vencido'}</span>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
