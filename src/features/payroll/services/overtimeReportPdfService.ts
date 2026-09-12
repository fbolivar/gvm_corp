import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
    drawBrandHeader, drawBrandFooter, brandTableStyles,
    pdfFmtDate, PDF_INK, PDF_MUTED, PDF_PRIMARY, PDF_SOFT, PDF_LINE,
    type PdfCompany,
} from '@/shared/lib/pdfKit'
import type { OvertimeRequest } from '../types'

const STATUS_LABEL: Record<string, string> = {
    PENDING: 'Pendiente',
    APPROVED: 'Aprobada',
    REJECTED: 'Rechazada',
}

function employeeName(req: OvertimeRequest): string {
    const emp = req.employee as { party?: { legal_name?: string } } | undefined
    return emp?.party?.legal_name ?? 'Sin nombre'
}

/**
 * Reporte de horas extra en PDF (para enviar a contabilidad).
 * Incluye la observación del empleado y la nota de quien revisó, que es lo que
 * justifica cada solicitud ante contabilidad.
 */
export async function generateOvertimeReportPdf(opts: {
    company: PdfCompany;
    requests: OvertimeRequest[];
    /** Etiqueta del filtro aplicado: "Aprobadas", "Todas", ... */
    filterLabel: string;
    /** Periodo elegido en pantalla: "Agosto de 2026", "2026-08-01 a 2026-08-15"... */
    rangeLabel?: string;
    generatedBy?: string;
}): Promise<void> {
    const { company, requests, filterLabel, rangeLabel, generatedBy } = opts
    const M = 12
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pw = doc.internal.pageSize.width

    // Orden pensado para revisión contable: por empleado y fecha ascendente.
    const rows = [...requests].sort((a, b) => {
        const n = employeeName(a).localeCompare(employeeName(b))
        return n !== 0 ? n : String(a.date).localeCompare(String(b.date))
    })

    const totalHours = rows.reduce((s, r) => s + Number(r.hours || 0), 0)
    const dates = rows.map(r => String(r.date)).filter(Boolean).sort()
    const period = dates.length
        ? `${pdfFmtDate(dates[0])} — ${pdfFmtDate(dates[dates.length - 1])}`
        : 'Sin registros'

    let y = await drawBrandHeader(doc, {
        company,
        title: 'Horas Extra',
        subtitle: `Filtro: ${filterLabel}   ·   Periodo: ${rangeLabel || period}   ·   ${rows.length} solicitud(es)`,
        margin: M,
    })

    // Resumen
    doc.setFillColor(...PDF_SOFT)
    doc.setDrawColor(...PDF_LINE)
    doc.setLineWidth(0.3)
    doc.roundedRect(M, y, pw - M * 2, 12, 2, 2, 'FD')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...PDF_INK)
    doc.text(`Total horas: ${totalHours.toLocaleString('es-CO')} h`, M + 4, y + 7.6)
    const byStatus = ['APPROVED', 'PENDING', 'REJECTED']
        .map(s => {
            const list = rows.filter(r => r.status === s)
            return list.length ? `${STATUS_LABEL[s]}: ${list.length} (${list.reduce((a, r) => a + Number(r.hours || 0), 0)} h)` : ''
        })
        .filter(Boolean)
        .join('     ')
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...PDF_MUTED)
    doc.text(byStatus, M + 52, y + 7.6)
    y += 16

    // Detalle
    autoTable(doc, {
        startY: y,
        margin: { left: M, right: M },
        head: [['Empleado', 'Fecha', 'Horas', 'Observación', 'Estado']],
        body: rows.map(r => {
            const obs = (r.reason || '').trim() || '—'
            const note = (r.reviewer_notes || '').trim()
            return [
                employeeName(r),
                pdfFmtDate(String(r.date)),
                `${Number(r.hours || 0)}`,
                note ? `${obs}\nRevisión: ${note}` : obs,
                STATUS_LABEL[r.status] ?? r.status,
            ]
        }),
        ...brandTableStyles(),
        columnStyles: {
            0: { cellWidth: 44 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 14, halign: 'right', fontStyle: 'bold' },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 22, halign: 'center' },
        },
    })

    // Totales por empleado — lo que contabilidad necesita para liquidar.
    const perEmployee = new Map<string, { count: number; hours: number }>()
    for (const r of rows) {
        const k = employeeName(r)
        const acc = perEmployee.get(k) ?? { count: 0, hours: 0 }
        acc.count += 1
        acc.hours += Number(r.hours || 0)
        perEmployee.set(k, acc)
    }

    const afterDetail = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y
    autoTable(doc, {
        startY: afterDetail + 8,
        margin: { left: M, right: M },
        head: [['Resumen por empleado', 'Solicitudes', 'Horas']],
        body: [...perEmployee.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([name, v]) => [name, String(v.count), `${v.hours}`]),
        foot: [['TOTAL', String(rows.length), `${totalHours}`]],
        ...brandTableStyles(),
        footStyles: {
            fillColor: PDF_SOFT as unknown as [number, number, number],
            textColor: PDF_INK as unknown as [number, number, number],
            fontStyle: 'bold' as const,
            fontSize: 8,
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 28, halign: 'center' },
            2: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
        },
    })

    // Firma de autorización (contabilidad suele pedirla)
    const afterSummary = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? afterDetail
    let sy = afterSummary + 18
    if (sy > doc.internal.pageSize.height - 45) { doc.addPage(); sy = 30 }
    doc.setDrawColor(...PDF_LINE)
    doc.setLineWidth(0.3)
    doc.line(M + 6, sy, M + 70, sy)
    doc.line(pw - M - 70, sy, pw - M - 6, sy)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...PDF_MUTED)
    doc.text('Elaborado por', M + 6, sy + 4)
    doc.text('Aprobado por', pw - M - 70, sy + 4)
    if (generatedBy) {
        doc.setTextColor(...PDF_INK)
        doc.setFont('helvetica', 'bold')
        doc.text(generatedBy, M + 6, sy - 2)
    }

    // Pie + numeración en todas las páginas
    const pages = doc.getNumberOfPages()
    const stamp = new Date().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
    for (let p = 1; p <= pages; p++) {
        doc.setPage(p)
        drawBrandFooter(doc, company, { margin: M, note: `Generado ${stamp}${generatedBy ? ` por ${generatedBy}` : ''}` })
        doc.setFontSize(7)
        doc.setTextColor(...PDF_PRIMARY)
        doc.text(`${p} / ${pages}`, pw - M, doc.internal.pageSize.height - 8, { align: 'right' })
    }

    const slug = [filterLabel, rangeLabel].filter(Boolean).join('_').replace(/[^A-Za-z0-9]+/g, '_')
    doc.save(`Horas_Extra_${slug}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
