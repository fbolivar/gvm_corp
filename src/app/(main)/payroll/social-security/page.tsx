"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { employeeService } from "@/features/payroll/services/employeeService"
import { payrollService } from "@/features/payroll/services/payrollService"
import { Employee, PayrollSettlement } from "@/features/payroll/types"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import {
    Loader2,
    Download,
    ShieldCheck,
    ChevronLeft,
    TrendingUp,
    FileSpreadsheet,
    Users
} from "lucide-react"
import Link from "next/link"
import { SocialSecurityReport } from "@/features/payroll/components/SocialSecurityReport"

export default function SocialSecurityPage() {
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

                // Generar consolidado de prueba para el mes actual
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
        a.download = `PILA_CONSULIDADO_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        toast.success("Reporte PILA exportado correctamente")
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consolidando aportes de ley...</p>
            </div>
        )
    }

    return (
        <div className="p-10 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <Link href="/payroll" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors mb-4">
                        <ChevronLeft className="h-4 w-4" /> Volver a Nómina
                    </Link>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic">
                        Centro de <span className="text-primary">Seguridad Social</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Consolidado PILA y Parafiscales - Periodo Actual</p>
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        onClick={handleExportCsv}
                        className="h-16 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black italic tracking-tight text-xl transition-all shadow-xl flex items-center gap-3"
                    >
                        EXPORTAR PILA <FileSpreadsheet className="h-6 w-6" />
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none bg-white shadow-premium rounded-[2.5rem] p-8 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total IBC Consolidado</p>
                    <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-black italic tracking-tighter text-slate-900">
                            ${new Intl.NumberFormat('es-CO').format(consolidatedData?.totals.ibc || 0)}
                        </span>
                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </div>
                </Card>
                <Card className="border-none bg-indigo-600 shadow-premium rounded-[2.5rem] p-8 space-y-4 text-white">
                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Aportes Salud & Pensión</p>
                    <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-black italic tracking-tighter">
                            ${new Intl.NumberFormat('es-CO').format((consolidatedData?.totals.health || 0) + (consolidatedData?.totals.pension || 0))}
                        </span>
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                    </div>
                </Card>
                <Card className="border-none bg-emerald-500 shadow-premium rounded-[2.5rem] p-8 space-y-4 text-white">
                    <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Total Parafiscales</p>
                    <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-black italic tracking-tighter">
                            ${new Intl.NumberFormat('es-CO').format(consolidatedData?.totals.parafiscales || 0)}
                        </span>
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <Users className="h-5 w-5" />
                        </div>
                    </div>
                </Card>
                <Card className="border-none bg-slate-900 shadow-premium rounded-[2.5rem] p-8 space-y-4 text-white">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gasto Total Periodo</p>
                    <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-black italic tracking-tighter">
                            ${new Intl.NumberFormat('es-CO').format(consolidatedData?.totals.total || 0)}
                        </span>
                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-emerald-400" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* List by Employee */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shadow-sm">
                        <Users className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 italic tracking-tight">Detalle por Colaborador</h2>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {consolidatedData?.settlements.map((s, i) => (
                        <Card key={i} className="border-none bg-white shadow-premium rounded-[3rem] overflow-hidden group">
                            <div className="p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                <div className="space-y-1">
                                    <h3 className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors capitalize">{s.name}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{s.doc}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-10">
                                    <div className="space-y-1 text-center lg:text-left">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">IBC Comercial</p>
                                        <p className="text-lg font-black text-slate-900 italic tracking-tight">${new Intl.NumberFormat('es-CO').format(s.social_security!.ibc)}</p>
                                    </div>
                                    <div className="space-y-1 text-center lg:text-left">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Seg. Social (Total)</p>
                                        <p className="text-lg font-black text-indigo-600 italic tracking-tight">${new Intl.NumberFormat('es-CO').format(s.social_security!.employer.total + s.social_security!.employee.total)}</p>
                                    </div>
                                    <div className="space-y-1 text-center lg:text-left">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Parafiscales</p>
                                        <p className="text-lg font-black text-amber-600 italic tracking-tight">${new Intl.NumberFormat('es-CO').format(s.social_security!.parafiscales.total)}</p>
                                    </div>
                                    <div className="px-8 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-center lg:text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aportes del Empleador</p>
                                        <p className="text-2xl font-black text-slate-900 italic tracking-tighter">${new Intl.NumberFormat('es-CO').format(s.social_security!.total_cost)}</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            <div className="p-10 rounded-[3rem] bg-indigo-50/50 border border-indigo-100 flex items-center gap-6">
                <div className="h-16 w-16 rounded-[2rem] bg-white flex items-center justify-center text-indigo-600 shadow-premium">
                    <ShieldCheck className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-black text-indigo-900 italic tracking-tight">Cumplimiento Legal Verificado</h3>
                    <p className="text-sm font-bold text-indigo-600/80 leading-relaxed max-w-2xl">
                        Los cálculos realizados en este tablero siguen estrictamente la normativa colombiana actual (UVT 2026).
                        Las exoneraciones de la Ley 1607/2012 (Salud, SENA e ICBF) se aplican automáticamente para colaboradores que devengan menos de 10 SMLV.
                    </p>
                </div>
            </div>
        </div>
    )
}
