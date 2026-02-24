import { createClient } from '@/lib/supabase/server';
import { productionService } from '@/features/production/services/productionService';
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from '@/shared/components/ui/button';
import { Badge } from "@/shared/components/ui/badge";
import { OrderList } from '@/features/production/components/OrderList';
import {
    Zap,
    ClipboardList,
    Settings2,
    Plus,
    Factory,
    ChevronRight,
    Hammer,
    Cpu,
    Target,
    Activity,
    Sparkles,
    ShieldCheck,
    Box
} from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/shared/lib/utils";
import { redirect } from "next/navigation";
import { settingsService } from '@/features/settings/services/settingsService';

export default async function ProductionPage() {
    const supabase = await createClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    const [recipes, orders, tenant] = await Promise.all([
        productionService.getRecipes(supabase),
        productionService.getOrders(supabase),
        settingsService.getTenantInfo(supabase)
    ]);

    const activeOrders = orders.filter((o: any) => o.status === 'IN_PROGRESS').length;
    const pendingOrders = orders.filter((o: any) => o.status === 'DRAFT').length;
    const completedOrders = orders.filter((o: any) => o.status === 'COMPLETED').length;

    return (
        <div className="page-container space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 🏭 PREMIUM INDUSTRIAL HEADER */}
            <div className="relative group overflow-hidden bg-slate-900 rounded-[4rem] p-16 text-white shadow-active">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <Factory className="h-64 w-64 text-white" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-10 bg-rose-500 rounded-full" />
                            <span className="text-xs font-black uppercase tracking-[0.5em] text-rose-500">Terminal de Manufactura</span>
                        </div>
                        <h1 className="text-7xl font-black tracking-tighter italic uppercase leading-[0.8]">
                            Planta de <br /><span className="text-slate-400">Producción</span>
                        </h1>
                        <div className="flex items-center gap-4">
                            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.4em]">Control de Procesos & BOM (v3.0)</p>
                            <div className="flex items-center gap-2 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                                <Cpu className="h-3 w-3 text-rose-500 animate-pulse" />
                                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">En Línea</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button variant="outline" asChild className="h-20 px-10 rounded-[2rem] border-none bg-white/5 hover:bg-white/10 text-white font-black hover:scale-105 transition-all backdrop-blur-md">
                            <Link href="/production/recipes" className="flex items-center gap-4">
                                <Settings2 className="h-6 w-6 text-indigo-400" />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] uppercase tracking-widest opacity-40">Catálogo</span>
                                    <span className="text-xs uppercase tracking-widest">Recetas BOM</span>
                                </div>
                            </Link>
                        </Button>
                        <Button asChild className="h-20 px-12 rounded-[2rem] bg-rose-600 hover:bg-rose-500 text-white font-black shadow-active transition-all hover:scale-105 active:scale-95 border-none">
                            <Link href="/production/orders/new" className="flex items-center gap-4">
                                <Plus className="h-7 w-7" />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] uppercase tracking-widest opacity-60">Operación</span>
                                    <span className="text-xs uppercase tracking-widest">Nueva OP</span>
                                </div>
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* 📊 SUMMARY STRIP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                    { label: 'OPs en Ejecución', value: activeOrders, icon: Zap, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Borradores en Cola', value: pendingOrders, icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Eficiencia de Planta', value: '94.5%', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-premium flex items-center gap-6 border border-slate-50 hover:border-rose-100 transition-colors group">
                        <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-6", stat.bg, stat.color)}>
                            <stat.icon className="h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{stat.label}</p>
                            <p className="text-3xl font-black text-slate-900 tracking-tighter italic">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ⚙️ OPERATIONAL GRID */}
            <div className="grid gap-12 lg:grid-cols-12 items-start">
                <div className="lg:col-span-8 space-y-8">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-inner">
                                <Hammer className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight italic leading-none">Panel de Control OP</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Órdenes de Producción en Tiempo Real</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" asChild className="h-10 px-6 rounded-xl text-primary hover:text-primary/80 font-black text-[10px] uppercase tracking-widest group">
                            <Link href="/production/orders" className="flex items-center gap-2">
                                Ver Todo el Historial <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </Button>
                    </div>

                    <Card className="border-none bg-white shadow-premium rounded-[4rem] overflow-hidden p-2">
                        <CardContent className="p-0">
                            <OrderList orders={orders} />
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-4 space-y-10">
                    <div className="flex items-center gap-4 px-2">
                        <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 shadow-inner">
                            <Activity className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight italic leading-none">Smart BOM</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Fichas Técnicas Destacadas</p>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {recipes.slice(0, 5).map((recipe: any) => (
                            <Card key={recipe.id} className="border-none bg-white shadow-premium rounded-[2.5rem] group hover:bg-slate-900 transition-all duration-700">
                                <CardContent className="p-8 flex items-center justify-between">
                                    <div className="space-y-2">
                                        <p className="text-slate-900 group-hover:text-white font-black text-xl tracking-tight transition-colors italic leading-none">{recipe.name}</p>
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className="border-slate-100 group-hover:border-white/10 group-hover:text-white/60 text-[8px] font-black uppercase tracking-widest rounded-md px-2.5 py-0.5 shadow-sm">SKU: {recipe.products?.sku}</Badge>
                                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest group-hover:text-white/20 transition-colors">v1.2</span>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="icon" asChild className="h-14 w-14 rounded-2xl border-none bg-slate-50 group-hover:bg-white/10 text-slate-400 group-hover:text-white shadow-sm transition-all hover:scale-110">
                                        <Link href={`/production/recipes/${recipe.id}`}>
                                            <ChevronRight className="h-6 w-6" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Button variant="outline" asChild className="w-full h-20 rounded-[2.5rem] border-none bg-rose-50 text-rose-700 font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-100 transition-all shadow-sm group">
                        <Link href="/production/recipes" className="flex items-center justify-center gap-4">
                            Gestionar Catálogo Completo BOM <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </Button>
                </div>
            </div>

            {/* 🛡️ AUDIT FOOTER */}
            <div className="bg-slate-950 p-16 rounded-[4rem] text-white flex flex-col lg:flex-row items-center justify-between gap-12 shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                    <ShieldCheck className="h-48 w-48 text-white" />
                </div>
                <div className="flex items-center gap-10 relative z-10 text-center lg:text-left flex-col lg:flex-row">
                    <div className="h-20 w-20 bg-white/10 rounded-[2rem] flex items-center justify-center text-white border border-white/10 shadow-inner rotate-12 group-hover:rotate-0 transition-transform duration-700">
                        <Box className="h-10 w-10 text-rose-400" />
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-white">Certificación Industrial</h4>
                        <p className="text-sm text-white/40 leading-relaxed font-medium max-w-xl">
                            Todas las operaciones en la planta de <span className="text-rose-400 font-black uppercase">{tenant?.name}</span> están sujetas a protocolos de control de calidad V3. El reporte de insumos es obligatorio para cerrar cada Orden de Producción.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

