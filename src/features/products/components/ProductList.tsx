"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Product } from "../types"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { useDebounce } from "@/shared/hooks/useDebounce"
import { Plus, Search, Package, Box, Edit3 } from "lucide-react"
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
        // Skip first render to avoid pushing the same URL on mount
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
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-xl p-3 shadow-sm border border-slate-100/50">
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Buscar por nombre o SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-12 h-10 bg-slate-50/50 border-none rounded-lg font-bold text-slate-900 placeholder:text-slate-300 focus-visible:ring-0 shadow-inner text-sm tracking-tight"
                    />
                </div>
                <Button
                    asChild
                    className="h-10 px-6 rounded-lg bg-slate-900 hover:bg-primary text-white font-bold shadow-active transition-all active:scale-95 border-none group"
                >
                    <Link href="/products/new" className="flex items-center gap-2.5">
                        <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-500" />
                        <span className="text-[9px] uppercase tracking-widest">Nuevo Item</span>
                    </Link>
                </Button>
            </div>

            {/* Table Section */}
            <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/80">
                        <TableRow className="border-slate-100 hover:bg-transparent">
                            <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-widest py-4 pl-6">Producto</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-widest py-4">Tipo</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-widest py-4">Precio</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-widest py-4 text-center">Stock</TableHead>
                            <TableHead className="text-slate-400 font-bold uppercase text-[9px] tracking-widest py-4 text-right pr-6">Estado</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialData.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={5} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center">
                                        <Box className="h-12 w-12 text-slate-200 mb-3" />
                                        <p className="text-sm font-bold text-slate-400">Sin resultados</p>
                                        <p className="text-[10px] text-slate-300 uppercase tracking-widest mt-1">Intenta con otro término de búsqueda</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            initialData.map((prod) => (
                                <TableRow key={prod.id ?? prod.sku} className="border-slate-50 hover:bg-slate-50/50 transition-all group">
                                    <TableCell className="py-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                                                <Package className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm tracking-tight">{prod.name}</div>
                                                <div className="font-mono text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">
                                                    {prod.sku || 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="space-y-1">
                                            <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[8px] font-black uppercase tracking-widest rounded-md">
                                                {prod.type === 'GOOD' ? 'Bien' : 'Servicio'}
                                            </Badge>
                                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{prod.uom}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex flex-col">
                                            <span className="text-slate-900 font-black font-mono text-sm">${(prod.selling_price ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}</span>
                                            <span className="text-[8px] text-slate-400 font-bold uppercase mt-0.5 tracking-widest">{prod.tax_category ?? 'IVA_0'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className={`text-sm font-black font-mono ${(prod.stock_qty || 0) > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                {prod.stock_qty || 0}
                                            </div>
                                            <div className={`w-10 h-1 rounded-full ${(prod.stock_qty || 0) > 10 ? 'bg-emerald-500/30' : (prod.stock_qty || 0) > 0 ? 'bg-amber-500/30' : 'bg-rose-500/30'}`} />
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 text-right pr-6">
                                        <div className="flex items-center justify-end gap-2">
                                            <Badge className={`rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase border tracking-widest ${prod.status === 'ACTIVE'
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                : 'bg-slate-50 text-slate-400 border-slate-200'
                                                }`}>
                                                {prod.status === 'ACTIVE' ? 'Activo' : prod.status}
                                            </Badge>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all" asChild>
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
                <div className="flex items-center justify-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm w-fit mx-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="rounded-lg border-slate-200 text-slate-500 hover:bg-slate-50 transition-all font-bold text-[9px] uppercase tracking-widest"
                    >
                        Anterior
                    </Button>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pag</span>
                        <div className="bg-slate-900 text-white font-bold text-[10px] h-7 w-7 rounded-md flex items-center justify-center">
                            {currentPage}
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">/ {totalPages}</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="rounded-lg border-slate-200 text-slate-500 hover:bg-slate-50 transition-all font-bold text-[9px] uppercase tracking-widest"
                    >
                        Siguiente
                    </Button>
                </div>
            )}
        </div>
    )
}
