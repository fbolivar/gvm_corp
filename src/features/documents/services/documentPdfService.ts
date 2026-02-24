import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Document, DocumentLine } from '../types';

export const documentPdfService = {
    generatePdf(document: Document) {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;

        // Configuration based on type
        const typeConfig: Record<string, { label: string, color: [number, number, number] }> = {
            'INVOICE': { label: 'FACTURA ELECTRÓNICA DE VENTA', color: [79, 70, 229] }, // Indigo
            'QUOTATION': { label: 'COTIZACIÓN COMERCIAL', color: [16, 185, 129] }, // Emerald
            'SALES_ORDER': { label: 'PEDIDO DE VENTA', color: [14, 165, 233] }, // Sky
            'PURCHASE_ORDER': { label: 'ORDEN DE COMPRA', color: [71, 85, 105] }, // Slate
            'VENDOR_BILL': { label: 'FACTURA DE COMPRA', color: [100, 116, 139] },
        };

        const config = typeConfig[document.doc_type] || { label: 'DOCUMENTO', color: [30, 41, 59] };

        // 1. HEADER (INDUSTRIAL STYLE)
        doc.setFillColor(...config.color);
        doc.rect(0, 0, pageWidth, 45, 'F');

        // Vertical Side Stripe (Industrial Accent)
        doc.setFillColor(30, 41, 59); // Dark Slate for contrast
        doc.rect(0, 0, 4, pageHeight, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(26);
        doc.setFont('helvetica', 'bold');
        doc.text("BC FABRIC SAS", 15, 22);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(226, 232, 240);
        doc.text("CALIDAD INDUSTRIAL SUPERIOR", 15, 29);
        doc.text("NIT: 901.456.789-1 | Bogotá D.C, Colombia", 15, 34);
        doc.text("Tel: +57 300 123 4567 | info@bcfabric.com", 15, 39);

        // Document Number & Info Badge
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(pageWidth - 75, 12, 60, 25, 2, 2, 'F');

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(config.label.split(' ')[0], pageWidth - 45, 19, { align: 'center' });

        doc.setFontSize(18);
        doc.setTextColor(...config.color);
        doc.text(`#${document.number}`, pageWidth - 45, 30, { align: 'center' });

        let currentY = 55;
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`FECHA EMISIÓN: ${document.issue_date}`.toUpperCase(), 15, currentY);
        if (document.due_date) {
            doc.text(`VENCIMIENTO: ${document.due_date}`.toUpperCase(), pageWidth - 15, currentY, { align: 'right' });
        }

        // Horizontal Line
        doc.setDrawColor(241, 245, 249);
        doc.line(15, currentY + 4, pageWidth - 15, currentY + 4);

        // 2. PARTY INFO
        currentY = 60;
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("DATOS DEL CLIENTE / PROVEEDOR", 15, currentY);

        currentY += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(document.party?.legal_name || 'Sin nombre', 15, currentY + 5);
        doc.setFontSize(9);
        doc.text(`NIT: ${document.party?.doc_number || 'N/A'}`, 15, currentY + 10);
        doc.text(`Tel: ${document.party?.phone || 'N/A'}`, 15, currentY + 15);
        doc.text(`Email: ${document.party?.email || 'N/A'}`, 15, currentY + 20);

        // 3. ITEMS TABLE
        currentY += 35;
        autoTable(doc, {
            startY: currentY,
            head: [['REF', 'DESCRIPCIÓN', 'CANT.', 'VR. UNITARIO', 'SUBTOTAL']],
            body: document.lines?.map((l: any, i: number) => [
                l.product?.sku || (i + 1).toString(),
                l.description,
                l.qty,
                `$${Number(l.unit_price).toLocaleString('es-CO')}`,
                `$${Number(l.line_total).toLocaleString('es-CO')}`
            ]) || [],
            styles: { fontSize: 8, cellPadding: 4, font: 'helvetica' },
            headStyles: { fillColor: config.color, textColor: [255, 255, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 15, right: 15 },
        });

        currentY = (doc as any).lastAutoTable?.finalY || currentY + 50;

        // 4. TOTALS
        const summaryWidth = 70;
        const summaryX = pageWidth - summaryWidth - 15;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text("Subtotal:", summaryX, currentY + 10);
        doc.text(`$${Number(document.subtotal).toLocaleString('es-CO')}`, pageWidth - 15, currentY + 10, { align: 'right' });

        doc.text("IVA (19%):", summaryX, currentY + 17);
        doc.text(`$${Number(document.taxes).toLocaleString('es-CO')}`, pageWidth - 15, currentY + 17, { align: 'right' });

        doc.setFillColor(...config.color);
        doc.rect(summaryX, currentY + 22, summaryWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text("TOTAL A PAGAR:", summaryX + 3, currentY + 30);
        doc.setFontSize(12);
        doc.text(`$${Number(document.total).toLocaleString('es-CO')}`, pageWidth - 18, currentY + 30, { align: 'right' });

        // 5. NOTES & SIGNATURE
        currentY += 45;
        if (currentY > pageHeight - 50) {
            doc.addPage();
            currentY = 20;
        }

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("NOTAS Y TÉRMINOS:", 15, currentY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const notes = document.notes_public || "Este documento se asimila en todos sus efectos a una letra de cambio. El no pago de esta factura en la fecha señalada causará intereses de mora a la tasa máxima legal permitida.";
        const splitNotes = doc.splitTextToSize(notes, pageWidth - 100);
        doc.text(splitNotes, 15, currentY + 6);

        // Placeholder for QR
        doc.setDrawColor(200, 200, 200);
        doc.rect(pageWidth - 45, currentY, 30, 30);
        doc.setFontSize(7);
        doc.text("CÓDIGO CUFE/QR", pageWidth - 45, currentY + 33);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`BC FABRIC SAS - Facturación Electrónica Autorizada por la DIAN`, pageWidth / 2, pageHeight - 10, { align: 'center' });

        doc.save(`${document.doc_type}_${document.number}.pdf`);
    }
};
