"use client"

import { Button } from "@/shared/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { useState } from "react"

interface PayrollSlipData {
    docNumber: string
    issueDate: string
    netAmount: number
    employeeName: string
    salary: number
    contractType: string
    companyName: string
}

interface Props extends PayrollSlipData {
    className?: string
}

export function PayrollSlipButton({
    docNumber, issueDate, netAmount, employeeName, salary,
    contractType, companyName, className
}: Props) {
    const [loading, setLoading] = useState(false)

    const handleDownload = async () => {
        setLoading(true)
        try {
            const { jsPDF } = await import('jspdf')
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

            const fmtCOP = (n: number) =>
                `$ ${new Intl.NumberFormat('es-CO').format(Math.round(n))}`

            const pageW = doc.internal.pageSize.getWidth()
            const margin = 18

            // ── HEADER BAR ────────────────────────────────────────
            doc.setFillColor(15, 23, 42)   // slate-900
            doc.rect(0, 0, pageW, 38, 'F')

            doc.setTextColor(255, 255, 255)
            doc.setFontSize(16)
            doc.setFont('helvetica', 'bold')
            doc.text('DESPRENDIBLE DE PAGO', margin, 16)

            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(148, 163, 184)
            doc.text(companyName.toUpperCase(), margin, 24)
            doc.text(`No. ${docNumber}  |  ${issueDate}`, margin, 30)

            // ── EMPLOYEE INFO ──────────────────────────────────────
            let y = 50
            doc.setTextColor(15, 23, 42)
            doc.setFontSize(11)
            doc.setFont('helvetica', 'bold')
            doc.text('EMPLEADO', margin, y)

            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(71, 85, 105)
            doc.text(employeeName, margin, y + 7)
            doc.text(`Contrato: ${contractType}  |  Sueldo Básico: ${fmtCOP(salary)}`, margin, y + 14)

            // ── DIVIDER ────────────────────────────────────────────
            y += 26
            doc.setDrawColor(226, 232, 240)
            doc.line(margin, y, pageW - margin, y)

            // ── CONCEPTS TABLE ─────────────────────────────────────
            y += 10
            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(15, 23, 42)
            doc.text('CONCEPTOS', margin, y)

            const concepts: { label: string; amount: number; type: 'D' | 'E' }[] = [
                { label: 'Salario Básico', amount: salary, type: 'D' },
                { label: 'Salud (4%)', amount: salary * 0.04, type: 'E' },
                { label: 'Pensión (4%)', amount: salary * 0.04, type: 'E' },
            ]

            y += 8
            doc.setFontSize(8)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(100, 116, 139)
            doc.text('CONCEPTO', margin, y)
            doc.text('DEVENGADO', pageW / 2 - 10, y, { align: 'center' })
            doc.text('DEDUCCIÓN', pageW - margin, y, { align: 'right' })

            doc.setDrawColor(226, 232, 240)
            y += 2
            doc.line(margin, y, pageW - margin, y)
            y += 5

            concepts.forEach(c => {
                doc.setFont('helvetica', 'normal')
                doc.setTextColor(71, 85, 105)
                doc.text(c.label, margin, y)
                if (c.type === 'D') {
                    doc.setTextColor(5, 150, 105)
                    doc.text(fmtCOP(c.amount), pageW / 2 - 10, y, { align: 'center' })
                } else {
                    doc.setTextColor(220, 38, 38)
                    doc.text(fmtCOP(c.amount), pageW - margin, y, { align: 'right' })
                }
                y += 8
            })

            // ── NET TOTAL ──────────────────────────────────────────
            y += 4
            doc.setFillColor(241, 245, 249)
            doc.rect(margin, y - 4, pageW - margin * 2, 18, 'F')

            doc.setFontSize(10)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(15, 23, 42)
            doc.text('NETO A PAGAR', margin + 4, y + 5)

            doc.setFontSize(14)
            doc.setTextColor(5, 150, 105)
            doc.text(fmtCOP(netAmount), pageW - margin - 4, y + 5, { align: 'right' })

            // ── FOOTER ─────────────────────────────────────────────
            const footerY = doc.internal.pageSize.getHeight() - 18
            doc.setFontSize(7)
            doc.setFont('helvetica', 'italic')
            doc.setTextColor(148, 163, 184)
            doc.text('Documento generado electrónicamente — GVM Corp ERP', pageW / 2, footerY, { align: 'center' })

            doc.save(`Desprendible_${docNumber.replace(/\//g, '-')}.pdf`)
        } catch (err) {
            console.error('Error generando PDF:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            variant="outline"
            onClick={handleDownload}
            disabled={loading}
            className={`h-16 w-16 rounded-2xl border-none bg-slate-50 hover:bg-slate-900 text-slate-400 hover:text-white transition-all duration-500 group/btn ${className ?? ''}`}
        >
            {loading
                ? <Loader2 className="h-6 w-6 animate-spin" />
                : <Download className="h-6 w-6 group-hover/btn:translate-y-1 transition-transform" />
            }
        </Button>
    )
}
