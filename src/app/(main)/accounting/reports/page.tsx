import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { settingsService } from '@/features/settings/services/settingsService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import Link from "next/link"
import {
    BarChart3,
    Scale,
    ListFilter,
    FileText,
    TrendingUp,
    Wallet,
    ShieldCheck,
    ChevronRight,
    PieChart,
    Activity,
    Lock,
    Zap
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { redirect } from 'next/navigation';

export default async function AccountingReportsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    const [pnl, tenant] = await Promise.all([
        accountingService.getProfitAndLoss(supabase, startDate, endDate),
        settingsService.getTenantInfo(supabase)
    ]);

    const margin = pnl.totalIncome > 0 ? ((pnl.netProfit / pnl.totalIncome) * 100).toFixed(1) : '0';
    const profitK = (pnl.netProfit / 1000).toFixed(0);
    const categories = [
        {
            name: "Estados Financieros Maestro",
            reports: [
                {
                    title: "Estado de Resultados",
                    subtitle: "P&L Analysis",
                    description: "Análisis dinámico de rentabilidad, utilidad bruta y EBITDA operativo.",
                    icon: BarChart3,
                    href: "/accounting/reports/p-and-l",
                    color: "text-indigo-400",
                    bg: "bg-indigo-500/10"
                },
                {
                    title: "Balance General",
                    subtitle: "Snapshot Financiero",
                    description: "Radiografía de Activos, Pasivos y Patrimonio bajo normativa NIIF.",
                    icon: Scale,
                    href: "/accounting/reports/balance-sheet",
                    color: "text-emerald-400",
                    bg: "bg-emerald-500/10"
                }
            ]
        },
        {
            name: "Auditoría & Control Interno",
            reports: [
                {
                    title: "Balance de Prueba",
                    subtitle: "Trial Balance",
                    description: "Detección de descuadres y validación de sumas iguales por cuenta.",
                    icon: ListFilter,
                    href: "/accounting/reports/trial-balance",
                    color: "text-amber-400",
                    bg: "bg-amber-500/10"
                },
                {
                    title: "Libro Auxiliar",
                    subtitle: "Ledger Detail",
                    description: "Trazabilidad forense de cada movimiento contable por tercero.",
                    icon: FileText,
                    href: "/accounting/reports/auxiliary",
                    color: "text-rose-400",
                    bg: "bg-rose-500/10"
                }
            ]
        },
        {
            name: "Inteligencia de Inventario",
            reports: [
                {
                    title: "Valoración de Stock",
                    subtitle: "Asset Valuation",
                    description: "Optimización de costos y valor real de bodega en tiempo real.",
                    icon: PieChart,
                    href: "/accounting/reports/inventory-valuation",
                    color: "text-sky-400",
                    bg: "bg-sky-500/10"
                }
            ]
        },
        {
            name: "Módulo Fiscal & Legal",
            reports: [
                {
                    title: "Certificados Tributarios",
                    subtitle: "Tax Compliance",
                    description: "Certificados de Retención en la Fuente, IVA e ICA para proveedores.",
                    icon: ShieldCheck,
                    href: "/accounting/reports/certificates",
                    color: "text-violet-400",
                    bg: "bg-violet-500/10"
                }
            ]
        }
    ];

    return (
        <div className="space-y-16 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-1000">

            {/* 🛡️ PREMIUM INDUSTRIAL HEADER */}
            <div className="bg-slate-900 rounded-[3.5rem] p-12 md:p-20 text-white shadow-active relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-16 opacity-[0.03] pointer-events-none group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-1000">
                    <PieChart className="h-80 w-80" />
                </div>

                <div className="relative z-10 space-y-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-12 bg-indigo-500 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-400">Intelligence Core v3.0</span>
                        </div>
                        <h1 className="text-5xl md:text-8xl font-black tracking-tighter italic uppercase leading-[0.8]">
                            Centro de <br /><span className="text-slate-500">Inteligencia</span>
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10">
                            <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Libros Contables: Al Día (2026)</span>
                        </div>
                        <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10">
                            <Lock className="h-4 w-4 text-indigo-400" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Acceso Nivel Auditoría</span>
                        </div>
                        <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10">
                            <Zap className="h-4 w-4 text-amber-400" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Reportes NIIF / IFRS</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 📋 REPORTS ARCHITECTURE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

                {/* Stats Sidebar/Column */}
                <div className="lg:col-span-4 space-y-10">
                    <div className="sticky top-10 space-y-10">
                        <div className="bg-white rounded-[3.5rem] p-10 shadow-premium border border-slate-50 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.05] pointer-events-none">
                                <TrendingUp className="h-24 w-24 text-slate-900" />
                            </div>
                            <div className="space-y-8 relative z-10">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Salud Financiera v3</p>
                                    <h3 className="text-4xl font-black text-slate-900 italic tracking-tighter">Overview</h3>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-slate-50 p-6 rounded-3xl group hover:bg-slate-900 hover:scale-[1.05] transition-all">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-400">Utilidad del Periodo</p>
                                        <p className="text-2xl font-black text-slate-900 italic group-hover:text-white">${profitK}K</p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-3xl group hover:bg-slate-900 hover:scale-[1.05] transition-all">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-400">Margen de Utilidad</p>
                                        <p className="text-2xl font-black text-slate-900 italic group-hover:text-white">{margin}%</p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-3xl group hover:bg-slate-900 hover:scale-[1.05] transition-all">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-amber-400">Ratio Operativo</p>
                                        <p className="text-2xl font-black text-slate-900 italic group-hover:text-white">{(pnl.totalIncome / (pnl.totalExpenses || 1)).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-active space-y-6">
                            <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center">
                                <ShieldCheck className="h-8 w-8 text-white" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xl font-black italic uppercase leading-tight">Cumplimiento Fiscal Integrado</h4>
                                <p className="text-xs font-medium text-white/70 leading-relaxed">
                                    Todos los reportes están sincronizados con la normativa DIAN vigente para el año gravable 2026.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Categories Grid */}
                <div className="lg:col-span-8 space-y-16">
                    {categories.map((cat) => (
                        <div key={cat.name} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
                            <div className="flex items-center gap-6 px-4">
                                <div className="h-10 w-1 bg-indigo-600 rounded-full" />
                                <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">{cat.name}</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {cat.reports.map((report) => (
                                    <Link key={report.href} href={report.href} className="group">
                                        <Card className="border-none shadow-premium bg-white rounded-[3rem] p-8 h-full transition-all group-hover:translate-y-[-8px] group-hover:shadow-active relative overflow-hidden">
                                            <div className={cn("inline-flex h-12 w-12 rounded-2xl items-center justify-center mb-6 shadow-inner", report.bg, report.color)}>
                                                <report.icon className="h-6 w-6" />
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{report.title}</h3>
                                                    <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
                                                </div>
                                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{report.subtitle}</p>
                                                <p className="text-xs text-slate-400 leading-relaxed pt-2 font-medium">
                                                    {report.description}
                                                </p>
                                            </div>

                                            {/* Industrial Detail Decoration */}
                                            <div className="absolute top-4 right-4 h-1 w-12 bg-slate-50 rounded-full" />
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}
