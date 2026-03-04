import { createClient } from '@/lib/supabase/server';
import { accountingService } from '@/features/accounting/services/accountingService';
import { settingsService } from '@/features/settings/services/settingsService';
import { Card } from "@/shared/components/ui/card"
import { VisualReportHeader } from '@/features/accounting/components/VisualReportHeader';
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
    const ratio = (pnl.totalIncome / (pnl.totalExpenses || 1)).toFixed(2);

    const categories: ReportCategory[] = [
        {
            name: "Estados Financieros",
            reports: [
                { title: "Estado de Resultados", subtitle: "P&L Analysis", description: "Analisis de rentabilidad, utilidad bruta y EBITDA operativo.", icon: BarChart3, href: "/accounting/reports/p-and-l", color: "text-indigo-600", bg: "bg-indigo-50" },
                { title: "Balance General", subtitle: "Snapshot Financiero", description: "Activos, Pasivos y Patrimonio bajo normativa NIIF.", icon: Scale, href: "/accounting/reports/balance-sheet", color: "text-emerald-600", bg: "bg-emerald-50" },
                { title: "Flujo de Efectivo", subtitle: "Cash Flow Statement", description: "Movimiento real de caja: operativo, inversion y financiamiento.", icon: ArrowLeftRight, href: "/accounting/reports/cash-flow", color: "text-cyan-600", bg: "bg-cyan-50" },
                { title: "Cambios en Patrimonio", subtitle: "Equity Changes", description: "Variaciones del patrimonio neto entre periodos contables.", icon: BookOpen, href: "/accounting/reports/equity-changes", color: "text-teal-600", bg: "bg-teal-50" },
            ]
        },
        {
            name: "Auditoria y Control",
            reports: [
                { title: "Balance de Prueba", subtitle: "Trial Balance", description: "Validacion de sumas iguales por cuenta.", icon: ListFilter, href: "/accounting/reports/trial-balance", color: "text-amber-600", bg: "bg-amber-50" },
                { title: "Libro Auxiliar", subtitle: "Ledger Detail", description: "Trazabilidad de cada movimiento contable por tercero.", icon: FileText, href: "/accounting/reports/auxiliary", color: "text-rose-600", bg: "bg-rose-50" },
                { title: "Libro Diario", subtitle: "Journal Book", description: "Registro cronologico de transacciones contables del periodo.", icon: ClipboardList, href: "/accounting/reports/journal", color: "text-orange-600", bg: "bg-orange-50" },
                { title: "Libro Mayor", subtitle: "General Ledger", description: "Consolidacion por cuenta contable con saldos acumulados.", icon: BookOpen, href: "/accounting/reports/general-ledger", color: "text-pink-600", bg: "bg-pink-50" },
            ]
        },
        {
            name: "Ventas y Cuentas por Cobrar",
            reports: [
                { title: "Reporte de Ventas", subtitle: "Sales Analysis", description: "Analisis por periodo, cliente, producto y vendedor.", icon: TrendingUp, href: "/accounting/reports/sales", color: "text-green-600", bg: "bg-green-50" },
                { title: "Cartera por Edades", subtitle: "Aging Report", description: "Clasificacion de CxC por dias de vencimiento.", icon: BarChart2, href: "/accounting/reports/aging-receivable", color: "text-lime-600", bg: "bg-lime-50" },
                { title: "Facturas Emitidas", subtitle: "Invoice Registry", description: "Listado de facturas con estado, CUFE y trazabilidad DIAN.", icon: Receipt, href: "/accounting/reports/invoices-issued", color: "text-emerald-600", bg: "bg-emerald-50" },
            ]
        },
        {
            name: "Compras y Cuentas por Pagar",
            reports: [
                { title: "Reporte de Compras", subtitle: "Purchase Analysis", description: "Analisis por proveedor, categoria y evolucion mensual.", icon: Truck, href: "/accounting/reports/purchases", color: "text-blue-600", bg: "bg-blue-50" },
                { title: "Cuentas por Pagar", subtitle: "Payables Aging", description: "Estado de deudas con proveedores y vencimientos.", icon: CreditCard, href: "/accounting/reports/aging-payable", color: "text-slate-600", bg: "bg-slate-50" },
            ]
        },
        {
            name: "Inventarios y Costos",
            reports: [
                { title: "Valoracion de Stock", subtitle: "Asset Valuation", description: "Valor del inventario por bodega, producto y metodo de costeo.", icon: PieChart, href: "/accounting/reports/inventory-valuation", color: "text-sky-600", bg: "bg-sky-50" },
                { title: "Kardex por Producto", subtitle: "Stock Movements", description: "Movimientos de entrada/salida con saldo en unidades y costo.", icon: Package, href: "/accounting/reports/kardex", color: "text-purple-600", bg: "bg-purple-50" },
                { title: "Baja Rotacion", subtitle: "Slow Movers", description: "SKUs sin movimiento para optimizar capital de trabajo.", icon: Activity, href: "/accounting/reports/slow-movers", color: "text-fuchsia-600", bg: "bg-fuchsia-50" },
            ]
        },
        {
            name: "Tesoreria y Bancos",
            reports: [
                { title: "Flujo de Caja Diario", subtitle: "Daily Cash Flow", description: "Ingresos vs egresos diarios con saldo acumulado.", icon: DollarSign, href: "/accounting/reports/daily-cash", color: "text-emerald-600", bg: "bg-emerald-50" },
                { title: "Conciliacion Bancaria", subtitle: "Bank Reconciliation", description: "Cruce de extractos vs libros con partidas pendientes.", icon: Banknote, href: "/accounting/reports/bank-reconciliation", color: "text-indigo-600", bg: "bg-indigo-50" },
            ]
        },
        {
            name: "Nomina y Recursos Humanos",
            reports: [
                { title: "Resumen de Nomina", subtitle: "Payroll Summary", description: "Consolidado de salarios, deducciones, aportes y neto a pagar.", icon: Users, href: "/accounting/reports/payroll-summary", color: "text-violet-600", bg: "bg-violet-50" },
                { title: "Costos de Empleador", subtitle: "Employer Cost", description: "Carga prestacional total: salud, pension, ARL, SENA, ICBF.", icon: Building2, href: "/accounting/reports/employer-cost", color: "text-pink-600", bg: "bg-pink-50" },
                { title: "Provisiones", subtitle: "Benefits Provision", description: "Calculo de cesantias, intereses, primas y vacaciones.", icon: Calculator, href: "/accounting/reports/benefits-provision", color: "text-rose-600", bg: "bg-rose-50" },
            ]
        },
        {
            name: "Fiscal y Legal",
            reports: [
                { title: "Certificados Tributarios", subtitle: "Tax Compliance", description: "Certificados de Retencion en la Fuente, IVA e ICA.", icon: ShieldCheck, href: "/accounting/reports/certificates", color: "text-violet-600", bg: "bg-violet-50" },
                { title: "Informe de IVA", subtitle: "VAT Report", description: "IVA generado vs descontable con saldo a favor/pagar.", icon: Percent, href: "/accounting/reports/vat", color: "text-amber-600", bg: "bg-amber-50" },
                { title: "Retenciones", subtitle: "Withholding Report", description: "Consolidado de ReteFuente, ReteIVA y ReteICA.", icon: Gavel, href: "/accounting/reports/withholdings", color: "text-red-600", bg: "bg-red-50" },
                { title: "Medios Magneticos DIAN", subtitle: "Tax Media Files", description: "Archivos XML para informacion exogena anual.", icon: FileSpreadsheet, href: "/accounting/reports/tax-media", color: "text-orange-600", bg: "bg-orange-50" },
            ]
        },
        {
            name: "Documentos para Impresion",
            reports: [
                { title: "Factura", subtitle: "Invoice Template", description: "Plantilla con logo, datos fiscales, QR DIAN y firma.", icon: Printer, href: "/accounting/reports/invoice-template", color: "text-indigo-600", bg: "bg-indigo-50" },
                { title: "Comprobante de Egreso", subtitle: "Payment Voucher", description: "Formato de comprobante con datos del beneficiario.", icon: Wallet, href: "/accounting/reports/expense-voucher", color: "text-emerald-600", bg: "bg-emerald-50" },
                { title: "Recibo de Caja", subtitle: "Cash Receipt", description: "Formato para ingresos con consecutivo y concepto.", icon: Receipt, href: "/accounting/reports/cash-receipt", color: "text-sky-600", bg: "bg-sky-50" },
                { title: "Nota Credito / Debito", subtitle: "Credit/Debit Note", description: "Documento de ajuste con referencia a factura original.", icon: FileText, href: "/accounting/reports/credit-note", color: "text-amber-600", bg: "bg-amber-50" },
                { title: "Orden de Compra", subtitle: "Purchase Order", description: "Formato de solicitud al proveedor con condiciones.", icon: ClipboardList, href: "/accounting/reports/purchase-order", color: "text-blue-600", bg: "bg-blue-50" },
                { title: "Cotizacion Comercial", subtitle: "Sales Quotation", description: "Propuesta comercial con productos, precios y vigencia.", icon: Landmark, href: "/accounting/reports/quotation-template", color: "text-violet-600", bg: "bg-violet-50" },
            ]
        }
    ];

    const totalReports = categories.reduce((sum, cat) => sum + cat.reports.length, 0);

    const statsCards = [
        { label: 'Utilidad del Periodo', value: `$${profitK}K`, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: TrendingUp },
        { label: 'Margen de Utilidad', value: `${margin}%`, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: BarChart3 },
        { label: 'Ratio Operativo', value: ratio, color: 'text-amber-600', bg: 'bg-amber-50', icon: Activity },
        { label: 'Total Reportes', value: totalReports, color: 'text-slate-600', bg: 'bg-slate-50', icon: FileText },
    ];

    return (
        <div className="page-container space-y-6 pb-20 animate-in fade-in duration-500">
            <VisualReportHeader
                title="Centro de Inteligencia"
                subtitle="Reportes financieros, operativos y fiscales"
                tenant={tenant}
            />

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {statsCards.map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-3">
                        <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", s.bg, s.color)}>
                            <s.icon className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{s.label}</p>
                            <p className="text-sm font-bold text-slate-900 font-mono tabular-nums">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Report Categories */}
            <div className="space-y-8">
                {categories.map((cat) => (
                    <div key={cat.name} className="space-y-3">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-slate-900">{cat.name}</h2>
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">{cat.reports.length}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {cat.reports.map((report) => (
                                <Link key={report.href} href={report.href}>
                                    <Card className="rounded-2xl border border-slate-100 shadow-sm p-4 h-full hover:border-indigo-100 transition-colors group">
                                        <div className="flex items-start gap-3">
                                            <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", report.bg, report.color)}>
                                                <report.icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h3 className="text-xs font-bold text-slate-900 truncate">{report.title}</h3>
                                                    <ChevronRight className="h-3.5 w-3.5 text-slate-200 group-hover:text-slate-500 transition-colors shrink-0" />
                                                </div>
                                                <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wider">{report.subtitle}</p>
                                                <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5 line-clamp-2">{report.description}</p>
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
    );
}
