"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Product } from "../types"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { useDebounce } from "@/shared/hooks/useDebounce"
import { Plus, Search, Package, Edit3, Sparkles, ScanBarcode } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/shared/components/ui/badge"

interface ProductListProps {
    initialData: Product[]
    totalCount: number
    currentPage: number
    perPage: number
}

export function ProductList({ initialData, totalCount, currentPage, perPage }: ProductListProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const [search, setSearch] = useState(searchParams.get('search') || '')
    const debouncedSearch = useDebounce(search, 500)
    const isFirstRender = useRef(true)

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }
        const params = new URLSearchParams(searchParams.toString())
        if (debouncedSearch) {
            params.set('search', debouncedSearch)
        } else {
            params.delete('search')
        }
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch])

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('page', newPage.toString())
        router.push(`${pathname}?${params.toString()}`)
    }

    const totalPages = Math.ceil(totalCount / perPage)

    return (
        <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white rounded-xl p-3 border border-slate-100">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar por nombre o SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-9 pl-10 bg-slate-50 border-none rounded-lg text-sm placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-indigo-200"
                    />
                </div>
                <Button asChild className="h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs">
                    <Link href="/products/new" className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Nuevo Item
                    </Link>
                </Button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent border-slate-100">
                            <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Producto</TableHead>
                            <TableHead className="hidden lg:table-cell text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Barcode</TableHead>
                            <TableHead className="hidden md:table-cell text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Tipo</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Precio</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider text-center">Stock</TableHead>
                            <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider text-right">Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialData.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={6} className="py-12 text-center">
                                    <div className="flex flex-col items-center gap-3 opacity-30">
                                        <Sparkles className="h-8 w-8 text-slate-300" />
                                        <p className="text-xs text-slate-400">Sin resultados</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            initialData.map((prod) => (
                                <TableRow key={prod.id ?? prod.sku} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                                                <Package className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 truncate">{prod.name}</p>
                                                <span className="text-[10px] text-slate-400 font-mono">{prod.sku || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                        {prod.barcode ? (
                                            <div className="flex items-center gap-1.5">
                                                <ScanBarcode className="h-3.5 w-3.5 text-slate-400" />
                                                <span className="text-[11px] font-mono text-slate-600">{prod.barcode}</span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-300">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">
                                        <div className="space-y-1">
                                            <Badge variant="outline" className="border-slate-200 text-slate-500 text-[10px] font-semibold rounded-full px-2 py-0.5">
                                                {prod.type === 'GOOD' ? 'Bien' : 'Servicio'}
                                            </Badge>
                                            <p className="text-[10px] text-slate-400">{prod.uom}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900 tabular-nums">${(prod.selling_price ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}</span>
                                            <span className="text-[10px] text-slate-400">{prod.tax_category ?? 'IVA_0'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={`text-sm font-bold tabular-nums ${(prod.stock_qty || 0) > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {prod.stock_qty || 0}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Badge className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${prod.status === 'ACTIVE'
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                : 'bg-slate-50 text-slate-400 border-slate-200'
                                                }`}>
                                                {prod.status === 'ACTIVE' ? 'Activo' : prod.status}
                                            </Badge>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-slate-300 hover:text-indigo-600 hover:bg-indigo-50" asChild>
                                                <Link href={`/products/${prod.id}`}>
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 bg-white p-2.5 rounded-xl border border-slate-100 w-fit mx-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="rounded-lg border-slate-200 text-xs font-semibold"
                    >
                        Anterior
                    </Button>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-medium">Pag</span>
                        <span className="bg-indigo-600 text-white font-bold text-[10px] h-6 w-6 rounded-md flex items-center justify-center">
                            {currentPage}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">/ {totalPages}</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="rounded-lg border-slate-200 text-xs font-semibold"
                    >
                        Siguiente
                    </Button>
                </div>
            )}
        </div>
    )
}
