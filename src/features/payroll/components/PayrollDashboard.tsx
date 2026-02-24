"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"
import {
    Users,
    Calculator,
    Calendar,
    Plus,
    ArrowRight,
    TrendingUp,
    Clock,
    UserPlus,
    FileText,
    ChevronRight,
    ShieldCheck,
    Wallet,
    TrendingDown,
    Sparkles,
    Banknote,
    Activity,
    Zap,
    Scale,
    Landmark
} from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface PayrollDashboardProps {
    stats: {
        totalEmployees: number;
        activeEmployees: number;
        lastSettlementDate: string | null;
        lastSettlementAmount: number;
    }
}

export function PayrollDashboard({ stats }: PayrollDashboardProps) {
    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            {/* 🏭 PREMIUM HEADER DARK */}
            <div className="relative group overflow-hidden bg-slate-950 rounded-[4rem] p-16 text-white shadow-active">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
                    <Users className="h-64 w-64 text-white" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-10 bg-indigo-500 rounded-full" />
                            <span className="text-xs font-black uppercase tracking-[0.5em] text-indigo-500">Gestión de Talento Humano</span>
                        </div>
                        <h1 className="text-7xl font-black tracking-tighter italic uppercase leading-[0.8]">
                            Control de <br /><span className="text-slate-500">Nómina</span>
                        </h1>
                        <div className="flex items-center gap-4">
                            <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.4em]">Liquidaciones & RRHH (v3.0)</p>
                            <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                                <ShieldCheck className="h-3 w-3 text-indigo-400" />
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic">Legal & DIAN</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button variant="outline" asChild className="h-20 px-10 rounded-[2rem] border-none bg-white/5 hover:bg-white/10 text-white font-black hover:scale-105 transition-all backdrop-blur-md">
                            <Link href="/payroll/employees" className="flex items-center gap-4">
                                <Users className="h-6 w-6 text-indigo-400" />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] uppercase tracking-widest opacity-40">Directorio</span>
                                    <span className="text-xs uppercase tracking-widest">Colaboradores</span>
                                </div>
                            </Link>
                        </Button>
                        <Button asChild className="h-20 px-12 rounded-[2rem] bg-indigo-600 hover:bg-indigo-500 text-white font-black shadow-active transition-all hover:scale-105 active:scale-95 border-none">
                            <Link href="/payroll/settlement" className="flex items-center gap-4">
                                <Plus className="h-7 w-7" />
                                <div className="flex flex-col items-start leading-none">
                                    <span className="text-[10px] uppercase tracking-widest opacity-60">Operación</span>
                                    <span className="text-xs uppercase tracking-widest">Nueva Liquidación</span>
                                </div>
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>

            {/* 📊 SUMMARY STRIP */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                    { label: 'Contratos Activos', value: stats.activeEmployees, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Último Desembolso', value: `$${stats.lastSettlementAmount.toLocaleString('es-CO')}`, icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Pendiente Pago', value: '$0', icon: Wallet, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: 'Eficiencia', value: '99.2%', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-premium flex items-center gap-6 border border-slate-50 hover:border-indigo-100 transition-colors group">
                        <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-6", stat.bg, stat.color)}>
                            <stat.icon className="h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{stat.label}</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tighter italic">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* 🛠️ QUICK ACTIONS GRID */}
            <div className="grid gap-8 md:grid-cols-4">
                {[
                    { title: "Personal", desc: "Gestión de contratos y expedientes.", icon: UserPlus, href: "/payroll/employees", color: "indigo" },
                    { title: "Liquidación", desc: "Cálculo de nómina y prestaciones.", icon: Calculator, href: "/payroll/settlement", color: "emerald" },
                    { title: "Dispersión", desc: "Pago masivo Bancolombia/Davivienda.", icon: Landmark, href: "/payroll/dispersion", color: "rose" },
                    { title: "Reportes", desc: "Certificados y desprendibles.", icon: FileText, href: "/reports/payroll", color: "amber" }
                ].map((action, i) => (
                    <Link key={i} href={action.href} className="group">
                        <Card className="h-full rounded-[3rem] border-none bg-white shadow-premium overflow-hidden transition-all duration-700 group-hover:shadow-active group-hover:scale-[1.02] border border-slate-50 hover:border-indigo-100">
                            <CardContent className="p-10 flex flex-col gap-6">
                                <div className={cn("h-16 w-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-700 group-hover:rotate-12",
                                    action.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                                        action.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                            action.color === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                )}>
                                    <action.icon className="h-8 w-8" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase transition-all group-hover:text-indigo-600">{action.title}</h3>
                                    <p className="text-xs text-slate-400 font-bold leading-relaxed">{action.desc}</p>
                                </div>
                                <div className="mt-auto pt-6 flex items-center gap-3 text-slate-300 group-hover:text-indigo-600 transition-colors">
                                    <span className="text-[10px] font-black uppercase tracking-widest">Ejecutar</span>
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* 🛡️ AUDIT FOOTER */}
            <div className="bg-slate-950 p-16 rounded-[4rem] text-white flex flex-col lg:flex-row items-center justify-between gap-12 shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                    <ShieldCheck className="h-48 w-48 text-white" />
                </div>
                <div className="flex items-center gap-10 relative z-10 text-center lg:text-left flex-col lg:flex-row">
                    <div className="h-20 w-20 bg-white/10 rounded-[2rem] flex items-center justify-center text-white border border-white/10 shadow-inner rotate-12 group-hover:rotate-0 transition-transform duration-700">
                        <Scale className="h-10 w-10 text-indigo-400" />
                    </div>
                    <div className="space-y-3">
                        <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-none text-white">Cumplimiento del Código Sustantivo</h4>
                        <p className="text-sm text-white/40 leading-relaxed font-medium max-w-xl">
                            Todos los procesos de liquidación bajo los estándares industriales cumplen con la legislación laboral vigente. El reporte a UGPP y seguridad social se genera automáticamente tras cada cierre de periodo.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

