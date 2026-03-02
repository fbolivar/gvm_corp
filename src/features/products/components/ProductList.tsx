"use client"

import { useState, useEffect } from "react"
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

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (debouncedSearch) {
            params.set('search', debouncedSearch)
        } else {
            params.delete('search')
        }
        params.set('page', '1')

        router.push(`${pathname}?${params.toString()}`)
    }, [debouncedSearch, pathname, router, searchParams])

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('page', newPage.toString())
        router.push(`${pathname}?${params.toString()}`)
    }

    const totalPages = Math.ceil(totalCount / perPage)

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/60 shadow-2xl">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <Input
                        placeholder="Buscar por nombre o SKU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-12 bg-slate-950/50 border-slate-800 text-white placeholder:text-slate-600 rounded-2xl h-12 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                    />
                </div>
                <Button
                    asChild
                    className="rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 px-8 shadow-lg shadow-blue-900/40 transition-all active:scale-95 whitespace-nowrap"
                >
                    <Link href="/products/new">
                        <Plus className="mr-2 h-5 w-5" /> Nuevo Ítem
                    </Link>
                </Button>
            </div>

            {/* Table Section */}
            <div className="rounded-3xl border border-slate-800 bg-slate-900/20 backdrop-blur-xl shadow-2xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-950/40">
                        <TableRow className="border-slate-800 hover:bg-transparent">
                            <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] py-5 pl-8">Producto / Identidad</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] py-5">Atributos</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] py-5">Finanzas</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] py-5 text-center">Disponibilidad</TableHead>
                            <TableHead className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] py-5 text-right pr-8">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialData.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={8} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center opacity-40">
                                        <Box className="h-16 w-16 mb-4" />
                                        <p className="text-lg font-medium">No se encontraron resultados maestros.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            initialData.map((prod) => (
                                <TableRow key={prod.id ?? prod.sku} className="border-slate-800/50 hover:bg-slate-800/30 transition-all duration-300 group">
                                    <TableCell className="py-6 pl-8">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-center shadow-lg group-hover:bg-blue-600/10 group-hover:border-blue-500/50 transition-all">
                                                <Package className="h-6 w-6 text-slate-500 group-hover:text-blue-400" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white text-base tracking-tight">{prod.name}</div>
                                                <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                                                    SKU: {prod.sku || 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <div className="space-y-1.5">
                                            <Badge variant="outline" className="bg-slate-950/50 text-slate-400 border-slate-800 text-[9px] font-black uppercase tracking-tighter rounded-md">
                                                {prod.type === 'GOOD' ? 'Tangible' : 'Servicio'}
                                            </Badge>
                                            <div className="text-[10px] text-slate-500 font-bold uppercase">{prod.uom}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6">
                                        <div className="flex flex-col">
                                            <span className="text-white font-black font-mono text-sm">${(prod.selling_price ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 0 })}</span>
                                            <span className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-widest">{prod.tax_category ?? 'IVA_0'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6 text-center">
                                        <div className="flex flex-col items-center gap-1.5">
                                            <div className={`text-sm font-black font-mono ${(prod.stock_qty || 0) > 0 ? 'text-blue-400' : 'text-rose-500'}`}>
                                                {prod.stock_qty || 0}
                                            </div>
                                            <div className={`w-12 h-1 rounded-full ${(prod.stock_qty || 0) > 10 ? 'bg-blue-500/50' : (prod.stock_qty || 0) > 0 ? 'bg-amber-500/50' : 'bg-rose-500/50'}`} />
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-6 text-right pr-8">
                                        <div className="flex items-center justify-end gap-2">
                                            <Badge className={`rounded-full px-3 py-0.5 text-[9px] font-black uppercase border tracking-widest ${prod.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-800'
                                                }`}>
                                                {prod.status}
                                            </Badge>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all" asChild>
                                                <Link href={`/products/${prod.id}`}>
                                                    <Edit3 className="h-4 w-4" />
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
                <div className="flex items-center justify-center gap-4 bg-slate-900/40 backdrop-blur-md p-4 rounded-2xl border border-slate-800/60 shadow-xl w-fit mx-auto">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="rounded-xl border-slate-800 text-slate-400 hover:bg-slate-800 transition-all font-bold"
                    >
                        Anterior
                    </Button>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Página</span>
                        <div className="bg-blue-600 text-white font-bold text-xs h-8 w-8 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40">
                            {currentPage}
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">de {totalPages}</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="rounded-xl border-slate-800 text-slate-400 hover:bg-slate-800 transition-all font-bold"
                    >
                        Siguiente
                    </Button>
                </div>
            )}
        </div>
    )
}
