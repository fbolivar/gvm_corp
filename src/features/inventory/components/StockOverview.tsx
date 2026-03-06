"use client"

import { ProductStock } from "../types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Package, Warehouse, Sparkles } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"

interface StockOverviewProps {
    stock: (ProductStock & { products: { name: string, sku: string } | null, warehouses: { name: string } | null })[]
}

export function StockOverview({ stock }: StockOverviewProps) {
    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent border-slate-100">
                        <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Producto</TableHead>
                        <TableHead className="hidden md:table-cell text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Bodega</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider text-center">Cantidad</TableHead>
                        <TableHead className="hidden md:table-cell text-[10px] font-semibold uppercase text-slate-400 tracking-wider text-right">Costo Unitario</TableHead>
                        <TableHead className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider text-right">Valor Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {stock.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={5} className="py-12 text-center">
                                <div className="flex flex-col items-center gap-3 opacity-30">
                                    <Sparkles className="h-8 w-8 text-slate-300" />
                                    <p className="text-xs text-slate-400">Sin existencias registradas</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        stock.map((s, idx) => (
                            <TableRow key={s.id ?? `${s.product_id}-${s.warehouse_id}-${idx}`} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                                            <Package className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 truncate">{s.products?.name}</p>
                                            <span className="text-[10px] text-slate-400 font-mono">{s.products?.sku}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                    <div className="flex items-center gap-2">
                                        <Warehouse className="h-3.5 w-3.5 text-slate-400" />
                                        <span className="text-xs text-slate-600">{s.warehouses?.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className={cn(
                                            "text-sm font-bold tabular-nums",
                                            Number(s.qty) <= 0 ? "text-rose-500" : "text-slate-900"
                                        )}>
                                            {Number(s.qty).toLocaleString()}
                                        </span>
                                        {Number(s.qty) <= 0 && (
                                            <Badge className="bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                                Agotado
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-right">
                                    <span className="text-sm text-slate-500 tabular-nums">
                                        ${Number(s.avg_cost).toLocaleString('es-CO')}
                                    </span>
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                                        ${(Number(s.qty) * Number(s.avg_cost)).toLocaleString('es-CO')}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
