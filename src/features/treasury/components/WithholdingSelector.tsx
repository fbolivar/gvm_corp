"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { taxEngine } from "@/features/taxes/services/taxEngine"
import { TaxConfiguration } from "@/features/taxes/types"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Plus, Trash2, ShieldAlert, Percent, Calculator, ChevronDown } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface WithholdingLine {
    withholding_id: string
    base_amount: number
    applied_amount: number
}

interface Props {
    baseAmount: number
    onChange: (lines: WithholdingLine[]) => void
}

export function WithholdingSelector({ baseAmount, onChange }: Props) {
    const supabase = createClient()
    const [available, setAvailable] = useState<TaxConfiguration[]>([])
    const [lines, setLines] = useState<WithholdingLine[]>([])
    const currentYear = new Date().getFullYear()

    useEffect(() => {
        taxEngine.getConfigurations(supabase, currentYear).then(setAvailable)
    }, [])

    const addLine = () => {
        setLines([...lines, { withholding_id: '', base_amount: baseAmount, applied_amount: 0 }])
    }

    const removeLine = (index: number) => {
        const newLines = lines.filter((_, i) => i !== index)
        setLines(newLines)
        onChange(newLines)
    }

    const updateLine = (index: number, field: keyof WithholdingLine, value: any) => {
        const newLines = [...lines]
        newLines[index] = { ...newLines[index], [field]: value }

        if (field === 'withholding_id' || field === 'base_amount') {
            const config = available.find(a => a.id === newLines[index].withholding_id)
            if (config) {
                // Check base amount threshold
                const base = Number(newLines[index].base_amount)
                if (base >= config.base_amount) {
                    newLines[index].applied_amount = (base * config.rate) / 100
                } else {
                    newLines[index].applied_amount = 0
                }
            }
        }

        setLines(newLines)
        onChange(newLines)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-500/80" />
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Cálculo de Impuestos y Deducciones (Año {currentYear})</h4>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLine}
                    className="h-8 border-slate-800 bg-slate-900/40 text-[9px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50 rounded-xl px-4 transition-all"
                >
                    <Plus className="w-3 h-3 mr-2" />
                    Nueva Deducción
                </Button>
            </div>

            {lines.length > 0 ? (
                <div className="space-y-3">
                    {lines.map((line, index) => {
                        const config = available.find(a => a.id === line.withholding_id)
                        return (
                            <div key={index} className="group flex flex-col md:flex-row md:items-center gap-4 bg-slate-950/80 p-5 rounded-2xl border border-slate-900 hover:border-slate-800 transition-all shadow-lg relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-600/30 group-hover:bg-amber-500/60 transition-colors" />

                                <div className="flex-1 space-y-2">
                                    <Label className="text-[9px] font-black text-slate-600 uppercase tracking-widest pl-1">Impuesto / Concepto</Label>
                                    <div className="relative">
                                        <select
                                            value={line.withholding_id}
                                            onChange={(e) => updateLine(index, 'withholding_id', e.target.value)}
                                            className="w-full h-10 bg-slate-900/50 border border-slate-800/50 rounded-xl px-3 pr-10 text-xs font-bold text-slate-200 outline-none appearance-none focus:ring-1 focus:ring-amber-500/30 transition-all cursor-pointer"
                                        >
                                            <option value="">Seleccione concepto...</option>
                                            {available.map(c => (
                                                <option key={c.id} value={c.id!}>
                                                    {c.tax_name} ({c.rate}%) - Base Mín: ${c.base_amount.toLocaleString()}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="w-full md:w-32 space-y-2">
                                    <Label className="text-[9px] font-black text-slate-600 uppercase tracking-widest pl-1">Base Gravable</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700">$</span>
                                        <Input
                                            type="number"
                                            value={line.base_amount}
                                            onChange={(e) => updateLine(index, 'base_amount', Number(e.target.value))}
                                            className="h-10 bg-slate-900/50 border-slate-800/50 pl-6 rounded-xl text-xs font-bold text-slate-300 focus:ring-1 focus:ring-amber-500/30 border-dashed"
                                        />
                                    </div>
                                </div>

                                <div className="w-full md:w-32 space-y-2 text-right">
                                    <Label className="text-[9px] font-black text-slate-600 uppercase tracking-widest pr-1">Retención</Label>
                                    <div className="flex items-center justify-end gap-2 h-10 px-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                                        <Calculator className="h-3 w-3 text-amber-600/50" />
                                        <span className="text-xs font-black text-amber-500 font-mono tracking-tighter">
                                            -${line.applied_amount.toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                <div className="pt-2 md:pt-6">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeLine(index)}
                                        className="h-10 w-10 text-rose-500/50 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-8 bg-slate-950/30 rounded-3xl border border-dashed border-slate-800 group hover:bg-slate-950/50 transition-all cursor-pointer" onClick={addLine}>
                    <div className="h-10 w-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                        <Percent className="h-5 w-5 text-slate-700" />
                    </div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] group-hover:text-slate-500 transition-colors text-center px-4">
                        No se han reportado retenciones.<br />Haga clic para agregar impuestos locales.
                    </p>
                </div>
            )}
        </div>
    )
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
    return <label className={cn("block text-xs font-medium text-slate-700", className)}>{children}</label>
}
