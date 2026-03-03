"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { employeeService } from "@/features/payroll/services/employeeService"
import { payrollService } from "@/features/payroll/services/payrollService"
import { Employee } from "@/features/payroll/types"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { Input } from "@/shared/components/ui/input"
import {
    Loader2,
    ChevronLeft,
    Calculator,
    User,
    Calendar,
    FileWarning,
    TrendingDown,
    Download
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function TerminationPage() {
    const supabase = createClient()
    const [employees, setEmployees] = useState<Employee[]>([])
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("")
    const [loading, setLoading] = useState(true)
    const [isCalculating, setIsCalculating] = useState(false)
    const [result, setResult] = useState<any>(null)

    const [dates, setDates] = useState({
        endDate: new Date().toISOString().split('T')[0],
        lastPrima: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Default Jan 1st
        lastCesantias: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        lastVacations: new Date().toISOString().split('T')[0] // Should be dynamic based on employee entry
    })

    useEffect(() => {
        async function loadEmployees() {
            try {
                const data = await employeeService.getEmployees(supabase)
                setEmployees(data)
            } catch (err) {
                console.error(err)
                toast.error("Error al cargar colaboradores")
            } finally {
                setLoading(false)
            }
        }
        loadEmployees()
    }, [supabase])

    const handleCalculate = () => {
        const emp = employees.find(e => e.id === selectedEmployeeId)
        if (!emp) {
            toast.error("Seleccione un colaborador")
            return
        }

        setIsCalculating(true)
        try {
            const final = payrollService.calculateFinalSettlement(
                emp,
                dates.endDate,
                dates.lastPrima,
                dates.lastVacations,
                dates.lastCesantias
            )
            setResult(final)
            toast.success("Liquidación estimada calculada")
        } catch (err) {
            console.error(err)
            toast.error("Error en el cálculo")
        } finally {
            setIsCalculating(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preparando simulador de liquidación...</p>
            </div>
        )
    }

    return (
        <div className="p-10 space-y-10 max-w-[1400px] mx-auto animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <Link href="/payroll" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors mb-4">
                        <ChevronLeft className="h-4 w-4" /> Volver a Nómina
                    </Link>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Liquidación <span className="text-rose-600">Definitiva</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Cálculo de Prestaciones Sociales por Fin de Contrato</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Configuration Sidebar */}
                <Card className="lg:col-span-4 border-none shadow-premium bg-white rounded-[3rem] p-4">
                    <CardHeader className="p-10 pb-0">
                        <CardTitle className="text-xl font-black italic tracking-tight text-slate-900">Estructura de Retiro</CardTitle>
                    </CardHeader>
                    <CardContent className="p-10 space-y-8">
                        {/* Employee Select */}
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Colaborador</Label>
                            <div className="relative group/input">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within/input:text-primary transition-colors" />
                                <select
                                    className="w-full h-14 pl-12 pr-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 appearance-none cursor-pointer italic"
                                    value={selectedEmployeeId}
                                    onChange={e => setSelectedEmployeeId(e.target.value)}
                                >
                                    <option value="">Seleccione...</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>{e.party?.legal_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Dates Grid */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Fecha de Retiro</Label>
                                <Input
                                    type="date"
                                    className="h-14 bg-slate-50 border-none rounded-2xl font-bold"
                                    value={dates.endDate}
                                    onChange={e => setDates({ ...dates, endDate: e.target.value })}
                                />
                            </div>

                            <div className="p-6 rounded-[2rem] bg-amber-50/50 border border-amber-100 space-y-6">
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                                    <FileWarning className="h-4 w-4" /> Últimas Fechas de Pago
                                </p>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <Label className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Última Prima</Label>
                                        <Input type="date" className="h-10 bg-white border-slate-100 rounded-xl text-xs font-bold" value={dates.lastPrima} onChange={e => setDates({ ...dates, lastPrima: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Últimas Cesantías</Label>
                                        <Input type="date" className="h-10 bg-white border-slate-100 rounded-xl text-xs font-bold" value={dates.lastCesantias} onChange={e => setDates({ ...dates, lastCesantias: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">Últimas Vacaciones</Label>
                                        <Input type="date" className="h-10 bg-white border-slate-100 rounded-xl text-xs font-bold" value={dates.lastVacations} onChange={e => setDates({ ...dates, lastVacations: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleCalculate}
                            disabled={isCalculating || !selectedEmployeeId}
                            className="w-full h-18 rounded-[2rem] bg-slate-900 hover:bg-primary text-white font-black italic tracking-tight text-xl transition-all shadow-xl active:scale-95 flex items-center gap-3"
                        >
                            {isCalculating ? <Loader2 className="h-6 w-6 animate-spin" /> : (
                                <>
                                    CALCULAR RETIRO <Calculator className="h-5 w-5" />
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Results Area */}
                <div className="lg:col-span-8 flex flex-col gap-10">
                    {result ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Details Card */}
                                <Card className="border-none shadow-premium bg-white rounded-[3rem] p-10 space-y-8">
                                    <h3 className="text-xl font-black italic tracking-tight text-slate-900">Prestaciones Adeudadas</h3>
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center group">
                                            <div>
                                                <p className="text-sm font-black text-slate-900">Prima de Servicios</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Días: {result.days.prima}</p>
                                            </div>
                                            <span className="text-xl font-black text-slate-900 italic">${new Intl.NumberFormat('es-CO').format(Math.round(result.amounts.prima))}</span>
                                        </div>
                                        <div className="flex justify-between items-center group">
                                            <div>
                                                <p className="text-sm font-black text-slate-900">Cesantías</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Días: {result.days.cesantias}</p>
                                            </div>
                                            <span className="text-xl font-black text-slate-900 italic">${new Intl.NumberFormat('es-CO').format(Math.round(result.amounts.cesantias))}</span>
                                        </div>
                                        <div className="flex justify-between items-center group">
                                            <div>
                                                <p className="text-sm font-black text-slate-900">Intereses Cesantías</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">12% proporcional</p>
                                            </div>
                                            <span className="text-xl font-black text-slate-900 italic">${new Intl.NumberFormat('es-CO').format(Math.round(result.amounts.intereses))}</span>
                                        </div>
                                        <div className="flex justify-between items-center group">
                                            <div>
                                                <p className="text-sm font-black text-slate-900">Vacaciones</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Días: {result.days.vacaciones}</p>
                                            </div>
                                            <span className="text-xl font-black text-slate-900 italic">${new Intl.NumberFormat('es-CO').format(Math.round(result.amounts.vacaciones))}</span>
                                        </div>
                                    </div>
                                </Card>

                                {/* Total Card */}
                                <div className="rounded-[2.5rem] bg-slate-900 p-10 text-white flex flex-col justify-center items-center text-center gap-6 shadow-active relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl animate-pulse" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">Gran Total Prestacional</p>
                                    <div className="space-y-1">
                                        <p className="text-4xl font-black tracking-tighter text-white">
                                            ${new Intl.NumberFormat('es-CO').format(Math.round(result.amounts.total))}
                                        </p>
                                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Pesos Colombianos</p>
                                    </div>
                                    <Button className="w-full h-12 rounded-2xl bg-white text-slate-900 hover:bg-primary hover:text-white font-black tracking-tight text-base transition-all shadow-xl flex items-center gap-3 mt-4">
                                        DESCARGAR PDF <Download className="h-6 w-6" />
                                    </Button>
                                </div>
                            </div>

                            <div className="p-8 rounded-[3rem] bg-indigo-50 border border-indigo-100 flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 shrink-0">
                                    <FileWarning className="h-8 w-8" />
                                </div>
                                <p className="text-xs font-bold text-indigo-900 leading-relaxed italic">
                                    Esta es una simulación basada en los conceptos legales mínimos. No incluye indemnizaciones por despido sin justa causa ni descuentos por préstamos pendientes.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-40 text-center gap-10 opacity-30">
                            <div className="h-40 w-40 rounded-[4rem] bg-slate-50 flex items-center justify-center text-slate-100 shadow-inner group overflow-hidden border border-slate-200">
                                <TrendingDown className="h-20 w-20 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-1000" />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-3xl font-black text-slate-900 italic tracking-tight">Módulo de Retiros</h3>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] max-w-sm mx-auto leading-relaxed">
                                    Defina los parámetros en el panel lateral para generar el simulador de liquidación definitiva.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
