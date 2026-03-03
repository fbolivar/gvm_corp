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
    FileText,
    ChevronLeft,
    Sparkles,
    ShieldCheck,
    ArrowRight,
    Plus,
    User,
    Calendar,
    TrendingDown,
    TrendingUp,
    Eye,
    Landmark,
    Banknote
} from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
            toast.success("Cálculo realizado con éxito")
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

            // Fetch full doc with party for accounting service
            const { data: fullDoc } = await supabase
                .from('documents')
                .select('*, party:parties(*)')
                .eq('id', doc.id)
                .single();

            // 1. Accounting Integration
            const { accountingService } = await import("@/features/accounting/services/accountingService")
            await accountingService.createEntryFromPayroll(supabase, fullDoc, settlement)
            toast.success("Asiento contable generado automáticamente")

            // 2. DIAN Integration (Optional)
            if (emitToDian) {
                const { dianService } = await import("@/features/dian/services/dianService")
                await dianService.emitDocument(supabase, doc.id)
                toast.success("¡Nómina Emitida y aceptada por la DIAN!")
            } else {
            }

            // 3. Treasury Integration (NEW: ARMORING PAYMENTS)
            if (generatePayment && selectedAccountId) {
                const employee = employees.find(e => e.id === selectedEmployeeId);
                await treasuryService.createPayrollPayment(supabase, settlement, employee, selectedAccountId);
                toast.success("Protocolo de pago inyectado en Tesorería");
            }

            router.push('/payroll/employees');
        } catch (err: any) {
            console.error(err)
            toast.error(err.message || "No se pudo generar la nómina")
        } finally {
            setIsGenerating(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preparando motor de cálculo...</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Configuration Sidebar */}
            <Card className="lg:col-span-4 border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden group">
                <CardHeader className="p-10 pb-6 border-b border-slate-50">
                    <CardTitle className="text-xl font-black text-slate-900 tracking-tight italic">Parámetros</CardTitle>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configuración del periodo</p>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Colaborador</Label>
                            <div className="relative group">
                                <User className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                <select
                                    className="w-full h-14 pl-14 pr-6 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
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

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Fuente de Pago (Tesorería)</Label>
                            <div className="relative group">
                                <Landmark className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                <select
                                    className="w-full h-14 pl-14 pr-6 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                                    value={selectedAccountId}
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                    disabled={!generatePayment}
                                >
                                    <option value="">Seleccione cuenta...</option>
                                    {treasuryAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name} (${acc.balance?.toLocaleString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100">
                            <input
                                type="checkbox"
                                id="genPay"
                                checked={generatePayment}
                                onChange={(e) => setGeneratePayment(e.target.checked)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <Label htmlFor="genPay" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 cursor-pointer italic">Blindar Pago en Tesorería</Label>
                        </div>
                    </div>

                    <Button
                        className="w-full h-16 rounded-[2rem] bg-slate-900 hover:bg-rose-600 text-white font-black italic tracking-tight text-xl transition-all shadow-active active:scale-95 group flex items-center justify-center gap-3"
                        disabled={!selectedEmployeeId}
                        onClick={handleCalculate}
                    >
                        CALCULAR VALORES <Calculator className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                    </Button>

                    <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0" />
                        <p className="text-[10px] font-bold text-indigo-600 leading-tight italic">
                            Motor de cálculo actualizado según Resoluciones DIAN 2026.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Main Results View */}
            <Card className="lg:col-span-8 border-none bg-white shadow-premium rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-10 pb-6 border-b border-slate-50 flex flex-row items-center justify-between bg-slate-50/50">
                    <div className="space-y-1">
                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tight italic">Resumen de Liquidación</CardTitle>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detalle técnico de haberes y descuentos</p>
                    </div>
                    {settlement && (
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-full h-10 px-6 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-white hover:shadow-sm flex items-center gap-2"
                                onClick={() => setIsPreviewOpen(true)}
                            >
                                <Eye className="h-4 w-4" /> Vista Previa
                            </Button>
                            <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-full shadow-sm border border-slate-100">
                                <input
                                    type="checkbox"
                                    id="emitDian"
                                    checked={emitToDian}
                                    onChange={(e) => setEmitToDian(e.target.checked)}
                                    className="w-4 h-4 rounded-full border-slate-300 text-primary focus:ring-primary"
                                />
                                <Label htmlFor="emitDian" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 cursor-pointer">Emitir Automáticamente</Label>
                            </div>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    {settlement ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-700">
                            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                                {/* Earnings Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm border-none">
                                            <TrendingUp className="h-5 w-5" />
                                        </div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600">Devengados</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {settlement.concepts.filter(c => c.type === 'EARNING').map((c, i) => (
                                            <div key={i} className="flex justify-between items-center bg-emerald-50/30 border border-emerald-50 p-5 rounded-[2rem] hover:scale-[1.02] transition-all group">
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">{c.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{c.description}</p>
                                                </div>
                                                <span className="text-lg font-black text-emerald-600 tracking-tighter">
                                                    + ${new Intl.NumberFormat('es-CO').format(Math.round(c.amount))}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Deductions Section */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-sm border-none">
                                            <TrendingDown className="h-5 w-5" />
                                        </div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-rose-600">Deducciones</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {settlement.concepts.filter(c => c.type === 'DEDUCTION').map((c, i) => (
                                            <div key={i} className="flex justify-between items-center bg-rose-50/30 border border-rose-50 p-5 rounded-[2rem] hover:scale-[1.02] transition-all group">
                                                <div>
                                                    <p className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">{c.name}</p>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{c.description}</p>
                                                </div>
                                                <span className="text-lg font-black text-rose-600 tracking-tighter">
                                                    - ${new Intl.NumberFormat('es-CO').format(Math.round(c.amount))}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {settlement.social_security && (
                                <div className="px-10 py-10 border-t border-slate-50 bg-slate-50/20 space-y-10">
                                    <SocialSecurityReport summary={settlement.social_security} />
                                    {settlement.provisions && (
                                        <EmployerCostReport ss={settlement.social_security} provisions={settlement.provisions} />
                                    )}
                                </div>
                            )}

                            {/* Summation Footer */}
                            <div className="p-10 pt-0">
                                <div className="bg-slate-900 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-10 shadow-active group relative overflow-hidden">
                                    <Sparkles className="absolute -bottom-10 -right-10 h-60 w-60 text-white/5 rotate-12" />

                                    <div className="space-y-2 text-center md:text-left relative z-10">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Total Neto a Pagar</p>
                                        <div className="flex items-baseline gap-4">
                                            <span className="text-4xl font-black text-white tracking-tight leading-none">
                                                ${new Intl.NumberFormat('es-CO').format(Math.round(settlement.net_pay))}
                                            </span>
                                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">COP</span>
                                        </div>
                                    </div>

                                    <Button
                                        className={cn(
                                            "h-18 px-12 rounded-[2.5rem] font-black italic tracking-tight text-xl transition-all shadow-xl group/btn active:scale-95 relative z-10",
                                            emitToDian ? "bg-white text-emerald-600 hover:bg-emerald-50" : "bg-white text-slate-900 hover:bg-primary hover:text-white"
                                        )}
                                        onClick={handleGenerate}
                                        disabled={isGenerating}
                                    >
                                        {isGenerating ? (
                                            <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                {emitToDian ? 'EMITIR AHORA' : 'GENERAR BORRADOR'}
                                                <ArrowRight className="h-6 w-6 group-hover/btn:translate-x-2 transition-transform" />
                                            </div>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-40 text-center gap-6">
                            <div className="h-24 w-24 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-200 shadow-inner group overflow-hidden">
                                <Calculator className="h-12 w-12 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-900 italic tracking-tight">Esperando parámetros</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] max-w-xs mx-auto">
                                    Selecciona un colaborador y define los días trabajados para visualizar la liquidación.
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
