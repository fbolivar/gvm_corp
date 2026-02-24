"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/shared/components/ui/dialog"
import {
    FileText,
    Users,
    Package,
    ShoppingCart,
    Wallet,
    ShoppingBag,
    ShieldCheck,
    Zap,
    ChevronRight,
    ArrowUpRight,
    Search,
    TrendingUp,
    TrendingDown,
    Activity
} from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/lib/utils"

const ACTIONS = [
    { title: "Ventas", icon: ShoppingCart, href: "/sales", color: "text-blue-500", bg: "bg-blue-50", stat: "+12.4%", count: "1,234.5k", isPositive: true },
    { title: "Compras", icon: ShoppingBag, href: "/purchasing", color: "text-emerald-500", bg: "bg-emerald-50", stat: "-2.1%", count: "890.1k", isPositive: false },
    { title: "Inventario", icon: Package, href: "/inventory", color: "text-amber-500", bg: "bg-amber-50", stat: "+5.3%", count: "345.2k", isPositive: true },
    { title: "Nómina", icon: Zap, href: "/payroll", color: "text-rose-500", bg: "bg-rose-50", stat: "+1.2%", count: "112.4k", isPositive: true }
]

export function ActionGrid() {
    return (
        <Card className="bg-white border-none shadow-sm h-full rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-lg font-bold text-slate-900 tracking-tight italic uppercase">Métricas Nodo</CardTitle>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sincronización de Módulos</p>
                </div>
                <div className="flex items-center gap-2">
                    <select className="text-[9px] font-bold uppercase tracking-widest bg-slate-50 border-none rounded-xl px-3 py-1.5 text-slate-500 outline-none cursor-pointer hover:bg-slate-900 hover:text-white transition-all shadow-inner">
                        <option>Semana</option>
                        <option>Mes</option>
                        <option>Año</option>
                    </select>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {ACTIONS.map((action, index) => (
                    <Link
                        key={index}
                        href={action.href}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50/50 transition-all group border border-transparent hover:border-slate-100"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-lg ${action.bg} flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-sm`}>
                                <action.icon className={`h-5 w-5 ${action.color}`} />
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{action.title}</span>
                                <span className="text-base font-extrabold text-slate-900 italic tracking-tight tabular-nums">${action.count}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge className={cn(
                                "text-[8px] font-bold px-2 py-0.5 rounded-full border-none shadow-sm flex items-center gap-1 uppercase tracking-widest leading-none",
                                action.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                            )}>
                                {action.isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                                {action.stat}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-primary transition-all group-hover:translate-x-1 duration-500" />
                        </div>
                    </Link>
                ))}

                <div className="pt-2">
                    <Card className="bg-slate-900 border-none shadow-active overflow-hidden relative group rounded-xl">
                        <div className="absolute top-0 right-0 h-24 w-24 bg-primary/20 rounded-full -mr-6 -mt-6 blur-2xl animate-pulse-slow" />
                        <CardContent className="p-6 relative z-10 flex items-center justify-between">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <h4 className="text-white font-bold text-base italic tracking-tight uppercase">Crecimiento</h4>
                                    <p className="text-slate-500 text-[8px] font-bold uppercase tracking-widest max-w-[100px]">Proyección Q4</p>
                                </div>

                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button className="bg-primary hover:bg-primary/90 text-white rounded-lg h-9 px-4 font-bold text-[8px] uppercase tracking-widest transition-all shadow-lg shadow-primary/20 border-none">
                                            Analizar
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-lg bg-white border-none rounded-2xl p-0 overflow-hidden shadow-active">
                                        <div className="p-8 bg-slate-900 text-white relative overflow-hidden">
                                            <div className="absolute top-0 right-0 h-40 w-40 bg-primary/20 rounded-full -mr-12 -mt-12 blur-2xl" />
                                            <DialogHeader className="relative z-10">
                                                <DialogTitle className="text-2xl font-extrabold italic tracking-tight uppercase">Informe de Expansión</DialogTitle>
                                                <DialogDescription className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.3em] mt-1">Análisis Predictivo v3.0</DialogDescription>
                                            </DialogHeader>

                                            <div className="grid grid-cols-3 gap-3 mt-6 relative z-10">
                                                <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
                                                    <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest mb-1">Impacto</p>
                                                    <p className="text-lg font-extrabold italic tracking-tight text-white">$1.2M</p>
                                                    <span className="text-[7px] text-emerald-400 font-bold flex items-center gap-1 mt-2 uppercase tracking-widest">
                                                        <TrendingUp className="h-2 w-2" /> +15%
                                                    </span>
                                                </div>
                                                <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
                                                    <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest mb-1">Eficiencia</p>
                                                    <p className="text-lg font-extrabold italic tracking-tight text-white">28%</p>
                                                    <span className="text-[7px] text-emerald-400 font-bold flex items-center gap-1 mt-2 uppercase tracking-widest">
                                                        <Zap className="h-2 w-2" /> +2%
                                                    </span>
                                                </div>
                                                <div className="bg-white/5 backdrop-blur-md rounded-xl p-3 border border-white/10">
                                                    <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest mb-1">Target</p>
                                                    <p className="text-lg font-extrabold italic tracking-tight text-white">$450k</p>
                                                    <span className="text-[7px] text-slate-400 font-bold flex items-center gap-1 mt-2 uppercase tracking-widest">
                                                        <Activity className="h-2 w-2" /> OK
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-white space-y-6">
                                            <div className="flex items-center gap-2">
                                                <div className="h-1 w-6 bg-slate-900 rounded-full" />
                                                <h4 className="text-base font-extrabold text-slate-900 uppercase italic tracking-tight">Desempeño</h4>
                                            </div>
                                            <div className="space-y-6">
                                                {[
                                                    { name: "Comercial", value: 85, color: "bg-blue-600" },
                                                    { name: "Operaciones", value: 65, color: "bg-emerald-600" },
                                                    { name: "Logística", value: 45, color: "bg-amber-600" },
                                                    { name: "Administrativo", value: 92, color: "bg-rose-600" }
                                                ].map((dept) => (
                                                    <div key={dept.name} className="space-y-2">
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{dept.name}</span>
                                                            <span className="text-sm font-extrabold text-slate-900 italic tracking-tight">{dept.value}%</span>
                                                        </div>
                                                        <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                                                            <div
                                                                className={cn("h-full rounded-full transition-all duration-1000", dept.color)}
                                                                style={{ width: `${dept.value}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex justify-end pt-2">
                                                <Button variant="outline" className="h-10 px-6 rounded-lg font-bold text-[8px] uppercase tracking-widest border-slate-100 hover:bg-slate-900 hover:text-white transition-all shadow-sm" asChild>
                                                    <Link href="/accounting/reports">Ver Detalles</Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            <div className="relative h-20 w-20 flex flex-col items-center justify-center text-white">
                                <span className="font-extrabold text-lg italic tracking-tight leading-none">75%</span>
                                <span className="text-[6px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Status</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    )
}
