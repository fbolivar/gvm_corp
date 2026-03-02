import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { settingsService } from '@/features/settings/services/settingsService';
import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
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
    Zap,
    Package,
    Receipt,
    Users,
    Calculator,
    Landmark,
    Gavel,
    ClipboardList,
    FileSpreadsheet,
    Printer,
    BarChart2,
    DollarSign,
    Truck,
    ArrowLeftRight,
    BookOpen,
    Building2,
    Percent,
    CreditCard,
    Banknote,
    type LucideIcon
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { redirect } from 'next/navigation';

interface ReportItem {
    title: string;
    subtitle: string;
    description: string;
    icon: LucideIcon;
    href: string;
    color: string;
    bg: string;
    badge?: string;
}

interface ReportCategory {
    name: string;
    reports: ReportItem[];
}

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

    const categories: ReportCategory[] = [
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
                },
                {
                    title: "Estado de Flujo de Efectivo",
                    subtitle: "Cash Flow Statement",
                    description: "Movimiento real de caja: operativo, inversión y financiamiento.",
                    icon: ArrowLeftRight,
                    href: "/accounting/reports/cash-flow",
                    color: "text-cyan-400",
                    bg: "bg-cyan-500/10"
                },
                {
                    title: "Estado de Cambios en Patrimonio",
                    subtitle: "Equity Changes",
                    description: "Variaciones del patrimonio neto entre periodos contables.",
                    icon: BookOpen,
                    href: "/accounting/reports/equity-changes",
                    color: "text-teal-400",
                    bg: "bg-teal-500/10"
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
                },
                {
                    title: "Libro Diario",
                    subtitle: "Journal Book",
                    description: "Registro cronológico de todas las transacciones contables del periodo.",
                    icon: ClipboardList,
                    href: "/accounting/reports/journal",
                    color: "text-orange-400",
                    bg: "bg-orange-500/10"
                },
                {
                    title: "Libro Mayor",
                    subtitle: "General Ledger",
                    description: "Consolidación por cuenta contable con saldos acumulados.",
                    icon: BookOpen,
                    href: "/accounting/reports/general-ledger",
                    color: "text-pink-400",
                    bg: "bg-pink-500/10"
                }
            ]
        },
        {
            name: "Ventas & Cuentas por Cobrar",
            reports: [
                {
                    title: "Reporte de Ventas",
                    subtitle: "Sales Analysis",
                    description: "Análisis por periodo, cliente, producto y vendedor con tendencias.",
                    icon: TrendingUp,
                    href: "/accounting/reports/sales",
                    color: "text-green-400",
                    bg: "bg-green-500/10"
                },
                {
                    title: "Cartera por Edades",
                    subtitle: "Aging Report",
                    description: "Clasificación de CxC por días de vencimiento: 30, 60, 90, 120+.",
                    icon: BarChart2,
                    href: "/accounting/reports/aging-receivable",
                    color: "text-lime-400",
                    bg: "bg-lime-500/10"
                },
                {
                    title: "Facturas Emitidas",
                    subtitle: "Invoice Registry",
                    description: "Listado completo de facturas con estado, CUFE y trazabilidad DIAN.",
                    icon: Receipt,
                    href: "/accounting/reports/invoices-issued",
                    color: "text-emerald-400",
                    bg: "bg-emerald-500/10"
                }
            ]
        },
        {
            name: "Compras & Cuentas por Pagar",
            reports: [
                {
                    title: "Reporte de Compras",
                    subtitle: "Purchase Analysis",
                    description: "Análisis por proveedor, categoría y evolución mensual de gastos.",
                    icon: Truck,
                    href: "/accounting/reports/purchases",
                    color: "text-blue-400",
                    bg: "bg-blue-500/10"
                },
                {
                    title: "Cuentas por Pagar",
                    subtitle: "Payables Aging",
                    description: "Estado de deudas con proveedores y calendario de vencimientos.",
                    icon: CreditCard,
                    href: "/accounting/reports/aging-payable",
                    color: "text-slate-400",
                    bg: "bg-slate-500/10"
                },
            ]
        },
        {
            name: "Inventarios & Costos",
            reports: [
                {
                    title: "Valoración de Stock",
                    subtitle: "Asset Valuation",
                    description: "Valor real del inventario por bodega, producto y método de costeo.",
                    icon: PieChart,
                    href: "/accounting/reports/inventory-valuation",
                    color: "text-sky-400",
                    bg: "bg-sky-500/10"
                },
                {
                    title: "Kardex por Producto",
                    subtitle: "Stock Movements",
                    description: "Movimientos de entrada/salida por referencia con saldo en unidades y costo.",
                    icon: Package,
                    href: "/accounting/reports/kardex",
                    color: "text-purple-400",
                    bg: "bg-purple-500/10"
                },
                {
                    title: "Productos de Baja Rotación",
                    subtitle: "Slow Movers",
                    description: "Identificación de SKUs sin movimiento para optimizar capital de trabajo.",
                    icon: Activity,
                    href: "/accounting/reports/slow-movers",
                    color: "text-fuchsia-400",
                    bg: "bg-fuchsia-500/10"
                }
            ]
        },
        {
            name: "Tesorería & Bancos",
            reports: [
                {
                    title: "Flujo de Caja Diario",
                    subtitle: "Daily Cash Flow",
                    description: "Ingresos vs egresos diarios con saldo acumulado por cuenta bancaria.",
                    icon: DollarSign,
                    href: "/accounting/reports/daily-cash",
                    color: "text-emerald-400",
                    bg: "bg-emerald-500/10"
                },
                {
                    title: "Conciliación Bancaria",
                    subtitle: "Bank Reconciliation",
                    description: "Cruce de extractos vs libros con identificación de partidas pendientes.",
                    icon: Banknote,
                    href: "/accounting/reports/bank-reconciliation",
                    color: "text-indigo-400",
                    bg: "bg-indigo-500/10"
                }
            ]
        },
        {
            name: "Nómina & Recursos Humanos",
            reports: [
                {
                    title: "Resumen de Nómina",
                    subtitle: "Payroll Summary",
                    description: "Consolidado de salarios, deducciones, aportes y neto a pagar por periodo.",
                    icon: Users,
                    href: "/accounting/reports/payroll-summary",
                    color: "text-violet-400",
                    bg: "bg-violet-500/10",
                },
                {
                    title: "Costos de Empleador",
                    subtitle: "Employer Cost",
                    description: "Carga prestacional total: salud, pensión, ARL, SENA, ICBF y cajas.",
                    icon: Building2,
                    href: "/accounting/reports/employer-cost",
                    color: "text-pink-400",
                    bg: "bg-pink-500/10",
                },
                {
                    title: "Provisiones de Prestaciones",
                    subtitle: "Benefits Provision",
                    description: "Cálculo acumulado de cesantías, intereses, primas y vacaciones.",
                    icon: Calculator,
                    href: "/accounting/reports/benefits-provision",
                    color: "text-rose-400",
                    bg: "bg-rose-500/10",
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
                },
                {
                    title: "Informe de IVA",
                    subtitle: "VAT Report",
                    description: "IVA generado vs IVA descontable con saldo a favor/pagar por bimestre.",
                    icon: Percent,
                    href: "/accounting/reports/vat",
                    color: "text-amber-400",
                    bg: "bg-amber-500/10",
                },
                {
                    title: "Retenciones Practicadas",
                    subtitle: "Withholding Report",
                    description: "Consolidado de ReteFuente, ReteIVA y ReteICA practicadas y asumidas.",
                    icon: Gavel,
                    href: "/accounting/reports/withholdings",
                    color: "text-red-400",
                    bg: "bg-red-500/10",
                },
                {
                    title: "Medios Magnéticos DIAN",
                    subtitle: "Tax Media Files",
                    description: "Generación de archivos XML para reporte de información exógena anual.",
                    icon: FileSpreadsheet,
                    href: "/accounting/reports/tax-media",
                    color: "text-orange-400",
                    bg: "bg-orange-500/10"
                }
            ]
        },
        {
            name: "Documentos para Impresión",
            reports: [
                {
                    title: "Diseñador de Factura",
                    subtitle: "Invoice Template",
                    description: "Plantilla personalizable con logo, datos fiscales, QR DIAN y firma digital.",
                    icon: Printer,
                    href: "/accounting/reports/invoice-template",
                    color: "text-indigo-400",
                    bg: "bg-indigo-500/10"
                },
                {
                    title: "Comprobante de Egreso",
                    subtitle: "Payment Voucher",
                    description: "Formato imprimible de comprobante con datos del beneficiario y firmas.",
                    icon: Wallet,
                    href: "/accounting/reports/expense-voucher",
                    color: "text-emerald-400",
                    bg: "bg-emerald-500/10"
                },
                {
                    title: "Recibo de Caja",
                    subtitle: "Cash Receipt",
                    description: "Formato imprimible para ingresos con consecutivo, concepto y aprobación.",
                    icon: Receipt,
                    href: "/accounting/reports/cash-receipt",
                    color: "text-sky-400",
                    bg: "bg-sky-500/10"
                },
                {
                    title: "Nota Crédito / Débito",
                    subtitle: "Credit/Debit Note",
                    description: "Documento de ajuste con referencia a factura original y causales.",
                    icon: FileText,
                    href: "/accounting/reports/credit-note",
                    color: "text-amber-400",
                    bg: "bg-amber-500/10"
                },
                {
                    title: "Orden de Compra",
                    subtitle: "Purchase Order",
                    description: "Formato oficial de solicitud al proveedor con condiciones y aprobaciones.",
                    icon: ClipboardList,
                    href: "/accounting/reports/purchase-order",
                    color: "text-blue-400",
                    bg: "bg-blue-500/10"
                },
                {
                    title: "Cotización Comercial",
                    subtitle: "Sales Quotation",
                    description: "Propuesta comercial imprimible con productos, precios y vigencia.",
                    icon: Landmark,
                    href: "/accounting/reports/quotation-template",
                    color: "text-violet-400",
                    bg: "bg-violet-500/10"
                }
            ]
        }
    ];

    const totalReports = categories.reduce((sum, cat) => sum + cat.reports.length, 0);
    const activeReports = categories.reduce((sum, cat) => sum + cat.reports.filter(r => !r.badge).length, 0);

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

                    <div className="flex flex-wrap items-center gap-4">
                        <Badge className="bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            <Activity className="h-3 w-3 mr-2 text-emerald-400 animate-pulse" />
                            Libros Contables: Al Día (2026)
                        </Badge>
                        <Badge className="bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            <Lock className="h-3 w-3 mr-2 text-indigo-400" />
                            Acceso Nivel Auditoría
                        </Badge>
                        <Badge className="bg-white/5 border border-white/10 text-white text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            <Zap className="h-3 w-3 mr-2 text-amber-400" />
                            NIIF / IFRS
                        </Badge>
                        <Badge className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2.5 rounded-full">
                            <FileText className="h-3 w-3 mr-2" />
                            {totalReports} Reportes • {activeReports} Activos
                        </Badge>
                    </div>
                </div>
            </div>

            {/* 📋 REPORTS ARCHITECTURE */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

                {/* Stats Sidebar */}
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

                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-6 rounded-3xl group hover:bg-slate-900 hover:scale-[1.02] transition-all duration-500">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-400">Utilidad del Periodo</p>
                                        <p className="text-2xl font-black text-slate-900 italic group-hover:text-white">${profitK}K</p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-3xl group hover:bg-slate-900 hover:scale-[1.02] transition-all duration-500">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-400">Margen de Utilidad</p>
                                        <p className="text-2xl font-black text-slate-900 italic group-hover:text-white">{margin}%</p>
                                    </div>
                                    <div className="bg-slate-50 p-6 rounded-3xl group hover:bg-slate-900 hover:scale-[1.02] transition-all duration-500">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-amber-400">Ratio Operativo</p>
                                        <p className="text-2xl font-black text-slate-900 italic group-hover:text-white">{(pnl.totalIncome / (pnl.totalExpenses || 1)).toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Compliance card */}
                        <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-active space-y-6 relative overflow-hidden">
                            <div className="absolute -bottom-8 -right-8 opacity-10 pointer-events-none">
                                <ShieldCheck className="h-40 w-40" />
                            </div>
                            <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center">
                                <ShieldCheck className="h-8 w-8 text-white" />
                            </div>
                            <div className="space-y-2 relative z-10">
                                <h4 className="text-xl font-black italic uppercase leading-tight">Cumplimiento Fiscal</h4>
                                <p className="text-xs font-medium text-white/70 leading-relaxed">
                                    Reportes sincronizados con normativa DIAN vigente. Generación de medios magnéticos, certificados y documentos tributarios para el año gravable 2026.
                                </p>
                            </div>
                        </div>

                        {/* Export formats */}
                        <div className="bg-white rounded-[3rem] p-8 shadow-premium border border-slate-50">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mb-5">Formatos de Exportación</p>
                            <div className="flex flex-wrap gap-2">
                                {["PDF", "Excel", "CSV", "XML"].map(fmt => (
                                    <Badge key={fmt} className="bg-slate-50 text-slate-600 border-none text-[9px] font-black uppercase tracking-[0.3em] px-4 py-2 rounded-xl">
                                        {fmt}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Categories Grid */}
                <div className="lg:col-span-8 space-y-14">
                    {categories.map((cat, catIndex) => (
                        <div key={cat.name} className="space-y-6" style={{ animationDelay: `${catIndex * 100}ms` }}>
                            <div className="flex items-center gap-4 px-2">
                                <div className="h-8 w-1 bg-indigo-600 rounded-full" />
                                <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">{cat.name}</h2>
                                <Badge className="bg-slate-100 text-slate-400 border-none text-[8px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-lg">
                                    {cat.reports.length}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {cat.reports.map((report) => (
                                    <Link key={report.href} href={report.badge ? "#" : report.href} className={cn("group", report.badge && "cursor-default")}>
                                        <Card className={cn(
                                            "border-none shadow-premium bg-white rounded-[2.5rem] p-7 h-full transition-all relative overflow-hidden",
                                            report.badge
                                                ? "opacity-60 hover:opacity-80"
                                                : "group-hover:translate-y-[-4px] group-hover:shadow-active"
                                        )}>
                                            <div className="flex items-start gap-5">
                                                <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:rotate-6", report.bg, report.color)}>
                                                    <report.icon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-1.5">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <h3 className="text-sm font-black text-slate-900 tracking-tight truncate">{report.title}</h3>
                                                        {report.badge ? (
                                                            <Badge className="bg-slate-100 text-slate-400 border-none text-[7px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md shrink-0">
                                                                {report.badge}
                                                            </Badge>
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4 text-slate-200 group-hover:text-slate-900 group-hover:translate-x-1 transition-all shrink-0" />
                                                        )}
                                                    </div>
                                                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{report.subtitle}</p>
                                                    <p className="text-[11px] text-slate-400 leading-relaxed font-medium line-clamp-2">
                                                        {report.description}
                                                    </p>
                                                </div>
                                            </div>
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
