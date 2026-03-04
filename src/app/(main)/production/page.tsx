import { createClient } from '@/lib/supabase/server';
import { productionService } from '@/features/production/services/productionService';
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from '@/shared/components/ui/button';
import { OrderList } from '@/features/production/components/OrderList';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import {
    Zap,
    ClipboardList,
    Settings2,
    Plus,
    ChevronRight,
    Activity,
    BookOpen,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from "@/shared/lib/utils";
import { redirect } from "next/navigation";
import { settingsService } from '@/features/settings/services/settingsService';

export default async function ProductionPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const [recipes, orders, tenant] = await Promise.all([
        productionService.getRecipes(supabase),
        productionService.getOrders(supabase),
        settingsService.getTenantInfo(supabase)
    ]);

    const activeOrders = orders.filter((o: Record<string, unknown>) => o.status === 'IN_PROGRESS').length;
    const pendingOrders = orders.filter((o: Record<string, unknown>) => o.status === 'DRAFT').length;
    const completedOrders = orders.filter((o: Record<string, unknown>) => o.status === 'COMPLETED').length;
    const efficiency = orders.length > 0 ? Math.round((completedOrders / orders.length) * 100) : 0;

    const kpis = [
        { label: 'OPs en Ejecucion', value: activeOrders, icon: Zap, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Borradores en Cola', value: pendingOrders, icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Eficiencia de Planta', value: `${efficiency}%`, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <VisualReportHeader
                    title="Planta de Produccion"
                    subtitle="Control de procesos, ordenes y fichas tecnicas BOM"
                    tenant={tenant}
                />
                <div className="flex gap-3">
                    <Button variant="outline" asChild className="h-9 px-4 rounded-xl text-xs gap-2">
                        <Link href="/production/recipes">
                            <Settings2 className="h-3.5 w-3.5" /> Recetas BOM
                        </Link>
                    </Button>
                    <Button asChild className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs gap-2">
                        <Link href="/production/orders/new">
                            <Plus className="h-3.5 w-3.5" /> Nueva OP
                        </Link>
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", kpi.bg, kpi.color)}>
                            <kpi.icon className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                            <p className="text-sm font-bold text-slate-900 font-mono tabular-nums">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Operational Grid */}
            <div className="grid gap-6 lg:grid-cols-12 items-start">
                {/* Order list */}
                <div className="lg:col-span-8 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold text-slate-900">Ordenes de Produccion</h2>
                        <Button variant="ghost" size="sm" asChild className="h-8 px-3 rounded-lg text-xs text-slate-500 hover:text-slate-900 gap-1">
                            <Link href="/production/orders">
                                Ver historial <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    </div>

                    <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <OrderList orders={orders} />
                        </CardContent>
                    </Card>
                </div>

                {/* Recipes sidebar */}
                <div className="lg:col-span-4 space-y-4">
                    <h2 className="text-sm font-bold text-slate-900">Fichas Tecnicas BOM</h2>

                    <div className="space-y-3">
                        {recipes.slice(0, 5).map((recipe: Record<string, unknown>) => {
                            const products = recipe.products as { name?: string; sku?: string } | null;
                            return (
                                <Card key={String(recipe.id)} className="rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-100 transition-colors">
                                    <CardContent className="p-4 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-900 leading-snug truncate">{String(recipe.name)}</p>
                                            <p className="text-[10px] text-slate-400 truncate">SKU: {products?.sku ?? '—'}</p>
                                        </div>
                                        <Button variant="outline" size="icon" asChild className="h-8 w-8 rounded-lg shrink-0">
                                            <Link href={`/production/recipes/${String(recipe.id)}`}>
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    <Button variant="outline" asChild className="w-full h-9 rounded-xl text-xs gap-2">
                        <Link href="/production/recipes">
                            <BookOpen className="h-3.5 w-3.5" /> Ver catalogo completo BOM
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
