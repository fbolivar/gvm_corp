import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
    ArrowLeft, Warehouse, Plus, MapPin, Package, Grid3X3
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';

interface PageProps { params: Promise<{ id: string }> }

export default async function WarehouseDetailPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Load warehouse
    const { data: warehouse } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (!warehouse) notFound();

    // Load locations
    const { data: rawLocations } = await supabase
        .from('warehouse_locations')
        .select('*')
        .eq('warehouse_id', id)
        .order('aisle')
        .order('rack')
        .order('position');

    const locations = rawLocations ?? [];

    // Load stock for this warehouse (top 20 by qty)
    const { data: rawStock } = await supabase
        .from('product_stock')
        .select('qty, avg_cost, product_id, products(name, sku)')
        .eq('warehouse_id', id)
        .gt('qty', 0)
        .order('qty', { ascending: false })
        .limit(20);

    const stock = rawStock ?? [];

    // Server Actions
    async function addLocation(formData: FormData) {
        'use server';
        const sup = await createClient();
        const aisle    = (formData.get('aisle') as string).toUpperCase().trim();
        const rack     = (formData.get('rack') as string).trim();
        const position = (formData.get('position') as string).trim() || '1';
        const capacity = formData.get('capacity') ? Number(formData.get('capacity')) : null;

        if (!aisle || !rack) return;
        await sup.from('warehouse_locations').insert({ warehouse_id: id, aisle, rack, position, capacity });
        revalidatePath(`/inventory/warehouses/${id}`);
    }

    async function deleteLocation(formData: FormData) {
        'use server';
        const sup = await createClient();
        const locId = formData.get('loc_id') as string;
        if (!locId) return;
        await sup.from('warehouse_locations').delete().eq('id', locId);
        revalidatePath(`/inventory/warehouses/${id}`);
    }

    // Group locations by aisle
    const byAisle: Record<string, typeof locations> = {};
    for (const loc of locations) {
        const key = loc.aisle;
        if (!byAisle[key]) byAisle[key] = [];
        byAisle[key].push(loc);
    }

    return (
        <div className="page-container space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header */}
            <div className="relative overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-all duration-1000">
                    <Warehouse className="h-24 w-24 text-white" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-8 bg-emerald-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-400">
                                Inventario · Bodega {warehouse.code}
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                            {warehouse.name}
                        </h1>
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">
                            {locations.length} ubicaciones · {stock.length} productos
                        </p>
                    </div>
                    <Button variant="outline" className="h-12 px-6 rounded-2xl border-white/10 text-slate-300 hover:bg-white/10 font-black text-[10px] uppercase tracking-widest shrink-0" asChild>
                        <Link href="/inventory/warehouses"><ArrowLeft className="h-4 w-4 mr-2" />Bodegas</Link>
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[
                    { label: 'Pasillos',    value: Object.keys(byAisle).length, icon: Grid3X3,  color: 'text-slate-600',   bg: 'bg-slate-50' },
                    { label: 'Ubicaciones', value: locations.length,             icon: MapPin,   color: 'text-indigo-600',  bg: 'bg-indigo-50' },
                    { label: 'Productos',   value: stock.length,                 icon: Package,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-[2.5rem] p-7 shadow-premium flex items-center gap-5">
                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 ${kpi.bg} ${kpi.color}`}>
                            <kpi.icon className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid md:grid-cols-12 gap-10 items-start">
                {/* Nueva Ubicación */}
                <div className="md:col-span-4">
                    <div className="bg-white rounded-[2.5rem] shadow-premium overflow-hidden">
                        <div className="h-2 bg-slate-900 w-full" />
                        <div className="p-8 space-y-6">
                            <div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Nueva Ubicación</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Pasillo · Estante · Posición</p>
                            </div>
                            <form action={addLocation} className="space-y-4">
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pasillo</label>
                                        <input name="aisle" required placeholder="A" maxLength={5}
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-center text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estante</label>
                                        <input name="rack" required placeholder="01" maxLength={5}
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pos.</label>
                                        <input name="position" placeholder="1" maxLength={5}
                                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Capacidad (opcional)</label>
                                    <input name="capacity" type="number" min="0" step="0.01" placeholder="Ej: 500 (kg)"
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                                </div>
                                <button type="submit"
                                    className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors">
                                    <Plus className="h-4 w-4" /> Agregar Ubicación
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Mapa de Ubicaciones */}
                <div className="md:col-span-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-6 bg-indigo-500 rounded-full" />
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Mapa de Bodega</h2>
                    </div>

                    {Object.keys(byAisle).length === 0 ? (
                        <div className="bg-white rounded-[2rem] border border-dashed border-slate-200 py-16 text-center">
                            <MapPin className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-400 font-black text-sm">Agrega ubicaciones para mapear la bodega</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(byAisle).sort().map(([aisle, locs]) => (
                                <div key={aisle} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                                    <div className="flex items-center gap-3 px-6 py-4 bg-slate-50/60 border-b border-slate-100">
                                        <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                                            {aisle}
                                        </div>
                                        <span className="text-sm font-black text-slate-700 uppercase tracking-widest">Pasillo {aisle}</span>
                                        <span className="text-[10px] font-bold text-slate-400">{locs.length} posiciones</span>
                                    </div>
                                    <div className="p-4 flex flex-wrap gap-2">
                                        {locs.map(loc => (
                                            <form key={loc.id} action={deleteLocation} className="group relative">
                                                <input type="hidden" name="loc_id" value={loc.id} />
                                                <div className="relative h-16 w-20 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center gap-0.5 overflow-hidden">
                                                    <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">{loc.label}</span>
                                                    {loc.capacity && (
                                                        <span className="text-[8px] font-bold text-indigo-400">{loc.capacity} kg</span>
                                                    )}
                                                    <button type="submit"
                                                        className="absolute inset-0 bg-rose-500/0 hover:bg-rose-500/90 text-transparent hover:text-white text-[9px] font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center">
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </form>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Stock en esta bodega */}
            {stock.length > 0 && (
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-6 bg-emerald-500 rounded-full" />
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Stock en esta Bodega</h2>
                    </div>
                    <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full" role="table">
                                <thead>
                                    <tr className="border-b border-slate-50 bg-slate-50/50">
                                        {['Producto', 'SKU', 'Cantidad', 'Costo Prom.', 'Valor Total'].map(h => (
                                            <th key={h} scope="col"
                                                className="px-5 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {stock.map((s: any) => {
                                        const product = s.products as { name: string; sku: string } | null;
                                        const value = Number(s.qty) * Number(s.avg_cost);
                                        return (
                                            <tr key={s.product_id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-5 py-4 text-sm font-bold text-slate-900">{product?.name ?? '—'}</td>
                                                <td className="px-5 py-4 text-xs font-mono text-slate-500">{product?.sku ?? '—'}</td>
                                                <td className="px-5 py-4 text-sm font-black text-slate-700">{Number(s.qty).toLocaleString('es-CO')}</td>
                                                <td className="px-5 py-4 text-sm text-slate-600">${Number(s.avg_cost).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                                                <td className="px-5 py-4 text-sm font-black text-emerald-700">${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
