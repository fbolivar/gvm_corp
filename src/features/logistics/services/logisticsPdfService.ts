import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Carrier, Shipment, ShipmentItem } from '../types';

export const logisticsPdfService = {
    generateRemision(shipment: any) {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;

        // --- Header Section ---
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, pageWidth, 50, 'F');

        // Logo / Name (Inverted)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(26);
        doc.setFont('helvetica', 'bold');
        doc.text("GVM S.A.S", 20, 25);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text("SOLUCIONES LOGÍSTICAS INDUSTRIALES", 20, 32);
        doc.text("NIT: 900.000.000-0", 20, 37);

        // Document ID (Large Number)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(32);
        doc.setFont('helvetica', 'bold');
        doc.text(`${shipment.order?.number || 'S/N'}`, pageWidth - 20, 30, { align: 'right' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(99, 102, 241); // indigo-500
        doc.text("GUÍA DE REMISIÓN", pageWidth - 20, 38, { align: 'right' });

        // --- Meta Info Bar ---
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(0, 50, pageWidth, 15, 'F');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.setFont('helvetica', 'bold');
        doc.text(`FECHA DE EMISIÓN: ${format(new Date(), "PPP", { locale: es })}`.toUpperCase(), 20, 60);
        doc.text(`TIPO: ENTREGA FÍSICA NO CONTABLE`.toUpperCase(), pageWidth - 20, 60, { align: 'right' });

        // --- Parties Section ---
        let currentY = 85;

        // Destinatario Card
        doc.setFillColor(241, 245, 249); // slate-100
        doc.roundedRect(20, currentY - 10, 80, 45, 3, 3, 'F');
        doc.setTextColor(30, 41, 59); // slate-900
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("ENTREGAR A:", 25, currentY);

        doc.setFontSize(11);
        doc.text(shipment.order?.party?.legal_name || 'CLIENTE FINAL', 25, currentY + 8);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105); // slate-600
        doc.text(`NIT/CC: ${shipment.order?.party?.nit || 'N/A'}`, 25, currentY + 14);
        doc.text(`TEL: ${shipment.order?.party?.phone || 'N/A'}`, 25, currentY + 20);

        // Wrap address if needed
        const address = shipment.order?.party?.address || 'SIN DIRECCIÓN';
        const splitAddress = doc.splitTextToSize(address, 70);
        doc.text(splitAddress, 25, currentY + 26);

        // Shipping Data Card
        doc.setFillColor(241, 245, 249); // slate-100
        doc.roundedRect(110, currentY - 10, 80, 45, 3, 3, 'F');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("DETALLES DE LOGÍSTICA:", 115, currentY);

        doc.setFont('helvetica', 'normal');
        doc.text(`Transportadora:`, 115, currentY + 8);
        doc.setFont('helvetica', 'bold');
        doc.text(shipment.carrier?.name || 'LOGÍSTICA INTERNA', 145, currentY + 8);

        doc.setFont('helvetica', 'normal');
        doc.text(`Nº Seguimiento:`, 115, currentY + 16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(99, 102, 241);
        doc.text(shipment.tracking_number || 'PENDIENTE ASIGNAR', 145, currentY + 16);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(`Origen:`, 115, currentY + 24);
        doc.text(`Órden de Venta #${shipment.order?.number}`, 145, currentY + 24);

        currentY += 50;

        // --- Items Table ---
        autoTable(doc, {
            startY: currentY,
            head: [['SKU / REFERENCIA', 'PRODUCTO', 'PEDIDO', 'DESPACHADO', 'CUMP.']],
            body: shipment.items?.map((item: any) => [
                item.product?.sku || 'N/A',
                item.product?.name || item.product_id,
                item.qty_ordered,
                item.qty_shipped,
                item.qty_shipped === item.qty_ordered ? '100%' : `${Math.round((item.qty_shipped / item.qty_ordered) * 100)}%`
            ]) || [],
            styles: { fontSize: 8, cellPadding: 5, font: 'helvetica', textColor: [71, 85, 105] },
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
            columnStyles: {
                0: { cellWidth: 30 },
                2: { halign: 'center', fontStyle: 'bold' },
                3: { halign: 'center', fontStyle: 'bold', textColor: [99, 102, 241] },
                4: { halign: 'center' }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 20, right: 20 },
        });

        currentY = (doc as any).lastAutoTable?.finalY + 20;

        // --- Observations ---
        if (shipment.notes) {
            doc.setFillColor(254, 252, 232); // amber-50
            const splitNotes = doc.splitTextToSize(`NOTAS: ${shipment.notes}`, pageWidth - 40);
            doc.roundedRect(20, currentY, pageWidth - 40, (splitNotes.length * 5) + 8, 2, 2, 'F');
            doc.setFontSize(8);
            doc.setTextColor(146, 64, 14); // amber-800
            doc.text(splitNotes, 25, currentY + 6);
            currentY += (splitNotes.length * 5) + 15;
        }

        // --- Signature Blocks ---
        if (currentY > pageHeight - 60) {
            doc.addPage();
            currentY = 30;
        }

        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.3);

        // Left - Dispatch
        doc.line(20, currentY + 30, 90, currentY + 30);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'bold');
        doc.text("RESPONSABLE DESPACHO", 20, currentY + 35);
        doc.setFont('helvetica', 'normal');
        doc.text("Firma y Sello GVM S.A.S", 20, currentY + 39);

        // Right - Receiver
        doc.line(120, currentY + 30, 190, currentY + 30);
        doc.setFont('helvetica', 'bold');
        doc.text("RECIBIDO A CONFORMIDAD", 120, currentY + 35);
        doc.setFont('helvetica', 'normal');
        doc.text("Nombre, C.C y Firma", 120, currentY + 39);

        // --- Vertical Border Accent ---
        doc.setFillColor(99, 102, 241); // Indigo
        doc.rect(0, 0, 5, pageHeight, 'F');

        // --- Footer ---
        doc.setTextColor(148, 163, 184); // slate-400
        doc.setFontSize(7);
        doc.text("CERTIFICADO DE DESPACHO LOGITRACK V3 — GENERADO AUTOMÁTICAMENTE", pageWidth / 2, pageHeight - 15, { align: 'center' });
        doc.text(`PÁGINA ${doc.getNumberOfPages()}`, pageWidth - 20, pageHeight - 15, { align: 'right' });

        doc.save(`Remision_${shipment.order?.number || 'GVM'}.pdf`);
    }

};
