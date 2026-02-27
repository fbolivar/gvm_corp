import { createClient } from '@/lib/supabase/server';
import { productionService } from '@/features/production/services/productionService';
import { FinishOrderButton } from '@/features/production/components/FinishOrderButton';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
    Factory, ArrowLeft, Hash, CheckCircle2, PlayCircle,
    Clock, XCircle, Package, FlaskConical, Warehouse, Target
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
    DRAFT:       { label: 'Borrador',    color: 'text-slate-600',   bg: 'bg-slate-100',   icon: Clock },
    IN_PROGRESS: { label: 'En Proceso',  color: 'text-amber-600',   bg: 'bg-amber-100',   icon: PlayCircle },
    COMPLETED:   { label: 'Finalizada',  color: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle2 },
    CANCELLED:   { label: 'Anulada',     color: 'text-rose-600',    bg: 'bg-rose-100',    icon: XCircle },
};

export default async function ProductionOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    let order: any;
    try {
        order = await productionService.getOrderById(supabase, id);
    } catch {
        notFound();
    }

    const meta = STATUS_META[order.status] || STATUS_META.DRAFT;
    const Icon = meta.icon;
    const progress = order.qty_target > 0 ? Math.min((order.qty_produced / order.qty_target) * 100, 100) : 0;
    const recipe = order.recipes;
    const finishedProduct = recipe?.products;

    return (
        <div className="page-container space-y-10 pb-24 animate-in fade-in slide-in-from-bottom-6 duration-700">

            {/* HEADER */}
            <div className="relative overflow-hidden bg-slate-900 rounded-[3.5rem] p-10 md:p-14 text-white shadow-active">
                <div className="absolute top-0 right-0 p-10 opacity-[0.04] pointer-events-none">
                    <Factory className="h-56 w-56" />
                </div>
                <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-4">
                        <Button asChild variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-white/40 hover:text-white hover:bg-white/10">
                            <Link href="/production"><ArrowLeft className="h-5 w-5" /></Link>
                        </Button>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Planta de Producción</span>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl">
                                    <Hash className="h-3 w-3 text-slate-400" />
                                    <span className="text-[10px] font-black text-white tracking-widest">{order.order_number}</span>
                                </div>
                                <Badge className={cn("border-none font-black text-[10px] tracking-widest px-4 py-1.5 rounded-full", meta.bg, meta.color)}>
                                    {meta.label}
                                </Badge>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic uppercase leading-[0.85]">
                                {recipe?.name || 'Orden de Producción'}
                            </h1>
                            {finishedProduct && (
                                <p className="text-white/40 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                                    <Package className="h-3.5 w-3.5" />
                                    SKU {finishedProduct.sku} — {finishedProduct.name}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Rendimiento</span>
                            <span className="text-5xl font-black italic tracking-tighter">
                                {order.qty_produced}<span className="text-slate-500 text-2xl ml-2">/ {order.qty_target}</span>
                            </span>
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{finishedProduct?.uom || 'UNIDADES'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* PROGRESS BAR */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-50 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Icon className={cn("h-5 w-5", meta.color)} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progreso de Producción</span>
                    </div>
                    <span className={cn("text-2xl font-black italic tracking-tighter", progress >= 100 ? "text-emerald-600" : "text-slate-900")}>
                        {Math.round(progress)}%
                    </span>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={cn("h-full rounded-full transition-all duration-1000", progress >= 100 ? "bg-emerald-500" : "bg-rose-500")}
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase tracking-widest">
                    <span>0</span>
                    <span>Meta: {order.qty_target} {finishedProduct?.uom || 'UN'}</span>
                </div>
            </div>

            {/* INFO GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-50 space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                        <FlaskConical className="h-6 w-6" />
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Receta BOM</p>
                    <p className="text-lg font-black text-slate-900 italic tracking-tight">{recipe?.name || '—'}</p>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-50 space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                        <Warehouse className="h-6 w-6" />
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bodega</p>
                    <p className="text-lg font-black text-slate-900 italic tracking-tight">{order.warehouses?.name || '—'}</p>
                </div>

                <div className="bg-white rounded-[2.5rem] p-8 shadow-premium border border-slate-50 space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                        <Target className="h-6 w-6" />
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Meta</p>
                    <p className="text-lg font-black text-slate-900 italic tracking-tight">
                        {order.qty_target} {finishedProduct?.uom || 'UN'}
                    </p>
                </div>
            </div>

            {/* BOM MATERIALS */}
            {recipe?.items && recipe.items.length > 0 && (
                <div className="bg-white rounded-[3rem] shadow-premium border border-slate-50 overflow-hidden">
                    <div className="px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                            <FlaskConical className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black italic uppercase tracking-tight text-slate-900">Materiales BOM</h3>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Insumos requeridos por unidad de producción</p>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {recipe.items.map((item: any, i: number) => (
                            <div key={i} className="px-10 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                        <Package className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 text-sm">{item.products?.name}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SKU: {item.products?.sku}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Qty Requerida</p>
                                    <p className="text-lg font-black italic text-slate-900 tabular-nums">
                                        {item.qty_required} <span className="text-slate-300 text-sm">{item.products?.uom}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ACTIONS */}
            {order.status === 'IN_PROGRESS' && (
                <div className="bg-amber-50 rounded-[2.5rem] p-8 border border-amber-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                            <PlayCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="font-black text-slate-900 text-sm uppercase italic tracking-tight">Orden en Ejecución</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Registra qty producida para cerrar la OP</p>
                        </div>
                    </div>
                    <FinishOrderButton orderId={order.id} qtyTarget={order.qty_target} />
                </div>
            )}
        </div>
    );
}
