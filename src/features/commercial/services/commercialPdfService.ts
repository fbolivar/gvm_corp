import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
    drawBrandHeader, drawBrandFooter, brandTableStyles,
    pdfFmtInt, pdfFmtDate,
    PDF_PRIMARY, PDF_MUTED, PDF_INK, PDF_SOFT, PDF_LINE,
    type PdfCompany,
} from '@/shared/lib/pdfKit'
import { ITEM_TYPE_LABELS, STATUS_META } from '../types'

const money = (v: number) => `$${pdfFmtInt(Math.round(Number(v) || 0))}`

interface PdfRequest {
    number?: string | null
    title?: string
    purpose?: string | null
    destination?: string | null
    start_date?: string | null
    end_date?: string | null
    status?: string
    total_estimated?: number
    total_actual?: number | null
    decision_notes?: string | null
    requester?: { full_name?: string | null; email?: string | null } | null
    approver?: { full_name?: string | null } | null
    party?: { legal_name?: string | null } | null
    items?: Array<{ type: string; description?: string | null; schedule?: string | null; quantity: number; unit_cost: number; subtotal: number; actual_cost?: number | null }>
}

export const commercialPdfService = {
    async generate(request: PdfRequest, company: PdfCompany) {
        const doc = new jsPDF('p', 'mm', 'letter')
        const pw = doc.internal.pageSize.width
        const M = 12
        const CW = pw - M * 2

        let y = await drawBrandHeader(doc, {
            company,
            title: 'Solicitud Comercial',
            number: request.number ?? '',
            margin: M,
        })

        const isLiquidated = request.status === 'LIQUIDATED'

        // Título de la solicitud
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...PDF_INK)
        doc.text(doc.splitTextToSize(request.title || '—', CW), M, y)
        y += 7

        // Bloque de información
        const blockH = request.purpose ? 34 : 26
        doc.setFillColor(...PDF_SOFT); doc.setDrawColor(...PDF_LINE); doc.setLineWidth(0.3)
        doc.roundedRect(M, y, CW, blockH, 2, 2, 'FD')
        const colW = (CW - 8) / 2
        const lx = M + 4, rx = M + colW + 8
        const field = (lab: string, val: string, x: number, yy: number, labW = 30) => {
            doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_MUTED)
            doc.text(lab.toUpperCase(), x, yy)
            doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_INK)
            doc.text(doc.splitTextToSize(val || '-', colW - labW - 2), x + labW, yy)
        }
        field('Solicitante', request.requester?.full_name || request.requester?.email || '—', lx, y + 6)
        field('Destino', request.destination || '—', lx, y + 13)
        field('Fechas', `${pdfFmtDate(request.start_date)} - ${pdfFmtDate(request.end_date)}`, lx, y + 20)
        field('Estado', STATUS_META[(request.status as keyof typeof STATUS_META)]?.label ?? request.status ?? '—', rx, y + 6)
        field('Cliente', request.party?.legal_name || '—', rx, y + 13)
        field('Decidido por', request.approver?.full_name || '—', rx, y + 20)
        if (request.purpose) {
            doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_MUTED)
            doc.text('MOTIVO', lx, y + 27)
            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_INK)
            doc.text(doc.splitTextToSize(request.purpose, CW - 22), lx + 14, y + 27)
        }
        y += blockH + 5

        // Tabla de conceptos
        const head = isLiquidated
            ? [['#', 'Tipo', 'Descripción', 'Cant.', 'Costo Unit.', 'Estimado', 'Real']]
            : [['#', 'Tipo', 'Descripción', 'Cant.', 'Costo Unit.', 'Subtotal']]
        const body = (request.items || []).map((it, i) => {
            const base = [
                String(i + 1),
                ITEM_TYPE_LABELS[it.type] ?? it.type,
                it.schedule ? `${it.description ?? ''}\nHorario: ${it.schedule}` : (it.description ?? ''),
                pdfFmtInt(Number(it.quantity)),
                money(Number(it.unit_cost)),
                money(Number(it.subtotal)),
            ]
            if (isLiquidated) base.push(money(Number(it.actual_cost ?? 0)))
            return base
        })
        const footRow = isLiquidated
            ? ['', '', 'TOTALES', '', '', money(Number(request.total_estimated)), money(Number(request.total_actual))]
            : ['', '', 'TOTAL', '', '', money(Number(request.total_estimated))]

        const tableBase = brandTableStyles()
        autoTable(doc, {
            startY: y, head, body, foot: [footRow],
            ...tableBase,
            styles: { ...tableBase.styles, fontSize: 8 },
            footStyles: { fillColor: PDF_SOFT as unknown as [number, number, number], textColor: PDF_INK as unknown as [number, number, number], fontStyle: 'bold', fontSize: 8 },
            columnStyles: {
                0: { halign: 'center', cellWidth: 8 },
                1: { cellWidth: 26, fontStyle: 'bold' },
                2: { cellWidth: 'auto' },
                3: { halign: 'right', cellWidth: 16 },
                4: { halign: 'right', cellWidth: 26 },
                5: { halign: 'right', cellWidth: 26 },
                6: { halign: 'right', cellWidth: 26 },
            },
            margin: { left: M, right: M },
        })
        y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 30
        y += 6

        // Notas de decisión
        if (request.decision_notes) {
            doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_PRIMARY)
            doc.text('OBSERVACIONES DE LA DECISIÓN', M, y)
            doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_INK); doc.setFontSize(8)
            doc.text(doc.splitTextToSize(request.decision_notes, CW), M, y + 4.5)
            y += 14
        }

        // Firmas
        y = Math.max(y, doc.internal.pageSize.height - 42)
        const sigW = (CW - 20) / 2
        doc.setDrawColor(...PDF_INK); doc.setLineWidth(0.3)
        doc.line(M, y, M + sigW, y)
        doc.line(pw - M - sigW, y, pw - M, y)
        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_INK)
        doc.text('SOLICITANTE', M, y + 4)
        doc.text('APROBACIÓN', pw - M - sigW, y + 4)
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_MUTED); doc.setFontSize(6.5)
        doc.text(request.requester?.full_name || 'Firma y nombre', M, y + 8)
        doc.text(request.approver?.full_name || 'Firma y nombre', pw - M - sigW, y + 8)

        drawBrandFooter(doc, company, { margin: M })
        doc.save(`Solicitud_${request.number || 'SIN-NUMERO'}.pdf`)
    },
}
