import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { PrintButton } from '@/features/accounting/components/PrintButton';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cn } from "@/shared/lib/utils"
import { Landmark, ChevronRight, ArrowLeft } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentLine {
    id: string;
    description: string | null;
    qty: number;
    unit_price: number;
    total: number;
}

interface Party {
    legal_name: string | null;
    doc_number: string | null;
    nit: string | null;
    address: string | null;
    city: string | null;
    email: string | null;
    phone: string | null;
}

interface QuotationDocument {
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

interface QuotationDocumentWithLines extends QuotationDocument {
    document_lines: DocumentLine[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
    return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;
}

function fmtDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

function validityDate(issueDateIso: string): string {
    const d = new Date(issueDateIso + 'T00:00:00');
    d.setDate(d.getDate() + 30);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}

function cotNumber(number: string | null): string {
    if (!number) return 'COT-S/N';
    return `COT-${number}`;
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function QuotationTemplatePage({
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

    // ── PRINT VIEW: single quotation ──────────────────────────────────────────
    if (params.id) {
        const { data: rawDoc, error: docError } = await supabase
            .from('documents')
            .select('*, party:parties(legal_name, doc_number, nit, address, city, email, phone), document_lines(*)')
            .eq('id', params.id)
            .eq('doc_type', 'INVOICE')
            .single();

        if (docError || !rawDoc) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-in fade-in duration-700">
                    <div className="h-20 w-20 bg-violet-50 rounded-[2rem] flex items-center justify-center text-violet-400">
                        <Landmark className="h-10 w-10" />
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase">
                            Cotizacion no encontrada
                        </h2>
                        <p className="text-sm text-slate-400 font-medium">
                            El documento solicitado no existe o no tienes acceso a el.
                        </p>
                    </div>
                    <Link
                        href="/accounting/reports/quotation-template"
                        className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al listado
                    </Link>
                </div>
            );
        }

        const doc = rawDoc as unknown as QuotationDocumentWithLines;
        const party = doc.party as Party | null;
        const lines: DocumentLine[] = (doc.document_lines ?? []) as DocumentLine[];

        return (
            <div className="space-y-6 pb-24 animate-in fade-in duration-700">

                {/* Top controls — hidden when printing */}
                <div className="flex items-center justify-between print:hidden">
                    <Link
                        href="/accounting/reports/quotation-template"
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Listado de cotizaciones
                    </Link>
                    <PrintButton label="Imprimir Cotizacion" />
                </div>

                {/* A4 Quotation card */}
                <Card className="print:block border-none shadow-premium bg-white rounded-[2.5rem] p-12 md:p-16 max-w-3xl mx-auto print:rounded-none print:shadow-none print:p-8 print:max-w-full">

                    {/* Company header */}
                    <div className="flex items-start justify-between gap-8 pb-10 border-b-2 border-violet-600">
                        <div className="flex items-start gap-6">
                            {tenant?.logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={tenant.logo_url}
                                    alt={`Logo ${tenant?.name}`}
                                    className="h-16 w-16 rounded-2xl object-contain bg-slate-50 border border-slate-100"
                                />
                            ) : (
                                <div className="h-16 w-16 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
                                    <Landmark className="h-8 w-8 text-violet-500" />
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
                                {tenant?.city && (
                                    <p className="text-[10px] text-slate-400 font-medium">{tenant.city}</p>
                                )}
                                {tenant?.phone && (
                                    <p className="text-[10px] text-slate-400 font-medium">Tel: {tenant.phone}</p>
                                )}
                                {tenant?.email && (
                                    <p className="text-[10px] text-slate-400 font-medium">{tenant.email}</p>
                                )}
                            </div>
                        </div>

                        {/* Quotation title block */}
                        <div className="text-right shrink-0 space-y-1">
                            <p className="text-[9px] font-black text-violet-500 uppercase tracking-[0.4em]">
                                Cotizacion Comercial
                            </p>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                Sales Quotation
                            </p>
                            <p className="text-3xl font-black text-violet-700 italic tracking-tighter leading-none mt-2">
                                {cotNumber(doc.number)}
                            </p>
                            <Badge className="border-none text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg bg-violet-100 text-violet-700">
                                Cotizacion Previa
                            </Badge>
                        </div>
                    </div>

                    {/* Dates row */}
                    <div className="grid grid-cols-3 gap-4 py-8 border-b border-slate-100">
                        <div className="bg-violet-50 rounded-2xl p-5 space-y-1">
                            <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest">
                                Fecha de emision
                            </p>
                            <p className="text-sm font-black text-slate-900 italic tracking-tight">
                                {fmtDate(doc.issue_date)}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-5 space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Valida hasta
                            </p>
                            <p className="text-sm font-black text-slate-900 italic tracking-tight">
                                {validityDate(doc.issue_date)}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-5 space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Vigencia
                            </p>
                            <p className="text-sm font-black text-indigo-600 italic tracking-tight">
                                30 dias
                            </p>
                        </div>
                    </div>

                    {/* Validity note */}
                    <div className="py-4 border-b border-slate-100">
                        <p className="text-[10px] text-slate-500 font-medium italic">
                            Valida por <strong className="text-slate-700">30 dias</strong> desde{' '}
                            <strong className="text-slate-700">{fmtDate(doc.issue_date)}</strong>.
                            Precios sujetos a cambio sin previo aviso. Oferta no vinculante hasta confirmacion escrita.
                        </p>
                    </div>

                    {/* Customer section */}
                    <div className="py-8 border-b border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                            Cotizado a
                        </p>
                        <div className="bg-violet-50/60 rounded-2xl p-5 space-y-1 border border-violet-100">
                            <p className="text-base font-black text-slate-900 italic uppercase tracking-tight">
                                {party?.legal_name ?? 'Cliente a Definir'}
                            </p>
                            {(party?.doc_number || party?.nit) && (
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    NIT / CC: {party.nit ?? party.doc_number}
                                </p>
                            )}
                            {party?.address && (
                                <p className="text-[10px] text-slate-500 font-medium">{party.address}</p>
                            )}
                            {party?.city && (
                                <p className="text-[10px] text-slate-500 font-medium">{party.city}</p>
                            )}
                            {party?.email && (
                                <p className="text-[10px] text-slate-500 font-medium">{party.email}</p>
                            )}
                            {party?.phone && (
                                <p className="text-[10px] text-slate-500 font-medium">Tel: {party.phone}</p>
                            )}
                        </div>
                    </div>

                    {/* Line items table */}
                    <div className="py-8 border-b border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
                            Descripcion de productos / servicios
                        </p>
                        <div className="overflow-x-auto rounded-2xl border border-slate-100">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-violet-700 text-white">
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
                                            Subtotal
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {lines.length > 0 ? lines.map((line) => (
                                        <tr key={line.id} className="hover:bg-violet-50/30 transition-colors">
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
                                                Sin lineas de detalle registradas
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
                            <div className="h-px bg-violet-200" />
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-black text-slate-900 uppercase tracking-widest">
                                    Total a Pagar
                                </span>
                                <span className="text-2xl font-black text-violet-700 italic tracking-tighter">
                                    {fmt(Number(doc.total))}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Payment terms */}
                    <div className="py-6 border-b border-slate-100">
                        <div className="bg-slate-50 rounded-2xl p-5 flex items-start justify-between gap-6">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Forma de pago
                                </p>
                                <p className="text-sm font-black text-slate-900 italic tracking-tight">
                                    30 dias
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                    Credito 30 dias desde la fecha de factura.
                                </p>
                            </div>
                            <div className="space-y-1 text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Moneda
                                </p>
                                <p className="text-sm font-black text-slate-900 italic tracking-tight">
                                    Pesos Colombianos (COP)
                                </p>
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

                    {/* Acceptance section */}
                    <div className="py-8 border-b border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">
                            Aceptacion
                        </p>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-8">
                                <div className="h-px bg-slate-200 mt-12" />
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Aprobado por
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-medium">{tenant?.name ?? 'Empresa'}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">NIT: {tenant?.nit ?? '—'}</p>
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div className="h-px bg-slate-200 mt-12" />
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Aceptado por el cliente
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-medium">{party?.legal_name ?? 'Cliente'}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Fecha: ____________________</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Company contact footer */}
                    <div className="pt-8">
                        <div className="bg-violet-700 rounded-2xl p-6 text-white">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div>
                                    <p className="text-[9px] font-black text-violet-200 uppercase tracking-[0.3em] mb-1">
                                        Informacion de contacto
                                    </p>
                                    <p className="text-sm font-black italic tracking-tight">
                                        {tenant?.name ?? 'Empresa'}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-1 text-right">
                                    {tenant?.phone && (
                                        <p className="text-[10px] font-medium text-violet-200">Tel: {tenant.phone}</p>
                                    )}
                                    {tenant?.email && (
                                        <p className="text-[10px] font-medium text-violet-200">{tenant.email}</p>
                                    )}
                                    {tenant?.address && (
                                        <p className="text-[10px] font-medium text-violet-200">{tenant.address}</p>
                                    )}
                                    {tenant?.city && (
                                        <p className="text-[10px] font-medium text-violet-200">{tenant.city}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                        <p className="text-[8px] text-slate-300 text-center font-medium tracking-widest uppercase mt-4">
                            Documento generado por {tenant?.name ?? 'GVM Corp'} · Plataforma GVM ERP v3.0 · 2026
                        </p>
                    </div>

                </Card>
            </div>
        );
    }

    // ── LIST VIEW: quotation grid ──────────────────────────────────────────────

    const { data: rawDocuments } = await supabase
        .from('documents')
        .select('*, party:parties(legal_name, doc_number)')
        .eq('doc_type', 'INVOICE')
        .order('issue_date', { ascending: false })
        .limit(20);

    const documents: QuotationDocument[] = (rawDocuments ?? []) as unknown as QuotationDocument[];
    const totalDocs = documents.length;
    const totalAmount = documents.reduce((sum, d) => sum + (Number(d.total) || 0), 0);

    return (
        <div className="space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* Header card */}
            <div className="bg-violet-700 rounded-[3.5rem] p-12 md:p-20 text-white shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-16 opacity-[0.04] pointer-events-none group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000">
                    <Landmark className="h-80 w-80" />
                </div>

                <div className="relative z-10 space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-12 bg-violet-300 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-violet-300">
                                Sales Quotation v3.0
                            </span>
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black tracking-tighter italic uppercase leading-[0.8]">
                            Cotizacion <br />
                            <span className="text-violet-400">Comercial</span>
                        </h1>
                        <p className="text-violet-200 font-bold text-sm uppercase tracking-widest">
                            SALES QUOTATION — Ofertas Comerciales
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <Badge className="bg-white/10 border border-white/20 text-white text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            <Landmark className="h-3 w-3 mr-2 text-violet-300" />
                            COTIZACION COMERCIAL
                        </Badge>
                        <Badge className="bg-white/10 border border-white/20 text-white text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            {totalDocs} documentos · {fmt(totalAmount)}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Quotation cards grid */}
            {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6">
                    <div className="h-24 w-24 bg-violet-50 rounded-[2rem] flex items-center justify-center text-violet-300">
                        <Landmark className="h-12 w-12" />
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-xl font-black italic tracking-tighter text-slate-900 uppercase">
                            Sin cotizaciones registradas
                        </p>
                        <p className="text-sm text-slate-400 font-medium">
                            Las cotizaciones basadas en facturas de venta apareceran aqui.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="flex items-center gap-4 px-2">
                        <div className="h-8 w-1 bg-violet-600 rounded-full" />
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">
                            Ultimas 20 Cotizaciones
                        </h2>
                        <Badge className="bg-slate-100 text-slate-400 border-none text-[8px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-lg">
                            {totalDocs}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {documents.map((doc) => {
                            const party = doc.party as { legal_name?: string; doc_number?: string } | null;

                            return (
                                <Link
                                    key={doc.id}
                                    href={`?id=${doc.id}`}
                                    className="group"
                                >
                                    <Card className={cn(
                                        "border-none shadow-premium bg-white rounded-[2.5rem] p-7 h-full transition-all",
                                        "group-hover:translate-y-[-4px] group-hover:shadow-active relative overflow-hidden"
                                    )}>

                                        {/* Background watermark */}
                                        <div className="absolute top-0 right-0 p-4 opacity-[0.04] pointer-events-none group-hover:scale-110 transition-transform duration-700">
                                            <Landmark className="h-24 w-24 text-violet-700" />
                                        </div>

                                        <div className="relative z-10 space-y-5">
                                            {/* Top row: number */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-violet-700 flex items-center justify-center text-white shrink-0 group-hover:bg-violet-600 transition-colors">
                                                        <Landmark className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 italic tracking-tight">
                                                            {cotNumber(doc.number)}
                                                        </p>
                                                        <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest">
                                                            Cotizacion Comercial
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge className="border-none text-[8px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg bg-violet-100 text-violet-700 shrink-0">
                                                    Cotizacion
                                                </Badge>
                                            </div>

                                            {/* Customer */}
                                            <div className="bg-slate-50 rounded-2xl p-4 space-y-0.5 group-hover:bg-violet-50/50 transition-colors">
                                                <p className="text-xs font-black text-slate-800 italic tracking-tight uppercase line-clamp-1">
                                                    {party?.legal_name ?? 'Cliente por Definir'}
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
                                                    <p className="text-lg font-black text-violet-700 italic tracking-tighter">
                                                        {fmt(Number(doc.total))}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* CTA row */}
                                            <div className="flex items-center justify-end">
                                                <span className="flex items-center gap-1 text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-violet-500 transition-colors">
                                                    Ver Cotizacion
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
            <div className="bg-violet-50 p-12 rounded-[4rem] flex flex-col lg:flex-row items-center justify-between gap-10 border border-violet-100">
                <div className="flex items-center gap-8">
                    <div className="h-20 w-20 bg-white rounded-[2rem] flex items-center justify-center text-violet-600 shadow-premium border border-violet-100">
                        <Landmark className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                            Formato de Cotizacion
                        </h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-xl">
                            Haz clic en cualquier cotizacion para ver su plantilla completa lista para imprimir
                            y enviar al cliente. Incluye lineas de firma y condiciones de pago.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-white px-8 py-4 rounded-[2rem] border border-violet-200 shadow-premium shrink-0">
                    <Landmark className="h-5 w-5 text-violet-400" />
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                        Valida por 30 dias
                    </span>
                </div>
            </div>

        </div>
    );
}
