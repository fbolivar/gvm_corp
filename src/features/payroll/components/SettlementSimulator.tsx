"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
    Calculator,
    Calendar,
    ArrowRight,
    Download,
    AlertCircle,
    TrendingUp,
    ShieldCheck,
    Coins,
    Sparkles,
    FileText,
    ArrowUpRight
} from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { cn } from "@/shared/lib/utils"

export function SettlementSimulator() {
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [salary, setSalary] = useState(1300606) // Salario Mínimo 2024
    const [transportAllowance, setTransportAllowance] = useState(162000)

    const calculateSettlement = () => {
        const days = differenceInDays(new Date(endDate), new Date(startDate)) + 1
        const baseSalary = salary + transportAllowance

        // Simplified Colombian labor law logic
        const severancePay = (baseSalary * days) / 360 // Cesantías
        const severanceInterest = (severancePay * days * 0.12) / 360 // Intereses Cesantías
        const serviceBonus = (baseSalary * days) / 360 // Prima de Servicios
        const vacation = (salary * days) / 720 // Vacaciones

        const total = severancePay + severanceInterest + serviceBonus + vacation

        return {
            days,
            severancePay,
            severanceInterest,
            serviceBonus,
            vacation,
            total
        }
    }

    const results = calculateSettlement()

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(val)

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* 🔧 INPUT SECTION */}
                <Card className="lg:col-span-12 border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden group">
                    <CardHeader className="p-10 border-b border-slate-50 bg-slate-50/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-5">
                                <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm transition-transform group-hover:scale-110 duration-500">
                                    <Calculator className="h-7 w-7" />
                                </div>
                                <div className="space-y-1">
                                    <CardTitle className="text-3xl font-black text-slate-900 tracking-tight italic">Parámetros de Cálculo</CardTitle>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Define las fechas y montos base</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50/50 rounded-full">
                                <Sparkles className="h-3 w-3 text-indigo-500 animate-pulse" />
                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest leading-none">Simulación Activa</span>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-10">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
                            {/* Fecha Inicio */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Fecha de Ingreso</label>
                                <div className="relative group/field">
                                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="h-16 pl-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            {/* Fecha Fin */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Fecha de Retiro</label>
                                <div className="relative group/field">
                                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="h-16 pl-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            {/* Salario Base */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Salario Base (COP)</label>
                                <div className="relative group/field">
                                    <Coins className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                    <Input
                                        type="number"
                                        value={salary}
                                        onChange={(e) => setSalary(Number(e.target.value))}
                                        className="h-16 pl-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Auxilio Transporte */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Aux. Transporte</label>
                                <div className="relative group/field">
                                    <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within/field:text-primary transition-colors" />
                                    <Input
                                        type="number"
                                        value={transportAllowance}
                                        onChange={(e) => setTransportAllowance(Number(e.target.value))}
                                        className="h-16 pl-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus-visible:ring-4 focus-visible:ring-primary/10 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 p-6 rounded-[2rem] bg-indigo-50/30 border border-indigo-100/50 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900 italic tracking-tight">Tiempo Total Calculado</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{results.days} Días de prestación social</p>
                                </div>
                            </div>
                            <Button className="h-12 px-8 rounded-xl bg-slate-900 hover:bg-primary text-white font-black text-[10px] uppercase tracking-widest shadow-active transition-all group/btn">
                                Recalcular Simulación <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 📊 RESULTS DASHBOARD */}
                <Card className="lg:col-span-12 border-none bg-slate-900 shadow-2xl rounded-[2.5rem] overflow-hidden group p-1 origin-top transition-all duration-500">
                    <CardHeader className="p-10 relative overflow-hidden">
                        <Sparkles className="absolute -top-10 -right-10 h-40 w-40 text-white/5 -rotate-12" />
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                            <div>
                                <h3 className="text-xl font-black text-white/60 uppercase tracking-[0.3em] mb-2">Liquidación Estimada</h3>
                                <div className="text-4xl font-black text-white tracking-tight tabular-nums drop-shadow-sm">
                                    {formatCurrency(results.total)}
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <Button variant="outline" className="h-14 px-8 rounded-2xl border-white/10 bg-white/5 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">
                                    <Download className="mr-3 h-5 w-5 text-indigo-400" /> Descargar PDF
                                </Button>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-1 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1 p-1">
                            {/* Cesantías */}
                            <div className="bg-white/5 backdrop-blur-md p-10 rounded-[2rem] border border-white/10 group/item hover:bg-white/10 transition-all">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="h-12 w-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300">
                                        <Coins className="h-6 w-6" />
                                    </div>
                                    <ArrowUpRight className="h-5 w-5 text-white/10 group-hover/item:text-white/40 transition-colors" />
                                </div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Cesantías</p>
                                <p className="text-2xl font-black text-white italic tracking-tight mt-1">{formatCurrency(results.severancePay)}</p>
                            </div>

                            {/* Intereses Cesantías */}
                            <div className="bg-white/5 backdrop-blur-md p-10 rounded-[2rem] border border-white/10 group/item hover:bg-white/10 transition-all">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300">
                                        <TrendingUp className="h-6 w-6" />
                                    </div>
                                    <ArrowUpRight className="h-5 w-5 text-white/10 group-hover/item:text-white/40 transition-colors" />
                                </div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Int. Cesantías</p>
                                <p className="text-2xl font-black text-white italic tracking-tight mt-1">{formatCurrency(results.severanceInterest)}</p>
                            </div>

                            {/* Prima de Servicios */}
                            <div className="bg-white/5 backdrop-blur-md p-10 rounded-[2rem] border border-white/10 group/item hover:bg-white/10 transition-all">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                                        <ShieldCheck className="h-6 w-6" />
                                    </div>
                                    <ArrowUpRight className="h-5 w-5 text-white/10 group-hover/item:text-white/40 transition-colors" />
                                </div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Prima de Servicios</p>
                                <p className="text-2xl font-black text-white italic tracking-tight mt-1">{formatCurrency(results.serviceBonus)}</p>
                            </div>

                            {/* Vacaciones */}
                            <div className="bg-white/5 backdrop-blur-md p-10 rounded-[2rem] border border-white/10 group/item hover:bg-white/10 transition-all">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="h-12 w-12 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-300">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <ArrowUpRight className="h-5 w-5 text-white/10 group-hover/item:text-white/40 transition-colors" />
                                </div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Vacaciones</p>
                                <p className="text-2xl font-black text-white italic tracking-tight mt-1">{formatCurrency(results.vacation)}</p>
                            </div>
                        </div>

                        {/* Legal Disclaim */}
                        <div className="p-10 flex items-start gap-4 text-white/40">
                            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-medium leading-relaxed italic">
                                Este cálculo es una <span className="text-white/60 font-black">simulación informativa</span> basada en las normas laborales vigentes en Colombia. Los valores reales pueden variar según pactos extralegales, deducciones de nómina o novedades específicas del contrato.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
