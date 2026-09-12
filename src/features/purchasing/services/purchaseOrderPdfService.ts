import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
    drawBrandHeader, drawBrandFooter, brandTableStyles,
    pdfFmtInt, pdfFmtDate,
    PDF_PRIMARY, PDF_MUTED, PDF_INK, PDF_SOFT, PDF_LINE,
    type PdfCompany,
} from '@/shared/lib/pdfKit'

const money = (v: number) => `$${pdfFmtInt(Math.round(Number(v) || 0))}`

const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Borrador',
    PENDING_APPROVAL: 'Pendiente Aprobación',
    APPROVED: 'Aprobada',
    PARTIALLY_RECEIVED: 'Parcialmente Recibida',
    RECEIVED: 'Recibida',
    CANCELLED: 'Anulada',
}

interface PdfLine {
    qty: number
    unit_cost: number
    tax_rate?: number | null
    product?: { name?: string | null; sku?: string | null } | null
}

interface PdfOrder {
    po_number?: string | null
    status?: string
    order_date?: string | null
    expected_delivery?: string | null
    currency?: string
    notes?: string | null
    subtotal?: number
    tax_total?: number
    total?: number
    supplier?: { legal_name?: string | null; doc_number?: string | null } | null
    warehouse?: { name?: string | null } | null
    lines?: PdfLine[]
}

export const purchaseOrderPdfService = {
    async generate(order: PdfOrder, company: PdfCompany) {
        const doc = new jsPDF('p', 'mm', 'letter')
        const pw = doc.internal.pageSize.width
        const M = 12
        const CW = pw - M * 2
        const curr = order.currency === 'USD' ? 'USD' : 'COP'

        let y = await drawBrandHeader(doc, {
            company,
            title: 'Orden de Compra',
            number: order.po_number ?? '',
            margin: M,
        })

        // ── Bloque de información ─────────────────────────────────────────────
        const blockH = 26
        doc.setFillColor(...PDF_SOFT); doc.setDrawColor(...PDF_LINE); doc.setLineWidth(0.3)
        doc.roundedRect(M, y, CW, blockH, 2, 2, 'FD')
        const colW = (CW - 8) / 2
        const lx = M + 4, rx = M + colW + 8
        const field = (lab: string, val: string, x: number, yy: number, labW = 34) => {
            doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_MUTED)
            doc.text(lab.toUpperCase(), x, yy)
            doc.setFontSize(8.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_INK)
            doc.text(doc.splitTextToSize(val || '-', colW - labW - 2), x + labW, yy)
        }
        field('Proveedor', order.supplier?.legal_name || '—', lx, y + 6)
        field('NIT', order.supplier?.doc_number || '—', lx, y + 13)
        field('Bodega destino', order.warehouse?.name || '—', lx, y + 20)
        field('Fecha orden', pdfFmtDate(order.order_date), rx, y + 6)
        field('Entrega esperada', order.expected_delivery ? pdfFmtDate(order.expected_delivery) : 'Sin especificar', rx, y + 13)
        field('Estado', STATUS_LABELS[order.status ?? ''] ?? order.status ?? '—', rx, y + 20)
        y += blockH + 5

        // ── Tabla de líneas ──────────────────────────────────────────────────
        const head = [['#', 'Producto', 'SKU', 'Cant.', 'Costo Unit.', 'IVA %', 'Total']]
        const body = (order.lines || []).map((l, i) => {
            const qty = Number(l.qty)
            const unit = Number(l.unit_cost)
            const rate = Number(l.tax_rate ?? 0.19)
            return [
                String(i + 1),
                l.product?.name ?? 'Producto',
                l.product?.sku ?? '—',
                pdfFmtInt(qty),
                money(unit),
                `${Math.round(rate * 100)}%`,
                money(qty * unit),
            ]
        })

        const tableBase = brandTableStyles()
        autoTable(doc, {
            startY: y, head, body,
            ...tableBase,
            styles: { ...tableBase.styles, fontSize: 8 },
            columnStyles: {
                0: { halign: 'center', cellWidth: 8 },
                1: { cellWidth: 'auto', fontStyle: 'bold' },
                2: { cellWidth: 26 },
                3: { halign: 'right', cellWidth: 16 },
                4: { halign: 'right', cellWidth: 28 },
                5: { halign: 'right', cellWidth: 16 },
                6: { halign: 'right', cellWidth: 28 },
            },
            margin: { left: M, right: M },
        })
        y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 30
        y += 8

        // ── Totales (bloque derecho) ─────────────────────────────────────────
        const boxW = 74
        const boxX = pw - M - boxW
        const totRows: [string, string][] = [
            ['Subtotal', money(order.subtotal ?? 0)],
            ['IVA', money(order.tax_total ?? 0)],
        ]
        doc.setFontSize(8.5)
        totRows.forEach(([lab, val], i) => {
            const yy = y + i * 6
            doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_MUTED)
            doc.text(lab, boxX + 2, yy)
            doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_INK)
            doc.text(val, pw - M - 2, yy, { align: 'right' })
        })
        const totalY = y + totRows.length * 6 + 1
        doc.setFillColor(...PDF_PRIMARY)
        doc.roundedRect(boxX, totalY, boxW, 9, 1.5, 1.5, 'F')
        doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255); doc.setFontSize(9.5)
        doc.text(`Total ${curr}`, boxX + 3, totalY + 6)
        doc.text(money(order.total ?? 0), pw - M - 3, totalY + 6, { align: 'right' })
        y = totalY + 16

        // ── Notas ────────────────────────────────────────────────────────────
        if (order.notes) {
            doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_PRIMARY)
            doc.text('NOTAS', M, y)
            doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_INK); doc.setFontSize(8)
            doc.text(doc.splitTextToSize(order.notes, CW), M, y + 4.5)
            y += 14
        }

        // ── Firmas ───────────────────────────────────────────────────────────
        y = Math.max(y, doc.internal.pageSize.height - 42)
        const sigW = (CW - 20) / 2
        doc.setDrawColor(...PDF_INK); doc.setLineWidth(0.3)
        doc.line(M, y, M + sigW, y)
        doc.line(pw - M - sigW, y, pw - M, y)
        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...PDF_INK)
        doc.text('ELABORADO POR', M, y + 4)
        doc.text('AUTORIZADO POR', pw - M - sigW, y + 4)
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...PDF_MUTED); doc.setFontSize(6.5)
        doc.text('Firma y nombre', M, y + 8)
        doc.text('Firma y nombre', pw - M - sigW, y + 8)

        drawBrandFooter(doc, company, { margin: M })
        doc.save(`OC_${order.po_number || 'SIN-NUMERO'}.pdf`)
    },
}
