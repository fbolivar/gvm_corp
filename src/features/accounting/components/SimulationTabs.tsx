"use client"

import { useState } from "react"
import { AccountingSimulation } from "./AccountingSimulation"
import { PurchaseAccountingSimulation } from "./PurchaseAccountingSimulation"
import { cn } from "@/shared/lib/utils"

export function SimulationTabs({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
    const [tab, setTab] = useState<'ventas' | 'compras'>('ventas')
    return (
        <div className="space-y-5">
            <div className="flex gap-2">
                {(['ventas', 'compras'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={cn('h-10 px-5 rounded-xl text-sm font-semibold capitalize',
                            tab === t ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
                        {t}
                    </button>
                ))}
            </div>
            {tab === 'ventas'
                ? <AccountingSimulation defaultFrom={defaultFrom} defaultTo={defaultTo} />
                : <PurchaseAccountingSimulation defaultFrom={defaultFrom} defaultTo={defaultTo} />}
        </div>
    )
}
