import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    Gavel,
    ArrowRight,
    FileText,
    TrendingDown,
    Shield,
    AlertCircle,
} from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"

// Colombia 2026 standard withholding rates
const RETES = {
    RETEFUENTE_COMPRAS:   { rate: 0.035, label: 'ReteFuente Compras',   min_uvt: 27, uvt: 49449 },
    RETEFUENTE_SERVICIOS: { rate: 0.04,  label: 'ReteFuente Servicios', min_uvt: 4,  uvt: 49449 },
    RETEIVA:              { rate: 0.15,  label: 'ReteIVA (15% del IVA)', min_uvt: 0,  uvt: 49449 },
    RETEICA:              { rate: 0.003, label: 'ReteICA',               min_uvt: 0,  uvt: 49449 },
};

type DocWithParty = {
    id: string;
    number: string | null;
    issue_date: string;
    subtotal: number;
    taxes: number;
    status: string;
    party: { legal_name: string; doc_number: string; party_type: string } | null;
};

export default async function WithholdingsPage({
    searchParams
}: {
    searchParams: Promise<{ startDate?: string; endDate?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const now = new Date();
    const startDate = params.startDate || new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate   = params.endDate   || now.toISOString().split('T')[0];

    const tenant = await settingsService.getTenantInfo(supabase);

    // Only VENDOR_BILL (purchases) generate retenciones practicadas
    const { data: vendorBills } = await supabase
        .from('documents')
        .select('id, number, issue_date, subtotal, taxes, status, party:parties(legal_name, doc_number, party_type)')
        .eq('doc_type', 'VENDOR_BILL')
        .gte('issue_date', startDate)
        .lte('issue_date', endDate)
        .order('issue_date', { ascending: false });

    const bills = (vendorBills ?? []) as unknown as DocWithParty[];

    // Compute retenciones per bill
    const minReteFuente = RETES.RETEFUENTE_COMPRAS.min_uvt * RETES.RETEFUENTE_COMPRAS.uvt;

    const rows = bills.map(b => {
        const subtotal = Number(b.subtotal) || 0;
        const iva      = Number(b.taxes)    || 0;
        const reteF    = subtotal >= minReteFuente ? subtotal * RETES.RETEFUENTE_COMPRAS.rate : 0;
        const reteIva  = iva > 0 ? iva * RETES.RETEIVA.rate : 0;
        const reteIca  = subtotal * RETES.RETEICA.rate;
        const total    = reteF + reteIva + reteIca;
        return { bill: b, reteF, reteIva, reteIca, total, subtotal, iva };
    });

    const totReteFuente = rows.reduce((s, r) => s + r.reteF, 0);
    const totReteIva    = rows.reduce((s, r) => s + r.reteIva, 0);
    const totReteIca    = rows.reduce((s, r) => s + r.reteIca, 0);
    const totRetes      = rows.reduce((s, r) => s + r.total, 0);
    const totSubtotal   = rows.reduce((s, r) => s + r.subtotal, 0);

    const fmt = (n: number) =>
        `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    const pct = (n: number, base: number) =>
        base > 0 ? `${((n / base) * 100).toFixed(1)}%` : '0%';

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            <VisualReportHeader
                title="Retenciones Practicadas"
                subtitle={`ReteFuente · ReteIVA · ReteICA — ${startDate} » ${endDate}`}
                tenant={tenant}
            />

            {/* KPI Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">
                        Total Retenciones
                    </span>
                    <div className="flex items-baseline gap-4">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                            {fmt(totRetes)}
                        </h2>
                        <span className="text-xl font-black text-red-400 uppercase italic tracking-widest">
                            {pct(totRetes, totSubtotal)} base
                        </span>
                    </div>
                </div>
                <ReportingFilters />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                {[
                    { label: 'ReteFuente', sub: '3.5% compras ≥ 27 UVT', value: totReteFuente, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'ReteIVA', sub: '15% del IVA pagado', value: totReteIva, color: 'text-orange-600', bg: 'bg-orange-50' },
                    { label: 'ReteICA', sub: '0.3% sobre compras', value: totReteIca, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Total a Consignar', sub: 'Obligación mensual', value: totRetes, color: 'text-white', bg: 'bg-slate-900', dark: true },
                ].map(item => (
                    <Card key={item.label} className={cn(
                        "border-none rounded-[2.5rem] p-8",
                        item.dark ? "bg-slate-900 shadow-active" : "bg-white shadow-premium"
                    )}>
                        <div className="space-y-4">
                            <div className={cn(
                                "h-12 w-12 rounded-xl flex items-center justify-center",
                                item.dark ? "bg-white/10" : item.bg
                            )}>
                                <Gavel className={cn("h-6 w-6", item.dark ? "text-white" : item.color)} />
                            </div>
                            <div>
                                <p className={cn("text-[9px] font-black uppercase tracking-widest mb-0.5", item.dark ? "text-white/40" : "text-slate-400")}>{item.label}</p>
                                <p className={cn("text-xl font-black italic tracking-tighter", item.dark ? "text-white" : item.color)}>{fmt(item.value)}</p>
                                <p className={cn("text-[9px] font-medium mt-0.5", item.dark ? "text-white/30" : "text-slate-300")}>{item.sub}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Rates Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'ReteFuente base', rate: '3.5%', note: 'Aplicable a compras ≥ 27 UVT ($1,335,123)', color: 'border-red-200 bg-red-50/50' },
                    { label: 'ReteIVA base', rate: '15%', note: 'Del IVA de la factura (solo grandes contribuyentes y régimen común)', color: 'border-orange-200 bg-orange-50/50' },
                    { label: 'ReteICA base', rate: '0.3%', note: 'Variable por municipio. Se usa tasa mínima para estimación', color: 'border-amber-200 bg-amber-50/50' },
                ].map(item => (
                    <div key={item.label} className={cn("p-6 rounded-2xl border", item.color)}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.label}</span>
                            <Badge className="bg-white border-none text-slate-700 text-[9px] font-black px-3 py-1">{item.rate}</Badge>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{item.note}</p>
                    </div>
                ))}
            </div>

            {/* Bills Table */}
            <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">
                            Retenciones por Factura de Compra
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            {bills.length} facturas · Periodo {startDate} – {endDate}
                        </p>
                    </div>
                    <AlertCircle className="h-5 w-5 text-amber-400" />
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-8 py-5 text-left   text-[9px] font-black text-slate-400 uppercase tracking-widest">Proveedor</th>
                                <th className="px-8 py-5 text-left   text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                <th className="px-8 py-5 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">Subtotal</th>
                                <th className="px-8 py-5 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">ReteFuente</th>
                                <th className="px-8 py-5 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">ReteIVA</th>
                                <th className="px-8 py-5 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">ReteICA</th>
                                <th className="px-8 py-5 text-right  text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Ret.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {rows.map(({ bill, reteF, reteIva, reteIca, total, subtotal }) => (
                                <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-xl bg-slate-900 flex items-center justify-center text-white text-xs font-black shrink-0 group-hover:bg-red-600 transition-colors">
                                                {(bill.party?.legal_name ?? 'P').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-900 italic">{bill.party?.legal_name ?? '—'}</p>
                                                <p className="text-[9px] text-slate-400 font-bold">{bill.party?.doc_number ?? ''}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{bill.issue_date}</span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-xs font-bold text-slate-600 tabular-nums">{fmt(subtotal)}</span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className={cn("text-xs font-bold tabular-nums", reteF > 0 ? "text-red-600" : "text-slate-200")}>
                                            {reteF > 0 ? fmt(reteF) : '—'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className={cn("text-xs font-bold tabular-nums", reteIva > 0 ? "text-orange-600" : "text-slate-200")}>
                                            {reteIva > 0 ? fmt(reteIva) : '—'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-xs font-bold text-amber-600 tabular-nums">{fmt(reteIca)}</span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <span className="text-sm font-black text-slate-900 tabular-nums italic">{fmt(total)}</span>
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-10 py-20 text-center">
                                        <TrendingDown className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sin facturas de compra en el periodo</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {rows.length > 0 && (
                    <div className="px-10 py-6 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{rows.length} facturas · Estimación basada en tasas estándar Colombia 2026</span>
                        <div className="flex items-center gap-4">
                            <div className="text-right"><span className="text-[9px] font-black text-red-500 block">ReteFuente</span><span className="text-sm font-black text-red-600 italic">{fmt(totReteFuente)}</span></div>
                            <div className="text-right"><span className="text-[9px] font-black text-orange-500 block">ReteIVA</span><span className="text-sm font-black text-orange-600 italic">{fmt(totReteIva)}</span></div>
                            <div className="text-right"><span className="text-[9px] font-black text-amber-500 block">ReteICA</span><span className="text-sm font-black text-amber-600 italic">{fmt(totReteIca)}</span></div>
                            <div className="text-right border-l border-slate-200 pl-4"><span className="text-[9px] font-black text-indigo-500 block">Total</span><span className="text-lg font-black text-slate-900 italic">{fmt(totRetes)}</span></div>
                        </div>
                    </div>
                )}
            </Card>

            <div className="bg-slate-100 p-10 rounded-[2.5rem] flex flex-col lg:flex-row items-center justify-between gap-10 border border-slate-200">
                <div className="flex items-center gap-8">
                    <div className="h-14 w-14 bg-white rounded-[2rem] flex items-center justify-center text-red-600 shadow-premium border border-white">
                        <Shield className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-2xl font-black tracking-tight uppercase leading-tight text-slate-900">
                            Obligación Mensual
                        </h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-xl">
                            <span className="text-red-600 font-bold">{tenant?.name}</span> debe consignar{' '}
                            <span className="font-black text-slate-900">{fmt(totRetes)}</span> en retenciones practicadas
                            en el formulario 350 antes del vencimiento del mes siguiente.
                            Valores estimados con tasas estándar Colombia 2026.
                        </p>
                    </div>
                </div>
                <Button variant="outline" className="h-12 rounded-[2rem] border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest px-12 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-premium group shrink-0">
                    Exportar F350 <ArrowRight className="ml-4 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
}
