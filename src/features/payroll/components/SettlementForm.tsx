"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { employeeService } from "@/features/payroll/services/employeeService"
import { financeService } from "@/features/payroll/services/financeService"
import { payrollService } from "@/features/payroll/services/payrollService"
import { treasuryService } from "@/features/treasury/services/treasuryService"
import { TreasuryAccount } from "@/features/treasury/types"
import { Employee, PayrollLoan, PayrollBenefit, PayrollSettlement } from "@/features/payroll/types"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import {
    Loader2,
    Calculator,
    ArrowRight,
    User,
    TrendingDown,
    TrendingUp,
    Eye,
    Landmark,
    ShieldCheck,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/shared/lib/utils"
import { SocialSecurityReport } from "./SocialSecurityReport"
import { EmployerCostReport } from "./EmployerCostReport"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/shared/components/ui/dialog"
import { PaymentSlip } from "./PaymentSlip"

export function SettlementForm() {
    const router = useRouter()
    const supabase = createClient()
    const [employees, setEmployees] = useState<Employee[]>([])
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("")
    const [settlement, setSettlement] = useState<PayrollSettlement | null>(null)
    const [loading, setLoading] = useState(true)
    const [isGenerating, setIsGenerating] = useState(false)
    const [daysWorked, setDaysWorked] = useState<number>(30)
    const [emitToDian, setEmitToDian] = useState(false)
    const [activeLoans, setActiveLoans] = useState<PayrollLoan[]>([])
    const [activeBenefits, setActiveBenefits] = useState<PayrollBenefit[]>([])
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [treasuryAccounts, setTreasuryAccounts] = useState<TreasuryAccount[]>([])
    const [selectedAccountId, setSelectedAccountId] = useState<string>("")
    const [generatePayment, setGeneratePayment] = useState(true)

    useEffect(() => {
        async function loadData() {
            try {
                const [empData, accData] = await Promise.all([
                    employeeService.getEmployees(supabase),
                    treasuryService.getAccounts(supabase)
                ])
                setEmployees(empData)
                setTreasuryAccounts(accData.filter(a => a.type === 'BANK' || a.type === 'CASH'))
                if (accData.length > 0) setSelectedAccountId(accData[0].id!)
            } catch (err) {
                console.error(err)
                toast.error("No se pudieron cargar los datos base")
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [supabase])

    const handleCalculate = async () => {
        const employee = employees.find(e => e.id === selectedEmployeeId)
        if (!employee) return

        setLoading(true)
        try {
            const loans = await financeService.getEmployeeLoans(supabase, employee.id!)
            const benefits = await financeService.getEmployeeBenefits(supabase, employee.id!)

            setActiveLoans(loans)
            setActiveBenefits(benefits)

            const result = payrollService.calculateSettlement(employee, daysWorked, loans, benefits)
            setSettlement(result)
            toast.success("Calculo realizado con exito")
        } catch (err) {
            console.error(err)
            toast.error("Error al obtener datos financieros del colaborador")
        } finally {
            setLoading(false)
        }
    }

    const handleGenerate = async () => {
        if (!settlement) return
        setIsGenerating(true)
        try {
            const tenantId = await employeeService.getTenantId(supabase)
            const doc = await payrollService.createPayrollDocument(supabase, settlement, tenantId)

            const { data: fullDoc } = await supabase
                .from('documents')
                .select('*, party:parties(*)')
                .eq('id', doc.id)
                .single();

            const { accountingService } = await import("@/features/accounting/services/accountingService")
            await accountingService.createEntryFromPayroll(supabase, fullDoc, settlement)
            toast.success("Asiento contable generado automaticamente")

            if (emitToDian) {
                const { dianService } = await import("@/features/dian/services/dianService")
                await dianService.emitDocument(supabase, doc.id)
                toast.success("Nomina emitida y aceptada por la DIAN")
            }

            if (generatePayment && selectedAccountId) {
                const employee = employees.find(e => e.id === selectedEmployeeId);
                await treasuryService.createPayrollPayment(supabase, settlement, employee, selectedAccountId);
                toast.success("Pago registrado en Tesoreria");
            }

            router.push('/payroll/employees');
        } catch (err: unknown) {
            const error = err as { message?: string }
            console.error(err)
            toast.error(error.message || "No se pudo generar la nomina")
        } finally {
            setIsGenerating(false)
        }
    }

    const fmt = (n: number) => `$${new Intl.NumberFormat('es-CO').format(Math.round(n))}`

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-xs text-slate-400">Preparando motor de calculo...</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Configuration Sidebar */}
            <Card className="lg:col-span-4 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <CardHeader className="p-5 pb-4 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900">Parametros</CardTitle>
                    <p className="text-xs text-slate-400 mt-0.5">Configuracion del periodo</p>
                </CardHeader>
                <CardContent className="p-5 space-y-5">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Colaborador</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                <select
                                    className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all appearance-none"
                                    value={selectedEmployeeId}
                                    onChange={(e) => {
                                        setSelectedEmployeeId(e.target.value)
                                        setSettlement(null)
                                    }}
                                >
                                    <option value="">Seleccione un colaborador...</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.party?.legal_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fuente de Pago</Label>
                            <div className="relative">
                                <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                <select
                                    className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all appearance-none"
                                    value={selectedAccountId}
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                    disabled={!generatePayment}
                                >
                                    <option value="">Seleccione cuenta...</option>
                                    {treasuryAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name} ({fmt(acc.balance ?? 0)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                            <input
                                type="checkbox"
                                id="genPay"
                                checked={generatePayment}
                                onChange={(e) => setGeneratePayment(e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <Label htmlFor="genPay" className="text-xs text-indigo-700 cursor-pointer">Registrar pago en Tesoreria</Label>
                        </div>
                    </div>

                    <Button
                        className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs gap-2"
                        disabled={!selectedEmployeeId}
                        onClick={handleCalculate}
                    >
                        <Calculator className="h-3.5 w-3.5" />
                        Calcular Valores
                    </Button>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2">
                        <ShieldCheck className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                            Motor de calculo actualizado segun Resoluciones DIAN 2026.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Main Results View */}
            <Card className="lg:col-span-8 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <CardHeader className="p-5 pb-4 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold text-slate-900">Resumen de Liquidacion</CardTitle>
                        <p className="text-xs text-slate-400 mt-0.5">Detalle de haberes y descuentos</p>
                    </div>
                    {settlement && (
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 rounded-lg text-xs gap-1.5"
                                onClick={() => setIsPreviewOpen(true)}
                            >
                                <Eye className="h-3.5 w-3.5" /> Vista Previa
                            </Button>
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                <input
                                    type="checkbox"
                                    id="emitDian"
                                    checked={emitToDian}
                                    onChange={(e) => setEmitToDian(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <Label htmlFor="emitDian" className="text-[10px] text-slate-500 cursor-pointer">Emitir DIAN</Label>
                            </div>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    {settlement ? (
                        <div className="animate-in fade-in duration-500">
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Earnings */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                            <TrendingUp className="h-3.5 w-3.5" />
                                        </div>
                                        <h3 className="text-xs font-bold text-emerald-600">Devengados</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {settlement.concepts.filter(c => c.type === 'EARNING').map((c, i) => (
                                            <div key={i} className="flex justify-between items-center bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900">{c.name}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{c.description}</p>
                                                </div>
                                                <span className="text-xs font-bold text-emerald-600 font-mono tabular-nums shrink-0 ml-3">
                                                    +{fmt(c.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Deductions */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-7 w-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                                            <TrendingDown className="h-3.5 w-3.5" />
                                        </div>
                                        <h3 className="text-xs font-bold text-rose-600">Deducciones</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {settlement.concepts.filter(c => c.type === 'DEDUCTION').map((c, i) => (
                                            <div key={i} className="flex justify-between items-center bg-rose-50/50 border border-rose-100 p-3 rounded-xl">
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900">{c.name}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{c.description}</p>
                                                </div>
                                                <span className="text-xs font-bold text-rose-600 font-mono tabular-nums shrink-0 ml-3">
                                                    -{fmt(c.amount)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {settlement.social_security && (
                                <div className="px-5 py-5 border-t border-slate-100 space-y-5">
                                    <SocialSecurityReport summary={settlement.social_security} />
                                    {settlement.provisions && (
                                        <EmployerCostReport ss={settlement.social_security} provisions={settlement.provisions} />
                                    )}
                                </div>
                            )}

                            {/* Net Pay Footer */}
                            <div className="p-5 pt-0">
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="text-center md:text-left">
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Neto a Pagar</p>
                                        <div className="flex items-baseline gap-2 mt-1">
                                            <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                                                {fmt(settlement.net_pay)}
                                            </span>
                                            <span className="text-xs text-slate-400">COP</span>
                                        </div>
                                    </div>

                                    <Button
                                        className={cn(
                                            "h-9 px-6 rounded-xl text-xs gap-2",
                                            emitToDian ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"
                                        )}
                                        onClick={handleGenerate}
                                        disabled={isGenerating}
                                    >
                                        {isGenerating ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <>
                                                {emitToDian ? 'Emitir Ahora' : 'Generar Borrador'}
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
                                <Calculator className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Esperando parametros</h3>
                                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                                    Selecciona un colaborador y define los dias trabajados para visualizar la liquidacion.
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-5xl bg-transparent border-none shadow-none p-0 overflow-visible">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Vista Previa de Desprendible</DialogTitle>
                    </DialogHeader>
                    {settlement && employees.find(e => e.id === selectedEmployeeId) && (
                        <PaymentSlip
                            document={{
                                number: "PRE-001",
                                issue_date: new Date().toISOString(),
                                lines: settlement.concepts.map(c => ({
                                    description: c.name,
                                    unit_price: c.type === 'EARNING' ? c.amount : -c.amount,
                                    line_total: c.type === 'EARNING' ? c.amount : -c.amount
                                }))
                            }}
                            employee={employees.find(e => e.id === selectedEmployeeId)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
