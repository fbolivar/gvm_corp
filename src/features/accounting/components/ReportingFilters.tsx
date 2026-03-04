"use client"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Scale, X } from "lucide-react"
import { cn } from "@/shared/lib/utils"

export function ReportingFilters() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [startDate, setStartDate] = useState(searchParams.get('startDate') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(searchParams.get('endDate') || new Date().toISOString().split('T')[0])

    const [showCompare, setShowCompare] = useState(!!(searchParams.get('compareStart') || searchParams.get('compareEnd')))
    const prevMonthStart = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0]
    const prevMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0]
    const [compareStart, setCompareStart] = useState(searchParams.get('compareStart') || prevMonthStart)
    const [compareEnd, setCompareEnd] = useState(searchParams.get('compareEnd') || prevMonthEnd)

    const handleApply = () => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('startDate', startDate)
        params.set('endDate', endDate)
        if (showCompare) {
            params.set('compareStart', compareStart)
            params.set('compareEnd', compareEnd)
        } else {
            params.delete('compareStart')
            params.delete('compareEnd')
        }
        router.push(`?${params.toString()}`)
    }

    return (
        <div className="space-y-2">
            <div className="flex items-end gap-3 bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
                <div className="space-y-1.5">
                    <Label htmlFor="startDate" className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">Desde</Label>
                    <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-9 bg-slate-50 border-slate-200 text-xs"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="endDate" className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">Hasta</Label>
                    <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-9 bg-slate-50 border-slate-200 text-xs"
                    />
                </div>
                <Button onClick={handleApply} size="sm" className="h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold">
                    Generar
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowCompare(!showCompare)}
                    className={cn(
                        "h-9 w-9 rounded-lg shrink-0",
                        showCompare
                            ? "bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100"
                            : "text-slate-400 hover:bg-slate-50"
                    )}
                    title="Comparar con periodo anterior"
                >
                    <Scale className="h-4 w-4" />
                </Button>
            </div>

            {showCompare && (
                <div className="flex items-end gap-3 bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
                    <div className="flex items-center gap-1.5 text-indigo-500 text-[9px] font-semibold uppercase tracking-wider mr-1 self-end mb-2">
                        <Scale className="h-3 w-3" />
                        Vs.
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="compareStart" className="text-indigo-400 text-[10px] uppercase tracking-wider font-medium">Desde</Label>
                        <Input
                            id="compareStart"
                            type="date"
                            value={compareStart}
                            onChange={(e) => setCompareStart(e.target.value)}
                            className="h-9 bg-white border-indigo-200 text-xs"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="compareEnd" className="text-indigo-400 text-[10px] uppercase tracking-wider font-medium">Hasta</Label>
                        <Input
                            id="compareEnd"
                            type="date"
                            value={compareEnd}
                            onChange={(e) => setCompareEnd(e.target.value)}
                            className="h-9 bg-white border-indigo-200 text-xs"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowCompare(false)}
                        className="text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 h-9 w-9 rounded-lg self-end"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    )
}
