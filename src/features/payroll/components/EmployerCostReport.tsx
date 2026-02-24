import { ProvisionsSummary, SocialSecuritySummary } from "../types"
import { ShieldCheck, CalendarClock, TrendingUp, Wallet } from "lucide-react"

interface Props {
    ss: SocialSecuritySummary;
    provisions: ProvisionsSummary;
}

export function EmployerCostReport({ ss, provisions }: Props) {
    const totalEmployerCost = ss.employer.total + ss.parafiscales.total + provisions.total;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 mt-10">
            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                <div>
                    <h3 className="text-2xl font-black italic tracking-tighter text-slate-900">Costo Total Empleador</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión mensual real de la compañía</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Mensual</p>
                    <p className="text-4xl font-black italic tracking-tighter text-primary">
                        ${new Intl.NumberFormat('es-CO').format(Math.round(totalEmployerCost))}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Seguridad Social & Parafiscales */}
                <div className="p-8 rounded-[2.5rem] bg-emerald-50/50 border border-emerald-100 space-y-6">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="h-6 w-6 text-emerald-600" />
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">Cargas Legales (PILA)</h4>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500">Salud + Pensión + ARL</span>
                            <span className="font-black text-slate-900">${new Intl.NumberFormat('es-CO').format(Math.round(ss.employer.total))}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500">Parafiscales (CCF/SENA/ICBF)</span>
                            <span className="font-black text-slate-900">${new Intl.NumberFormat('es-CO').format(Math.round(ss.parafiscales.total))}</span>
                        </div>
                        <div className="pt-4 border-t border-emerald-100 flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-emerald-600">Subtotal PILA</span>
                            <span className="text-xl font-black text-emerald-700 italic">
                                ${new Intl.NumberFormat('es-CO').format(Math.round(ss.employer.total + ss.parafiscales.total))}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Provisiones Sociales */}
                <div className="p-8 rounded-[2.5rem] bg-indigo-50/50 border border-indigo-100 space-y-6">
                    <div className="flex items-center gap-3">
                        <CalendarClock className="h-6 w-6 text-indigo-600" />
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">Provisiones Mensuales</h4>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500">Cesantías (8.33%)</span>
                            <span className="font-black text-slate-900">${new Intl.NumberFormat('es-CO').format(Math.round(provisions.cesantias))}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500">Int. sobre Cesantías (1%)</span>
                            <span className="font-black text-slate-900">${new Intl.NumberFormat('es-CO').format(Math.round(provisions.intereses_cesantias))}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500">Prima de Servicios (8.33%)</span>
                            <span className="font-black text-slate-900">${new Intl.NumberFormat('es-CO').format(Math.round(provisions.prima))}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-500">Vacaciones (4.17%)</span>
                            <span className="font-black text-slate-900">${new Intl.NumberFormat('es-CO').format(Math.round(provisions.vacaciones))}</span>
                        </div>
                        <div className="pt-4 border-t border-indigo-100 flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-indigo-600">Subtotal Provisiones</span>
                            <span className="text-xl font-black text-indigo-700 italic">
                                ${new Intl.NumberFormat('es-CO').format(Math.round(provisions.total))}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 text-white/50 text-[10px] font-black uppercase tracking-widest text-center italic border border-white/10 shadow-xl">
                Nota: Las provisiones son valores acumulados para el pago futuro de prestaciones legales.
            </div>
        </div>
    )
}
