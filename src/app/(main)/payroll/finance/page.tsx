"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { financeService } from "@/features/payroll/services/financeService"
import { employeeService } from "@/features/payroll/services/employeeService"
import { Employee, PayrollLoan, PayrollBenefit } from "@/features/payroll/types"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import {
    Wallet,
    Plus,
    Users,
    TrendingDown,
    TrendingUp,
    Clock,
    DollarSign,
    ChevronLeft,
    CheckCircle2,
    Briefcase
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function PayrollFinancePage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loans, setLoans] = useState<PayrollLoan[]>([])
    const [benefits, setBenefits] = useState<PayrollBenefit[]>([])

    useEffect(() => {
        async function loadData() {
            try {
                const [empData, loanData, benefitData] = await Promise.all([
                    employeeService.getEmployees(supabase),
                    supabase.from('payroll_loans').select('*, employee:employees(party:parties(legal_name))'),
                    supabase.from('payroll_benefits').select('*, employee:employees(party:parties(legal_name))')
                ])

                setEmployees(empData)
                setLoans(loanData.data || [])
                setBenefits(benefitData.data || [])
            } catch (err) {
                console.error(err)
                toast.error("Error cargando datos financieros")
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [supabase])

    const totalLoans = loans.reduce((acc, l) => acc + (Number(l.amount_total) - Number(l.amount_paid)), 0)
    const activeBenefitsCount = benefits.filter(b => b.status === 'ACTIVE').length

    return (
        <div className="p-10 space-y-12 max-w-[1600px] mx-auto animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="space-y-2">
                    <Link href="/payroll" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors mb-4">
                        <ChevronLeft className="h-4 w-4" /> Volver a Nómina
                    </Link>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Módulo <span className="text-indigo-600">Financiero HCM</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Libranzas, Préstamos y Auxilios Extralegales</p>
                </div>

                <div className="flex items-center gap-4">
                    <Button className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-xl transition-all hover:scale-105 flex items-center gap-3">
                        <Plus className="h-6 w-6" /> NUEVO PRÉSTAMO
                    </Button>
                    <Button variant="outline" className="h-14 px-8 rounded-2xl bg-white border-none shadow-premium text-slate-500 font-black hover:bg-slate-50 transition-all">
                        ESTRUCTURAR BENEFICIO
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="rounded-[2.5rem] border-none bg-white shadow-premium p-8 flex items-center justify-between group hover:bg-slate-900 transition-all duration-500">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white/40">Cartera de Préstamos</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-white">${totalLoans.toLocaleString('es-CO')}</p>
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                        <DollarSign className="h-8 w-8" />
                    </div>
                </Card>

                <Card className="rounded-[2.5rem] border-none bg-white shadow-premium p-8 flex items-center justify-between group hover:bg-slate-900 transition-all duration-500">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white/40">Beneficios Activos</p>
                        <p className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-white">{activeBenefitsCount}</p>
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <Briefcase className="h-8 w-8" />
                    </div>
                </Card>

                <Card className="rounded-[2.5rem] border-none bg-indigo-600 shadow-premium p-8 flex items-center justify-between text-white overflow-hidden relative">
                    <Wallet className="absolute -bottom-10 -right-10 h-40 w-40 text-white/10 rotate-12" />
                    <div className="space-y-2 relative z-10">
                        <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Ahorro en Retención</p>
                        <p className="text-2xl font-black tracking-tight">OPTIMIZADO</p>
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-white/10 flex items-center justify-center relative z-10">
                        <TrendingUp className="h-8 w-8" />
                    </div>
                </Card>
            </div>

            {/* Split View: Loans & Benefits */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {/* LOANS LIST */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-xl font-black text-slate-400 uppercase tracking-[0.2em] italic flex items-center gap-3">
                            <Clock className="h-5 w-5" /> Préstamos Vigentes
                        </h2>
                        <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full uppercase">Libranzas DIAN</span>
                    </div>

                    <div className="space-y-4">
                        {loans.map((loan) => (
                            <Card key={loan.id} className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden group hover:scale-[1.01] transition-all">
                                <div className="p-8 flex items-center justify-between max-md:flex-col max-md:items-start gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                            <Users className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-black text-slate-900 italic tracking-tight uppercase">{(loan as any).employee?.party?.legal_name || 'Empleado'}</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{loan.description || 'Préstamo General'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-12">
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo Pendiente</p>
                                            <p className="text-xl font-black text-slate-900 italic tracking-tighter">
                                                ${(Number(loan.amount_total) - Number(loan.amount_paid)).toLocaleString('es-CO')}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Progreso</p>
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(loan.installments_paid / loan.installment_count) * 100}%` }} />
                                                </div>
                                                <span className="text-[10px] font-black text-slate-900 italic">{loan.installments_paid}/{loan.installment_count}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* BENEFITS LIST */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-xl font-black text-slate-400 uppercase tracking-[0.2em] italic flex items-center gap-3">
                            <TrendingUp className="h-5 w-5" /> Auxilios & Beneficios
                        </h2>
                        <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase">No Constitutivos</span>
                    </div>

                    <div className="space-y-4">
                        {benefits.map((benefit) => (
                            <Card key={benefit.id} className="border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden group hover:scale-[1.01] transition-all">
                                <div className="p-8 flex items-center justify-between max-md:flex-col max-md:items-start gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                                            <Briefcase className="h-6 w-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="font-black text-slate-900 italic tracking-tight uppercase">{(benefit as any).employee?.party?.legal_name || 'Empleado'}</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{benefit.name}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-12">
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto Mensual</p>
                                            <p className="text-xl font-black text-emerald-600 italic tracking-tighter">
                                                ${Number(benefit.amount).toLocaleString('es-CO')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{benefit.frequency}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
