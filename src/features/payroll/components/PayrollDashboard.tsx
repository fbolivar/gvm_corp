"use client"

import { Card, CardContent } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"
import {
    Users, Calculator, Plus, ArrowRight,
    UserPlus, FileText, Banknote, Wallet, Zap, Landmark,
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
        <div className="space-y-6">
            {/* Actions */}
            <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" asChild className="h-9 px-4 rounded-xl text-xs">
                    <Link href="/payroll/employees">
                        <Users className="h-3.5 w-3.5 mr-2" />
                        Colaboradores
                    </Link>
                </Button>
                <Button size="sm" asChild className="h-9 px-4 rounded-xl gap-2 bg-indigo-600 hover:bg-indigo-700 text-xs">
                    <Link href="/payroll/settlement">
                        <Plus className="h-3.5 w-3.5" />
                        Nueva Liquidacion
                    </Link>
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Contratos Activos', value: String(stats.activeEmployees), icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Ultimo Desembolso', value: `$${stats.lastSettlementAmount.toLocaleString('es-CO')}`, icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Pendiente Pago', value: '$0', icon: Wallet, color: 'text-rose-600', bg: 'bg-rose-50' },
                    { label: 'Eficiencia', value: '99.2%', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", stat.bg, stat.color)}>
                            <stat.icon className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                            <p className="text-sm font-bold text-slate-900 font-mono tabular-nums">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-4">
                {[
                    { title: "Personal", desc: "Gestion de contratos y expedientes.", icon: UserPlus, href: "/payroll/employees", color: "indigo" },
                    { title: "Liquidacion", desc: "Calculo de nomina y prestaciones.", icon: Calculator, href: "/payroll/settlement", color: "emerald" },
                    { title: "Dispersion", desc: "Pago masivo Bancolombia/Davivienda.", icon: Landmark, href: "/payroll/dispersion", color: "rose" },
                    { title: "Consolidada", desc: "Nomina consolidada del periodo.", icon: FileText, href: "/payroll/summary", color: "amber" },
                ].map((action, i) => (
                    <Link key={i} href={action.href} className="group">
                        <Card className="h-full rounded-2xl border border-slate-100 bg-white shadow-sm hover:border-indigo-100 hover:shadow-md transition-all duration-300">
                            <CardContent className="p-5 flex flex-col gap-4">
                                <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center",
                                    action.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' :
                                        action.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                            action.color === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                                )}>
                                    <action.icon className="h-4 w-4" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{action.title}</h3>
                                    <p className="text-xs text-slate-400">{action.desc}</p>
                                </div>
                                <div className="mt-auto pt-2 flex items-center gap-2 text-slate-300 group-hover:text-indigo-500 transition-colors">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Acceder</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}
