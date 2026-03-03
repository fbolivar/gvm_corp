import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ShoppingBag, Package, PackageX, Layers } from 'lucide-react'
import { CatalogSearch, type CatalogProduct } from '@/features/catalog/components/CatalogSearch'

export const metadata = { title: 'Catálogo de Productos — GVM Corp' }

export default async function CatalogPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const [productsResult, stockResult] = await Promise.all([
        supabase
            .from('products')
            .select('id, name, sku, description, price, cost, category, unit, min_stock')
            .order('name')
            .limit(200),
        supabase
            .from('product_stock')
            .select('product_id, qty'),
    ])

    const rawProducts = productsResult.data ?? []
    const stockData = stockResult.data ?? []

    // Aggregate stock quantities per product
    const stockMap = new Map<string, number>()
    for (const row of stockData) {
        const current = stockMap.get(row.product_id) ?? 0
        stockMap.set(row.product_id, current + Number(row.qty))
    }

    const products: CatalogProduct[] = rawProducts.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku ?? null,
        description: p.description ?? null,
        price: p.price ?? null,
        cost: p.cost ?? null,
        category: p.category ?? null,
        unit: p.unit ?? null,
        min_stock: p.min_stock ?? null,
        totalQty: stockMap.get(p.id) ?? 0,
    }))

    const totalProducts = products.length
    const withStock = products.filter((p) => p.totalQty > 0).length
    const withoutStock = products.filter((p) => p.totalQty === 0).length

    const kpis = [
        {
            label: 'Total Productos',
            value: totalProducts.toLocaleString('es-CO'),
            icon: Layers,
            accent: 'bg-indigo-50 text-indigo-600',
        },
        {
            label: 'Con Stock',
            value: withStock.toLocaleString('es-CO'),
            icon: Package,
            accent: 'bg-emerald-50 text-emerald-600',
        },
        {
            label: 'Sin Stock',
            value: withoutStock.toLocaleString('es-CO'),
            icon: PackageX,
            accent: withoutStock > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400',
        },
    ]

    return (
        <div className="page-container space-y-10 pb-24 animate-in fade-in slide-in-from-bottom-6 duration-700">

            {/* ── HERO HEADER ── */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-active border border-white/5">
                {/* Decorative background icon */}
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-6 transition-all duration-1000">
                    <ShoppingBag className="h-24 w-24 text-white" />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
                    {/* Title block */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-1.5 w-8 bg-indigo-400 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">
                                Módulo de Inventario Comercial
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase leading-tight">
                            Catálogo <br />
                            <span className="text-slate-500">de Productos</span>
                        </h1>
                        <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em]">
                            {totalProducts.toLocaleString('es-CO')} productos disponibles
                        </p>
                    </div>

                    {/* KPI strip */}
                    <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                        {kpis.map((kpi) => {
                            const Icon = kpi.icon
                            return (
                                <div
                                    key={kpi.label}
                                    className="bg-white rounded-[2.5rem] p-7 shadow-premium flex items-center gap-5 min-w-[160px]"
                                >
                                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${kpi.accent}`}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                            {kpi.label}
                                        </p>
                                        <p className="text-2xl font-black text-slate-900 tracking-tight leading-tight tabular-nums">
                                            {kpi.value}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* ── SEARCH + GRID (Client Component) ── */}
            <CatalogSearch products={products} />

        </div>
    )
}
