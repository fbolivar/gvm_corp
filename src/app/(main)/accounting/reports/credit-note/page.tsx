import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { PrintButton } from '@/features/accounting/components/PrintButton';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cn } from "@/shared/lib/utils"
import { FileText, ChevronRight, ArrowLeft, AlertTriangle, Minus, Plus } from "lucide-react"

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
    doc_number?: string | null;
    address?: string | null;
}

interface InvoiceDoc {
    id: string;
    number: string | null;
    issue_date: string;
    status: string;
    subtotal: number;
    taxes: number;
    total: number;
    party_id: string | null;
    party?: Party | null;
}

interface InvoiceDocWithLines extends InvoiceDoc {
    document_lines: DocumentLine[];
}

// ─── Config ───────────────────────────────────────────────────────────────────

type NoteType = 'credito' | 'debito';

interface NoteConfig {
    label: string;
    subtitle: string;
    prefix: string;
    accentBg: string;
    accentText: string;
    accentBorder: string;
    accentLight: string;
    headerBg: string;
    icon: React.ElementType;
    signText: string;
    badgeCls: string;
}

const NOTE_CONFIG: Record<NoteType, NoteConfig> = {
    credito: {
        label: 'Nota Crédito',
        subtitle: 'CREDIT NOTE — Ajuste a favor del cliente',
        prefix: 'NC',
        accentBg: 'bg-amber-600',
        accentText: 'text-amber-600',
        accentBorder: 'border-amber-600',
        accentLight: 'bg-amber-50',
        headerBg: 'bg-amber-800',
        icon: Minus,
        signText: 'Reduce el valor de la factura',
        badgeCls: 'bg-amber-50 text-amber-700',
    },
    debito: {
        label: 'Nota Débito',
        subtitle: 'DEBIT NOTE — Cargo adicional al cliente',
        prefix: 'ND',
        accentBg: 'bg-rose-600',
        accentText: 'text-rose-600',
        accentBorder: 'border-rose-600',
        accentLight: 'bg-rose-50',
        headerBg: 'bg-rose-800',
        icon: Plus,
        signText: 'Incrementa el valor de la factura',
        badgeCls: 'bg-rose-50 text-rose-700',
    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function todayISO(): string {
    return new Date().toISOString().split('T')[0];
}

function noteNumber(prefix: string, invoiceNumber: string | null): string {
    const year = new Date().getFullYear();
    const seq = invoiceNumber
        ? invoiceNumber.replace(/\D/g, '').slice(-4).padStart(4, '0')
        : '0001';
    return `${prefix}-${year}-${seq}`;
}

function resolveNoteType(raw?: string): NoteType {
    return raw === 'debito' ? 'debito' : 'credito';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CreditNotePage({
    searchParams,
}: {
    searchParams: Promise<{ id?: string; tipo?: string }>;
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tenant = await settingsService.getTenantInfo(supabase);
    const tipo = resolveNoteType(params.tipo);
    const cfg = NOTE_CONFIG[tipo];

    // ── PRINT VIEW ────────────────────────────────────────────────────────────
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
                        <AlertTriangle className="h-10 w-10" />
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase">
                            Factura no encontrada
                        </h2>
                        <p className="text-sm text-slate-400 font-medium">
                            El documento solicitado no existe o no tienes acceso a el.
                        </p>
                    </div>
                    <Link
                        href={`/accounting/reports/credit-note?tipo=${tipo}`}
                        className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al listado
                    </Link>
                </div>
            );
        }

        const doc = rawDoc as unknown as InvoiceDocWithLines;
        const party = doc.party as Party | null;
        const lines: DocumentLine[] = (doc.document_lines ?? []) as DocumentLine[];
        const noteNum = noteNumber(cfg.prefix, doc.number);
        const today = todayISO();
        const NoteIcon = cfg.icon;

        return (
            <div className="space-y-6 pb-24 animate-in fade-in duration-700">

                {/* Top controls */}
                <div className="flex items-center justify-between print:hidden">
                    <Link
                        href={`/accounting/reports/credit-note?tipo=${tipo}`}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Listado de facturas
                    </Link>
                    <PrintButton label={`Imprimir ${cfg.label}`} />
                </div>

                {/* A4 Note card */}
                <Card className="print:block border-none shadow-premium bg-white rounded-[2.5rem] p-12 md:p-16 max-w-3xl mx-auto print:rounded-none print:shadow-none print:p-8 print:max-w-full">

                    {/* ── Company Header ───────────────────────────────────── */}
                    <div className="flex items-start justify-between gap-8 pb-10 border-b-4 border-slate-900">
                        <div className="flex items-start gap-5">
                            {tenant?.logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={tenant.logo_url}
                                    alt={`Logo ${tenant?.name}`}
                                    className="h-16 w-16 rounded-2xl object-contain bg-slate-50 border border-slate-100"
                                />
                            ) : (
                                <div className="h-16 w-16 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0">
                                    <FileText className="h-8 w-8 text-white" />
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
                                {tenant?.phone && (
                                    <p className="text-[10px] text-slate-400 font-medium">Tel. {tenant.phone}</p>
                                )}
                                {tenant?.email && (
                                    <p className="text-[10px] text-slate-400 font-medium">{tenant.email}</p>
                                )}
                            </div>
                        </div>

                        {/* Note type title block */}
                        <div className="text-right shrink-0">
                            <div className={cn(
                                "inline-block border-2 rounded-2xl px-6 py-4",
                                cfg.accentBorder
                            )}>
                                <div className="flex items-center justify-end gap-2 mb-1">
                                    <NoteIcon className={cn("h-4 w-4", cfg.accentText)} />
                                    <p className={cn("text-[9px] font-black uppercase tracking-[0.4em] leading-none", cfg.accentText)}>
                                        {cfg.label}
                                    </p>
                                </div>
                                <p className={cn("text-3xl font-black italic tracking-tighter leading-none", cfg.accentText)}>
                                    {noteNum}
                                </p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                                    {cfg.signText}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Dates + Reference ────────────────────────────────── */}
                    <div className="grid grid-cols-3 gap-4 py-8 border-b border-slate-100">
                        <div className="bg-slate-50 rounded-2xl p-4 space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Fecha de Emisión
                            </p>
                            <p className="text-sm font-black text-slate-900 italic tracking-tight">
                                {fmtDate(today)}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-4 space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Ref. Factura
                            </p>
                            <p className="text-sm font-black text-slate-900 italic tracking-tight">
                                {doc.number ?? 'S/N'}
                            </p>
                        </div>
                        <div className={cn("rounded-2xl p-4 space-y-1", cfg.accentLight)}>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Fecha Factura
                            </p>
                            <p className="text-sm font-black text-slate-900 italic tracking-tight">
                                {fmtDate(doc.issue_date)}
                            </p>
                        </div>
                    </div>

                    {/* ── Customer ─────────────────────────────────────────── */}
                    <div className="py-8 border-b border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                            Dirigido a
                        </p>
                        <div className={cn("rounded-2xl p-5 space-y-1", cfg.accentLight)}>
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

                    {/* ── Concept Table ────────────────────────────────────── */}
                    <div className="py-8 border-b border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
                            Concepto del Ajuste
                        </p>
                        <div className="overflow-x-auto rounded-2xl border border-slate-100">
                            <table className="w-full">
                                <thead>
                                    <tr className={cn("text-white", cfg.accentBg)}>
                                        <th className="px-5 py-3 text-left text-[9px] font-black uppercase tracking-widest rounded-tl-2xl">
                                            Concepto
                                        </th>
                                        <th className="px-5 py-3 text-right text-[9px] font-black uppercase tracking-widest">
                                            Cant.
                                        </th>
                                        <th className="px-5 py-3 text-right text-[9px] font-black uppercase tracking-widest">
                                            Precio Unit.
                                        </th>
                                        <th className="px-5 py-3 text-right text-[9px] font-black uppercase tracking-widest rounded-tr-2xl">
                                            Valor Ajuste
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
                                            <td className={cn("px-5 py-4 text-xs font-black text-right tabular-nums", cfg.accentText)}>
                                                {fmt(Number(line.total))}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-10 text-center text-[10px] text-slate-400 font-medium italic">
                                                Sin lineas de detalle registradas en la factura de referencia
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── Totals ───────────────────────────────────────────── */}
                    <div className="py-8 border-b border-slate-100">
                        <div className="max-w-xs ml-auto space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Subtotal Ajuste
                                </span>
                                <span className="text-sm font-medium text-slate-700 tabular-nums">
                                    {fmt(Number(doc.subtotal))}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    IVA Ajuste (19%)
                                </span>
                                <span className="text-sm font-medium text-slate-700 tabular-nums">
                                    {fmt(Number(doc.taxes))}
                                </span>
                            </div>
                            <div className="h-px bg-slate-200" />
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-black text-slate-900 uppercase tracking-widest">
                                    Total Ajuste
                                </span>
                                <span className={cn("text-2xl font-black italic tracking-tighter", cfg.accentText)}>
                                    {fmt(Number(doc.total))}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ── Causal ───────────────────────────────────────────── */}
                    <div className="py-8 border-b border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                            Causal del Ajuste
                        </p>
                        <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
                            {[
                                { key: 'devolucion', label: 'Devolucion de mercancias o anulacion parcial' },
                                { key: 'descuento', label: 'Descuento comercial o rebaja en precio' },
                                { key: 'ajuste', label: 'Ajuste de precio acordado con el cliente' },
                            ].map(({ key, label }) => (
                                <div key={key} className="flex items-start gap-3">
                                    <div className={cn("h-4 w-4 rounded border-2 mt-0.5 shrink-0", cfg.accentBorder)} />
                                    <p className="text-xs font-medium text-slate-700 leading-snug">{label}</p>
                                </div>
                            ))}
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pt-1">
                                Marcar el causal correspondiente antes de imprimir
                            </p>
                        </div>
                    </div>

                    {/* ── Signatures ───────────────────────────────────────── */}
                    <div className="pt-10 pb-2">
                        <div className="grid grid-cols-2 gap-16">
                            <div className="flex flex-col gap-2">
                                <div className="h-px bg-slate-900 w-full" />
                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] text-center">
                                    Elaboro
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
                                    Nombre, Cargo y Firma
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="h-px bg-slate-400 w-full" />
                                <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] text-center">
                                    Aprobo
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">
                                    Nombre, Cargo y Firma
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Footer ───────────────────────────────────────────── */}
                    <div className="pt-8 border-t border-slate-100 mt-8 flex items-center justify-between">
                        <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">
                            Documento equivalente a {cfg.label} — Normativa fiscal colombiana
                        </span>
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                            {tenant?.name ?? 'GVM Corp'} · NIT {tenant?.nit ?? '—'}{tenant?.dv ? `-${tenant.dv}` : ''} · 2026
                        </span>
                    </div>

                </Card>
            </div>
        );
    }

    // ── LIST VIEW ─────────────────────────────────────────────────────────────

    const { data: rawDocuments } = await supabase
        .from('documents')
        .select('*, party:parties(legal_name, doc_number)')
        .eq('doc_type', 'INVOICE')
        .order('issue_date', { ascending: false })
        .limit(20);

    const documents: InvoiceDoc[] = (rawDocuments ?? []) as unknown as InvoiceDoc[];
    const totalDocs = documents.length;
    const totalAmount = documents.reduce((sum, d) => sum + (Number(d.total) || 0), 0);

    const NoteIcon = cfg.icon;

    return (
        <div className="space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* ── Header card ────────────────────────────────────────────────── */}
            <div className={cn(
                "rounded-[2.5rem] p-10 text-white shadow-active relative overflow-hidden group",
                tipo === 'debito' ? 'bg-rose-900' : 'bg-amber-900'
            )}>
                <div className="absolute top-0 right-0 p-16 opacity-[0.04] pointer-events-none group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000">
                    <FileText className="h-24 w-24" />
                </div>

                <div className="relative z-10 space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "h-2 w-12 rounded-full",
                                tipo === 'debito' ? 'bg-rose-400' : 'bg-amber-400'
                            )} />
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-[0.5em]",
                                tipo === 'debito' ? 'text-rose-400' : 'text-amber-400'
                            )}>
                                {tipo === 'debito' ? 'Debit Note Module v3.0' : 'Credit Note Module v3.0'}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                            Nota Credito /<br />
                            <span className="text-white/30">Debito</span>
                        </h1>
                        <p className={cn(
                            "font-bold text-sm uppercase tracking-widest",
                            tipo === 'debito' ? 'text-rose-300' : 'text-amber-300'
                        )}>
                            {cfg.subtitle}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <Badge className="bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            <FileText className="h-3 w-3 mr-2 text-amber-400" />
                            {totalDocs} facturas disponibles
                        </Badge>
                        <Badge className="bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            <NoteIcon className={cn("h-3 w-3 mr-2", tipo === 'debito' ? 'text-rose-400' : 'text-amber-400')} />
                            Total base: {fmt(totalAmount)}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* ── Tab switcher ────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-1">
                <Link
                    href="?tipo=credito"
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                        tipo === 'credito'
                            ? 'bg-amber-600 text-white shadow-premium'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    )}
                >
                    <Minus className="h-3.5 w-3.5" />
                    Nota Credito
                </Link>
                <Link
                    href="?tipo=debito"
                    className={cn(
                        "flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                        tipo === 'debito'
                            ? 'bg-rose-600 text-white shadow-premium'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    )}
                >
                    <Plus className="h-3.5 w-3.5" />
                    Nota Debito
                </Link>
            </div>

            {/* ── Invoice cards grid ───────────────────────────────────────────── */}
            {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6">
                    <div className="h-24 w-24 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-300">
                        <FileText className="h-12 w-12" />
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-xl font-black italic tracking-tighter text-slate-900 uppercase">
                            Sin facturas disponibles
                        </p>
                        <p className="text-sm text-slate-400 font-medium">
                            Las facturas de venta emitidas apareceran aqui para generar notas de ajuste.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="flex items-center gap-4 px-2">
                        <div className={cn("h-8 w-1 rounded-full", cfg.accentBg)} />
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

                            return (
                                <Link
                                    key={doc.id}
                                    href={`?id=${doc.id}&tipo=${tipo}`}
                                    className="group"
                                >
                                    <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-7 h-full transition-all group-hover:translate-y-[-4px] group-hover:shadow-active relative overflow-hidden">

                                        {/* Top accent stripe */}
                                        <div className={cn(
                                            "absolute top-0 left-0 h-1 w-full rounded-t-[2.5rem]",
                                            tipo === 'debito'
                                                ? 'bg-gradient-to-r from-rose-400 to-rose-600'
                                                : 'bg-gradient-to-r from-amber-400 to-amber-600'
                                        )} />

                                        {/* Background watermark */}
                                        <div className="absolute top-0 right-0 p-4 opacity-[0.04] pointer-events-none group-hover:scale-110 transition-transform duration-700">
                                            <FileText className="h-24 w-24 text-slate-900" />
                                        </div>

                                        <div className="relative z-10 space-y-5 pt-2">
                                            {/* Invoice number + note badge */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-xl flex items-center justify-center text-white shrink-0 transition-colors",
                                                        tipo === 'debito'
                                                            ? 'bg-rose-600 group-hover:bg-rose-700'
                                                            : 'bg-amber-600 group-hover:bg-amber-700'
                                                    )}>
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900 italic tracking-tight">
                                                            {doc.number ?? 'S/N'}
                                                        </p>
                                                        <p className={cn("text-[9px] font-black uppercase tracking-widest", cfg.accentText)}>
                                                            Factura de Venta
                                                        </p>
                                                    </div>
                                                </div>
                                                <Badge className={cn(
                                                    "border-none text-[8px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg shrink-0",
                                                    cfg.badgeCls
                                                )}>
                                                    {cfg.label}
                                                </Badge>
                                            </div>

                                            {/* Customer */}
                                            <div className={cn(
                                                "rounded-2xl p-4 space-y-0.5 transition-colors",
                                                tipo === 'debito'
                                                    ? 'bg-slate-50 group-hover:bg-rose-50/40'
                                                    : 'bg-slate-50 group-hover:bg-amber-50/40'
                                            )}>
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
                                                        Total Factura
                                                    </p>
                                                    <p className={cn("text-lg font-black italic tracking-tighter", cfg.accentText)}>
                                                        {fmt(Number(doc.total))}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* CTA */}
                                            <div className="flex items-center justify-end">
                                                <span className={cn(
                                                    "flex items-center gap-1 text-[9px] font-black uppercase tracking-widest transition-colors",
                                                    tipo === 'debito'
                                                        ? 'text-slate-300 group-hover:text-rose-500'
                                                        : 'text-slate-300 group-hover:text-amber-500'
                                                )}>
                                                    Generar {cfg.label}
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

            {/* ── Footer tip ───────────────────────────────────────────────────── */}
            <div className="bg-slate-100 p-10 rounded-[2.5rem] flex flex-col lg:flex-row items-center justify-between gap-10 border border-slate-200">
                <div className="flex items-center gap-8">
                    <div className={cn(
                        "h-14 w-14 rounded-[2rem] flex items-center justify-center shadow-premium border border-white",
                        cfg.accentLight
                    )}>
                        <AlertTriangle className={cn("h-10 w-10", cfg.accentText)} />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-2xl font-black tracking-tight uppercase leading-tight text-slate-900">
                            Selecciona una Factura
                        </h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-xl">
                            Haz clic en cualquier factura para generar la nota de ajuste correspondiente.
                            El documento se genera a partir de las lineas de la factura original.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-white px-8 py-4 rounded-[2rem] border border-slate-200 shadow-premium shrink-0">
                    <NoteIcon className={cn("h-5 w-5", cfg.accentText)} />
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                        {cfg.label} — Ctrl + P para imprimir
                    </span>
                </div>
            </div>

        </div>
    );
}
