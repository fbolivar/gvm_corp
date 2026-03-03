"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Filter, Tag, Package, ShoppingBag } from 'lucide-react'

export interface CatalogProduct {
    id: string
    name: string
    sku: string | null
    description: string | null
    price: number | null
    cost: number | null
    category: string | null
    unit: string | null
    min_stock: number | null
    totalQty: number
}

interface Props {
    products: CatalogProduct[]
}

const formatCOP = (value: number | null): string => {
    if (value === null || value === undefined) return '—'
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
    }).format(value)
}

const CATEGORY_COLORS: Record<string, string> = {
    'ROPA': 'bg-indigo-100 text-indigo-700',
    'TEJIDO': 'bg-violet-100 text-violet-700',
    'ACCESORIO': 'bg-amber-100 text-amber-700',
    'SERVICIO': 'bg-cyan-100 text-cyan-700',
    'MATERIA_PRIMA': 'bg-orange-100 text-orange-700',
    'INSUMO': 'bg-lime-100 text-lime-700',
}

function getCategoryColor(category: string | null): string {
    if (!category) return 'bg-slate-100 text-slate-500'
    const upper = category.toUpperCase()
    return CATEGORY_COLORS[upper] ?? 'bg-slate-100 text-slate-600'
}

function ProductCard({ product }: { product: CatalogProduct }) {
    const inStock = product.totalQty > 0
    const quotationUrl = `/sales/quotations/new?productId=${product.id}&productName=${encodeURIComponent(product.name)}`

    return (
        <article className="bg-white rounded-[2.5rem] p-6 shadow-premium border border-slate-50 hover:shadow-active hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4">
            {/* Top row: icon + category badge */}
            <div className="flex items-start justify-between gap-3">
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 shadow-inner">
                    <Package className="h-6 w-6 text-slate-400" />
                </div>
                {product.category && (
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getCategoryColor(product.category)}`}>
                        {product.category}
                    </span>
                )}
            </div>

            {/* Name + SKU */}
            <div className="space-y-0.5">
                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight uppercase">
                    {product.name}
                </h3>
                {product.sku && (
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                        SKU: {product.sku}
                    </p>
                )}
            </div>

            {/* Description */}
            {product.description && (
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-medium">
                    {product.description}
                </p>
            )}

            {/* Separator */}
            <div className="h-px bg-slate-100 w-full" />

            {/* Pricing */}
            <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 tracking-tight leading-tight tabular-nums">
                        {formatCOP(product.price)}
                    </span>
                </div>
                {product.cost !== null && (
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                        Costo: {formatCOP(product.cost)}
                    </p>
                )}
            </div>

            {/* Stock + unit row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <span
                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        inStock
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}
                >
                    {inStock ? `Stock: ${product.totalQty}` : 'Agotado'}
                </span>
                {product.unit && (
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                        / {product.unit}
                    </span>
                )}
            </div>

            {/* CTA */}
            <Link
                href={quotationUrl}
                className="mt-auto flex items-center justify-center gap-2 h-10 w-full rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest transition-all duration-300 active:scale-95 shadow-active"
                aria-label={`Nueva cotización para ${product.name}`}
            >
                Nueva Cotización
            </Link>
        </article>
    )
}

export function CatalogSearch({ products }: Props) {
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')

    const categories = useMemo(() => {
        const cats = Array.from(
            new Set(products.map((p) => p.category).filter(Boolean))
        ) as string[]
        return cats.sort()
    }, [products])

    const filtered = useMemo(() => {
        const term = search.toLowerCase().trim()
        return products.filter((p) => {
            const matchesSearch =
                !term ||
                p.name.toLowerCase().includes(term) ||
                (p.sku?.toLowerCase().includes(term) ?? false)

            const matchesCategory =
                selectedCategory === 'all' ||
                p.category === selectedCategory

            return matchesSearch && matchesCategory
        })
    }, [products, search, selectedCategory])

    return (
        <div className="space-y-6">
            {/* Search + filter bar */}
            <div className="bg-white rounded-[2rem] p-3 shadow-premium border border-slate-50 flex flex-col xl:flex-row items-stretch xl:items-center gap-3">
                {/* Search input */}
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                    <input
                        type="search"
                        placeholder="Buscar por nombre o SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-11 w-full pl-11 pr-4 bg-slate-50 rounded-xl border-none font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 text-sm tracking-tight transition-all"
                        aria-label="Buscar productos"
                    />
                </div>

                {/* Category select */}
                <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="h-11 pl-11 pr-8 bg-slate-50 rounded-xl border-none font-bold text-slate-700 text-[11px] uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-400/40 appearance-none cursor-pointer transition-all min-w-[180px]"
                        aria-label="Filtrar por categoría"
                    >
                        <option value="all">Todas las categorías</option>
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Result counter */}
            <div className="flex items-center gap-2 px-1">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {filtered.length} producto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                    {selectedCategory !== 'all' && (
                        <span className="text-indigo-500"> · {selectedCategory}</span>
                    )}
                </span>
            </div>

            {/* Product grid */}
            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filtered.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <div className="py-24 flex flex-col items-center justify-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100 gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-white flex items-center justify-center shadow-premium">
                        <ShoppingBag className="h-8 w-8 text-slate-200" />
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                            Sin resultados
                        </p>
                        <p className="text-xs text-slate-300 font-medium">
                            Intenta con otros términos de búsqueda
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
