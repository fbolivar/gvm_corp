import { createClient } from "@/lib/supabase/server"
import { employeeService } from "@/features/payroll/services/employeeService"
import { financeService } from "@/features/payroll/services/financeService"
import { overtimeService } from "@/features/payroll/services/overtimeService"
import { redirect } from "next/navigation"
import { AttendanceWidget } from "@/features/payroll/components/AttendanceWidget"
import { PayrollSlipButton } from "@/features/payroll/components/PayrollSlipButton"
import { OvertimePanel } from "@/features/payroll/components/OvertimePanel"
import { CertificateButtons } from "@/features/payroll/components/CertificateButtons"
import { AbsenceRequestForm } from "@/features/payroll/components/AbsenceRequestForm"
import {
    Wallet,
    FileText,
    TrendingUp,
    BadgeInfo,
} from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"

export default async function MyPayrollPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    const employee = await employeeService.getEmployeeByUserId(supabase, user.id)

    if (!employee) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-6">
                <div className="h-16 w-16 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
                    <BadgeInfo className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Portal No Vinculado</h1>
                    <p className="text-slate-400 text-sm max-w-md">Tu cuenta de usuario no está vinculada a un registro de empleado. Contacta a RRHH para habilitar tu autoservicio.</p>
                </div>
            </div>
        )
    }

    const [loans, benefits, documents, overtimeRequests] = await Promise.all([
        financeService.getEmployeeLoans(supabase, employee.id!),
        financeService.getEmployeeBenefits(supabase, employee.id!),
        supabase.from('documents').select('id, number, issue_date, total, status').eq('party_id', employee.party_id).eq('doc_type', 'PAYROLL').order('issue_date', { ascending: false }).limit(5),
        overtimeService.getMyOvertimeRequests(supabase, employee.id!).catch(() => []),
    ])

    return (
        <div className="space-y-8 pb-16 animate-in fade-in duration-500 px-4 md:px-0">
            {/* HEADER */}
            <div className="bg-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-1.5 w-8 bg-emerald-500 rounded-full" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-emerald-400">Portal de Empleado</span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            Hola, <span className="text-slate-400">{employee.party?.legal_name.split(' ')[0]}</span>
                        </h1>
                        <div className="flex items-center gap-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Gestión de Nómina &amp; Beneficios</p>
                            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                                <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Contrato Activo</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <div className="h-10 px-6 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-center items-end hover:bg-white/10 transition-colors">
                            <span className="text-xs uppercase tracking-wide text-slate-400 font-medium">Sueldo Básico</span>
                            <span className="text-sm font-bold tracking-tight">${Number(employee.salary).toLocaleString('es-CO')}</span>
                        </div>
                        <div className="h-10 px-6 rounded-xl bg-indigo-500/20 border border-indigo-500/20 flex flex-col justify-center items-end hover:bg-indigo-500/30 transition-colors">
                            <span className="text-xs uppercase tracking-wide text-indigo-400 font-medium">Tipo Contrato</span>
                            <span className="text-sm font-bold tracking-tight uppercase text-indigo-100">{employee.contract_type}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN LAYOUT: 60% content + 40% sidebar */}
            <div className="flex flex-col lg:flex-row gap-8">
                {/* MAIN CONTENT COLUMN */}
                <div className="space-y-8" style={{ flex: '0 0 58%' }}>

                    {/* PAYROLL STUBS SECTION */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <h2 className="text-lg font-bold tracking-tight text-slate-900">Desprendibles</h2>
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tus últimos 5 pagos certificados</p>
                            </div>
                        </div>

                        <div className="grid gap-3">
                            {documents.data?.map((doc) => (
                                <div key={doc.id} className="group bg-white rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 hover:border-slate-200">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shrink-0">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h3 className="text-sm font-bold text-slate-900 tracking-tight">{doc.number}</h3>
                                                <Badge variant="outline" className="text-xs font-semibold px-2 py-0 border-slate-200">PAYROLL</Badge>
                                            </div>
                                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{doc.issue_date}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between w-full md:w-auto gap-6">
                                        <div className="text-right">
                                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-0.5">Neto Liquidado</p>
                                            <p className="text-base font-bold text-emerald-600 tracking-tight">${(Number((doc as any).total) || 0).toLocaleString('es-CO')}</p>
                                        </div>
                                        <PayrollSlipButton
                                            docNumber={doc.number || ''}
                                            issueDate={doc.issue_date || ''}
                                            netAmount={Number((doc as any).total) || 0}
                                            employeeName={employee.party?.legal_name || ''}
                                            salary={Number(employee.salary) || 0}
                                            contractType={employee.contract_type || ''}
                                            companyName={'GVM Corp'}
                                        />
                                    </div>
                                </div>
                            ))}
                            {(!documents.data || documents.data.length === 0) && (
                                <div className="py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3">
                                    <BadgeInfo className="h-8 w-8 text-slate-300" />
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">No se han emitido desprendibles electrónicos</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* BENEFITS SECTION */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-slate-100" />
                            <h2 className="text-xs font-semibold text-indigo-500 uppercase tracking-wide shrink-0 px-3">Auxilios &amp; Beneficios</h2>
                            <div className="h-px flex-1 bg-slate-100" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {benefits.map((benefit) => (
                                <div key={benefit.id} className="relative group bg-indigo-50/40 rounded-2xl p-6 overflow-hidden border border-indigo-100/60 transition-all hover:bg-indigo-50/70">
                                    <div className="absolute -top-3 -right-3 p-6 opacity-[0.06] text-indigo-600">
                                        <TrendingUp className="h-16 w-16" />
                                    </div>
                                    <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                                        <div className="flex justify-between items-start">
                                            <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                                                <TrendingUp className="h-5 w-5" />
                                            </div>
                                            <Badge className="bg-white text-indigo-600 border-none font-semibold text-xs px-2 py-0.5 rounded-full uppercase tracking-wide shadow-sm">
                                                {benefit.frequency}
                                            </Badge>
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-sm font-bold text-slate-900 tracking-tight">{benefit.name}</h4>
                                            <p className="text-lg font-bold text-indigo-700 tracking-tight">${Number(benefit.amount).toLocaleString('es-CO')}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {benefits.length === 0 && (
                                <div className="md:col-span-2 py-10 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3">
                                    <TrendingUp className="h-7 w-7 text-slate-300" />
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Sin auxilios o beneficios activos</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* SIDEBAR COLUMN */}
                <aside className="min-w-0 space-y-6" style={{ flex: '1 1 0%' }}>
                    {/* ATTENDANCE WIDGET */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <AttendanceWidget employeeId={employee.id!} tenantId={employee.tenant_id || ''} />
                    </div>

                    {/* FINANCIAL HEALTH / LOANS */}
                    <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-[0.05] pointer-events-none">
                            <Wallet className="h-20 w-20" />
                        </div>

                        <div className="relative z-10 space-y-5">
                            <div className="space-y-0.5">
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-indigo-400">Salud Financiera</h3>
                                <p className="text-sm font-bold text-white">Prestamos &amp; Libranzas</p>
                            </div>

                            <div className="space-y-5">
                                {loans.map(loan => (
                                    <div key={loan.id} className="space-y-2">
                                        <div className="flex justify-between items-end gap-2">
                                            <div className="space-y-0.5 min-w-0">
                                                <p className="text-sm font-semibold uppercase tracking-tight truncate">{loan.description || 'Credito Libranza'}</p>
                                                <p className="text-xs font-medium text-indigo-400 uppercase tracking-wide">Saldo Pendiente</p>
                                            </div>
                                            <p className="text-sm font-bold tracking-tight text-indigo-100 shrink-0">${(Number(loan.amount_total) - Number(loan.amount_paid)).toLocaleString('es-CO')}</p>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-700"
                                                style={{ width: `${(loan.installments_paid / loan.installment_count) * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs font-medium uppercase tracking-wide text-slate-500">
                                            <span>Progreso</span>
                                            <span className="text-indigo-400 font-semibold">{Math.round((loan.installments_paid / loan.installment_count) * 100)}%</span>
                                        </div>
                                    </div>
                                ))}
                                {loans.length === 0 && (
                                    <div className="py-6 text-center space-y-3 bg-white/5 rounded-xl border border-white/5">
                                        <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center mx-auto">
                                            <Wallet className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Sin obligaciones financieras activas</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* OVERTIME REQUESTS */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-500">Horas Extra</h3>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mt-0.5">Solicita y sigue tus HE</p>
                        </div>
                        <OvertimePanel
                            employeeId={employee.id!}
                            salary={Number(employee.salary)}
                            tenantId={employee.tenant_id || ''}
                            requests={overtimeRequests}
                        />
                    </div>

                    {/* AUSENCIAS */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-500">Vacaciones &amp; Ausencias</h3>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mt-0.5">Solicita permisos y ausencias</p>
                        </div>
                        <AbsenceRequestForm />
                    </div>

                    {/* QUICK CERTIFICATES */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <div className="mb-4">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Certificados</h3>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400 mt-0.5">Descarga tus certificados laborales</p>
                        </div>
                        <CertificateButtons
                            data={{
                                employeeName:      employee.party?.legal_name ?? '',
                                employeeDoc:       (employee.party as { doc_number?: string } | undefined)?.doc_number ?? '',
                                employeeDocType:   (employee.party as { doc_type?: string } | undefined)?.doc_type ?? 'C.C.',
                                contractType:      employee.contract_type,
                                startDate:         employee.start_date,
                                salary:            Number(employee.salary),
                                transportAllowance: employee.transport_allowance,
                                companyName:       'GVM Corp',
                            }}
                        />
                    </div>
                </aside>
            </div>
        </div>
    );
}
