"use client"

import { InventoryMovement } from "../types"
import { format } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { ArrowDownLeft, ArrowUpRight, Box, Warehouse, History, Clock, FileText, Zap, Sparkles, ChevronRight } from "lucide-react"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"
import { useI18n } from "@/shared/stores/useLanguageStore"

interface InventoryListProps {
    movements: (InventoryMovement & { products: { name: string, sku: string } | null, warehouses: { name: string } | null })[]
}

export function InventoryList({ movements }: InventoryListProps) {
    const { t, language } = useI18n();
    const dateLocale = language === 'es' ? es : enUS;

    return (
        <div className="space-y-4">
            {movements.length === 0 ? (
                <div className="py-24 text-center flex flex-col items-center gap-8 group">
                    <div className="h-24 w-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center border-4 border-white shadow-premium group-hover:rotate-12 transition-transform duration-700">
                        <History className="h-10 w-10 text-slate-200" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">
                            {t.inventory.silence}
                        </p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-4">
                            {t.inventory.waiting}
                        </p>
                    </div>
                </div>
            ) : (
                movements.map((mov) => {
                    const isIn = mov.type === 'IN';
                    const Icon = isIn ? ArrowDownLeft : ArrowUpRight;

                    return (
                        <div key={mov.id ?? `${mov.product_id}-${mov.warehouse_id}-${mov.occurred_at}`} className="group relative p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] bg-white hover:bg-slate-50 transition-all duration-500 border border-transparent hover:border-slate-100 hover:shadow-premium overflow-hidden">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-full w-24 bg-gradient-to-l from-slate-50 translate-x-full group-hover:translate-x-0 transition-transform duration-700 pointer-events-none" />

                            <div className="flex items-center gap-6 relative z-10">
                                <div className={cn(
                                    "h-12 w-12 sm:h-16 sm:w-16 rounded-[1rem] sm:rounded-[1.2rem] flex items-center justify-center shadow-premium shrink-0 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6",
                                    isIn ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                )}>
                                    <Icon className="h-6 w-6 sm:h-8 sm:w-8" />
                                </div>
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic mb-0.5">
                                                {format(new Date(mov.occurred_at || ''), "dd MMM, yyyy • HH:mm", { locale: dateLocale })}
                                            </span>
                                            <span className="text-base sm:text-xl font-black text-slate-900 group-hover:text-primary transition-colors truncate tracking-tighter italic uppercase leading-tight">
                                                {mov.products?.name}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-slate-900 px-2.5 py-0.5 rounded-md shadow-sm">
                                                    <span className="text-[9px] font-mono font-black text-white">{mov.products?.sku}</span>
                                                </div>
                                                <div className="h-1 w-1 rounded-full bg-slate-200" />
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <Warehouse className="h-3 w-3" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest italic">{mov.warehouses?.name}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <span className={cn(
                                                "text-xl sm:text-3xl font-black italic tracking-tighter tabular-nums leading-none group-hover:scale-110 transition-transform",
                                                isIn ? "text-emerald-600" : "text-rose-600"
                                            )}>
                                                {isIn ? '+' : '-'}{Number(mov.qty).toLocaleString()}
                                            </span>
                                            <Badge variant="outline" className={cn(
                                                "border-none px-2.5 py-0.5 font-black text-[8px] uppercase tracking-[0.2em] rounded-full shadow-inner italic",
                                                isIn ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                            )}>
                                                {isIn ? t.inventory.entry : t.inventory.exit}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-700 delay-100">
                                <ChevronRight className="h-6 w-6 text-slate-300" />
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    )
}
