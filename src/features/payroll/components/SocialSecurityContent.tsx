"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { employeeService } from "@/features/payroll/services/employeeService"
import { payrollService } from "@/features/payroll/services/payrollService"
import { Employee, PayrollSettlement } from "@/features/payroll/types"
import { toast } from "sonner"
import { Card } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import {
    Loader2,
    ShieldCheck,
    TrendingUp,
    FileSpreadsheet,
    Users,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"

export function SocialSecurityContent() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [employees, setEmployees] = useState<Employee[]>([])
    const [consolidatedData, setConsolidatedData] = useState<{
        settlements: (PayrollSettlement & { name: string; doc: string })[];
        totals: {
            ibc: number;
            health: number;
            pension: number;
            arl: number;
            parafiscales: number;
            total: number;
        }
    } | null>(null)

    useEffect(() => {
        async function loadData() {
            try {
                const data = await employeeService.getEmployees(supabase)
                setEmployees(data)

                const settlements = data.map(emp => {
                    const s = payrollService.calculateSettlement(emp, 30)
                    return {
                        ...s,
                        name: emp.party?.legal_name || 'Desconocido',
                        doc: emp.party?.doc_number || ''
                    }
                })

                const totals = settlements.reduce((acc, s) => {
                    const ss = s.social_security!
                    return {
                        ibc: acc.ibc + ss.ibc,
                        health: acc.health + ss.employer.health + ss.employee.health,
                        pension: acc.pension + ss.employer.pension + ss.employee.pension,
                        arl: acc.arl + ss.employer.arl,
                        parafiscales: acc.parafiscales + ss.parafiscales.total,
                        total: acc.total + ss.total_cost + ss.employee.total
                    }
                }, { ibc: 0, health: 0, pension: 0, arl: 0, parafiscales: 0, total: 0 })

                setConsolidatedData({ settlements, totals })
            } catch (err) {
                console.error(err)
                toast.error("Error cargando datos de seguridad social")
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [supabase])

    const handleExportCsv = async () => {
        if (!consolidatedData) return
        const { pilaService } = await import("@/features/payroll/services/pilaService")
        const records = consolidatedData.settlements.map(s => {
            const ss = s.social_security!
            return {
                employee_name: s.name,
                employee_doc: s.doc,
                ibc: ss.ibc,
                health_employee: ss.employee.health,
                health_employer: ss.employer.health,
                pension_employee: ss.employee.pension,
                pension_employer: ss.employer.pension,
                arl: ss.employer.arl,
                ccf: ss.parafiscales.ccf,
                sena: ss.parafiscales.sena,
                icbf: ss.parafiscales.icbf,
                total: ss.total_cost + ss.employee.total
            }
        })
        const csv = pilaService.exportToCsv(records)
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `PILA_CONSOLIDADO_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        toast.success("Reporte PILA exportado correctamente")
    }

    const fmt = (n: number) => `$${new Intl.NumberFormat('es-CO').format(n)}`

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-xs text-slate-400">Consolidando aportes de ley...</p>
            </div>
        )
    }

    const kpis = [
        { label: 'Total IBC', value: fmt(consolidatedData?.totals.ibc || 0), icon: TrendingUp, color: 'text-slate-600', bg: 'bg-slate-50' },
        { label: 'Salud & Pension', value: fmt((consolidatedData?.totals.health || 0) + (consolidatedData?.totals.pension || 0)), icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Parafiscales', value: fmt(consolidatedData?.totals.parafiscales || 0), icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Gasto Total', value: fmt(consolidatedData?.totals.total || 0), icon: TrendingUp, color: 'text-rose-600', bg: 'bg-rose-50' },
    ]

    return (
        <>
            {/* Export button */}
            <div className="flex justify-end">
                <Button
                    onClick={handleExportCsv}
                    size="sm"
                    className="h-9 px-4 rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-xs"
                >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Exportar PILA
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", kpi.bg, kpi.color)}>
                            <kpi.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                            <p className="text-sm font-bold text-slate-900 font-mono tabular-nums truncate">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Detail per employee */}
            <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-900">Detalle por Colaborador</h2>

                {consolidatedData?.settlements.length === 0 && (
                    <Card className="rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                        <Users className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                        <p className="text-xs text-slate-400">No hay empleados activos</p>
                    </Card>
                )}

                <div className="space-y-3">
                    {consolidatedData?.settlements.map((s, i) => (
                        <Card key={i} className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{s.name}</h3>
                                    <p className="text-[10px] text-slate-400">{s.doc}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-4 lg:gap-6">
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">IBC</p>
                                        <p className="text-xs font-bold text-slate-900 font-mono tabular-nums">{fmt(s.social_security!.ibc)}</p>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Seg. Social</p>
                                        <p className="text-xs font-bold text-indigo-600 font-mono tabular-nums">{fmt(s.social_security!.employer.total + s.social_security!.employee.total)}</p>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Parafiscales</p>
                                        <p className="text-xs font-bold text-amber-600 font-mono tabular-nums">{fmt(s.social_security!.parafiscales.total)}</p>
                                    </div>
                                    <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 min-w-0">
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Aportes Empleador</p>
                                        <p className="text-sm font-bold text-slate-900 font-mono tabular-nums">{fmt(s.social_security!.total_cost)}</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Legal compliance note */}
            <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start gap-4">
                <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-indigo-600 shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-indigo-900">Cumplimiento Legal Verificado</h3>
                    <p className="text-xs text-indigo-600/80 leading-relaxed mt-1">
                        Los calculos siguen la normativa colombiana actual (UVT 2026).
                        Las exoneraciones de la Ley 1607/2012 (Salud, SENA e ICBF) se aplican automaticamente para colaboradores que devengan menos de 10 SMLV.
                    </p>
                </div>
            </div>
        </>
    )
}
