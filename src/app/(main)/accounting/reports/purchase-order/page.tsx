import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { PrintButton } from '@/features/accounting/components/PrintButton';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cn } from "@/shared/lib/utils"
import { ClipboardList, ChevronRight, ArrowLeft, Truck } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Party {
    legal_name: string;
    nit: string | null;
    doc_number: string | null;
    address: string | null;
    city: string | null;
    email: string | null;
    phone: string | null;
}

interface DocumentLine {
    id: string;
    document_id: string;
    description: string | null;
    qty: number;
    unit_price: number;
    line_total: number;
    tax_config: unknown;
}

interface PurchaseOrder {
    id: string;
    doc_type: string;
    number: string | null;
    issue_date: string;
    due_date: string | null;
    total: number;
    taxes: number;
    subtotal: number;
    status: string;
    party_id: string | null;
    party: Party | null;
    document_lines: DocumentLine[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
    return `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
}

function ocNumber(number: string | null): string {
    if (!number) return 'OC-000';
    return `OC-${number}`;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
    DRAFT:    { label: 'Borrador',  cls: 'bg-slate-100 text-slate-500' },
    SENT:     { label: 'Enviada',   cls: 'bg-blue-50 text-blue-600' },
    ACCEPTED: { label: 'Aceptada',  cls: 'bg-emerald-50 text-emerald-700' },
    PAID:     { label: 'Pagada',    cls: 'bg-indigo-50 text-indigo-600' },
};

// ─── List View ────────────────────────────────────────────────────────────────

interface ListViewProps {
    orders: PurchaseOrder[];
}

function ListView({ orders }: ListViewProps) {
    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* Dark hero header */}
            <div className="bg-slate-900 rounded-[3.5rem] p-12 md:p-16 text-white shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000">
                    <ClipboardList className="h-80 w-80" />
                </div>
                <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-12 bg-blue-500 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-400">
                            Compras · Purchase Order
                        </span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter italic uppercase leading-[0.85]">
                        Orden de<br />
                        <span className="text-slate-500">Compra</span>
                    </h1>
                    <p className="text-sm font-medium text-slate-400 max-w-lg leading-relaxed">
                        Documentos oficiales de solicitud a proveedores. Selecciona una orden para ver e imprimir el formato oficial.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                        <Badge className="bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            <ClipboardList className="h-3 w-3 mr-2 text-blue-400" />
                            {orders.length} Órdenes Recientes
                        </Badge>
                        <Badge className="bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            <Truck className="h-3 w-3 mr-2" />
                            Tipo: VENDOR BILL
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Cards grid */}
            {orders.length === 0 ? (
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-16 text-center">
                    <ClipboardList className="h-14 w-14 text-slate-200 mx-auto mb-5" />
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
                        Sin órdenes de compra registradas
                    </p>
                    <p className="text-xs text-slate-300 font-medium mt-2">
                        Las órdenes de compra aparecerán aquí una vez registres documentos de tipo VENDOR BILL.
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {orders.map((order) => {
                        const oc = ocNumber(order.number);
                        const vendor = order.party?.legal_name ?? 'Sin proveedor';
                        const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['DRAFT'];
                        return (
                            <Link key={order.id} href={`?id=${order.id}`} className="group">
                                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-7 h-full transition-all group-hover:translate-y-[-4px] group-hover:shadow-active relative overflow-hidden">

                                    {/* Top accent line */}
                                    <div className="absolute top-0 left-7 right-7 h-0.5 bg-gradient-to-r from-blue-500/40 to-transparent rounded-full" />

                                    <div className="space-y-5">
                                        {/* Header row */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="h-11 w-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 transition-transform duration-500 group-hover:rotate-6">
                                                <ClipboardList className="h-5 w-5" />
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Badge className={cn(
                                                    "border-none text-[7px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg",
                                                    statusCfg.cls
                                                )}>
                                                    {statusCfg.label}
                                                </Badge>
                                                <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </div>

                                        {/* OC number */}
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                N° Orden
                                            </p>
                                            <p className="text-lg font-black text-slate-900 italic tracking-tighter">
                                                {oc}
                                            </p>
                                        </div>

                                        {/* Total */}
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                                Valor Total
                                            </p>
                                            <p className="text-2xl font-black text-blue-600 italic tracking-tighter tabular-nums">
                                                {fmt(Number(order.total))}
                                            </p>
                                        </div>

                                        {/* Meta */}
                                        <div className="space-y-2 pt-1 border-t border-slate-50">
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                                                    Fecha
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-600 tracking-widest uppercase">
                                                    {fmtDate(order.issue_date)}
                                                </span>
                                            </div>
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">
                                                    Proveedor
                                                </span>
                                                <span className="text-[10px] font-black text-slate-800 italic text-right truncate max-w-[140px]">
                                                    {vendor}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Print View ───────────────────────────────────────────────────────────────

interface PrintViewProps {
    order: PurchaseOrder;
    tenantName: string;
    tenantNit: string;
    tenantAddress: string;
    tenantCity: string;
}

function PrintView({ order, tenantName, tenantNit, tenantAddress, tenantCity }: PrintViewProps) {
    const oc = ocNumber(order.number);
    const vendor = order.party;
    const lines = order.document_lines ?? [];
    const subtotal = Number(order.subtotal);
    const taxes = Number(order.taxes);
    const total = Number(order.total);

    return (
        <div className="space-y-10 pb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Screen-only action bar */}
            <div className="flex items-center justify-between print:hidden">
                <Link
                    href="/accounting/reports/purchase-order"
                    className="flex items-center gap-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al listado
                </Link>
                <PrintButton label="Imprimir Orden de Compra" />
            </div>

            {/* ── A4-style purchase order ─────────────────────────────────── */}
            <div className={cn(
                "bg-white rounded-[2.5rem] shadow-premium mx-auto overflow-hidden",
                "print:rounded-none print:shadow-none print:max-w-none print:w-full",
                "max-w-3xl"
            )}>

                {/* Top accent stripe */}
                <div className="h-2 bg-slate-900 print:bg-slate-900" />

                <div className="p-10 md:p-14 space-y-8 print:p-10">

                    {/* Company header (buyer) */}
                    <div className="flex items-start justify-between gap-8 pb-6 border-b-2 border-slate-900">
                        <div className="space-y-1.5">
                            <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-400">
                                Empresa Compradora
                            </p>
                            <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-900">
                                {tenantName}
                            </h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                                NIT: {tenantNit}
                            </p>
                            {tenantAddress && (
                                <p className="text-xs font-medium text-slate-400">
                                    {tenantAddress}{tenantCity ? ` · ${tenantCity}` : ''}
                                </p>
                            )}
                        </div>
                        <div className="text-right space-y-2 shrink-0">
                            <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-2xl">
                                <ClipboardList className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {oc}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Document title */}
                    <div className="text-center space-y-3">
                        <div className="inline-flex flex-col items-center gap-2">
                            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">
                                Orden de Compra
                            </h1>
                            <div className="flex items-center gap-4">
                                <div className="h-px w-16 bg-slate-200" />
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
                                    Purchase Order
                                </span>
                                <div className="h-px w-16 bg-slate-200" />
                            </div>
                        </div>
                    </div>

                    {/* Dates row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 rounded-2xl p-5 space-y-1.5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Fecha de Orden
                            </p>
                            <p className="text-base font-black text-slate-900 italic tracking-tight">
                                {fmtDate(order.issue_date)}
                            </p>
                        </div>
                        <div className="bg-slate-50 rounded-2xl p-5 space-y-1.5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Fecha de Entrega
                            </p>
                            <p className="text-base font-black text-slate-900 italic tracking-tight">
                                {fmtDate(order.due_date)}
                            </p>
                        </div>
                    </div>

                    {/* Vendor section */}
                    <div className="bg-slate-800 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-blue-400" />
                            <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.5em]">
                                Proveedor
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-start justify-between gap-4">
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/40 shrink-0">
                                    Razón Social
                                </span>
                                <span className="text-sm font-black italic uppercase text-white text-right">
                                    {vendor?.legal_name ?? 'Sin proveedor'}
                                </span>
                            </div>
                            {(vendor?.nit ?? vendor?.doc_number) && (
                                <>
                                    <div className="h-px bg-white/10" />
                                    <div className="flex items-start justify-between gap-4">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40 shrink-0">
                                            NIT
                                        </span>
                                        <span className="text-sm font-black text-white/80 text-right font-mono">
                                            {vendor?.nit ?? vendor?.doc_number}
                                        </span>
                                    </div>
                                </>
                            )}
                            {vendor?.address && (
                                <>
                                    <div className="h-px bg-white/10" />
                                    <div className="flex items-start justify-between gap-4">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40 shrink-0">
                                            Dirección
                                        </span>
                                        <span className="text-sm font-medium text-white/70 text-right">
                                            {vendor.address}{vendor.city ? `, ${vendor.city}` : ''}
                                        </span>
                                    </div>
                                </>
                            )}
                            {vendor?.email && (
                                <>
                                    <div className="h-px bg-white/10" />
                                    <div className="flex items-start justify-between gap-4">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40 shrink-0">
                                            Email
                                        </span>
                                        <span className="text-sm font-medium text-white/70 text-right">
                                            {vendor.email}
                                        </span>
                                    </div>
                                </>
                            )}
                            {vendor?.phone && (
                                <>
                                    <div className="h-px bg-white/10" />
                                    <div className="flex items-start justify-between gap-4">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/40 shrink-0">
                                            Teléfono
                                        </span>
                                        <span className="text-sm font-medium text-white/70 text-right">
                                            {vendor.phone}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Conditions section */}
                    <div className="border border-slate-100 rounded-2xl p-6 space-y-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em]">
                            Condiciones
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Forma de Pago
                                </p>
                                <p className="text-xs font-black text-slate-700 italic">
                                    30 días
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Lugar de Entrega
                                </p>
                                <p className="text-xs font-black text-slate-700 italic">
                                    {tenantCity || 'Colombia'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Moneda
                                </p>
                                <p className="text-xs font-black text-slate-700 italic">
                                    COP
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Line items table */}
                    <div className="overflow-hidden rounded-2xl border border-slate-100">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-900 text-white">
                                    <th className="px-5 py-4 text-left text-[8px] font-black uppercase tracking-widest w-8">#</th>
                                    <th className="px-5 py-4 text-left text-[8px] font-black uppercase tracking-widest">Descripción</th>
                                    <th className="px-5 py-4 text-right text-[8px] font-black uppercase tracking-widest">Cantidad</th>
                                    <th className="px-5 py-4 text-right text-[8px] font-black uppercase tracking-widest">Valor Unit.</th>
                                    <th className="px-5 py-4 text-right text-[8px] font-black uppercase tracking-widest">IVA %</th>
                                    <th className="px-5 py-4 text-right text-[8px] font-black uppercase tracking-widest">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {lines.map((line, idx) => {
                                    const ivaRate = (line.tax_config as { rate?: number })?.rate ?? 0;
                                    const ivaPct = (ivaRate * 100).toFixed(0);
                                    return (
                                        <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-5 py-4">
                                                <span className="text-[9px] font-black text-slate-400 italic">
                                                    {idx + 1}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-xs font-bold text-slate-800 leading-snug">
                                                    {line.description ?? '—'}
                                                </p>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <span className="text-xs font-black text-slate-700 tabular-nums">
                                                    {line.qty}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <span className="text-xs font-bold text-slate-600 tabular-nums">
                                                    {fmt(Number(line.unit_price))}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <span className="text-xs font-black text-amber-600 tabular-nums">
                                                    {ivaPct}%
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <span className="text-sm font-black text-slate-900 tabular-nums italic">
                                                    {fmt(Number(line.line_total))}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {lines.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-10 text-center">
                                            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">
                                                Sin líneas de detalle
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex items-center justify-between gap-4 py-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    Subtotal
                                </span>
                                <span className="text-sm font-bold text-slate-700 tabular-nums">
                                    {fmt(subtotal)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 py-2">
                                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
                                    IVA Total
                                </span>
                                <span className="text-sm font-bold text-amber-700 tabular-nums">
                                    {fmt(taxes)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-4 py-3 border-t-2 border-slate-900">
                                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">
                                    Gran Total
                                </span>
                                <span className="text-xl font-black text-slate-900 italic tabular-nums">
                                    {fmt(total)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Authorization section */}
                    <div className="border border-slate-100 rounded-2xl p-6 space-y-6">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em]">
                            Autorización
                        </p>
                        <div className="grid grid-cols-2 gap-10">
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-full h-14 border-b-2 border-slate-300" />
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 text-center">
                                    Gerente de Compras
                                </p>
                                <div className="h-3 w-28 bg-slate-100 rounded-full" />
                            </div>
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-full h-14 border-b-2 border-slate-300" />
                                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 text-center">
                                    Autorizado por
                                </p>
                                <div className="h-3 w-28 bg-slate-100 rounded-full" />
                            </div>
                        </div>
                    </div>

                    {/* Terms and conditions footer */}
                    <div className="bg-slate-50 rounded-2xl p-6 space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em] mb-3">
                            Términos y Condiciones
                        </p>
                        <p className="text-[10px] font-medium text-slate-400 leading-relaxed">
                            1. Esta orden de compra constituye un acuerdo de compra entre {tenantName} y el proveedor indicado.
                            2. El proveedor debe confirmar la recepción de esta orden dentro de las 48 horas siguientes.
                            3. Los productos o servicios deben cumplir con las especificaciones descritas en este documento.
                            4. Cualquier cambio en precio, cantidad o condiciones de entrega debe ser aprobado previamente por escrito.
                            5. El pago se realizará según las condiciones indicadas, previa verificación de entrega satisfactoria.
                        </p>
                    </div>

                    {/* Footer note */}
                    <div className="text-center pt-2">
                        <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.3em]">
                            Documento generado el {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })} &nbsp;·&nbsp; {tenantName} &nbsp;·&nbsp; NIT: {tenantNit}
                        </p>
                    </div>
                </div>

                {/* Bottom accent stripe */}
                <div className="h-1.5 bg-blue-600 print:bg-blue-600" />
            </div>
        </div>
    );
}

// ─── Page (Server Component) ──────────────────────────────────────────────────

export default async function PurchaseOrderPage({
    searchParams
}: {
    searchParams: Promise<{ id?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const tenant = await settingsService.getTenantInfo(supabase);

    // ── Detail view ──────────────────────────────────────────────────────────

    if (params.id) {
        const { data: orderRaw } = await supabase
            .from('documents')
            .select('*, party:parties(legal_name, nit, doc_number, address, city, email, phone), document_lines(*)')
            .eq('id', params.id)
            .eq('doc_type', 'VENDOR_BILL')
            .single();

        if (!orderRaw) {
            redirect('/accounting/reports/purchase-order');
        }

        const order = orderRaw as unknown as PurchaseOrder;

        return (
            <PrintView
                order={order}
                tenantName={tenant?.name ?? 'Mi Empresa'}
                tenantNit={tenant ? `${tenant.nit}-${tenant.dv}` : ''}
                tenantAddress={tenant?.address ?? ''}
                tenantCity={tenant?.city ?? 'Colombia'}
            />
        );
    }

    // ── List view ────────────────────────────────────────────────────────────

    const { data: ordersRaw } = await supabase
        .from('documents')
        .select('*, party:parties(legal_name, nit, doc_number, address, city, email, phone), document_lines(*)')
        .eq('doc_type', 'VENDOR_BILL')
        .order('issue_date', { ascending: false })
        .limit(20);

    const orders = (ordersRaw ?? []) as unknown as PurchaseOrder[];

    return <ListView orders={orders} />;
}
