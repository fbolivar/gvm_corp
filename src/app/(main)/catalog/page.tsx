import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ShoppingBag, Package, PackageX, Layers } from 'lucide-react'
import { CatalogSearch, type CatalogProduct } from '@/features/catalog/components/CatalogSearch'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Catálogo de Productos — GVM Corp' }

export default async function CatalogPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Use the same RPC as /products (SECURITY DEFINER — avoids RLS issues)
    const { data: rpcData } = await supabase.rpc('get_products_with_stock', {
        p_limit: 200,
        p_offset: 0,
        p_search: '',
    })

    const CATEGORY_LABELS: Record<string, string> = {
        'GOOD': 'Bien',
        'SERVICE': 'Servicio',
    }

    const products: CatalogProduct[] = (rpcData ?? []).map((p: Record<string, unknown>) => {
        const rawType = (p.type as string) ?? null
        return {
            id: p.id as string,
            name: p.name as string,
            sku: (p.sku as string) ?? null,
            description: (p.description as string) ?? null,
            price: p.selling_price ? Number(p.selling_price) : null,
            cost: p.cost ? Number(p.cost) : null,
            category: rawType,
            categoryLabel: rawType ? (CATEGORY_LABELS[rawType] ?? rawType) : null,
            unit: (p.uom as string) ?? null,
            min_stock: p.min_stock ? Number(p.min_stock) : null,
            totalQty: Number(p.total_qty ?? 0),
        }
    })

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
        <div className="space-y-8 pb-16 animate-in fade-in duration-500 px-4 md:px-0">

            {/* ── HERO HEADER ── */}
            <div className="relative group overflow-hidden bg-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-lg">
                {/* Decorative background icon */}
                <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none">
                    <ShoppingBag className="h-20 w-20 text-white" />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    {/* Title block */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-1.5 w-8 bg-indigo-400 rounded-full" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-400">
                                Inventario Comercial
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            Catálogo <span className="text-slate-400">de Productos</span>
                        </h1>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            {totalProducts.toLocaleString('es-CO')} productos disponibles
                        </p>
                    </div>

                    {/* KPI strip */}
                    <div className="flex flex-wrap gap-3">
                        {kpis.map((kpi) => {
                            const Icon = kpi.icon
                            return (
                                <div
                                    key={kpi.label}
                                    className="h-10 px-5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 hover:bg-white/10 transition-colors"
                                >
                                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${kpi.accent}`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 leading-none">
                                            {kpi.label}
                                        </p>
                                        <p className="text-sm font-bold text-white tracking-tight tabular-nums leading-tight">
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
