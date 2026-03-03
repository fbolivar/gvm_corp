import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { PrintButton } from '@/features/accounting/components/PrintButton';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cn } from "@/shared/lib/utils"
import { Printer, FileText, ChevronRight, Building2, ArrowLeft } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentLine {
    id: string;
    description: string;
    qty: number;
    unit_price: number;
    total: number;
}

interface Party {
    legal_name: string;
    doc_number?: string;
    address?: string;
}

interface Document {
    id: string;
    number: string | null;
    issue_date: string;
    due_date: string | null;
    status: string;
    subtotal: number;
    taxes: number;
    total: number;
    notes: string | null;
    party_id: string | null;
    party?: Party | null;
}

interface DocumentWithLines extends Document {
    document_lines: DocumentLine[];
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
    DRAFT:    { label: 'Borrador', cls: 'bg-slate-100 text-slate-500' },
    SENT:     { label: 'Enviada',  cls: 'bg-emerald-50 text-emerald-700' },
    ACCEPTED: { label: 'Aceptada', cls: 'bg-blue-50 text-blue-600' },
    PAID:     { label: 'Pagada',   cls: 'bg-indigo-50 text-indigo-600' },
    VOIDED:   { label: 'Anulada',  cls: 'bg-rose-50 text-rose-600' },
    OVERDUE:  { label: 'Vencida',  cls: 'bg-amber-50 text-amber-600' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
    return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;
}

function fmtDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

// Deterministic CUFE simulation based on invoice id
function simulatedCufe(id: string): string {
    return `${id.replace(/-/g, '').slice(0, 32).toUpperCase()}SIM`;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function InvoiceTemplatePage({
    searchParams,
}: {
    searchParams: Promise<{ id?: string }>;
}) {
    const supabase = await createClient();
    const params = await searchParams;

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Tenant info
    const tenant = await settingsService.getTenantInfo(supabase);

    // ── PRINT VIEW: single invoice ────────────────────────────────────────────
    if (params.id) {
        const { data: rawDoc, error: docError } = await supabase
            .from('documents')
            .select('*, party:parties(legal_name, doc_number, address), document_lines(*)')
            .eq('id', params.id)
            .eq('doc_type', 'INVOICE')
            .single();

        if (docError || !rawDoc) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-700">
                    <div className="h-20 w-20 bg-rose-50 rounded-[2rem] flex items-center justify-center text-rose-400">
                        <FileText className="h-10 w-10" />
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase">
                            Factura no encontrada
                        </h2>
                        <p className="text-sm text-slate-400 font-medium">
                            El documento solicitado no existe o no tienes acceso a él.
                        </p>
                    </div>
                    <Link
                        href="/accounting/reports/invoice-template"
                        className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al listado
                    </Link>
                </div>
            );
        }

        const doc = rawDoc as unknown as DocumentWithLines;
        const party = doc.party as Party | null;
        const lines: DocumentLine[] = (doc.document_lines ?? []) as DocumentLine[];
        const status = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG['DRAFT'];
        const cufe = simulatedCufe(doc.id);

        return (
            <div className="space-y-6 pb-24 animate-in fade-in duration-700">

                {/* Top controls — hidden when printing */}
                <div className="flex items-center justify-between print:hidden">
                    <Link
                        href="/accounting/reports/invoice-template"
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Listado de facturas
                    </Link>
                    <PrintButton label="Imprimir Factura" />
                </div>

                {/* A4 Invoice card */}
                <Card className="print:block border-none shadow-premium bg-white rounded-[2.5rem] p-12 md:p-16 max-w-3xl mx-auto print:rounded-none print:shadow-none print:p-8 print:max-w-full">

                    {/* Company header */}
                    <div className="flex items-start justify-between gap-8 pb-10 border-b border-slate-100">
                        <div className="flex items-start gap-6">
                            {tenant?.logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={tenant.logo_url}
                                    alt={`Logo ${tenant?.name}`}
                                    className="h-16 w-16 rounded-2xl object-contain bg-slate-50 border border-slate-100"
                                />
                            ) : (
                                <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                                    <Building2 className="h-8 w-8 text-slate-400" />
                                </div>
                            )}
                            <div className="space-y-1">
                                <h2 className="text-xl font-black text-slate-900 italic uppercase tracking-tight leading-none">
                                    {tenant?.name ?? 'Empresa'}
                                </h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    NIT: {tenant?.nit ?? '—'}{tenant?.dv ? `-${tenant.dv}` : ''}
                                </p>
                                {tenant?.address && (
                                    <p className="text-[10px] text-slate-400 font-medium">{tenant.address}</p>
                                )}
                                {tenant?.email && (
                                    <p className="text-[10px] text-slate-400 font-medium">{tenant.email}</p>
                                )}
                                {tenant?.phone && (
                                    <p className="text-[10px] text-slate-400 font-medium">{tenant.phone}</p>
                                )}
                            </div>
                        </div>

                        {/* Invoice title block */}
                        <div className="text-right shrink-0 space-y-1">
                            <div className="flex items-center justify-end gap-2">
                                <Printer className="h-4 w-4 text-indigo-400 print:hidden" />
                                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.4em]">
                                    Factura de Venta
                                </p>
                            </div>
                            <p className="text-4xl font-black text-slate-900 italic tracking-tighter leading-none">
                                {doc.number ?? 'S/N'}
                            </p>
                            <Badge className={cn(
                                "border-none text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg",
                                status.cls
                            )}>
                                {status.label}
                            </Badge>
                        </div>
                    </div>

                    {/* Dates row */}
                    <div className="grid grid-cols-2 gap-6 py-8 border-b border-slate-100">
                        <div className="bg-slate-50 rounded-2xl p-5 space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Fecha de expedición
                            </p>
                            <p className="text-sm font-black text-slate-900 italic tracking-tight">
                                {fmtDate(doc.issue_date)}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-5 space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Fecha de vencimiento
                            </p>
                            <p className="text-sm font-black text-slate-900 italic tracking-tight">
                                {fmtDate(doc.due_date)}
                            </p>
                        </div>
                    </div>

                    {/* Customer section */}
                    <div className="py-8 border-b border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                            Facturado a
                        </p>
                        <div className="bg-indigo-50/50 rounded-2xl p-5 space-y-1">
                            <p className="text-base font-black text-slate-900 italic uppercase tracking-tight">
                                {party?.legal_name ?? 'Consumidor Final'}
                            </p>
                            {party?.doc_number && (
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    NIT / CC: {party.doc_number}
                                </p>
                            )}
                            {party?.address && (
                                <p className="text-[10px] text-slate-500 font-medium">{party.address}</p>
                            )}
                        </div>
                    </div>

                    {/* Line items table */}
                    <div className="py-8 border-b border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
                            Detalle de productos / servicios
                        </p>
                        <div className="overflow-x-auto rounded-2xl border border-slate-100">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-900 text-white">
                                        <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest rounded-tl-2xl">
                                            Descripcion
                                        </th>
                                        <th className="px-5 py-3 text-right text-[9px] font-black uppercase tracking-widest">
                                            Cant.
                                        </th>
                                        <th className="px-5 py-3 text-right text-[9px] font-black uppercase tracking-widest">
                                            Precio Unit.
                                        </th>
                                        <th className="px-5 py-3 text-right text-[9px] font-black uppercase tracking-widest rounded-tr-2xl">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {lines.length > 0 ? lines.map((line) => (
                                        <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-5 py-4 text-xs font-medium text-slate-700 leading-snug">
                                                {line.description || '—'}
                                            </td>
                                            <td className="px-5 py-4 text-xs font-black text-slate-700 text-right tabular-nums">
                                                {Number(line.qty).toLocaleString('es-CO')}
                                            </td>
                                            <td className="px-5 py-4 text-xs font-medium text-slate-600 text-right tabular-nums">
                                                {fmt(Number(line.unit_price))}
                                            </td>
                                            <td className="px-5 py-4 text-xs font-black text-slate-900 text-right tabular-nums">
                                                {fmt(Number(line.total))}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-10 text-center text-[10px] text-slate-400 font-medium italic">
                                                Sin líneas de detalle registradas
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Totals section */}
                    <div className="py-8 border-b border-slate-100">
                        <div className="max-w-xs ml-auto space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Subtotal
                                </span>
                                <span className="text-sm font-medium text-slate-700 tabular-nums">
                                    {fmt(Number(doc.subtotal))}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    IVA (19%)
                                </span>
                                <span className="text-sm font-medium text-slate-700 tabular-nums">
                                    {fmt(Number(doc.taxes))}
                                </span>
                            </div>
                            <div className="h-px bg-slate-200" />
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-black text-slate-900 uppercase tracking-widest">
                                    TOTAL
                                </span>
                                <span className="text-2xl font-black text-slate-900 italic tracking-tighter">
                                    {fmt(Number(doc.total))}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {doc.notes && (
                        <div className="py-6 border-b border-slate-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                Observaciones
                            </p>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">{doc.notes}</p>
                        </div>
                    )}

                    {/* CUFE footer */}
                    <div className="pt-8 space-y-3">
                        <div className="bg-slate-50 rounded-2xl p-5 space-y-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                CUFE (Simulado — pendiente habilitación DIAN)
                            </p>
                            <p className="text-[10px] font-mono text-slate-500 break-all leading-relaxed">
                                {cufe}
                            </p>
                        </div>
                        <p className="text-[8px] text-slate-300 text-center font-medium tracking-widest uppercase">
                            Documento generado por {tenant?.name ?? 'GVM Corp'} · Plataforma GVM ERP v3.0 · 2026
                        </p>
                    </div>

                </Card>
            </div>
        );
    }

    // ── LIST VIEW: invoice grid ────────────────────────────────────────────────

    const { data: rawDocuments } = await supabase
        .from('documents')
        .select('*, party:parties(legal_name, doc_number)')
        .eq('doc_type', 'INVOICE')
        .order('issue_date', { ascending: false })
        .limit(20);

    const documents: Document[] = (rawDocuments ?? []) as unknown as Document[];
    const totalDocs = documents.length;
    const totalAmount = documents.reduce((sum, d) => sum + (Number(d.total) || 0), 0);

    return (
        <div className="space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* Header card */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000">
                    <Printer className="h-24 w-24" />
                </div>

                <div className="relative z-10 space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-12 bg-indigo-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">
                                Invoice Template v3.0
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                            Disenador de <br />
                            <span className="text-slate-500">Factura</span>
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <Badge className="bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            <FileText className="h-3 w-3 mr-2 text-indigo-400" />
                            INVOICE TEMPLATE
                        </Badge>
                        <Badge className="bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            <Printer className="h-3 w-3 mr-2 text-emerald-400" />
                            {totalDocs} facturas · {fmt(totalAmount)}
                        </Badge>
                        <Badge className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            <Building2 className="h-3 w-3 mr-2" />
                            {tenant?.name ?? 'Empresa'}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Invoice cards grid */}
            {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6">
                    <div className="h-24 w-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300">
                        <FileText className="h-12 w-12" />
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-xl font-black italic tracking-tighter text-slate-900 uppercase">
                            Sin facturas registradas
                        </p>
                        <p className="text-sm text-slate-400 font-medium">
                            Las facturas de venta aparecen aqui una vez emitidas.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="flex items-center gap-4 px-2">
                        <div className="h-8 w-1 bg-indigo-600 rounded-full" />
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">
                            Ultimas 20 Facturas
                        </h2>
                        <Badge className="bg-slate-100 text-slate-400 border-none text-[8px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-lg">
                            {totalDocs}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {documents.map((doc) => {
                            const party = doc.party as Party | null;
                            const status = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG['DRAFT'];

                            return (
                                <Link
                                    key={doc.id}
                                    href={`?id=${doc.id}`}
                                    className="group"
                                >
                                    <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-7 h-full transition-all group-hover:translate-y-[-4px] group-hover:shadow-active relative overflow-hidden">

                                        {/* Background watermark */}
                                        <div className="absolute top-0 right-0 p-4 opacity-[0.04] pointer-events-none group-hover:scale-110 transition-transform duration-700">
                                            <FileText className="h-24 w-24 text-slate-900" />
                                        </div>

                                        <div className="relative z-10 space-y-5">
                                            {/* Top row: number + status */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shrink-0 group-hover:bg-indigo-600 transition-colors">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 italic tracking-tight">
                                                            {doc.number ?? 'S/N'}
                                                        </p>
                                                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                                                            Factura de Venta
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge className={cn(
                                                    "border-none text-[8px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg shrink-0",
                                                    status.cls
                                                )}>
                                                    {status.label}
                                                </Badge>
                                            </div>

                                            {/* Customer */}
                                            <div className="bg-slate-50 rounded-2xl p-4 space-y-0.5 group-hover:bg-indigo-50/50 transition-colors">
                                                <p className="text-xs font-black text-slate-800 italic tracking-tight uppercase line-clamp-1">
                                                    {party?.legal_name ?? 'Consumidor Final'}
                                                </p>
                                                {party?.doc_number && (
                                                    <p className="text-[9px] text-slate-400 font-bold tracking-widest">
                                                        NIT {party.doc_number}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Date + Total */}
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                        Fecha
                                                    </p>
                                                    <p className="text-[11px] font-bold text-slate-600 tracking-widest uppercase">
                                                        {doc.issue_date}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                        Total
                                                    </p>
                                                    <p className="text-lg font-black text-slate-900 italic tracking-tighter">
                                                        {fmt(Number(doc.total))}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* CTA row */}
                                            <div className="flex items-center justify-end">
                                                <span className="flex items-center gap-1 text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">
                                                    Ver factura
                                                    <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                                                </span>
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Footer tip */}
            <div className="bg-slate-100 p-10 rounded-[2.5rem] flex flex-col lg:flex-row items-center justify-between gap-10 border border-slate-200">
                <div className="flex items-center gap-8">
                    <div className="h-14 w-14 bg-white rounded-[2rem] flex items-center justify-center text-indigo-600 shadow-premium border border-white">
                        <Printer className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-2xl font-black tracking-tight uppercase leading-tight text-slate-900">
                            Impresion Directa
                        </h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-xl">
                            Haz clic en cualquier factura para ver su plantilla completa lista para imprimir.
                            El encabezado y barra lateral del sistema se ocultan automaticamente al imprimir.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-white px-8 py-4 rounded-[2rem] border border-slate-200 shadow-premium shrink-0">
                    <Printer className="h-5 w-5 text-indigo-400" />
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                        Ctrl + P para imprimir
                    </span>
                </div>
            </div>

        </div>
    );
}
