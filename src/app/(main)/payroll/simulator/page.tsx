"use client"

import { SettlementSimulator } from "@/features/payroll/components/SettlementSimulator"
import { ChevronLeft, Info, BarChart3, Sparkles } from "lucide-react"
import Link from "next/link"

export default function PayrollSimulatorPage() {
    return (
        <div className="p-10 space-y-12 max-w-[1600px] mx-auto animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-1">
                <div className="space-y-4">
                    <Link href="/payroll" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors mb-2">
                        <ChevronLeft className="h-4 w-4" /> Volver a Nómina
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-[2rem] bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                            <Sparkles className="h-8 w-8" />
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                Inteligencia <span className="text-indigo-600">Simulada</span>
                            </h1>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" /> Análisis Proyectivo de Liquidaciones Finales
                            </p>
                        </div>
                    </div>
                </div>

                <div className="hidden lg:flex items-center gap-6 p-6 rounded-[2rem] bg-indigo-50 border border-indigo-100/50">
                    <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-indigo-500 shadow-sm">
                        <Info className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Capacidad Predictiva</p>
                        <p className="text-xs font-bold text-indigo-900 italic">Cálculos basados en vigencia legal 2026</p>
                    </div>
                </div>
            </div>

            {/* Information Alert */}
            <div className="bg-slate-900 rounded-[3rem] p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 h-full w-1/2 bg-gradient-to-l from-indigo-500/10 to-transparent" />
                <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                    <div className="space-y-4 flex-1">
                        <h2 className="text-3xl font-black text-white tracking-tight">¿Cómo funciona la desvinculación?</h2>
                        <p className="text-slate-400 font-medium leading-relaxed">
                            El simulador proyecta el costo total de una terminación de contrato, incluyendo Prima, Cesantías e Intereses proporcionales al tiempo laborado, más las vacaciones no disfrutadas.
                            <span className="text-indigo-400 italic"> Ideal para negociaciones de retiro voluntario o proyecciones presupuestales de RRHH.</span>
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 shrink-0">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                            <p className="text-white font-black italic text-xl">100%</p>
                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Precisión Legal</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                            <p className="text-white font-black italic text-xl">SO-01</p>
                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Soporte Local</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* The Simulator */}
            <SettlementSimulator />

            {/* Footer / Notes */}
            <div className="flex justify-center pb-12">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic flex items-center gap-3">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    Valores expresados en Pesos Colombianos (COP)
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                    Generado por GVM HCM Core
                </p>
            </div>
        </div>
    )
}
