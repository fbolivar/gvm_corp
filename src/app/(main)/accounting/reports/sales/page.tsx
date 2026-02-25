import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    TrendingUp,
    Users,
    Calendar,
    FileText,
    ArrowRight,
    ShoppingBag,
    PieChart,
    ChevronRight,
    Search
} from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"

export default async function SalesReportPage({
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

    // Fetch Invoices (Sales)
    const { data: invoices, error } = await supabase
        .from('documents')
        .select('*, party:parties(legal_name, doc_number)')
        .eq('doc_type', 'INVOICE')
        .gte('issue_date', startDate)
        .lte('issue_date', endDate)
        .order('issue_date', { ascending: false });

    if (error) throw error;

    const [tenant] = await Promise.all([settingsService.getTenantInfo(supabase)]);

    // Metrics
    const totalSales = invoices?.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0) || 0;
    const totalSubtotal = invoices?.reduce((sum, inv) => sum + (Number(inv.subtotal) || 0), 0) || 0;
    const totalTaxes = invoices?.reduce((sum, inv) => sum + (Number(inv.taxes) || 0), 0) || 0;
    const invoiceCount = invoices?.length || 0;
    const avgTicket = invoiceCount > 0 ? totalSales / invoiceCount : 0;

    const fmt = (n: number) => `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header */}
            <VisualReportHeader
                title="Reporte de Ventas"
                subtitle={`Análisis Comercial: ${startDate} » ${endDate}`}
                tenant={tenant}
            />

            {/* Summary KPI Strip */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-1">
                <div className="flex items-center gap-12">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">Ingresos Brutos Operacionales</span>
                        <div className="flex items-baseline gap-4">
                            <h2 className="text-6xl font-black text-slate-900 tracking-tighter italic leading-none">
                                {fmt(totalSales)}
                            </h2>
                            <span className="text-xl font-black text-slate-300 uppercase italic tracking-widest">Facturado</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ReportingFilters />
                    <Button variant="outline" className="h-14 w-14 rounded-2xl border-slate-100 bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center shadow-sm">
                        <Search className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <ShoppingBag className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Volumen de Ventas</p>
                            <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{invoiceCount} Facturas</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ticket Promedio</p>
                            <p className="text-2xl font-black text-emerald-600 italic tracking-tighter">{fmt(avgTicket)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <PieChart className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Subtotal (Sin Impuestos)</p>
                            <p className="text-2xl font-black text-amber-600 italic tracking-tighter">{fmt(totalSubtotal)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-active bg-slate-900 rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all text-white">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Carga Prestacional / Impuestos</p>
                            <p className="text-2xl font-black text-white italic tracking-tighter">{fmt(totalTaxes)}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Sales Table */}
            <Card className="border-none shadow-premium bg-white rounded-[3rem] overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">Detalle de Facturación</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Listado Cronológico de Comprobantes</p>
                    </div>
                    <Button variant="ghost" className="text-indigo-600 text-[10px] font-black uppercase tracking-widest gap-2">
                        Ver Todo <ChevronRight className="h-3 w-3" />
                    </Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-10 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
                                <th className="px-10 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                <th className="px-10 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                                <th className="px-10 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Subtotal</th>
                                <th className="px-10 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">IVA</th>
                                <th className="px-10 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                                <th className="px-10 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {invoices?.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <span className="text-xs font-black text-slate-900 tracking-tight italic">{inv.number}</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            <Calendar className="h-3 w-3 text-slate-300" />
                                            {inv.issue_date}
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-slate-800 uppercase italic tracking-tight">{inv.party?.legal_name || 'Consumidor Final'}</p>
                                            <p className="text-[9px] text-slate-400 font-bold tracking-widest">{inv.party?.doc_number || ''}</p>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <span className="text-xs font-bold text-slate-600 tabular-nums">{fmt(Number(inv.subtotal))}</span>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <span className="text-xs font-bold text-slate-400 tabular-nums">{fmt(Number(inv.taxes))}</span>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <span className="text-sm font-black text-slate-900 tabular-nums italic">{fmt(Number(inv.total))}</span>
                                    </td>
                                    <td className="px-10 py-6 text-center">
                                        <Badge className={cn(
                                            "border-none text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-md",
                                            inv.status === 'SENT' ? "bg-emerald-50 text-emerald-600" :
                                                inv.status === 'PAID' ? "bg-indigo-50 text-indigo-600" :
                                                    "bg-slate-100 text-slate-400"
                                        )}>
                                            {inv.status === 'SENT' ? 'Finalizado' : inv.status === 'PAID' ? 'Cobrado' : inv.status}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}

                            {invoiceCount === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-10 py-20 text-center">
                                        <ShoppingBag className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No hay ventas registradas en este periodo</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Aesthetic Advisory */}
            <div className="bg-slate-100 p-12 rounded-[4rem] flex flex-col lg:flex-row items-center justify-between gap-10 border border-slate-200 shadow-inner">
                <div className="flex items-center gap-8">
                    <div className="h-20 w-20 bg-white rounded-[2rem] flex items-center justify-center text-indigo-600 shadow-premium border border-white">
                        <TrendingUp className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-slate-900">Performance Comercial</h4>
                        <p className="text-sm text-slate-500 leading-relaxed font-medium max-w-xl">
                            Este reporte analiza el flujo de ingresos directos. Los datos presentados corresponden exclusivamente a facturas de venta emitidas y validadas por el sistema de <span className="text-indigo-600 font-bold">{tenant?.name}</span>.
                        </p>
                    </div>
                </div>
                <Button variant="outline" className="h-16 rounded-[2rem] border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest px-12 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-premium group">
                    Exportar Análisis <ArrowRight className="ml-4 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
}
