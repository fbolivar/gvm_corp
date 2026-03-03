import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    Percent,
    TrendingUp,
    TrendingDown,
    ArrowRight,
    Wallet,
    AlertTriangle,
    CheckCircle2,
    FileText,
    Calendar,
} from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"

type DocWithParty = {
    id: string;
    doc_type: string;
    number: string | null;
    issue_date: string;
    subtotal: number;
    taxes: number;
    total: number;
    status: string;
    party: { legal_name: string; doc_number: string } | null;
};

export default async function VatReportPage({
    searchParams
}: {
    searchParams: Promise<{ startDate?: string; endDate?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const now = new Date();
    // Default: current bimonth (Colombia IVA is bimonthly)
    const startDate = params.startDate || new Date(now.getFullYear(), Math.floor(now.getMonth() / 2) * 2, 1).toISOString().split('T')[0];
    const endDate   = params.endDate   || now.toISOString().split('T')[0];

    const tenant = await settingsService.getTenantInfo(supabase);

    // IVA Generado (sales)
    const { data: salesDocs } = await supabase
        .from('documents')
        .select('id, doc_type, number, issue_date, subtotal, taxes, total, status, party:parties(legal_name, doc_number)')
        .in('doc_type', ['INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE'])
        .gte('issue_date', startDate)
        .lte('issue_date', endDate)
        .not('status', 'eq', 'VOIDED')
        .order('issue_date', { ascending: false });

    // IVA Descontable (purchases)
    const { data: purchaseDocs } = await supabase
        .from('documents')
        .select('id, doc_type, number, issue_date, subtotal, taxes, total, status, party:parties(legal_name, doc_number)')
        .in('doc_type', ['VENDOR_BILL'])
        .gte('issue_date', startDate)
        .lte('issue_date', endDate)
        .order('issue_date', { ascending: false });

    const sales     = (salesDocs    ?? []) as unknown as DocWithParty[];
    const purchases = (purchaseDocs ?? []) as unknown as DocWithParty[];

    // KPIs
    const ivaGenerado    = sales.reduce((s, d) => s + (Number(d.taxes) || 0), 0);
    const ivaDescontable = purchases.reduce((s, d) => s + (Number(d.taxes) || 0), 0);
    const saldo          = ivaGenerado - ivaDescontable;
    const baseGravable   = sales.reduce((s, d) => s + (Number(d.subtotal) || 0), 0);
    const baseCompras    = purchases.reduce((s, d) => s + (Number(d.subtotal) || 0), 0);

    const fmt = (n: number) =>
        `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            <VisualReportHeader
                title="Informe de IVA"
                subtitle={`IVA Generado vs Descontable · ${startDate} » ${endDate}`}
                tenant={tenant}
            />

            {/* KPI Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">
                        {saldo >= 0 ? 'IVA a Pagar DIAN' : 'Saldo a Favor'}
                    </span>
                    <div className="flex items-baseline gap-4">
                        <h2 className={cn(
                            "text-4xl font-black tracking-tight leading-none",
                            saldo >= 0 ? "text-rose-600" : "text-emerald-600"
                        )}>
                            {fmt(Math.abs(saldo))}
                        </h2>
                        <span className="text-xl font-black text-slate-300 uppercase italic tracking-widest">
                            {saldo >= 0 ? 'a pagar' : 'a favor'}
                        </span>
                    </div>
                </div>
                <ReportingFilters />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-10">
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                                <TrendingUp className="h-6 w-6" />
                            </div>
                            <Badge className="bg-rose-50 text-rose-600 border-none text-[8px] font-black uppercase tracking-widest px-3 py-1">IVA Generado</Badge>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Base Gravable Ventas</p>
                            <p className="text-sm font-bold text-slate-500 mb-3">{fmt(baseGravable)}</p>
                            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">IVA 19%</p>
                            <p className="text-3xl font-black text-rose-600 italic tracking-tighter">{fmt(ivaGenerado)}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">{sales.length} doc. de ventas en el periodo</p>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-10">
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <TrendingDown className="h-6 w-6" />
                            </div>
                            <Badge className="bg-emerald-50 text-emerald-600 border-none text-[8px] font-black uppercase tracking-widest px-3 py-1">IVA Descontable</Badge>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Base Gravable Compras</p>
                            <p className="text-sm font-bold text-slate-500 mb-3">{fmt(baseCompras)}</p>
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">IVA Acreditable</p>
                            <p className="text-3xl font-black text-emerald-600 italic tracking-tighter">{fmt(ivaDescontable)}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">{purchases.length} doc. de compras en el periodo</p>
                    </div>
                </Card>

                <Card className={cn(
                    "border-none rounded-[2.5rem] p-10",
                    saldo >= 0 ? "bg-slate-900 shadow-active" : "bg-emerald-600 shadow-active"
                )}>
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center">
                                {saldo >= 0
                                    ? <AlertTriangle className="h-6 w-6 text-amber-400" />
                                    : <CheckCircle2 className="h-6 w-6 text-white" />
                                }
                            </div>
                            <Badge className="bg-white/10 text-white border-none text-[8px] font-black uppercase tracking-widest px-3 py-1">
                                {saldo >= 0 ? 'Obligación' : 'Saldo Favor'}
                            </Badge>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">
                                {saldo >= 0 ? 'IVA a Declarar / Pagar' : 'Saldo a Favor DIAN'}
                            </p>
                            <p className="text-3xl font-black text-white italic tracking-tighter">{fmt(Math.abs(saldo))}</p>
                        </div>
                        <p className="text-[10px] text-white/50 font-medium">
                            Periodo bimestral: {startDate} – {endDate}
                        </p>
                    </div>
                </Card>
            </div>

            {/* 2-col detail: ventas & compras */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Ventas */}
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-50">
                        <h3 className="text-base font-black text-slate-900 tracking-tight italic uppercase">Documentos de Venta</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">IVA Generado · {sales.length} docs</p>
                    </div>
                    <div className="overflow-x-auto max-h-96">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-white z-10">
                                <tr className="bg-slate-50/50 border-b border-slate-50">
                                    <th className="px-6 py-4 text-left   text-[9px] font-black text-slate-400 uppercase tracking-widest">Doc / Fecha</th>
                                    <th className="px-6 py-4 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">Base</th>
                                    <th className="px-6 py-4 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">IVA</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {sales.map(doc => (
                                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-800 italic">{doc.number || '—'}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold">{doc.issue_date}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-[10px] font-bold text-slate-600 tabular-nums">{fmt(Number(doc.subtotal))}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-[10px] font-black text-rose-500 tabular-nums italic">{fmt(Number(doc.taxes))}</span>
                                        </td>
                                    </tr>
                                ))}
                                {sales.length === 0 && (
                                    <tr><td colSpan={3} className="px-6 py-10 text-center text-[10px] text-slate-300 font-black uppercase tracking-widest">Sin documentos</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-8 py-4 border-t border-slate-50 bg-slate-50/30 flex justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total IVA Generado</span>
                        <span className="text-sm font-black text-rose-600 italic">{fmt(ivaGenerado)}</span>
                    </div>
                </Card>

                {/* Compras */}
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-50">
                        <h3 className="text-base font-black text-slate-900 tracking-tight italic uppercase">Documentos de Compra</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">IVA Descontable · {purchases.length} docs</p>
                    </div>
                    <div className="overflow-x-auto max-h-96">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-white z-10">
                                <tr className="bg-slate-50/50 border-b border-slate-50">
                                    <th className="px-6 py-4 text-left   text-[9px] font-black text-slate-400 uppercase tracking-widest">Doc / Proveedor</th>
                                    <th className="px-6 py-4 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">Base</th>
                                    <th className="px-6 py-4 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">IVA</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {purchases.map(doc => (
                                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-800 italic">{doc.party?.legal_name || doc.number || '—'}</p>
                                                <p className="text-[9px] text-slate-400 font-bold">{doc.issue_date}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-[10px] font-bold text-slate-600 tabular-nums">{fmt(Number(doc.subtotal))}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-[10px] font-black text-emerald-600 tabular-nums italic">{fmt(Number(doc.taxes))}</span>
                                        </td>
                                    </tr>
                                ))}
                                {purchases.length === 0 && (
                                    <tr><td colSpan={3} className="px-6 py-10 text-center text-[10px] text-slate-300 font-black uppercase tracking-widest">Sin documentos</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-8 py-4 border-t border-slate-50 bg-slate-50/30 flex justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total IVA Descontable</span>
                        <span className="text-sm font-black text-emerald-600 italic">{fmt(ivaDescontable)}</span>
                    </div>
                </Card>
            </div>

            {/* Compliance banner */}
            <div className="bg-slate-100 p-10 rounded-[2.5rem] flex flex-col lg:flex-row items-center justify-between gap-10 border border-slate-200">
                <div className="flex items-center gap-8">
                    <div className="h-14 w-14 bg-white rounded-[2rem] flex items-center justify-center text-amber-500 shadow-premium border border-white">
                        <Percent className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-2xl font-black tracking-tight uppercase leading-tight text-slate-900">
                            Declaración Bimestral
                        </h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-xl">
                            {saldo >= 0
                                ? `${tenant?.name} debe declarar y pagar ${fmt(saldo)} de IVA ante la DIAN en el formulario 300. Fecha límite según calendario tributario 2026.`
                                : `${tenant?.name} tiene un saldo a favor de ${fmt(Math.abs(saldo))} que puede solicitar en devolución o compensar con otras obligaciones tributarias.`
                            }
                        </p>
                    </div>
                </div>
                <Button variant="outline" className="h-12 rounded-[2rem] border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest px-12 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-premium group shrink-0">
                    Generar Formulario 300 <ArrowRight className="ml-4 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
}
