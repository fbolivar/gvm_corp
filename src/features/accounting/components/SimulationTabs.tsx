"use client"

import { useState } from "react"
import { AccountingSimulation } from "./AccountingSimulation"
import { PurchaseAccountingSimulation } from "./PurchaseAccountingSimulation"
import { CostOfSalesSimulation } from "./CostOfSalesSimulation"
import { cn } from "@/shared/lib/utils"

const TABS = [
    { key: 'ventas', label: 'Ventas' },
    { key: 'compras', label: 'Compras' },
    { key: 'costo', label: 'Costo de venta' },
] as const

export function SimulationTabs({ defaultFrom, defaultTo }: { defaultFrom: string; defaultTo: string }) {
    const [tab, setTab] = useState<'ventas' | 'compras' | 'costo'>('ventas')
    return (
        <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={cn('h-10 px-5 rounded-xl text-sm font-semibold',
                            tab === t.key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600')}>
                        {t.label}
                    </button>
                ))}
            </div>
            {tab === 'ventas' && <AccountingSimulation defaultFrom={defaultFrom} defaultTo={defaultTo} />}
            {tab === 'compras' && <PurchaseAccountingSimulation defaultFrom={defaultFrom} defaultTo={defaultTo} />}
            {tab === 'costo' && <CostOfSalesSimulation defaultFrom={defaultFrom} defaultTo={defaultTo} />}
        </div>
    )
}
