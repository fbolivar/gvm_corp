"use client"

import { useState } from 'react'
import { ProductStock } from "../types"
import { Package, Warehouse, Sparkles, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

interface StockOverviewProps {
    stock: (ProductStock & {
        products: { name: string; sku: string; min_stock?: number } | null
        warehouses: { name: string } | null
    })[]
}

const PER_PAGE = 100

export function StockOverview({ stock }: StockOverviewProps) {
    const [page, setPage] = useState(1)
    const totalPages = Math.ceil(stock.length / PER_PAGE)
    const paged = stock.slice((page - 1) * PER_PAGE, page * PER_PAGE)

    if (stock.length === 0) {
        return (
            <div className="py-16 text-center flex flex-col items-center gap-3 opacity-40">
                <Sparkles className="h-8 w-8 text-slate-300" />
                <p className="text-xs text-slate-400">Sin existencias registradas</p>
            </div>
        )
    }

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full" role="table">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/60">
                            <th scope="col" className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[45%]">
                                Producto
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[25%]">
                                Bodega
                            </th>
                            <th scope="col" className="px-4 py-3 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[10%]">
                                Cantidad
                            </th>
                            <th scope="col" className="hidden lg:table-cell px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[10%]">
                                Costo Unit.
                            </th>
                            <th scope="col" className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-[10%]">
                                Valor Total
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {paged.map((s, idx) => {
                            const qty = Number(s.qty)
                            const minStock = Number(s.products?.min_stock ?? 0)
                            const isAgotado = qty <= 0
                            const isLow = !isAgotado && minStock > 0 && qty <= minStock
                            const totalVal = qty * Number(s.avg_cost)

                            return (
                                <tr
                                    key={s.id ?? `${s.product_id}-${s.warehouse_id}-${idx}`}
                                    className={cn(
                                        "group hover:bg-slate-50/60 transition-colors",
                                        isAgotado && "bg-rose-50/30"
                                    )}
                                >
                                    {/* Producto */}
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={cn(
                                                "h-8 w-8 shrink-0 rounded-lg border flex items-center justify-center",
                                                isAgotado
                                                    ? "bg-rose-50 border-rose-100 text-rose-400"
                                                    : isLow
                                                        ? "bg-amber-50 border-amber-100 text-amber-400"
                                                        : "bg-slate-50 border-slate-100 text-slate-400"
                                            )}>
                                                <Package className="h-3.5 w-3.5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2">
                                                    {s.products?.name ?? '—'}
                                                </p>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    {s.products?.sku}
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Bodega */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <Warehouse className="h-3 w-3 text-slate-300 shrink-0" />
                                            <span className="text-xs text-slate-500 leading-snug line-clamp-2">
                                                {s.warehouses?.name ?? '—'}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Cantidad */}
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={cn(
                                                "text-sm font-bold tabular-nums",
                                                isAgotado ? "text-rose-500" : isLow ? "text-amber-600" : "text-slate-900"
                                            )}>
                                                {qty.toLocaleString('es-CO')}
                                            </span>
                                            {isAgotado && (
                                                <Badge className="bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-semibold px-1.5 py-0 rounded-full leading-4">
                                                    Agotado
                                                </Badge>
                                            )}
                                            {isLow && (
                                                <span title="Stock bajo mínimo">
                                                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Costo unitario */}
                                    <td className="hidden lg:table-cell px-4 py-3 text-right">
                                        <span className="text-xs text-slate-400 tabular-nums font-mono">
                                            ${Number(s.avg_cost).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                        </span>
                                    </td>

                                    {/* Valor total */}
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-xs font-bold text-slate-800 tabular-nums font-mono">
                                            ${totalVal.toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination footer */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/40">
                    <span className="text-[10px] text-slate-400">
                        Mostrando{' '}
                        <span className="font-semibold text-slate-600">
                            {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, stock.length)}
                        </span>{' '}
                        de{' '}
                        <span className="font-semibold text-slate-600">{stock.length.toLocaleString('es-CO')}</span>{' '}
                        registros
                    </span>
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-lg"
                            disabled={page <= 1}
                            onClick={() => setPage(p => p - 1)}
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-[10px] text-slate-500 px-1">
                            {page} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-lg"
                            disabled={page >= totalPages}
                            onClick={() => setPage(p => p + 1)}
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
