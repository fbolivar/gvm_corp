"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { employeeService } from "@/features/payroll/services/employeeService"
import { Employee, PayrollLoan, PayrollBenefit } from "@/features/payroll/types"
import { CreateLoanModal } from "./CreateLoanModal"
import { CreateBenefitModal } from "./CreateBenefitModal"
import { toast } from "sonner"
import { Card } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import {
    Plus,
    Users,
    DollarSign,
    CheckCircle2,
    Briefcase,
    Loader2,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"

export function PayrollFinanceContent() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [employees, setEmployees] = useState<Employee[]>([])
    const [loans, setLoans] = useState<PayrollLoan[]>([])
    const [benefits, setBenefits] = useState<PayrollBenefit[]>([])
    const [tenantId, setTenantId] = useState("")
    const [loanModalOpen, setLoanModalOpen] = useState(false)
    const [benefitModalOpen, setBenefitModalOpen] = useState(false)

    const loadData = useCallback(async () => {
        try {
            const [empData, loanData, benefitData, tenantRes] = await Promise.all([
                employeeService.getEmployees(supabase),
                supabase.from('payroll_loans').select('*, employee:employees(party:parties(legal_name))'),
                supabase.from('payroll_benefits').select('*, employee:employees(party:parties(legal_name))'),
                supabase.from('user_tenants').select('tenant_id').limit(1).single(),
            ])

            setEmployees(empData)
            setLoans(loanData.data || [])
            setBenefits(benefitData.data || [])
            if (tenantRes.data?.tenant_id) setTenantId(tenantRes.data.tenant_id)
        } catch (err) {
            console.error(err)
            toast.error("Error cargando datos financieros")
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => {
        loadData()
    }, [loadData])

    const totalLoans = loans.reduce((acc, l) => acc + (Number(l.amount_total) - Number(l.amount_paid)), 0)
    const activeBenefitsCount = benefits.filter(b => b.status === 'ACTIVE').length
    const fmt = (n: number) => `$${n.toLocaleString('es-CO')}`

    const employeeOptions = employees
        .filter(e => e.status === 'ACTIVE')
        .map(e => ({
            id: e.id!,
            name: e.party?.legal_name || 'Sin nombre'
        }))

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-xs text-slate-400">Cargando datos financieros...</p>
            </div>
        )
    }

    return (
        <>
            {/* Action buttons */}
            <div className="flex items-center gap-3">
                <Button
                    size="sm"
                    className="h-9 px-4 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs"
                    onClick={() => setLoanModalOpen(true)}
                >
                    <Plus className="h-3.5 w-3.5" /> Nuevo Prestamo
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-4 rounded-xl text-xs"
                    onClick={() => setBenefitModalOpen(true)}
                >
                    <Plus className="h-3.5 w-3.5" /> Estructurar Beneficio
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Cartera de Prestamos', value: fmt(totalLoans), icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Beneficios Activos', value: String(activeBenefitsCount), icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Empleados Registrados', value: String(employees.length), icon: Users, color: 'text-slate-600', bg: 'bg-slate-50' },
                ].map((kpi, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", kpi.bg, kpi.color)}>
                            <kpi.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                            <p className="text-sm font-bold text-slate-900 font-mono tabular-nums">{kpi.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Split View: Loans & Benefits */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* LOANS */}
                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-slate-900">Prestamos Vigentes</h2>
                    <div className="space-y-3">
                        {loans.map((loan) => (
                            <Card key={loan.id} className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-5 flex items-center justify-between max-md:flex-col max-md:items-start gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                            <Users className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-xs font-bold text-slate-900 leading-snug truncate">{(loan as unknown as { employee?: { party?: { legal_name?: string } } }).employee?.party?.legal_name || 'Empleado'}</h3>
                                            <p className="text-[10px] text-slate-400 truncate">{loan.description || 'Prestamo General'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 shrink-0">
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Saldo</p>
                                            <p className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                                                {fmt(Number(loan.amount_total) - Number(loan.amount_paid))}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Progreso</p>
                                            <div className="flex items-center gap-2">
                                                <div className="h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(loan.installments_paid / loan.installment_count) * 100}%` }} />
                                                </div>
                                                <span className="text-[10px] text-slate-500 font-mono">{loan.installments_paid}/{loan.installment_count}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                        {loans.length === 0 && (
                            <Card className="rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
                                <DollarSign className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                                <p className="text-xs text-slate-400">Sin prestamos registrados</p>
                            </Card>
                        )}
                    </div>
                </div>

                {/* BENEFITS */}
                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-slate-900">Auxilios & Beneficios</h2>
                    <div className="space-y-3">
                        {benefits.map((benefit) => (
                            <Card key={benefit.id} className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="p-5 flex items-center justify-between max-md:flex-col max-md:items-start gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                            <Briefcase className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-xs font-bold text-slate-900 leading-snug truncate">{(benefit as unknown as { employee?: { party?: { legal_name?: string } } }).employee?.party?.legal_name || 'Empleado'}</h3>
                                            <p className="text-[10px] text-slate-400 truncate">{benefit.name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 shrink-0">
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Monto Mensual</p>
                                            <p className="text-sm font-bold text-emerald-600 font-mono tabular-nums">
                                                {fmt(Number(benefit.amount))}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                            <span className="text-[10px] font-semibold text-emerald-600 uppercase">{benefit.frequency}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                        {benefits.length === 0 && (
                            <Card className="rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
                                <Briefcase className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                                <p className="text-xs text-slate-400">Sin beneficios registrados</p>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <CreateLoanModal
                isOpen={loanModalOpen}
                onClose={() => setLoanModalOpen(false)}
                employees={employeeOptions}
                tenantId={tenantId}
                onSuccess={loadData}
            />
            <CreateBenefitModal
                isOpen={benefitModalOpen}
                onClose={() => setBenefitModalOpen(false)}
                employees={employeeOptions}
                tenantId={tenantId}
                onSuccess={loadData}
            />
        </>
    )
}
