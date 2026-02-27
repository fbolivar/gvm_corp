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
        <div className="space-y-3">
            <div className="flex items-end gap-4 bg-slate-900 overflow-hidden border border-slate-700/50 p-4 rounded-lg shadow-xl">
                <div className="space-y-2">
                    <Label htmlFor="startDate" className="text-slate-400 text-xs uppercase tracking-wider">Fecha Inicial</Label>
                    <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="endDate" className="text-slate-400 text-xs uppercase tracking-wider">Fecha Final</Label>
                    <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                    />
                </div>
                <Button onClick={handleApply} className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                    Generar Reporte
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowCompare(!showCompare)}
                    className={cn(
                        "h-10 w-10 rounded-lg transition-all",
                        showCompare
                            ? "bg-indigo-600 text-white hover:bg-indigo-700"
                            : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    )}
                    title="Comparar con período anterior"
                >
                    <Scale className="h-4 w-4" />
                </Button>
            </div>

            {showCompare && (
                <div className="flex items-end gap-4 bg-slate-800 border border-indigo-500/30 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-indigo-400 text-[9px] font-black uppercase tracking-widest mr-2 whitespace-nowrap self-end mb-2.5">
                        <Scale className="h-3 w-3" />
                        Vs.
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="compareStart" className="text-slate-400 text-xs uppercase tracking-wider">Desde</Label>
                        <Input
                            id="compareStart"
                            type="date"
                            value={compareStart}
                            onChange={(e) => setCompareStart(e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="compareEnd" className="text-slate-400 text-xs uppercase tracking-wider">Hasta</Label>
                        <Input
                            id="compareEnd"
                            type="date"
                            value={compareEnd}
                            onChange={(e) => setCompareEnd(e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowCompare(false)}
                        className="text-slate-400 hover:text-white hover:bg-slate-700 h-10 w-10 rounded-lg self-end"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    )
}
