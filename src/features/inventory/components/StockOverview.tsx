"use client"

import { ProductStock } from "../types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Package, AlertCircle, Database, Warehouse, ChevronRight, Box, Sparkles, ShieldCheck, ArrowRight, Zap, Cpu } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"

interface StockOverviewProps {
    stock: (ProductStock & { products: { name: string, sku: string } | null, warehouses: { name: string } | null })[]
}

export function StockOverview({ stock }: StockOverviewProps) {
    return (
        <Card className="border-none shadow-premium bg-white overflow-hidden rounded-[3.5rem] group relative">
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                <Cpu className="h-64 w-64 text-slate-900" />
            </div>

            <CardHeader className="py-12 px-12 border-b border-slate-50 relative overflow-hidden bg-slate-50/30">
                <Sparkles className="absolute -right-10 -top-10 h-40 w-40 text-slate-200 opacity-20 pointer-events-none" />
                <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="h-16 w-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white shadow-active transition-transform group-hover:rotate-12 duration-500">
                            <Database className="h-8 w-8" />
                        </div>
                        <div className="space-y-1">
                            <CardTitle className="text-4xl font-black text-slate-900 tracking-tighter italic leading-none uppercase">Estatus de Inventario</CardTitle>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">Consolidado Logístico de Existencias Maestro</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 px-6 py-2.5 font-black text-[10px] uppercase tracking-widest shadow-sm rounded-full">
                            Auditado & Sincronizado
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="border-slate-50 hover:bg-transparent">
                                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] py-10 pl-12 italic">Producto Maestro</TableHead>
                                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] py-10 italic">Centro Logístico</TableHead>
                                <th className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] py-10 italic text-center">Protocolo Cant.</th>
                                <th className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] py-10 italic text-right">Costo Unitario</th>
                                <TableHead className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] py-10 text-right pr-12 italic">Valorización Activo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stock.length === 0 ? (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={5} className="py-60 text-center">
                                        <div className="flex flex-col items-center gap-8 group">
                                            <div className="h-24 w-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-premium transition-transform group-hover:rotate-12">
                                                <Box className="h-12 w-12 text-slate-200" />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">Depósito Vacío</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-4">No se detectaron existencias registradas en este cuadrante.</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                stock.map((s) => (
                                    <TableRow key={s.id} className="border-slate-50 hover:bg-slate-50/80 transition-all duration-500 group/row">
                                        <TableCell className="pl-12 py-10">
                                            <div className="flex items-center gap-6">
                                                <div className="h-16 w-16 rounded-[1.2rem] bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm group-hover/row:scale-110 group-hover/row:border-primary/20 transition-all duration-700 relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-slate-50/50 opacity-0 group-hover/row:opacity-100 transition-opacity" />
                                                    <Package className="h-8 w-8 group-hover/row:text-primary relative z-10" />
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl font-black text-slate-900 group-hover/row:text-primary transition-colors tracking-tighter uppercase italic">
                                                            {s.products?.name}
                                                        </span>
                                                        <ShieldCheck className="h-4 w-4 text-emerald-500 opacity-0 group-hover/row:opacity-100 transition-all transform scale-0 group-hover/row:scale-110" />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-slate-900 px-2.5 py-0.5 rounded-md shadow-sm">
                                                            <span className="text-[10px] text-white font-mono font-black uppercase tracking-widest">
                                                                SKU: {s.products?.sku}
                                                            </span>
                                                        </div>
                                                        <Badge variant="outline" className="border-slate-100 text-[8px] font-black text-slate-300 uppercase tracking-widest italic rounded-full">Primary Asset</Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shadow-inner group-hover/row:bg-slate-900 group-hover/row:text-white transition-all duration-500 group/wh">
                                                    <Warehouse className="h-5 w-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest italic">{s.warehouses?.name}</span>
                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] italic">Warehouse Point</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <span className={cn(
                                                    "text-3xl font-black tracking-tighter italic tabular-nums leading-none",
                                                    Number(s.qty) <= 0 ? "text-rose-500 animate-pulse" : "text-emerald-600"
                                                )}>
                                                    {Number(s.qty).toLocaleString()}
                                                </span>
                                                {Number(s.qty) <= 0 ? (
                                                    <Badge className="bg-rose-500 text-white border-none text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Agotado</Badge>
                                                ) : (
                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] italic">Unidades Disponibles</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-lg font-black text-slate-400 font-mono tracking-tighter italic">
                                                    ${Number(s.avg_cost).toLocaleString('es-CO')}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <Zap className="h-3 w-3 text-amber-400" />
                                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Costo Ponderado</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-12">
                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className="text-2xl font-black text-slate-900 font-mono tracking-tighter italic group-hover/row:text-primary transition-colors duration-500 leading-none">
                                                    ${(Number(s.qty) * Number(s.avg_cost)).toLocaleString('es-CO')}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden shadow-inner flex items-center">
                                                        <div className="h-full bg-emerald-500 w-full animate-progress-fast" />
                                                    </div>
                                                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest italic">Capital Operativo</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
