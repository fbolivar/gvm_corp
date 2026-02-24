"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Package, TrendingUp, Zap } from "lucide-react"

interface Props {
    products: Array<{ name: string; sku: string; qty: number; total: number }>
}

export function TopProductsWidget({ products }: Props) {
    const maxTotal = Math.max(...products.map(p => p.total), 1);

    return (
        <Card className="bg-white border-none rounded-[2.5rem] p-8 shadow-premium relative overflow-hidden group">
            <CardHeader className="p-0 mb-8 flex flex-row items-center justify-between pointer-events-none">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="h-1.5 w-6 bg-slate-900 rounded-full" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Eficiencia Comercial</span>
                    </div>
                    <CardTitle className="text-3xl font-black italic uppercase tracking-tighter italic text-slate-900">Productos Top</CardTitle>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 shadow-inner group-hover:rotate-6 transition-transform">
                    <Package className="h-6 w-6" />
                </div>
            </CardHeader>

            <CardContent className="p-0 space-y-6">
                {products.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                        <Zap className="h-12 w-12 text-slate-100 mx-auto" />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Sin datos de ventas este mes</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {products.map((p, idx) => (
                            <div key={idx} className="space-y-3 group/item">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-300 italic tabular-nums">0{idx + 1}</span>
                                            <p className="text-sm font-black italic uppercase tracking-tight text-slate-800 group-hover/item:text-primary transition-colors">{p.name}</p>
                                        </div>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-6">{p.sku}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black italic tracking-tighter text-slate-900 tabular-nums">${p.total.toLocaleString('es-CO')}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{p.qty} Unidades</p>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-slate-900 group-hover/item:bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(15,23,42,0.1)]"
                                        style={{ width: `${(p.total / maxTotal) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="pt-6 border-t border-slate-50">
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic leading-none">Crecimiento Demanda</span>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-600 border-none font-bold text-[8px] uppercase px-2">+12.5%</Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
