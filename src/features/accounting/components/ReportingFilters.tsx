"use client"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

export function ReportingFilters() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [startDate, setStartDate] = useState(searchParams.get('startDate') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0])
    const [endDate, setEndDate] = useState(searchParams.get('endDate') || new Date().toISOString().split('T')[0])

    const handleApply = () => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('startDate', startDate)
        params.set('endDate', endDate)
        router.push(`?${params.toString()}`)
    }

    return (
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
        </div>
    )
}
