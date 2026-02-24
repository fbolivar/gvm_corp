import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ShieldCheck, User, Building2, Banknote, CreditCard, ExternalLink } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface Props {
    document: any;
    employee: any;
    cune?: string;
    qrData?: string;
}

export function PaymentSlip({ document, employee, cune, qrData }: Props) {
    const earnings = document.lines.filter((l: any) => l.unit_price > 0);
    const deductions = document.lines.filter((l: any) => l.unit_price < 0);

    const totalEarnings = earnings.reduce((sum: number, l: any) => sum + l.line_total, 0);
    const totalDeductions = Math.abs(deductions.reduce((sum: number, l: any) => sum + l.line_total, 0));
    const netPay = totalEarnings - totalDeductions;

    return (
        <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 max-w-4xl mx-auto space-y-12 relative overflow-hidden group">
            {/* Background Texture */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full -mr-48 -mt-48 blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50 rounded-full -ml-32 -mb-32 blur-2xl" />

            {/* Header: Company & Doc Info */}
            <div className="flex justify-between items-start relative z-10">
                <div className="space-y-4">
                    <div className="h-16 w-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                        <Building2 className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase">SaaS Factory S.A.S</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NIT: 901.444.555-1</p>
                        <p className="text-[10px] font-bold text-slate-400 italic">Calle 100 #8a-49, Bogotá D.C.</p>
                    </div>
                </div>
                <div className="text-right space-y-2">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-100 rounded-full">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Comprobante de Pago</span>
                        <span className="text-xs font-black text-primary italic">#{document.number}</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha de Emisión</p>
                    <p className="text-sm font-black text-slate-900 italic">
                        {format(new Date(document.issue_date), "dd 'de' MMMM, yyyy", { locale: es })}
                    </p>
                </div>
            </div>

            {/* Employee Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-50 relative z-10">
                <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Colaborador</p>
                    <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-primary" />
                        <p className="text-xs font-black text-slate-900 tracking-tight italic">{employee.party.legal_name}</p>
                    </div>
                </div>
                <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Identificación</p>
                    <p className="text-xs font-black text-slate-900 tracking-tight italic">{employee.party.doc_number}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Contrato</p>
                    <p className="text-xs font-black text-slate-900 tracking-tight italic">{employee.contract_type}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Salario Base</p>
                    <p className="text-xs font-black text-emerald-600 tracking-tight italic">
                        ${new Intl.NumberFormat('es-CO').format(employee.salary)}
                    </p>
                </div>
            </div>

            {/* Detailed Concepts Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                {/* Earnings */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Banknote className="h-3 w-3" /> Haberes / Devengados
                    </h3>
                    <div className="space-y-3">
                        {earnings.map((l: any, i: number) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 group/item">
                                <span className="text-xs font-bold text-slate-600 group-hover/item:text-slate-900 transition-colors uppercase">{l.description}</span>
                                <span className="text-xs font-black text-slate-900">${new Intl.NumberFormat('es-CO').format(l.line_total)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Deductions */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <CreditCard className="h-3 w-3" /> Descuentos / Deducciones
                    </h3>
                    <div className="space-y-3">
                        {deductions.map((l: any, i: number) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 group/item">
                                <span className="text-xs font-bold text-slate-600 group-hover/item:text-slate-900 transition-colors uppercase">{l.description}</span>
                                <span className="text-xs font-black text-rose-500">-${new Intl.NumberFormat('es-CO').format(Math.abs(l.line_total))}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Total Section */}
            <div className="pt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
                <div className="space-y-4 text-center md:text-left">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Método de Pago</p>
                        <p className="text-xs font-black text-slate-900 italic uppercase">
                            {employee.payment_method === 'BANK' ? `${employee.bank_name} - ${employee.bank_account_number}` : 'EFECTIVO / CAJA'}
                        </p>
                    </div>
                    {cune && (
                        <div className="p-4 bg-slate-900 rounded-2xl space-y-2 max-w-sm">
                            <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Identificador CUNE (DIAN)</p>
                            <code className="text-[9px] font-bold text-indigo-300 break-all">{cune}</code>
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 min-w-[300px] text-center space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Neto Recibido</p>
                    <h3 className="text-5xl font-black italic tracking-tighter text-slate-900">
                        ${new Intl.NumberFormat('es-CO').format(Math.round(netPay))}
                    </h3>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Pesos Colombianos</p>
                </div>
            </div>

            {/* Footer with legal note & signature line */}
            <div className="pt-10 text-center space-y-8 relative z-10">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-px w-64 bg-slate-200" />
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Firma del Colaborador</p>
                </div>
                <div className="flex justify-center items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                        Este documento es un soporte legal emitido bajo los estándares de Nómina Electrónica DIAN 2026.
                    </p>
                </div>
            </div>
        </div>
    )
}
