import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cn } from "@/shared/lib/utils"
import { FileSpreadsheet, Download, AlertCircle, CheckCircle2, Building2 } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface PartyRow {
    legal_name: string | null;
    doc_number: string | null;
    nit: string | null;
}

interface DocumentRow {
    id: string;
    doc_type: string;
    subtotal: number;
    taxes: number;
    total: number;
    party: PartyRow | null;
}

interface VendorAggregate {
    nit: string;
    legalName: string;
    totalPaid: number;
    docCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const THRESHOLD_VENDOR = 1_000_000; // Min COP to appear in Formato 1001

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
    return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`;
}

function pctShare(value: number, total: number): string {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
}

// ─── Format info cards ────────────────────────────────────────────────────────

const FORMAT_CARDS = [
    {
        id: 'F1001',
        title: 'Formato 1001',
        subtitle: 'Pagos o abonos en cuenta',
        description:
            'Reporta todos los pagos realizados a terceros (proveedores, contratistas, arrendadores) durante el ano gravable. Incluye el concepto de pago, el NIT del beneficiario y el valor pagado.',
        color: 'border-amber-200 bg-amber-50/50',
        badge: 'bg-amber-100 text-amber-700',
        icon: 'amber',
    },
    {
        id: 'F1007',
        title: 'Formato 1007',
        subtitle: 'Ingresos recibidos',
        description:
            'Reporta los ingresos obtenidos por la empresa durante el ano gravable. Incluye ventas de bienes y servicios facturados, identificando al cliente pagador por su NIT.',
        color: 'border-emerald-200 bg-emerald-50/50',
        badge: 'bg-emerald-100 text-emerald-700',
        icon: 'emerald',
    },
    {
        id: 'F1003',
        title: 'Formato 1003',
        subtitle: 'Retenciones practicadas',
        description:
            'Reporta las retenciones en la fuente (ReteFuente, ReteIVA, ReteICA) practicadas a terceros. Se cruza con la informacion de los retenidos para verificar consistencia en las declaraciones.',
        color: 'border-indigo-200 bg-indigo-50/50',
        badge: 'bg-indigo-100 text-indigo-700',
        icon: 'indigo',
    },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function TaxMediaPage({
    searchParams,
}: {
    searchParams: Promise<{ year?: string }>;
}) {
    const supabase = await createClient();
    const params = await searchParams;

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Tenant info
    const tenant = await settingsService.getTenantInfo(supabase);

    // Year filter
    const currentYear = new Date().getFullYear();
    const year = params.year ? parseInt(params.year, 10) : currentYear;
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // ── Fetch INVOICE documents (ingresos - Formato 1007) ──────────────────────
    const { data: rawInvoices } = await supabase
        .from('documents')
        .select('id, doc_type, subtotal, taxes, total, party:parties(legal_name, doc_number, nit)')
        .eq('doc_type', 'INVOICE')
        .gte('issue_date', startDate)
        .lte('issue_date', endDate);

    // ── Fetch VENDOR_BILL documents (pagos - Formato 1001) ─────────────────────
    const { data: rawVendorBills } = await supabase
        .from('documents')
        .select('id, doc_type, subtotal, taxes, total, party:parties(legal_name, doc_number, nit)')
        .eq('doc_type', 'VENDOR_BILL')
        .gte('issue_date', startDate)
        .lte('issue_date', endDate);

    const invoices: DocumentRow[] = (rawInvoices ?? []) as unknown as DocumentRow[];
    const vendorBills: DocumentRow[] = (rawVendorBills ?? []) as unknown as DocumentRow[];

    // ── KPI calculations ──────────────────────────────────────────────────────
    const totalInvoiced = invoices.reduce((s, d) => s + (Number(d.total) || 0), 0);
    const totalVendorPaid = vendorBills.reduce((s, d) => s + (Number(d.total) || 0), 0);
    const totalIvaPaid = vendorBills.reduce((s, d) => s + (Number(d.taxes) || 0), 0);

    // Retenciones estimadas (15% de IVA pagado a proveedores)
    const totalWithholdings = totalIvaPaid * 0.15;

    // Unique vendor count
    const uniqueVendorNits = new Set(
        vendorBills
            .map(d => (d.party as PartyRow | null)?.nit ?? (d.party as PartyRow | null)?.doc_number)
            .filter(Boolean)
    );

    // ── Aggregate vendor payments for Formato 1001 ────────────────────────────
    const vendorMap = new Map<string, VendorAggregate>();

    for (const bill of vendorBills) {
        const party = bill.party as PartyRow | null;
        const nit = party?.nit ?? party?.doc_number ?? 'SIN-NIT';
        const legalName = party?.legal_name ?? 'Proveedor Desconocido';
        const paid = Number(bill.total) || 0;

        const existing = vendorMap.get(nit);
        if (existing) {
            existing.totalPaid += paid;
            existing.docCount += 1;
        } else {
            vendorMap.set(nit, { nit, legalName, totalPaid: paid, docCount: 1 });
        }
    }

    // Filter by threshold and sort descending
    const vendorRows: VendorAggregate[] = Array.from(vendorMap.values())
        .filter(v => v.totalPaid >= THRESHOLD_VENDOR)
        .sort((a, b) => b.totalPaid - a.totalPaid);

    const vendorRowsTotal = vendorRows.reduce((s, v) => s + v.totalPaid, 0);

    // ── Year selector options ──────────────────────────────────────────────────
    const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

    return (
        <div className="space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* Header card */}
            <div className="bg-amber-600 rounded-[3.5rem] p-12 md:p-20 text-white shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-16 opacity-[0.04] pointer-events-none group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000">
                    <FileSpreadsheet className="h-80 w-80" />
                </div>

                <div className="relative z-10 space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-12 bg-amber-300 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-amber-200">
                                Tax Media Files — DIAN Colombia
                            </span>
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black tracking-tighter italic uppercase leading-[0.8]">
                            Medios <br />
                            <span className="text-amber-300">Magneticos</span>
                        </h1>
                        <p className="text-amber-100 font-bold text-sm uppercase tracking-widest">
                            TAX MEDIA FILES — Informacion Exogena Ano Gravable {year}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <Badge className="bg-white/10 border border-white/20 text-white text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            <FileSpreadsheet className="h-3 w-3 mr-2 text-amber-300" />
                            INFORMACION EXOGENA
                        </Badge>
                        <Badge className="bg-white/10 border border-white/20 text-white text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            <Building2 className="h-3 w-3 mr-2 text-amber-300" />
                            {tenant?.name ?? 'Empresa'} · NIT {tenant?.nit ?? '—'}
                        </Badge>
                        <Badge className="bg-white/10 border border-white/20 text-white text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            Ano Gravable {year}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Year selector */}
            <div className="flex items-center gap-3 px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Ano gravable:
                </span>
                {yearOptions.map(y => (
                    <Link
                        key={y}
                        href={`?year=${y}`}
                        className={cn(
                            "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            y === year
                                ? "bg-amber-600 text-white"
                                : "bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                        )}
                    >
                        {y}
                    </Link>
                ))}
            </div>

            {/* Format cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {FORMAT_CARDS.map(card => (
                    <div key={card.id} className={cn("p-7 rounded-[2.5rem] border space-y-4", card.color)}>
                        <div className="flex items-center justify-between">
                            <Badge className={cn("border-none text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg", card.badge)}>
                                {card.id}
                            </Badge>
                            <FileSpreadsheet className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-black text-slate-900 italic tracking-tight uppercase">
                                {card.title}
                            </p>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                {card.subtitle}
                            </p>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                            {card.description}
                        </p>
                    </div>
                ))}
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <Building2 className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                Proveedores unicos
                            </p>
                            <p className="text-3xl font-black text-amber-600 italic tracking-tighter">
                                {uniqueVendorNits.size}
                            </p>
                            <p className="text-[9px] text-slate-300 font-medium mt-0.5">Con pagos registrados</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                            <Download className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                Total pagado (F1001)
                            </p>
                            <p className="text-2xl font-black text-orange-600 italic tracking-tighter">
                                {fmt(totalVendorPaid)}
                            </p>
                            <p className="text-[9px] text-slate-300 font-medium mt-0.5">Pagos a proveedores</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                Ingresos facturados (F1007)
                            </p>
                            <p className="text-2xl font-black text-emerald-600 italic tracking-tighter">
                                {fmt(totalInvoiced)}
                            </p>
                            <p className="text-[9px] text-slate-300 font-medium mt-0.5">{invoices.length} facturas</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-active bg-slate-900 rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all text-white">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-amber-300" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">
                                Retenciones est. (F1003)
                            </p>
                            <p className="text-2xl font-black text-white italic tracking-tighter">
                                {fmt(totalWithholdings)}
                            </p>
                            <p className="text-[9px] text-white/30 font-medium mt-0.5">15% del IVA pagado</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Formato 1001 table */}
            <Card className="border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Badge className="bg-amber-100 text-amber-700 border-none text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg">
                                Formato 1001
                            </Badge>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">
                            Pagos a Proveedores
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            Ano gravable {year} · Solo terceros con pagos ≥ {fmt(THRESHOLD_VENDOR)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-400" />
                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                            {vendorRows.length} terceros
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    NIT Proveedor
                                </th>
                                <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Razon Social
                                </th>
                                <th className="px-8 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Docs
                                </th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Valor Pagado
                                </th>
                                <th className="px-8 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    % Particip.
                                </th>
                                <th className="px-8 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Concepto
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {vendorRows.length > 0 ? vendorRows.map((vendor, idx) => (
                                <tr key={vendor.nit} className="hover:bg-amber-50/30 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-xl bg-amber-600 flex items-center justify-center text-white text-[10px] font-black shrink-0 group-hover:bg-amber-700 transition-colors">
                                                {idx + 1}
                                            </div>
                                            <span className="text-xs font-mono font-bold text-slate-600">
                                                {vendor.nit}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-xs font-black text-slate-900 italic tracking-tight uppercase line-clamp-2">
                                            {vendor.legalName}
                                        </p>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <Badge className="bg-slate-100 text-slate-500 border-none text-[8px] font-black px-2.5 py-0.5 rounded-lg">
                                            {vendor.docCount}
                                        </Badge>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-sm font-black text-slate-900 tabular-nums italic">
                                            {fmt(vendor.totalPaid)}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-xs font-bold text-amber-600 tabular-nums">
                                            {pctShare(vendor.totalPaid, vendorRowsTotal)}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-[10px] font-medium text-slate-400 italic">
                                            Compras y servicios
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="px-10 py-20 text-center">
                                        <FileSpreadsheet className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                                            Sin pagos a proveedores en el ano {year}
                                        </p>
                                        <p className="text-xs text-slate-300 font-medium mt-2">
                                            Solo se muestran terceros con pagos ≥ {fmt(THRESHOLD_VENDOR)}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {vendorRows.length > 0 && (
                    <div className="px-10 py-6 border-t border-slate-50 bg-amber-50/30 flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {vendorRows.length} terceros reportables · Umbral ≥ {fmt(THRESHOLD_VENDOR)}
                        </span>
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block">
                                    Base reportable
                                </span>
                                <span className="text-lg font-black text-amber-700 italic">
                                    {fmt(vendorRowsTotal)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Threshold note */}
            <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 rounded-3xl px-8 py-6">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                        Criterio de reporte — Formato 1001
                    </p>
                    <p className="text-xs text-amber-600 font-medium leading-relaxed">
                        Solo se incluyen terceros con pagos <strong>iguales o superiores a {fmt(THRESHOLD_VENDOR)}</strong> en el ano gravable.
                        Este umbral es orientativo; la DIAN puede exigir reportar a todos los terceros segun el tipo de
                        declarante y el valor de los activos brutos. Verifique la resolucion vigente cada ano.
                    </p>
                </div>
            </div>

            {/* Download section */}
            <Card className="border-none shadow-premium bg-white rounded-[3rem] p-10">
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <Download className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">
                                Descarga de Archivos
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                Exportar informacion exogena para la DIAN
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Formato 1001 CSV */}
                        <div className="relative group">
                            <button
                                disabled
                                className="w-full flex flex-col items-start gap-3 p-6 rounded-2xl border-2 border-amber-200 bg-amber-50/50 opacity-60 cursor-not-allowed transition-all"
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                                        <FileSpreadsheet className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-amber-100 text-amber-600 border-none text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg">
                                        Proximamente
                                    </Badge>
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-black text-slate-700 italic tracking-tight">
                                        Descargar Formato 1001 (CSV)
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                                        Pagos o abonos en cuenta · Proveedores
                                    </p>
                                </div>
                            </button>
                        </div>

                        {/* Formato 1007 CSV */}
                        <div className="relative group">
                            <button
                                disabled
                                className="w-full flex flex-col items-start gap-3 p-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 opacity-60 cursor-not-allowed transition-all"
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                        <FileSpreadsheet className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-emerald-100 text-emerald-600 border-none text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg">
                                        Proximamente
                                    </Badge>
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-black text-slate-700 italic tracking-tight">
                                        Descargar Formato 1007 (CSV)
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                                        Ingresos recibidos · Clientes
                                    </p>
                                </div>
                            </button>
                        </div>

                        {/* XML DIAN */}
                        <div className="relative group">
                            <button
                                disabled
                                className="w-full flex flex-col items-start gap-3 p-6 rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 opacity-60 cursor-not-allowed transition-all"
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        <Download className="h-5 w-5" />
                                    </div>
                                    <Badge className="bg-indigo-100 text-indigo-600 border-none text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg">
                                        Proximamente
                                    </Badge>
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-black text-slate-700 italic tracking-tight">
                                        Exportar XML DIAN
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                                        Formato oficial · Muisca · Todos los formatos
                                    </p>
                                </div>
                            </button>
                        </div>

                    </div>

                    <div className="flex items-start gap-3 bg-slate-50 rounded-2xl px-6 py-4">
                        <AlertCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                            La generacion de archivos XML en el formato oficial DIAN (Muisca) requiere integracion directa
                            con el portal. Esta funcionalidad estara disponible proximamente. Por ahora puedes revisar
                            la informacion en pantalla y exportar manualmente desde las tablas.
                        </p>
                    </div>
                </div>
            </Card>

            {/* Footer banner */}
            <div className="bg-slate-100 p-12 rounded-[4rem] flex flex-col lg:flex-row items-center justify-between gap-10 border border-slate-200">
                <div className="flex items-center gap-8">
                    <div className="h-20 w-20 bg-white rounded-[2rem] flex items-center justify-center text-amber-600 shadow-premium border border-white">
                        <FileSpreadsheet className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-slate-900">
                            Obligacion DIAN Anual
                        </h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-xl">
                            <span className="text-amber-600 font-bold">{tenant?.name}</span> debe presentar la informacion
                            exogena (medios magneticos) ante la DIAN para el ano gravable{' '}
                            <span className="font-black text-slate-900">{year}</span>.
                            Los plazos vencen entre febrero y abril del ano siguiente segun el ultimo digito del NIT.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 bg-white px-8 py-4 rounded-[2rem] border border-amber-200 shadow-premium shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-amber-500" />
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                        Ano gravable {year}
                    </span>
                </div>
            </div>

        </div>
    );
}
