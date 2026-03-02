import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    Receipt,
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    FileText,
    ShieldCheck,
    ArrowRight,
    Hash,
    Users,
    TrendingUp,
    AlertTriangle,
} from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
    DRAFT:    { label: 'Borrador',  cls: 'bg-slate-100 text-slate-500' },
    SIGNED:   { label: 'Firmada',   cls: 'bg-indigo-50 text-indigo-600' },
    SENT:     { label: 'Enviada',   cls: 'bg-blue-50 text-blue-600' },
    ACCEPTED: { label: 'Aceptada',  cls: 'bg-emerald-50 text-emerald-700' },
    REJECTED: { label: 'Rechazada', cls: 'bg-rose-50 text-rose-600' },
    VOIDED:   { label: 'Anulada',   cls: 'bg-amber-50 text-amber-600' },
};

const DOC_TYPE_LABEL: Record<string, string> = {
    INVOICE:      'Factura de Venta',
    CREDIT_NOTE:  'Nota Crédito',
    DEBIT_NOTE:   'Nota Débito',
};

export default async function InvoicesIssuedPage({
    searchParams
}: {
    searchParams: Promise<{ startDate?: string; endDate?: string; status?: string; docType?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const startDate = params.startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate   = params.endDate   || new Date().toISOString().split('T')[0];
    const docTypes  = ['INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE'];

    // Fetch all emitted invoice-type documents with DIAN data
    let query = supabase
        .from('documents')
        .select('*, party:parties(legal_name, doc_number), electronic_document:electronic_documents(*)')
        .in('doc_type', docTypes)
        .gte('issue_date', startDate)
        .lte('issue_date', endDate)
        .order('issue_date', { ascending: false });

    if (params.status) {
        query = query.eq('status', params.status);
    }
    if (params.docType && docTypes.includes(params.docType)) {
        query = query.eq('doc_type', params.docType);
    }

    const { data: documents, error } = await query;
    if (error) throw error;

    const tenant = await settingsService.getTenantInfo(supabase);

    // ── KPIs ────────────────────────────────────────────────────────────────
    const docs = documents ?? [];
    const invoiceCount  = docs.length;
    const totalBilled   = docs.reduce((s, d) => s + (Number(d.total) || 0), 0);
    const totalTaxes    = docs.reduce((s, d) => s + (Number(d.taxes) || 0), 0);
    const acceptedCount = docs.filter(d => d.status === 'ACCEPTED').length;
    const rejectedCount = docs.filter(d => d.status === 'REJECTED').length;
    const pendingCount  = docs.filter(d => ['DRAFT','SIGNED','SENT'].includes(d.status)).length;

    const fmt = (n: number) =>
        `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            <VisualReportHeader
                title="Facturas Emitidas"
                subtitle={`Registro Electrónico DIAN: ${startDate} » ${endDate}`}
                tenant={tenant}
            />

            {/* KPI Strip */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-1">
                <div className="flex items-center gap-12">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">
                            Total Facturado
                        </span>
                        <div className="flex items-baseline gap-4">
                            <h2 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none">
                                {fmt(totalBilled)}
                            </h2>
                            <span className="text-xl font-black text-slate-300 uppercase italic tracking-widest">
                                {invoiceCount} docs
                            </span>
                        </div>
                    </div>
                </div>
                <ReportingFilters />
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Aceptadas DIAN</p>
                            <p className="text-2xl font-black text-emerald-600 italic tracking-tighter">{acceptedCount}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">En Tránsito</p>
                            <p className="text-2xl font-black text-amber-600 italic tracking-tighter">{pendingCount}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                            <XCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Rechazadas</p>
                            <p className="text-2xl font-black text-rose-500 italic tracking-tighter">{rejectedCount}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-active bg-slate-900 rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all text-white">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Total IVA Generado</p>
                            <p className="text-2xl font-black text-white italic tracking-tighter">{fmt(totalTaxes)}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Invoice Table */}
            <Card className="border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">
                            Registro de Documentos Electrónicos
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            Facturas · Notas Crédito · Notas Débito — DIAN Trazabilidad
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-emerald-500" />
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">DIAN Validado</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Número</th>
                                <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente / NIT</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Subtotal</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">IVA</th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                                <th className="px-8 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                                <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">CUFE</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {docs.map((doc) => {
                                const st  = STATUS_LABEL[doc.status] ?? STATUS_LABEL['DRAFT'];
                                const ed  = doc.electronic_document as any;
                                const cufe = ed?.cufe as string | undefined;

                                return (
                                    <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                                        {/* Type */}
                                        <td className="px-8 py-5">
                                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                                                {DOC_TYPE_LABEL[doc.doc_type] ?? doc.doc_type}
                                            </span>
                                        </td>

                                        {/* Number */}
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm shrink-0 group-hover:bg-indigo-600 transition-colors">
                                                    <FileText className="h-3.5 w-3.5" />
                                                </div>
                                                <span className="text-xs font-black text-slate-900 italic tracking-tight">{doc.number || '—'}</span>
                                            </div>
                                        </td>

                                        {/* Date */}
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                <Calendar className="h-3 w-3 text-slate-300" />
                                                {doc.issue_date}
                                            </div>
                                        </td>

                                        {/* Client */}
                                        <td className="px-8 py-5">
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-black text-slate-800 italic tracking-tight uppercase line-clamp-1">
                                                    {(doc.party as any)?.legal_name || 'Consumidor Final'}
                                                </p>
                                                <p className="text-[9px] text-slate-400 font-bold tracking-widest">
                                                    {(doc.party as any)?.doc_number || ''}
                                                </p>
                                            </div>
                                        </td>

                                        {/* Subtotal */}
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-xs font-bold text-slate-600 tabular-nums">{fmt(Number(doc.subtotal))}</span>
                                        </td>

                                        {/* IVA */}
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-xs font-bold text-slate-400 tabular-nums">{fmt(Number(doc.taxes))}</span>
                                        </td>

                                        {/* Total */}
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-sm font-black text-slate-900 tabular-nums italic">{fmt(Number(doc.total))}</span>
                                        </td>

                                        {/* Status */}
                                        <td className="px-8 py-5 text-center">
                                            <Badge className={cn(
                                                "border-none text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-md",
                                                st.cls
                                            )}>
                                                {st.label}
                                            </Badge>
                                        </td>

                                        {/* CUFE */}
                                        <td className="px-8 py-5 max-w-[180px]">
                                            {cufe ? (
                                                <div className="flex items-center gap-1.5" title={cufe}>
                                                    <Hash className="h-3 w-3 text-emerald-400 shrink-0" />
                                                    <span className="text-[9px] font-mono text-slate-400 truncate">{cufe.slice(0, 20)}…</span>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] text-slate-300 italic font-medium">Sin CUFE</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}

                            {docs.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-10 py-20 text-center">
                                        <Receipt className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                                            No hay documentos en este periodo
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer summary */}
                {docs.length > 0 && (
                    <div className="px-10 py-6 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {docs.length} documento{docs.length !== 1 ? 's' : ''} • Periodo {startDate} — {endDate}
                        </span>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Base Gravable</span>
                                <span className="text-sm font-black text-slate-700 italic">{fmt(totalBilled - totalTaxes)}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block">IVA Total</span>
                                <span className="text-sm font-black text-amber-700 italic">{fmt(totalTaxes)}</span>
                            </div>
                            <div className="text-right border-l border-slate-200 pl-6">
                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block">Total Facturado</span>
                                <span className="text-lg font-black text-slate-900 italic">{fmt(totalBilled)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* DIAN Compliance Banner */}
            <div className="bg-slate-100 p-12 rounded-[4rem] flex flex-col lg:flex-row items-center justify-between gap-10 border border-slate-200">
                <div className="flex items-center gap-8">
                    <div className="h-20 w-20 bg-white rounded-[2rem] flex items-center justify-center text-indigo-600 shadow-premium border border-white">
                        <ShieldCheck className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                            Trazabilidad DIAN
                        </h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-xl">
                            Este registro incluye facturas electrónicas, notas crédito y notas débito emitidas por{' '}
                            <span className="text-indigo-600 font-bold">{tenant?.name}</span>.
                            El CUFE (Código Único de Facturación Electrónica) garantiza la autenticidad ante la DIAN.
                        </p>
                    </div>
                </div>
                <Button variant="outline" className="h-16 rounded-[2rem] border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest px-12 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-premium group shrink-0">
                    Exportar Registro <ArrowRight className="ml-4 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
}
