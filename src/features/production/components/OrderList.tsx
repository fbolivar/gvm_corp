"use client"

import { Badge } from "@/shared/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
    Factory,
    Clock,
    CheckCircle2,
    XCircle,
    PlayCircle,
    ChevronRight,
    Hash,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"
import { FinishOrderButton } from "./FinishOrderButton"

interface OrderListProps {
    orders: Record<string, unknown>[]
}

export function OrderList({ orders }: OrderListProps) {
    if (!orders || orders.length === 0) {
        return (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center">
                    <Factory className="h-6 w-6 text-slate-300" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-900">Planta en Reposo</h3>
                    <p className="text-xs text-slate-400 mt-1">No se detectaron ordenes de produccion activas</p>
                </div>
                <Button asChild className="h-9 px-4 rounded-xl bg-slate-900 text-white text-xs mt-2">
                    <Link href="/production/orders/new">Generar Primera OP</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="divide-y divide-slate-50">
            {orders.map((order) => {
                const statusConfig = {
                    DRAFT: { label: 'Borrador', icon: Clock, color: 'text-slate-500', bg: 'bg-slate-50' },
                    IN_PROGRESS: { label: 'En Proceso', icon: PlayCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
                    COMPLETED: { label: 'Finalizada', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    CANCELLED: { label: 'Anulada', icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' }
                };

                const status = String(order.status ?? 'DRAFT') as keyof typeof statusConfig;
                const config = statusConfig[status] || statusConfig.DRAFT;
                const Icon = config.icon;
                const qtyTarget = Number(order.qty_target ?? 0);
                const qtyProduced = Number(order.qty_produced ?? 0);
                const progress = qtyTarget > 0 ? Math.round((qtyProduced / qtyTarget) * 100) : 0;
                const recipes = order.recipes as { name?: string; products?: { name?: string; sku?: string; uom?: string } } | null;

                return (
                    <div key={String(order.id)} className="p-5 hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", config.bg, config.color)}>
                                    <Icon className="h-4 w-4" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-lg">
                                            <Hash className="h-3 w-3 text-slate-500" />
                                            <span className="text-[10px] font-bold text-slate-900">{String(order.order_number)}</span>
                                        </div>
                                        <Badge className={cn("border-none text-[10px] font-semibold px-2.5 py-0.5 rounded-lg", config.bg, config.color)}>
                                            {config.label}
                                        </Badge>
                                    </div>
                                    <p className="text-xs font-bold text-slate-900 leading-snug mt-1 truncate">
                                        {recipes?.name || recipes?.products?.name}
                                    </p>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className="text-[10px] text-slate-400">SKU: {recipes?.products?.sku ?? '—'}</span>
                                        <span className="text-[10px] text-slate-400">
                                            {format(new Date(String(order.created_at)), "dd MMM yyyy", { locale: es })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                                <div className="text-right">
                                    <div className="flex items-center gap-2 justify-end">
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rendimiento</span>
                                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", progress >= 100 ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500")}>
                                            {progress}%
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                                        {qtyProduced}
                                        <span className="text-slate-300 ml-1">/ {qtyTarget}</span>
                                        <span className="text-[10px] text-slate-400 ml-1 font-normal">{recipes?.products?.uom || 'UND'}</span>
                                    </p>
                                </div>

                                {status === 'IN_PROGRESS' ? (
                                    <FinishOrderButton orderId={String(order.id)} qtyTarget={qtyTarget} />
                                ) : (
                                    <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg" asChild>
                                        <Link href={`/production/orders/${String(order.id)}`}>
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    )
}
