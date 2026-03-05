import { createClient } from '@/lib/supabase/server';
import { productService } from '@/features/products/services/productService';
import { ProductList } from '@/features/products/components/ProductList';
import { ProductFilters, ProductTypeEnum, ProductStatusEnum } from '@/features/products/types';
import { TrendingUp, AlertTriangle, Layers, Zap } from 'lucide-react';
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { redirect } from 'next/navigation';
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
import { settingsService } from '@/features/settings/services/settingsService';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProductsPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const params = await searchParams;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const page = Number(params?.page) || 1;
    const per_page = Number(params?.per_page) || 20;
    const search = params?.search as string || undefined;

    const typeParam = params?.type as string;
    const statusParam = params?.status as string;

    const filters: ProductFilters = {
        search,
        type: typeParam ? ProductTypeEnum.parse(typeParam) : undefined,
        status: statusParam ? ProductStatusEnum.parse(statusParam) : undefined,
        page,
        per_page
    };

    const [{ data, count }, tenant] = await Promise.all([
        productService.getProducts(supabase, filters),
        settingsService.getTenantInfo(supabase)
    ]);

    const totalActive = data.filter(p => p.status === 'ACTIVE').length;
    const lowStock = data.filter(p => (p.stock_qty ?? 0) <= (p.min_stock ?? 0) && p.type === 'GOOD').length;
    const totalValue = data.reduce((acc, p) => acc + ((p.stock_qty ?? 0) * (p.cost ?? 0)), 0);

    const stats = [
        {
            label: 'Total Items',
            value: count?.toLocaleString() ?? '0',
            sub: 'En el catalogo',
            icon: Layers,
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
            badgeText: 'SKUs',
            badgeClass: 'bg-blue-50 text-blue-600 border-blue-100',
        },
        {
            label: 'Activos',
            value: totalActive.toLocaleString(),
            sub: 'Disponibles para venta',
            icon: TrendingUp,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            badgeText: 'Venta',
            badgeClass: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        },
        {
            label: 'Stock Critico',
            value: lowStock.toLocaleString(),
            sub: 'Bajo nivel minimo',
            icon: AlertTriangle,
            iconBg: lowStock > 0 ? 'bg-rose-50' : 'bg-slate-50',
            iconColor: lowStock > 0 ? 'text-rose-600' : 'text-slate-400',
            badgeText: 'Alerta',
            badgeClass: lowStock > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-400 border-slate-100',
        },
        {
            label: 'Valorizacion',
            value: `$${totalValue.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
            sub: 'Al costo promedio',
            icon: Zap,
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
            badgeText: 'CPP',
            badgeClass: 'bg-amber-50 text-amber-600 border-amber-100',
        },
    ];

    return (
        <div className="space-y-6 pb-16 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Productos"
                subtitle="Inventario — Catalogo Maestro"
                tenant={tenant}
            />

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                        <Card key={s.label} className="border border-slate-100 bg-white shadow-sm rounded-2xl">
                            <CardContent className="p-5 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className={`h-10 w-10 rounded-xl ${s.iconBg} flex items-center justify-center ${s.iconColor}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <Badge className={`${s.badgeClass} border text-[10px] font-semibold px-2 py-0.5 rounded-full`}>{s.badgeText}</Badge>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
                                    <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none truncate">{s.value}</h3>
                                    <p className="text-[10px] text-slate-400 mt-1">{s.sub}</p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Product List */}
            <ProductList
                initialData={data}
                totalCount={count || 0}
                currentPage={page}
                perPage={per_page}
            />
        </div>
    );
}
