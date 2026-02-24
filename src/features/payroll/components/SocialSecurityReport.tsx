"use client"

import { SocialSecuritySummary } from "../types"
import { ShieldCheck, Info, Briefcase, Heart, PiggyBank, Users } from "lucide-react"

interface Props {
    summary: SocialSecuritySummary;
}

export function SocialSecurityReport({ summary }: Props) {
    const formatCurrency = (amt: number) =>
        new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0
        }).format(Math.round(amt));

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                        <ShieldCheck className="h-5 w-5" />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600">Costos de Seguridad Social y Parafiscales (PILA)</h3>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full">
                    <span className="text-[10px] font-black uppercase tracking-widest">IBC:</span>
                    <span className="text-sm font-black italic">{formatCurrency(summary.ibc)}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Seguridad Social Patronal */}
                <div className="p-8 rounded-[2.5rem] bg-indigo-50/50 border border-indigo-100 space-y-6 relative overflow-hidden group hover:shadow-xl transition-all">
                    <Briefcase className="absolute -top-4 -right-4 h-24 w-24 text-indigo-100 group-hover:rotate-12 transition-transform duration-700" />
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Seguridad Social</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                                <span>Pensión (12%)</span>
                                <span className="text-slate-900">{formatCurrency(summary.employer.pension)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                                <span>Salud (8.5%)</span>
                                <span className="text-slate-900">{formatCurrency(summary.employer.health)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                                <span>ARL</span>
                                <span className="text-slate-900">{formatCurrency(summary.employer.arl)}</span>
                            </div>
                            <div className="pt-3 border-t border-indigo-200 flex justify-between items-baseline">
                                <span className="text-[10px] font-black uppercase text-indigo-600">Subtotal</span>
                                <span className="text-xl font-black text-indigo-600 italic tracking-tighter">
                                    {formatCurrency(summary.employer.total)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Parafiscales */}
                <div className="p-8 rounded-[2.5rem] bg-amber-50/50 border border-amber-100 space-y-6 relative overflow-hidden group hover:shadow-xl transition-all">
                    <Users className="absolute -top-4 -right-4 h-24 w-24 text-amber-100 group-hover:-rotate-12 transition-transform duration-700" />
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Parafiscales</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                                <span>Caja Comp. (4%)</span>
                                <span className="text-slate-900">{formatCurrency(summary.parafiscales.ccf)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                                <span>ICBF (3%)</span>
                                <span className="text-slate-900">{formatCurrency(summary.parafiscales.icbf)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                                <span>SENA (2%)</span>
                                <span className="text-slate-900">{formatCurrency(summary.parafiscales.sena)}</span>
                            </div>
                            <div className="pt-3 border-t border-amber-200 flex justify-between items-baseline">
                                <span className="text-[10px] font-black uppercase text-amber-600">Subtotal</span>
                                <span className="text-xl font-black text-amber-600 italic tracking-tighter">
                                    {formatCurrency(summary.parafiscales.total)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Resumen de Aportes Empleado */}
                <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-200 space-y-6 relative overflow-hidden group hover:shadow-xl transition-all">
                    <PiggyBank className="absolute -top-4 -right-4 h-24 w-24 text-slate-200 group-hover:scale-110 transition-transform duration-700" />
                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Descuentos Empleado</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                                <span>Salud (4%)</span>
                                <span className="text-slate-900">{formatCurrency(summary.employee.health)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-bold text-slate-600">
                                <span>Pensión (4%)</span>
                                <span className="text-slate-900">{formatCurrency(summary.employee.pension)}</span>
                            </div>
                            <div className="pt-10 border-t border-slate-200 flex justify-between items-baseline">
                                <span className="text-[10px] font-black uppercase text-slate-900">Total Descuento</span>
                                <span className="text-xl font-black text-slate-900 italic tracking-tighter">
                                    {formatCurrency(summary.employee.total)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 rounded-3xl bg-indigo-900 text-white flex items-center justify-between shadow-active">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                        <Info className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Costo Total Empleador para el Periodo</p>
                        <p className="text-xs font-bold text-indigo-100 italic">Incluye IBC + Seguridad Social Patronal + Parafiscales</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-black italic tracking-tighter leading-none">
                        {formatCurrency(summary.ibc + summary.total_cost)}
                    </span>
                    <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mt-1">Gasto Real Empresa</p>
                </div>
            </div>
        </div>
    )
}
