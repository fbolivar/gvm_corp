import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ArrowLeft, Plus, MapPin, Package, Grid3X3 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';

interface PageProps { params: Promise<{ id: string }> }

export default async function WarehouseDetailPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: warehouse } = await supabase
        .from('warehouses')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (!warehouse) notFound();

    const { data: rawLocations } = await supabase
        .from('warehouse_locations')
        .select('*')
        .eq('warehouse_id', id)
        .order('aisle')
        .order('rack')
        .order('position');

    const locations = rawLocations ?? [];

    const { data: rawStock } = await supabase
        .from('product_stock')
        .select('qty, avg_cost, product_id, products(name, sku)')
        .eq('warehouse_id', id)
        .gt('qty', 0)
        .order('qty', { ascending: false })
        .limit(20);

    const stock = rawStock ?? [];

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

    const byAisle: Record<string, typeof locations> = {};
    for (const loc of locations) {
        const key = loc.aisle;
        if (!byAisle[key]) byAisle[key] = [];
        byAisle[key].push(loc);
    }

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            {warehouse.code}
                        </Badge>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">{warehouse.name}</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        {locations.length} ubicaciones · {stock.length} productos en stock
                    </p>
                </div>
                <Button variant="outline" asChild className="h-9 rounded-xl border-slate-200 text-xs font-semibold">
                    <Link href="/inventory/warehouses" className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Bodegas
                    </Link>
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Pasillos',    value: Object.keys(byAisle).length, icon: Grid3X3,  bg: 'bg-slate-50',    color: 'text-slate-600' },
                    { label: 'Ubicaciones', value: locations.length,             icon: MapPin,   bg: 'bg-indigo-50',   color: 'text-indigo-600' },
                    { label: 'Productos',   value: stock.length,                 icon: Package,  bg: 'bg-emerald-50',  color: 'text-emerald-600' },
                ].map((kpi) => (
                    <Card key={kpi.label} className="border border-slate-100 bg-white shadow-sm rounded-2xl">
                        <CardContent className="p-5 space-y-3">
                            <div className={`h-10 w-10 rounded-xl ${kpi.bg} flex items-center justify-center ${kpi.color}`}>
                                <kpi.icon className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</p>
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none">{kpi.value}</h3>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid md:grid-cols-12 gap-6 items-start">
                {/* Nueva Ubicación */}
                <Card className="md:col-span-4 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="p-5 pb-3 border-b border-slate-100">
                        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                                <Plus className="h-4 w-4" />
                            </div>
                            Nueva Ubicación
                        </CardTitle>
                        <p className="text-[10px] text-slate-400 mt-1">Pasillo · Estante · Posición</p>
                    </CardHeader>
                    <CardContent className="p-5">
                        <form action={addLocation} className="space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pasillo</label>
                                    <input name="aisle" required placeholder="A" maxLength={5}
                                        className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-center text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-indigo-200" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Estante</label>
                                    <input name="rack" required placeholder="01" maxLength={5}
                                        className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-200" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Pos.</label>
                                    <input name="position" placeholder="1" maxLength={5}
                                        className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-center text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-200" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Capacidad (opcional)</label>
                                <input name="capacity" type="number" min="0" step="0.01" placeholder="Ej: 500 (kg)"
                                    className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-200" />
                            </div>
                            <button type="submit"
                                className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors">
                                <Plus className="h-3.5 w-3.5" /> Agregar Ubicación
                            </button>
                        </form>
                    </CardContent>
                </Card>

                {/* Mapa de Ubicaciones */}
                <div className="md:col-span-8 space-y-4">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-indigo-600" />
                        Mapa de Bodega
                    </h2>

                    {Object.keys(byAisle).length === 0 ? (
                        <Card className="border border-dashed border-slate-200 rounded-2xl">
                            <CardContent className="py-12 text-center">
                                <MapPin className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                                <p className="text-xs text-slate-400">Agrega ubicaciones para mapear la bodega</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(byAisle).sort().map(([aisle, locs]) => (
                                <Card key={aisle} className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
                                    <div className="flex items-center gap-3 px-5 py-3 bg-slate-50/60 border-b border-slate-100">
                                        <div className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-semibold text-xs">
                                            {aisle}
                                        </div>
                                        <span className="text-xs font-semibold text-slate-700">Pasillo {aisle}</span>
                                        <span className="text-[10px] text-slate-400">{locs.length} posiciones</span>
                                    </div>
                                    <div className="p-3 flex flex-wrap gap-2">
                                        {locs.map(loc => (
                                            <form key={loc.id} action={deleteLocation} className="group relative">
                                                <input type="hidden" name="loc_id" value={loc.id} />
                                                <div className="relative h-14 w-16 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center gap-0.5 overflow-hidden">
                                                    <span className="text-[10px] font-semibold text-indigo-700">{loc.label}</span>
                                                    {loc.capacity && (
                                                        <span className="text-[8px] text-indigo-400">{loc.capacity} kg</span>
                                                    )}
                                                    <button type="submit"
                                                        className="absolute inset-0 bg-rose-500/0 hover:bg-rose-500/90 text-transparent hover:text-white text-[9px] font-semibold transition-all flex items-center justify-center">
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </form>
                                        ))}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Stock */}
            {stock.length > 0 && (
                <Card className="border border-slate-100 bg-white shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="p-5 pb-3 border-b border-slate-100">
                        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Package className="h-4 w-4 text-emerald-600" />
                            Stock en esta Bodega
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full" role="table">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50">
                                        {['Producto', 'SKU', 'Cantidad', 'Costo Prom.', 'Valor Total'].map(h => (
                                            <th key={h} scope="col" className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {stock.map((s) => {
                                        const product = s.products as unknown as { name: string; sku: string } | null;
                                        const value = Number(s.qty) * Number(s.avg_cost);
                                        return (
                                            <tr key={s.product_id} className="hover:bg-slate-50/50">
                                                <td className="px-5 py-3 text-xs font-semibold text-slate-900">{product?.name ?? '—'}</td>
                                                <td className="px-5 py-3 text-[10px] font-mono text-slate-400">{product?.sku ?? '—'}</td>
                                                <td className="px-5 py-3 text-xs font-bold text-slate-700 tabular-nums">{Number(s.qty).toLocaleString('es-CO')}</td>
                                                <td className="px-5 py-3 text-xs text-slate-500 tabular-nums">${Number(s.avg_cost).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                                                <td className="px-5 py-3 text-xs font-bold text-emerald-700 tabular-nums">${value.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
