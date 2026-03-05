"use client"

import { InventoryMovement } from "../types"
import { format } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { ArrowDownLeft, ArrowUpRight, History, Warehouse } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { useI18n } from "@/shared/stores/useLanguageStore"

interface InventoryListProps {
    movements: (InventoryMovement & { products: { name: string, sku: string } | null, warehouses: { name: string } | null })[]
}

export function InventoryList({ movements }: InventoryListProps) {
    const { t, language } = useI18n();
    const dateLocale = language === 'es' ? es : enUS;

    return (
        <div className="space-y-1">
            {movements.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center gap-3 opacity-30">
                    <History className="h-8 w-8 text-slate-300" />
                    <p className="text-xs text-slate-400">{t.inventory.silence}</p>
                </div>
            ) : (
                movements.map((mov) => {
                    const isIn = mov.type === 'IN';
                    const Icon = isIn ? ArrowDownLeft : ArrowUpRight;

                    return (
                        <div key={mov.id ?? `${mov.product_id}-${mov.warehouse_id}-${mov.occurred_at}`} className="group p-3 rounded-xl hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                                    isIn ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                )}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-900 truncate">
                                                {mov.products?.name}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[10px] text-slate-400 font-mono">{mov.products?.sku}</span>
                                                <span className="text-slate-200">·</span>
                                                <div className="flex items-center gap-1 text-slate-400">
                                                    <Warehouse className="h-2.5 w-2.5" />
                                                    <span className="text-[10px]">{mov.warehouses?.name}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-0.5 shrink-0">
                                            <span className={cn(
                                                "text-sm font-bold tabular-nums",
                                                isIn ? "text-emerald-600" : "text-rose-600"
                                            )}>
                                                {isIn ? '+' : '-'}{Number(mov.qty).toLocaleString()}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {format(new Date(mov.occurred_at || ''), "dd MMM HH:mm", { locale: dateLocale })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    )
}
