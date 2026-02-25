import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    TrendingDown,
    Truck,
    Calendar,
    FileText,
    ArrowRight,
    Package,
    Calculator,
    ChevronRight,
    Search
} from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"

export default async function PurchasesReportPage({
    searchParams
}: {
    searchParams: Promise<{ startDate?: string, endDate?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const startDate = params.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = params.endDate || new Date().toISOString().split('T')[0];

    // Fetch Bills (Purchases)
    const { data: bills, error } = await supabase
        .from('documents')
        .select('*, party:parties(legal_name, doc_number)')
        .eq('doc_type', 'VENDOR_BILL')
        .gte('issue_date', startDate)
        .lte('issue_date', endDate)
        .order('issue_date', { ascending: false });

    if (error) throw error;

    const [tenant] = await Promise.all([settingsService.getTenantInfo(supabase)]);

    // Metrics
    const totalPurchases = bills?.reduce((sum, b) => sum + (Number(b.total) || 0), 0) || 0;
    const totalSubtotal = bills?.reduce((sum, b) => sum + (Number(b.subtotal) || 0), 0) || 0;
    const totalTaxes = bills?.reduce((sum, b) => sum + (Number(b.taxes) || 0), 0) || 0;
    const billCount = bills?.length || 0;

    const fmt = (n: number) => `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header */}
            <VisualReportHeader
                title="Reporte de Compras"
                subtitle={`Control de Custos/Gastos: ${startDate} » ${endDate}`}
                tenant={tenant}
            />

            {/* Summary KPI Strip */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-1">
                <div className="flex items-center gap-12">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">Total Egresos Facturados</span>
                        <div className="flex items-baseline gap-4">
                            <h2 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none">
                                {fmt(totalPurchases)}
                            </h2>
                            <span className="text-xl font-black text-slate-300 uppercase italic tracking-widest">Comprometido</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ReportingFilters />
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                            <Package className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Volumen de Compras</p>
                            <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{billCount} Facturas</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                            <Calculator className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Carga Impositiva (IVA)</p>
                            <p className="text-2xl font-black text-white italic tracking-tighter">{fmt(totalTaxes)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <FileText className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Base Imponible</p>
                            <p className="text-2xl font-black text-blue-600 italic tracking-tighter">{fmt(totalSubtotal)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-emerald-50 rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all text-emerald-900">
                    <div className="space-y-4 text-emerald-600">
                        <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                            <TrendingDown className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-60">Impacto en P&L</p>
                            <p className="text-2xl font-black italic tracking-tighter opacity-90">Análisis Realizado</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Table */}
            <Card className="border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">Detalle de Compras y Gastos</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Listado de Facturas de Proveedores</p>
                    </div>
                    <Button variant="ghost" className="text-orange-600 text-[10px] font-black uppercase tracking-widest gap-2">
                        Analizar Costos <ChevronRight className="h-3 w-3" />
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-10 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
                                <th className="px-10 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                <th className="px-10 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Proveedor</th>
                                <th className="px-10 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Subtotal</th>
                                <th className="px-10 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Impuestos</th>
                                <th className="px-10 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {bills?.map((bill) => (
                                <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110">
                                                <Truck className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs font-black text-slate-900 tracking-tight italic">{bill.number}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            <Calendar className="h-3 w-3 text-slate-300" />
                                            {bill.issue_date}
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-slate-800 uppercase italic tracking-tight">{bill.party?.legal_name || 'N/A'}</p>
                                            <p className="text-[9px] text-slate-400 font-bold tracking-widest">{bill.party?.doc_number || ''}</p>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <span className="text-xs font-bold text-slate-600 tabular-nums">{fmt(Number(bill.subtotal))}</span>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <span className="text-xs font-bold text-slate-400 tabular-nums">{fmt(Number(bill.taxes))}</span>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <span className="text-sm font-black text-slate-900 tabular-nums italic">{fmt(Number(bill.total))}</span>
                                    </td>
                                </tr>
                            ))}

                            {billCount === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-10 py-20 text-center">
                                        <Package className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sin registro de compras en este periodo</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Aesthetic Advisory */}
            <div className="bg-slate-900 p-12 rounded-[4rem] text-white flex flex-col lg:flex-row items-center justify-between gap-10 shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform">
                    <Layers className="h-48 w-48 text-white" />
                </div>
                <div className="flex items-center gap-8 relative z-10">
                    <div className="h-20 w-20 bg-white/10 rounded-[2rem] flex items-center justify-center text-orange-400 border border-white/10 shadow-inner">
                        <TrendingDown className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Gestión de Egresos</h4>
                        <p className="text-sm text-white/40 leading-relaxed font-medium max-w-xl">
                            Consolidación técnica de costos y gastos registrados bajo la figura de Factura de Proveedor.
                            Este reporte alimenta directamente el Estado de Resultados (P&L).
                        </p>
                    </div>
                </div>
                <Button variant="outline" className="h-16 rounded-[2rem] bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest px-12 hover:bg-orange-500 hover:text-white transition-all shadow-active group relative z-10">
                    Certificar Compras <ArrowRight className="ml-4 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
}

const Layers = (props: any) => (
    <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24" height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
    </svg>
)
