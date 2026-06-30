import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TransferWithDetails } from '../types';
import {
    drawBrandHeader,
    drawBrandFooter,
    brandTableStyles,
    pdfFmtDate,
    pdfFmtInt,
    PDF_PRIMARY,
    PDF_MUTED,
    PDF_INK,
    PDF_SOFT,
    PDF_LINE,
    type PdfCompany,
} from '@/shared/lib/pdfKit';

const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Borrador',
    IN_TRANSIT: 'En tránsito',
    RECEIVED: 'Recibido',
    CANCELLED: 'Anulado',
};

export const transferPdfService = {
    async generate(transfer: TransferWithDetails, company: PdfCompany) {
        const doc = new jsPDF('p', 'mm', 'letter');
        const pw = doc.internal.pageSize.width;
        const M = 12;
        const CW = pw - M * 2;

        let y = await drawBrandHeader(doc, {
            company,
            title: 'Traslado de Bodega',
            number: transfer.transfer_number,
            margin: M,
        });

        const fromName = (transfer.from_warehouse as { name?: string } | undefined)?.name ?? '—';
        const toName = (transfer.to_warehouse as { name?: string } | undefined)?.name ?? '—';

        // ── Bloque de información ──
        const blockH = 24;
        doc.setFillColor(...PDF_SOFT);
        doc.setDrawColor(...PDF_LINE);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, y, CW, blockH, 2, 2, 'FD');

        const colGap = 8;
        const colW = (CW - colGap) / 2;
        const lx = M + 4;
        const rx = M + colW + colGap;
        const field = (lab: string, val: string, x: number, yy: number, labW = 32) => {
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...PDF_MUTED);
            doc.text(lab.toUpperCase(), x, yy);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...PDF_INK);
            doc.text(val || '-', x + labW, yy);
        };

        field('Bodega origen', fromName, lx, y + 6);
        field('Bodega destino', toName, lx, y + 13);
        field('Estado', STATUS_LABELS[transfer.status] ?? transfer.status, lx, y + 20);
        field('Fecha creación', pdfFmtDate(transfer.created_at), rx, y + 6);
        field('Enviado', pdfFmtDate(transfer.transferred_at), rx, y + 13);
        field('Recibido', pdfFmtDate(transfer.received_at), rx, y + 20);

        y += blockH + 5;

        // ── Tabla de artículos ──
        let totalQty = 0;
        let totalRecv = 0;
        const body = (transfer.lines || []).map((line, i) => {
            const qty = Number(line.qty) || 0;
            const recv = Number(line.qty_received ?? 0) || 0;
            totalQty += qty;
            totalRecv += recv;
            return [
                String(i + 1),
                line.product?.sku ?? '',
                line.product?.name ?? 'Producto',
                pdfFmtInt(qty),
                pdfFmtInt(recv),
                pdfFmtInt(Math.max(0, qty - recv)),
            ];
        });

        autoTable(doc, {
            startY: y,
            head: [['#', 'Código', 'Producto', 'Cantidad', 'Recibido', 'Pendiente']],
            body,
            foot: [['', '', 'TOTALES', pdfFmtInt(totalQty), pdfFmtInt(totalRecv), pdfFmtInt(Math.max(0, totalQty - totalRecv))]],
            ...brandTableStyles(),
            footStyles: {
                fillColor: PDF_SOFT as unknown as [number, number, number],
                textColor: PDF_INK as unknown as [number, number, number],
                fontStyle: 'bold',
                fontSize: 8,
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { cellWidth: 26, fontStyle: 'bold' },
                2: { cellWidth: 'auto' },
                3: { halign: 'right', cellWidth: 24 },
                4: { halign: 'right', cellWidth: 24 },
                5: { halign: 'right', cellWidth: 24 },
            },
            margin: { left: M, right: M },
        });

        y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 30;
        y += 6;

        // ── Notas ──
        if (transfer.notes) {
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...PDF_PRIMARY);
            doc.text('OBSERVACIONES', M, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...PDF_INK);
            doc.setFontSize(8);
            doc.text(doc.splitTextToSize(transfer.notes, CW), M, y + 4.5);
            y += 14;
        } else {
            y += 4;
        }

        // ── Firmas ──
        y = Math.max(y, doc.internal.pageSize.height - 45);
        const sigW = (CW - 20) / 2;
        doc.setDrawColor(...PDF_INK);
        doc.setLineWidth(0.3);
        doc.line(M, y, M + sigW, y);
        doc.line(pw - M - sigW, y, pw - M, y);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PDF_INK);
        doc.text('DESPACHA (Bodega origen)', M, y + 4);
        doc.text('RECIBE (Bodega destino)', pw - M - sigW, y + 4);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF_MUTED);
        doc.setFontSize(6.5);
        doc.text('Firma y nombre', M, y + 8);
        doc.text('Firma, C.C. y fecha', pw - M - sigW, y + 8);

        drawBrandFooter(doc, company, { margin: M });

        doc.save(`Traslado_${transfer.transfer_number || 'SIN-NUMERO'}.pdf`);
    },
};
