"use client"

import { useState } from "react"
import { Card } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
    Calculator,
    Calendar,
    Download,
    AlertCircle,
    TrendingUp,
    ShieldCheck,
    Coins,
    FileText,
} from "lucide-react"
import { format, differenceInDays } from "date-fns"
import { cn } from "@/shared/lib/utils"

export function SettlementSimulator() {
    const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [salary, setSalary] = useState(1300606)
    const [transportAllowance, setTransportAllowance] = useState(162000)

    const calculateSettlement = () => {
        const days = differenceInDays(new Date(endDate), new Date(startDate)) + 1
        const baseSalary = salary + transportAllowance

        const severancePay = (baseSalary * days) / 360
        const severanceInterest = (severancePay * days * 0.12) / 360
        const serviceBonus = (baseSalary * days) / 360
        const vacation = (salary * days) / 720

        const total = severancePay + severanceInterest + serviceBonus + vacation

        return { days, severancePay, severanceInterest, serviceBonus, vacation, total }
    }

    const results = calculateSettlement()

    const fmt = (val: number) =>
        `$${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(val)}`

    const concepts = [
        { label: 'Cesantias', value: results.severancePay, icon: Coins, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Int. Cesantias', value: results.severanceInterest, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Prima de Servicios', value: results.serviceBonus, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Vacaciones', value: results.vacation, icon: FileText, color: 'text-rose-600', bg: 'bg-rose-50' },
    ]

    const handleDownloadPdf = async () => {
        const { default: jsPDF } = await import('jspdf')
        const doc = new jsPDF('p', 'mm', 'letter')
        const w = doc.internal.pageSize.getWidth()
        let y = 20

        // Header
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.text('SIMULACION DE LIQUIDACION', w / 2, y, { align: 'center' })
        y += 8
        doc.setFontSize(9)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100)
        doc.text('Documento informativo — No constituye documento legal', w / 2, y, { align: 'center' })
        y += 12

        // Parameters box
        doc.setDrawColor(200)
        doc.setFillColor(248, 250, 252)
        doc.roundedRect(15, y, w - 30, 36, 3, 3, 'FD')
        y += 8
        doc.setTextColor(60)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('PARAMETROS', 20, y)
        y += 7
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        const params = [
            ['Fecha de Ingreso:', startDate],
            ['Fecha de Retiro:', endDate],
            ['Salario Base:', fmt(salary)],
            ['Aux. Transporte:', fmt(transportAllowance)],
            ['Dias Laborados:', `${results.days} dias`],
        ]
        for (const [label, value] of params) {
            doc.text(label, 20, y)
            doc.setFont('helvetica', 'bold')
            doc.text(value, 80, y)
            doc.setFont('helvetica', 'normal')
            y += 5
        }
        y += 10

        // Results table
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(60)
        doc.text('CONCEPTO', 20, y)
        doc.text('VALOR', w - 20, y, { align: 'right' })
        y += 2
        doc.setDrawColor(200)
        doc.line(20, y, w - 20, y)
        y += 6

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(30)
        const rows = [
            ['Cesantias', fmt(results.severancePay)],
            ['Intereses sobre Cesantias', fmt(results.severanceInterest)],
            ['Prima de Servicios', fmt(results.serviceBonus)],
            ['Vacaciones', fmt(results.vacation)],
        ]
        for (const [label, value] of rows) {
            doc.text(label, 20, y)
            doc.text(value, w - 20, y, { align: 'right' })
            y += 7
        }

        // Total
        y += 2
        doc.setDrawColor(100)
        doc.line(20, y, w - 20, y)
        y += 7
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('TOTAL LIQUIDACION ESTIMADA', 20, y)
        doc.text(fmt(results.total), w - 20, y, { align: 'right' })
        y += 14

        // Disclaimer
        doc.setFontSize(7)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(120)
        const disclaimer = 'Este calculo es una simulacion informativa basada en las normas laborales vigentes en Colombia. Los valores reales pueden variar segun pactos extralegales, deducciones de nomina o novedades del contrato.'
        const lines = doc.splitTextToSize(disclaimer, w - 40)
        doc.text(lines, 20, y)
        y += lines.length * 4 + 6

        // Footer
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(160)
        doc.text(`Generado el ${new Date().toLocaleDateString('es-CO')} — GVM Corp`, w / 2, y, { align: 'center' })

        doc.save(`simulacion-liquidacion-${endDate}.pdf`)
    }

    return (
        <div className="space-y-6">
            {/* Input parameters */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                        <Calculator className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Parametros de Calculo</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Fechas y montos base</p>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fecha de Ingreso</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-9 pl-9 rounded-xl text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fecha de Retiro</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-9 pl-9 rounded-xl text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Salario Base (COP)</label>
                            <div className="relative">
                                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                                <Input
                                    type="number"
                                    value={salary}
                                    onChange={(e) => setSalary(Number(e.target.value))}
                                    className="h-9 pl-9 rounded-xl text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Aux. Transporte</label>
                            <div className="relative">
                                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
                                <Input
                                    type="number"
                                    value={transportAllowance}
                                    onChange={(e) => setTransportAllowance(Number(e.target.value))}
                                    className="h-9 pl-9 rounded-xl text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0">
                                <TrendingUp className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-900">Tiempo Total Calculado</p>
                                <p className="text-[10px] text-slate-400">{results.days} dias de prestacion social</p>
                            </div>
                        </div>
                        <Button size="sm" className="h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs">
                            Recalcular
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Results */}
            <Card className="rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Liquidacion Estimada</h3>
                        <p className="text-lg font-bold text-slate-900 font-mono tabular-nums">{fmt(results.total)}</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl gap-2 text-xs" onClick={handleDownloadPdf}>
                        <Download className="h-3.5 w-3.5" /> Descargar PDF
                    </Button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {concepts.map((c, i) => (
                        <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", c.bg, c.color)}>
                                    <c.icon className="h-4 w-4" />
                                </div>
                            </div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{c.label}</p>
                            <p className="text-sm font-bold text-slate-900 font-mono tabular-nums mt-0.5">{fmt(c.value)}</p>
                        </div>
                    ))}
                </div>

                {/* Disclaimer */}
                <div className="px-6 pb-6">
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-700 leading-relaxed">
                            Este calculo es una <span className="font-bold">simulacion informativa</span> basada en las normas laborales vigentes en Colombia. Los valores reales pueden variar segun pactos extralegales, deducciones de nomina o novedades del contrato.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    )
}
