import { createClient } from "@/lib/supabase/server"
import { employeeService } from "@/features/payroll/services/employeeService"
import { financeService } from "@/features/payroll/services/financeService"
import { overtimeService } from "@/features/payroll/services/overtimeService"
import { redirect } from "next/navigation"
import { AttendanceWidget } from "@/features/payroll/components/AttendanceWidget"
import { PayrollSlipButton } from "@/features/payroll/components/PayrollSlipButton"
import { OvertimePanel } from "@/features/payroll/components/OvertimePanel"
import { CertificateButtons } from "@/features/payroll/components/CertificateButtons"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import {
    Wallet,
    FileText,
    TrendingUp,
    ShieldCheck,
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
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-10">
                <div className="h-20 w-20 rounded-[2rem] bg-rose-50 flex items-center justify-center text-rose-500">
                    <BadgeInfo className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-slate-900 italic tracking-tighter">Portal No Vinculado</h1>
                    <p className="text-slate-400 font-medium max-w-md">Tu cuenta de usuario no está vinculada a un registro de empleado. Contacta a RRHH para habilitar tu autoservicio.</p>
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
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000 px-4 md:px-0">
            {/* 🛡️ EMPLOYEE COMMAND CENTER HEADER */}
            <div className="bg-slate-900 rounded-[4rem] p-12 md:p-20 text-white shadow-active relative overflow-hidden group">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <ShieldCheck className="h-80 w-80 text-white" />
                </div>

                <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-12">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-2 w-12 bg-emerald-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-400">Employee Portal v3.0</span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter italic uppercase leading-[0.8]">
                            Hola, <br /><span className="text-slate-500">{employee.party?.legal_name.split(' ')[0]}</span>
                        </h1>
                        <div className="flex items-center gap-4">
                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em]">Gestión de Nómina & Beneficios</p>
                            <div className="flex items-center gap-2 bg-emerald-500/10 px-4 py-1.5 rounded-xl border border-emerald-500/20">
                                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic leading-none">Contrato Activo</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        <div className="h-24 px-10 rounded-[2rem] bg-white/5 backdrop-blur-md border border-white/10 flex flex-col justify-center items-end group/stat hover:bg-white/10 transition-all">
                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-black italic">Sueldo Básico</span>
                            <span className="text-3xl font-black italic tracking-tighter">${Number(employee.salary).toLocaleString('es-CO')}</span>
                        </div>
                        <div className="h-24 px-10 rounded-[2rem] bg-indigo-500/20 backdrop-blur-md border border-indigo-500/20 flex flex-col justify-center items-end group/stat hover:bg-indigo-500/30 transition-all">
                            <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-black italic">Tipo Contrato</span>
                            <span className="text-2xl font-black italic tracking-tight uppercase text-indigo-100">{employee.contract_type}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* 📊 MAIN CONTENT COLUMN */}
                <div className="lg:col-span-8 space-y-12">

                    {/* PAYROLL STUBS SECTION */}
                    <section className="space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black tracking-tighter italic uppercase text-slate-900 leading-none">Desprendibles</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tus últimos 5 pagos certificados</p>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            {documents.data?.map((doc) => (
                                <div key={doc.id} className="group bg-white rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-premium hover:shadow-active transition-all duration-500 border border-transparent hover:border-slate-100">
                                    <div className="flex items-center gap-8 w-full md:w-auto">
                                        <div className="h-20 w-20 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm">
                                            <FileText className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-xl font-black text-slate-900 italic tracking-tighter">{doc.number}</h3>
                                                <Badge variant="outline" className="text-[8px] font-black px-2 py-0 border-slate-200">PAYROLL</Badge>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{doc.issue_date}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between w-full md:w-auto gap-12">
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Neto Liquidado</p>
                                            <p className="text-3xl font-black text-emerald-600 italic tracking-tighter">${(Number((doc as any).total) || 0).toLocaleString('es-CO')}</p>
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
                                <div className="py-24 text-center bg-slate-50/50 rounded-[3.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-4">
                                    <BadgeInfo className="h-12 w-12 text-slate-200" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">No se han emitido desprendibles electrónicos</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* BENEFITS SECTION */}
                    <section className="space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="h-px flex-1 bg-slate-100" />
                            <h2 className="text-xs font-black text-indigo-400 uppercase tracking-[0.4em] italic shrink-0 px-4">Auxilios & Beneficios</h2>
                            <div className="h-px flex-1 bg-slate-100" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {benefits.map((benefit) => (
                                <div key={benefit.id} className="relative group bg-indigo-50/30 rounded-[3rem] p-10 overflow-hidden border border-indigo-50/50 transition-all hover:bg-indigo-50/50">
                                    <div className="absolute -top-4 -right-4 p-8 opacity-[0.05] text-indigo-600">
                                        <TrendingUp className="h-24 w-24" />
                                    </div>
                                    <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                                        <div className="flex justify-between items-start">
                                            <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600">
                                                <TrendingUp className="h-6 w-6" />
                                            </div>
                                            <Badge className="bg-white text-indigo-600 border-none font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                                                {benefit.frequency}
                                            </Badge>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-2xl font-black text-slate-900 italic tracking-tighter leading-none">{benefit.name}</h4>
                                            <p className="text-4xl font-black text-indigo-700 italic tracking-tighter leading-none">${Number(benefit.amount).toLocaleString('es-CO')}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* 🛡️ SIDEBAR COLUMN */}
                <aside className="lg:col-span-4 space-y-10">
                    {/* ATTENDANCE WIDGET */}
                    <div className="bg-white rounded-[3.5rem] shadow-premium overflow-hidden">
                        <AttendanceWidget employeeId={employee.id!} tenantId={employee.tenant_id || ''} />
                    </div>

                    {/* FINANCIAL HEALTH / LOANS */}
                    <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white shadow-active relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform duration-700">
                            <Wallet className="h-32 w-32" />
                        </div>

                        <div className="relative z-10 space-y-8">
                            <div className="space-y-1">
                                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">Salud Financiera</h3>
                                <p className="text-xl font-black italic tracking-tighter">Préstamos & Libranzas</p>
                            </div>

                            <div className="space-y-8">
                                {loans.map(loan => (
                                    <div key={loan.id} className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div className="space-y-1">
                                                <p className="text-sm font-black italic uppercase tracking-tight">{loan.description || 'Crédito Libranza'}</p>
                                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Saldo Pendiente</p>
                                            </div>
                                            <p className="text-lg font-black tracking-tighter italic text-indigo-100">${(Number(loan.amount_total) - Number(loan.amount_paid)).toLocaleString('es-CO')}</p>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-1000"
                                                style={{ width: `${(loan.installments_paid / loan.installment_count) * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-500">
                                            <span>Progreso de Pago</span>
                                            <span className="text-indigo-400 font-black">{Math.round((loan.installments_paid / loan.installment_count) * 100)}%</span>
                                        </div>
                                    </div>
                                ))}
                                {loans.length === 0 && (
                                    <div className="py-10 text-center space-y-4 bg-white/5 rounded-[2rem] border border-white/5">
                                        <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto">
                                            <Wallet className="h-6 w-6 text-slate-400" />
                                        </div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic leading-none">Sin obligaciones financieras activas</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* OVERTIME REQUESTS */}
                    <div className="bg-white rounded-[3.5rem] shadow-premium p-8">
                        <div className="mb-6">
                            <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 italic">Horas Extra</h3>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Solicita y sigue tus HE</p>
                        </div>
                        <OvertimePanel
                            employeeId={employee.id!}
                            salary={Number(employee.salary)}
                            tenantId={employee.tenant_id || ''}
                            requests={overtimeRequests}
                        />
                    </div>

                    {/* QUICK CERTIFICATES */}
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
                </aside>
            </div>
        </div>
    );
}
