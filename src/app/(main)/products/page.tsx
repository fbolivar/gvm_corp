import { createClient } from '@/lib/supabase/server';
import { productService } from '@/features/products/services/productService';
import { ProductList } from '@/features/products/components/ProductList';
import { ProductFilters, ProductTypeEnum, ProductStatusEnum } from '@/features/products/types';
import { TrendingUp, AlertTriangle, Layers, Zap } from 'lucide-react';

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProductsPage({ searchParams }: PageProps) {
    const supabase = await createClient();
    const params = await searchParams;

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

    const { data, count } = await productService.getProducts(supabase, filters);

    // Stats
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
        },
        {
            label: 'Activos',
            value: totalActive.toLocaleString(),
            sub: 'Disponibles para venta',
            icon: TrendingUp,
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
        },
        {
            label: 'Stock Critico',
            value: lowStock.toLocaleString(),
            sub: 'Bajo nivel minimo',
            icon: AlertTriangle,
            iconBg: lowStock > 0 ? 'bg-rose-50' : 'bg-slate-50',
            iconColor: lowStock > 0 ? 'text-rose-600' : 'text-slate-400',
        },
        {
            label: 'Valorizacion',
            value: `$${totalValue.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`,
            sub: 'Al costo promedio',
            icon: Zap,
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
        },
    ];

    return (
        <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700">

            {/* Header */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 px-1">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="px-2.5 py-1 bg-slate-900 rounded-full flex items-center gap-2 shadow-active">
                            <Zap className="h-2 w-2 text-blue-400 fill-blue-400" />
                            <span className="text-[8px] font-bold text-white uppercase tracking-widest">Maestro de Productos</span>
                        </div>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight italic uppercase leading-none">
                        Catalogo <span className="text-primary">Maestro</span>
                    </h1>
                    <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest">
                        Gestion de bienes, servicios, precios e inventario
                    </p>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-1">
                {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className="rounded-xl border-none bg-white shadow-sm p-5 flex items-start gap-4 relative overflow-hidden group hover:translate-y-[-2px] transition-all duration-300">
                            <div className={`h-9 w-9 rounded-lg ${s.iconBg} flex items-center justify-center ${s.iconColor} shadow-sm shrink-0`}>
                                <Icon className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">{s.label}</p>
                                <p className="text-lg font-extrabold text-slate-900 tracking-tight leading-none italic">{s.value}</p>
                                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">{s.sub}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Product List */}
            <div className="px-1">
                <ProductList
                    initialData={data}
                    totalCount={count || 0}
                    currentPage={page}
                    perPage={per_page}
                />
            </div>
        </div>
    );
}
