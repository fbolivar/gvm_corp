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
    categoryLabel: string | null
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
    'GOOD': 'bg-indigo-100 text-indigo-700',
    'SERVICE': 'bg-cyan-100 text-cyan-700',
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
        <article className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-3">
            {/* Top row: icon + category badge */}
            <div className="flex items-start justify-between gap-3">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                    <Package className="h-5 w-5 text-slate-400" />
                </div>
                {product.category && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${getCategoryColor(product.category)}`}>
                        {product.categoryLabel ?? product.category}
                    </span>
                )}
            </div>

            {/* Name + SKU */}
            <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-snug">
                    {product.name}
                </h3>
                {product.sku && (
                    <p className="text-xs font-mono text-slate-400 uppercase tracking-wide">
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
            <div className="space-y-0.5">
                <span className="text-lg font-bold text-slate-900 tracking-tight tabular-nums">
                    {formatCOP(product.price)}
                </span>
                {product.cost !== null && (
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                        Costo: {formatCOP(product.cost)}
                    </p>
                )}
            </div>

            {/* Stock + unit row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                        inStock
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}
                >
                    {inStock ? `Stock: ${product.totalQty}` : 'Agotado'}
                </span>
                {product.unit && (
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                        / {product.unit}
                    </span>
                )}
            </div>

            {/* CTA */}
            <Link
                href={quotationUrl}
                className="mt-auto flex items-center justify-center gap-2 h-9 w-full rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-bold text-xs uppercase tracking-wide transition-all duration-300 active:scale-95"
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
        const catMap = new Map<string, string>()
        for (const p of products) {
            if (p.category) catMap.set(p.category, p.categoryLabel ?? p.category)
        }
        return Array.from(catMap.entries()).sort((a, b) => a[1].localeCompare(b[1]))
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
        <div className="space-y-5">
            {/* Search + filter bar */}
            <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex flex-col xl:flex-row items-stretch xl:items-center gap-3">
                {/* Search input */}
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                    <input
                        type="search"
                        placeholder="Buscar por nombre o SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-10 w-full pl-11 pr-4 bg-slate-50 rounded-xl border-none font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 text-sm tracking-tight transition-all"
                        aria-label="Buscar productos"
                    />
                </div>

                {/* Category select */}
                <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="h-10 pl-11 pr-8 bg-slate-50 rounded-xl border-none font-semibold text-slate-700 text-xs uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-indigo-400/40 appearance-none cursor-pointer transition-all min-w-[180px]"
                        aria-label="Filtrar por categoría"
                    >
                        <option value="all">Todas las categorías</option>
                        {categories.map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Result counter */}
            <div className="flex items-center gap-2 px-1">
                <Tag className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    {filtered.length} producto{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
                    {selectedCategory !== 'all' && (
                        <span className="text-indigo-500"> · {selectedCategory}</span>
                    )}
                </span>
            </div>

            {/* Product grid */}
            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filtered.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <div className="py-16 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                        <ShoppingBag className="h-7 w-7 text-slate-300" />
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
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
