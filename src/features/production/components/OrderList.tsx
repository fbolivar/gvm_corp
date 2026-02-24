"use client"

import { ProductionOrder } from "../types"
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
    TrendingUp,
    AlertTriangle,
    Hash
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"
import { FinishOrderButton } from "./FinishOrderButton"

interface OrderListProps {
    orders: any[]
}

export function OrderList({ orders }: OrderListProps) {
    if (!orders || orders.length === 0) {
        return (
            <div className="py-32 text-center border-none bg-white rounded-[3rem]">
                <div className="h-24 w-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <Factory className="h-10 w-10 text-slate-200" />
                </div>
                <h3 className="text-slate-900 font-black text-3xl tracking-tight italic">Planta en Reposo</h3>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">No se detectaron órdenes de producción activas</p>
                <div className="mt-8">
                    <Button asChild className="h-12 px-8 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl transition-all hover:scale-105">
                        <Link href="/production/orders/new">Generar Primera OP</Link>
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="divide-y divide-slate-50">
            {orders.map((order) => {
                const statusConfig = {
                    DRAFT: { label: 'Borrador', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-50 shadow-sm border-slate-100', accent: 'bg-slate-500' },
                    IN_PROGRESS: { label: 'En Proceso', icon: PlayCircle, color: 'text-amber-600', bg: 'bg-amber-50 shadow-sm border-amber-100', accent: 'bg-amber-500' },
                    COMPLETED: { label: 'Finalizada', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 shadow-sm border-emerald-100', accent: 'bg-emerald-500' },
                    CANCELLED: { label: 'Anulada', icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50 shadow-sm border-rose-100', accent: 'bg-rose-500' }
                };

                const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.DRAFT;
                const Icon = config.icon;
                const progress = order.qty_target > 0 ? (order.qty_produced / order.qty_target) * 100 : 0;

                return (
                    <div key={order.id} className="group hover:bg-slate-50/50 transition-all duration-300 p-8 first:rounded-t-[3rem] last:rounded-b-[3rem]">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                            <div className="flex items-start gap-8 flex-1">
                                {/* Status Indicator */}
                                <div className={cn(
                                    "h-20 w-20 rounded-[2rem] flex flex-col items-center justify-center shrink-0 transition-all group-hover:scale-110 duration-500 relative overflow-hidden",
                                    config.bg,
                                    config.color
                                )}>
                                    <Icon className="h-10 w-10 relative z-10" />
                                    {/* Subtle progress fill for in-progress orders */}
                                    {order.status === 'IN_PROGRESS' && (
                                        <div
                                            className="absolute bottom-0 left-0 right-0 bg-amber-500/10 transition-all duration-1000"
                                            style={{ height: `${progress}%` }}
                                        />
                                    )}
                                </div>

                                <div className="space-y-4 flex-1">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full">
                                            <Hash className="h-3 w-3 text-slate-500" />
                                            <span className="text-[10px] font-black text-slate-900 tracking-widest">{order.order_number}</span>
                                        </div>
                                        <Badge className={cn("border-none text-[8px] font-black tracking-[0.2em] px-4 py-1 rounded-full", config.bg, config.color)}>
                                            {config.label.toUpperCase()}
                                        </Badge>
                                        {order.status === 'IN_PROGRESS' && (
                                            <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full">
                                                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Prioridad Alta</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-2xl font-black text-slate-900 tracking-tighter italic group-hover:text-primary transition-colors">
                                            {order.recipes?.name || order.recipes?.products?.name}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-6 text-slate-400">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-slate-300" />
                                                <span className="text-[11px] font-bold uppercase tracking-widest">
                                                    SKU: {order.recipes?.products?.sku}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-slate-300" />
                                                <span className="text-[11px] font-bold uppercase tracking-widest">
                                                    Iniciado {format(new Date(order.created_at), "dd MMM, yyyy", { locale: es })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-12">
                                <div className="text-right flex flex-col items-end gap-2 pr-4 border-r border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Rendimiento</p>
                                        <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", progress >= 100 ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500")}>
                                            {Math.round(progress)}%
                                        </span>
                                    </div>
                                    <div className="text-5xl font-black text-slate-900 tracking-tighter italic leading-none">
                                        {order.qty_produced || 0}
                                        <span className="text-slate-200 text-xl ml-2 not-italic">/ {order.qty_target}</span>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{order.recipes?.products?.uom || 'UNIDADES'}</p>
                                </div>

                                <div className="flex items-center gap-4">
                                    {order.status === 'IN_PROGRESS' ? (
                                        <FinishOrderButton orderId={order.id} qtyTarget={order.qty_target} />
                                    ) : (
                                        <Button size="icon" variant="ghost" className="h-14 w-14 rounded-2xl text-slate-200 hover:text-primary hover:bg-white hover:shadow-premium transition-all group/btn" asChild>
                                            <Link href={`/production/orders/${order.id}`}>
                                                <ChevronRight className="h-8 w-8 group-hover/btn:translate-x-1 transition-transform" />
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    )
}
