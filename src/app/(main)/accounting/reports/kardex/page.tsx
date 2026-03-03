import { createClient } from '@/lib/supabase/server';
import { settingsService } from '@/features/settings/services/settingsService';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { ReportingFilters } from '@/features/accounting/components/ReportingFilters';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { Card } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import {
    Package,
    ArrowUpCircle,
    ArrowDownCircle,
    RefreshCcw,
    Search,
    Calendar,
    ArrowRight,
    TrendingUp,
    Barcode
} from "lucide-react"
import { redirect } from 'next/navigation';
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"

export default async function KardexReportPage({
    searchParams
}: {
    searchParams: Promise<{ startDate?: string, endDate?: string, search?: string, type?: string, warehouseId?: string }>
}) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const startDate = params.startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = params.endDate || new Date().toISOString().split('T')[0];

    // Fetch movements using inventoryService
    const movements = await inventoryService.getAllMovements(supabase, {
        search: params.search,
        type: params.type,
        warehouse_id: params.warehouseId,
        limit: 100 // Limit for performance in overview
    });

    const [tenant] = await Promise.all([settingsService.getTenantInfo(supabase)]);

    // Filter by date (inventoryService.getAllMovements doesn't take date range currently, let's filter in memory or update service)
    // For now, in-memory filter since it's an MVP and limit is 100.
    const filteredMovements = movements.filter(m => {
        const date = m.occurred_at.split('T')[0];
        return date >= startDate && date <= endDate;
    });

    // Metrics
    const totalEntries = filteredMovements.filter(m => m.type === 'IN').reduce((sum, m) => sum + Number(m.qty), 0);
    const totalExits = filteredMovements.filter(m => m.type === 'OUT').reduce((sum, m) => sum + Number(m.qty), 0);
    const totalValue = filteredMovements.reduce((sum, m) => sum + (Number(m.qty) * Number(m.cost)), 0);

    const fmt = (n: number) => `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    return (
        <div className="space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* Header */}
            <VisualReportHeader
                title="Kardex por Producto"
                subtitle={`Trazabilidad de Existencias: ${startDate} » ${endDate}`}
                tenant={tenant}
            />

            {/* Summary KPI Strip */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-1">
                <div className="flex items-center gap-12">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] leading-none mb-4">Movimientos de Inventario</span>
                        <div className="flex items-baseline gap-4">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                                {filteredMovements.length}
                            </h2>
                            <span className="text-xl font-black text-slate-300 uppercase italic tracking-widest">Actividades</span>
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
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <ArrowUpCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Entradas (In)</p>
                            <p className="text-2xl font-black text-indigo-600 italic tracking-tighter">+{totalEntries} <span className="text-xs font-bold text-slate-300 ml-1">Unds</span></p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                            <ArrowDownCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Salidas (Out)</p>
                            <p className="text-2xl font-black text-orange-600 italic tracking-tighter">-{totalExits} <span className="text-xs font-bold text-slate-300 ml-1">Unds</span></p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-premium bg-white rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor de Movimientos</p>
                            <p className="text-2xl font-black text-emerald-600 italic tracking-tighter">{fmt(totalValue)}</p>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-active bg-slate-900 rounded-[2.5rem] p-8 group hover:translate-y-[-4px] transition-all text-white">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
                            <RefreshCcw className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Tasa de Rotación</p>
                            <p className="text-2xl font-black text-white italic tracking-tighter">Análisis Activo</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Movements Table */}
            <Card className="border-none shadow-premium bg-white rounded-[2.5rem] overflow-hidden">
                <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight italic uppercase">Libro de Kardex Cronológico</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Historial de entradas y salidas de almacén</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                            <input
                                type="text"
                                placeholder="Buscar SKU o Nombre..."
                                className="bg-slate-50 border-none rounded-2xl pl-12 pr-6 h-12 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 transition-all w-64"
                            />
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-10 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Producto / SKU</th>
                                <th className="px-10 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Bodega</th>
                                <th className="px-10 py-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                <th className="px-10 py-5 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                <th className="px-10 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Cantidad</th>
                                <th className="px-10 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Costo Unit.</th>
                                <th className="px-10 py-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredMovements.map((move) => (
                                <tr key={move.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110">
                                                <Barcode className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-900 tracking-tight italic">{move.products?.name || 'N/A'}</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{move.products?.sku || 'S/N'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{move.warehouses?.name || 'Central'}</span>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            <Calendar className="h-3 w-3 text-slate-300" />
                                            {move.occurred_at.split('T')[0]}
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-center">
                                        <Badge className={cn(
                                            "border-none text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-0.5 rounded-md",
                                            move.type === 'IN' ? "bg-emerald-50 text-emerald-600" :
                                                move.type === 'OUT' ? "bg-rose-50 text-rose-600" :
                                                    "bg-indigo-50 text-indigo-600"
                                        )}>
                                            {move.type === 'IN' ? 'Entrada' : move.type === 'OUT' ? 'Salida' : move.type}
                                        </Badge>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <span className={cn(
                                            "text-xs font-black tabular-nums italic",
                                            move.type === 'IN' ? "text-emerald-600" : "text-rose-600"
                                        )}>
                                            {move.type === 'OUT' ? `-${move.qty}` : `+${move.qty}`}
                                        </span>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <span className="text-xs font-bold text-slate-400 tabular-nums">{fmt(Number(move.cost))}</span>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <span className="text-sm font-black text-slate-900 tabular-nums italic">{fmt(Number(move.qty) * Number(move.cost))}</span>
                                    </td>
                                </tr>
                            ))}

                            {filteredMovements.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-10 py-20 text-center">
                                        <Package className="h-16 w-16 text-slate-200 mx-auto mb-6" />
                                        <p className="text-xl font-black text-slate-900 italic tracking-tight mb-2">Sin movimientos detectables</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ajuste los filtros o realice una búsqueda diferente</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Advisory */}
            <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white flex flex-col lg:flex-row items-center justify-between gap-12 shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                    <Package className="h-20 w-20" />
                </div>
                <div className="flex items-center gap-10 relative z-10">
                    <div className="h-14 w-14 bg-white/10 rounded-[2rem] flex items-center justify-center text-indigo-400 border border-white/10 shadow-inner -rotate-12 group-hover:rotate-0 transition-transform duration-700">
                        <ArrowRight className="h-10 w-10" />
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-2xl font-black tracking-tight uppercase leading-tight text-white">Consolidación de Inventarios</h4>
                        <p className="text-sm text-white/40 leading-relaxed font-medium max-w-xl">
                            El Kardex provee la trazabilidad forense de cada unidad física en <span className="text-amber-400 font-black uppercase">{tenant?.name}</span>.
                            Garantiza la correspondencia entre el stock real y los registros contables de costo de ventas.
                        </p>
                    </div>
                </div>
                <Button variant="outline" className="h-14 bg-white/5 border-white/10 text-white text-[10px] font-black uppercase tracking-widest px-10 hover:bg-white hover:text-slate-900 transition-all rounded-2xl shadow-active relative z-10">
                    Sincronizar Stock v3 <ArrowRight className="ml-4 h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
