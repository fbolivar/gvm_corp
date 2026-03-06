import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document } from '../types';
import { numberToWords } from '@/shared/utils/numberToWords';

// Colors matching GVM invoice
const BLUE = [0, 112, 192] as const;
const BLUE_LIGHT = [218, 238, 252] as const;
const BLACK = [0, 0, 0] as const;
const WHITE = [255, 255, 255] as const;
const GRAY = [80, 80, 80] as const;

export interface TenantPdfInfo {
    name: string;
    nit: string;
    dv: string;
    address?: string | null;
    city?: string | null;
    department?: string | null;
    phone?: string | null;
    email?: string | null;
    logo_url?: string | null;
}

export interface DianResolutionPdfInfo {
    resolution_number: string;
    prefix: string | null;
    start_range: number;
    end_range: number;
    start_date: string;
    end_date: string;
}

function fmt(n: number): string {
    return n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtInt(n: number): string {
    return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(iso: string | null | undefined): string {
    if (!iso) return '';
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

export const documentPdfService = {
    async generatePdf(
        document: Document,
        tenant?: TenantPdfInfo | null,
        resolution?: DianResolutionPdfInfo | null
    ) {
        const doc = new jsPDF('p', 'mm', 'letter');
        const pw = doc.internal.pageSize.width;
        const M = 8; // margin
        const CW = pw - M * 2; // content width

        const company = tenant || {
            name: 'EMPRESA S.A.S',
            nit: '000000000',
            dv: '0',
        };

        const docTypeLabels: Record<string, string> = {
            'INVOICE': 'Factura Electrónica De Venta No',
            'CREDIT_NOTE': 'Nota Crédito Electrónica No',
            'DEBIT_NOTE': 'Nota Débito Electrónica No',
            'QUOTATION': 'Cotización Comercial No',
            'PURCHASE_ORDER': 'Orden de Compra No',
            'VENDOR_BILL': 'Factura de Compra No',
            'SALES_ORDER': 'Pedido de Venta No',
            'RECEIPT': 'Recibo de Caja No',
            'DOC_SUPPORT': 'Documento Soporte No',
        };

        // =====================================================
        // 1. HEADER: Logo | Company Info | Invoice No + Res
        // =====================================================
        let y = M;
        const headerH = 38;

        // Outer border
        doc.setDrawColor(...BLUE);
        doc.setLineWidth(0.5);
        doc.rect(M, y, CW, headerH);

        // Left: Logo area
        const logoW = 38;
        doc.setDrawColor(...BLUE);
        doc.line(M + logoW, y, M + logoW, y + headerH);

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        const initials = company.name.split(' ').filter(w => w.length > 1).map(w => w[0]).join('').slice(0, 4);
        doc.text(initials, M + logoW / 2, y + 18, { align: 'center' });
        doc.setFontSize(5);
        doc.setTextColor(...GRAY);
        doc.setFont('helvetica', 'normal');
        doc.text('Logo Empresa', M + logoW / 2, y + 24, { align: 'center' });

        // Right: Invoice number box
        const rightW = 56;
        const rightX = pw - M - rightW;
        doc.setDrawColor(...BLUE);
        doc.line(rightX, y, rightX, y + headerH);

        // Center: Company info
        const centerX = M + logoW + 1;
        const centerW = rightX - centerX - 1;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLACK);
        doc.text(company.name.toUpperCase(), centerX + centerW / 2, y + 6, { align: 'center' });

        doc.setFontSize(5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY);

        const infoLines = [
            'RESPONSABLES DE IVA - NO SOMOS AGENTES DE RETENCIÓN DE IVA',
            'NO SOMOS GRANDES CONTRIBUYENTES NI AUTORRETENEDORES',
        ];
        let ly = y + 10;
        for (const line of infoLines) {
            doc.text(line, centerX + centerW / 2, ly, { align: 'center' });
            ly += 3;
        }
        if (company.address) {
            doc.text(`Sede principal: ${company.address}${company.city ? ', ' + company.city : ''}`, centerX + centerW / 2, ly, { align: 'center' });
            ly += 3;
        }
        if (company.phone) {
            doc.text(`Tel: ${company.phone}`, centerX + centerW / 2, ly, { align: 'center' });
            ly += 3;
        }
        if (company.email) {
            doc.text(`Email: ${company.email}`, centerX + centerW / 2, ly, { align: 'center' });
        }

        // NIT at bottom of center
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLACK);
        doc.text(`NIT. ${company.nit}  - ${company.dv}`, centerX + centerW / 2, y + 35, { align: 'center' });

        // Right column: Invoice label + number + resolution
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLACK);
        const docLabel = docTypeLabels[document.doc_type] || 'Documento No';
        const lblLines = doc.splitTextToSize(docLabel, rightW - 6);
        doc.text(lblLines, rightX + rightW / 2, y + 5, { align: 'center' });

        const prefix = resolution?.prefix || '';
        const numStr = prefix ? `${prefix}   No.   ${document.number}` : `No.   ${document.number}`;
        doc.setFontSize(11);
        doc.text(numStr, rightX + rightW / 2, y + 15, { align: 'center' });

        if (resolution) {
            doc.setFontSize(4.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...GRAY);
            const rl = [
                `Documento Oficial de Autorización de`,
                `Numeración Facturación Electrónica No.`,
                `${resolution.resolution_number} que habilita desde ${resolution.start_range} hasta`,
                `${resolution.end_range}. Vence ${fmtDate(resolution.end_date)}`,
            ];
            let ry = y + 20;
            for (const r of rl) {
                doc.text(r, rightX + rightW / 2, ry, { align: 'center' });
                ry += 2.8;
            }
        }

        y += headerH + 1;

        // =====================================================
        // 2. CLIENT INFO (blue-tinted background)
        // =====================================================
        const cH = 28;
        doc.setFillColor(...BLUE_LIGHT);
        doc.rect(M, y, CW, cH, 'F');
        doc.setDrawColor(...BLUE);
        doc.setLineWidth(0.3);
        doc.rect(M, y, CW, cH);

        const half = CW / 2;
        // Horizontal grid lines
        doc.line(M, y + 9, M + CW, y + 9);
        doc.line(M, y + 18, M + CW, y + 18);
        // Vertical center
        doc.line(M + half, y, M + half, y + 18);

        const P = 1.5; // cell padding
        doc.setFontSize(5.5);

        // Row 1 Left: CLIENTE + NIT
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text('CLIENTE', M + P, y + 3.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK);
        doc.setFontSize(6);
        doc.text(document.party?.legal_name || '', M + 18, y + 3.5);

        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text('NIT', M + P, y + 7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK);
        const cNit = document.party?.doc_number || '';
        const cDv = (document.party as Record<string, unknown>)?.dv as string || '';
        doc.text(`${cNit}${cDv ? ' ' + cDv : ''}`, M + 18, y + 7);

        // Row 1 Right: POR CONCEPTO DE + OBSERVACIÓN
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text('POR CONCEPTO DE', M + half + P, y + 3.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK);
        const cpt = document.notes_public || '';
        doc.text(cpt.substring(0, 60), M + half + 32, y + 3.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text('OBSERVACION', M + half + P, y + 7);

        // Row 2: DIRECCIÓN | CIUDAD | TELÉFONO
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text('DIRECCIÓN', M + P, y + 12.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK);
        doc.text((document.party as Record<string, unknown>)?.address as string || '', M + 22, y + 12.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text('CIUDAD', M + 65, y + 12.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK);
        doc.text((document.party as Record<string, unknown>)?.city as string || '', M + 80, y + 12.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text('TELÉFONO', M + half + P, y + 12.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK);
        doc.text(document.party?.phone || '', M + half + 20, y + 12.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text('FECHA FACTURA', M + half + P, y + 16);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK);
        doc.text(fmtDate(document.issue_date), M + half + 28, y + 16);

        // Row 3: FECHA FACTURA | VENCIMIENTO | FORMA PAGO | VENDEDOR
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text('FECHA FACTURA', M + P, y + 21.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK);
        doc.text(fmtDate(document.issue_date), M + 30, y + 21.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text('FECHA VENCIMIENTO', M + 50, y + 21.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK);
        doc.text(fmtDate(document.due_date), M + 80, y + 21.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text('FORMA DE PAGO', M + P, y + 25.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK);
        doc.text('Contado', M + 30, y + 25.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text('VENDEDOR', M + half + P, y + 21.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text('SUCURSAL', M + half + 50, y + 21.5);

        y += cH + 1;

        // =====================================================
        // 3. ITEMS TABLE
        // =====================================================
        const tHead = [['Item', 'Código', 'Descripción', 'Lote', 'Fecha\nVenci', 'Cantidad', 'U Med', 'Vr Unitario', 'IVA', 'Vr IVA', 'Dcto%', 'Total']];

        const tBody = (document.lines || []).map((line, i) => {
            const iva = Number(line.tax_config?.rate ?? line.tax_config?.iva ?? 0);
            const ivaAmt = Number(line.unit_price) * Number(line.qty) * (iva / 100);
            return [
                String(i + 1),
                line.product_id?.substring(0, 12) || '',
                line.description || '',
                '',
                '',
                fmtInt(Number(line.qty)),
                'Und.',
                fmtInt(Number(line.unit_price)),
                `${iva}%`,
                fmtInt(ivaAmt),
                '0',
                fmtInt(Number(line.line_total)),
            ];
        });

        autoTable(doc, {
            startY: y,
            head: tHead,
            body: tBody,
            styles: {
                fontSize: 5.5,
                cellPadding: 1.5,
                font: 'helvetica',
                textColor: [...BLACK] as [number, number, number],
                lineColor: [...BLUE] as [number, number, number],
                lineWidth: 0.2,
            },
            headStyles: {
                fillColor: [...BLUE] as [number, number, number],
                textColor: [...WHITE] as [number, number, number],
                fontStyle: 'bold',
                fontSize: 5,
                halign: 'center',
                valign: 'middle',
                cellPadding: 2,
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 8 },
                1: { cellWidth: 18 },
                2: { cellWidth: 40 },
                3: { halign: 'center', cellWidth: 14 },
                4: { halign: 'center', cellWidth: 16 },
                5: { halign: 'right', cellWidth: 14 },
                6: { halign: 'center', cellWidth: 10 },
                7: { halign: 'right', cellWidth: 20 },
                8: { halign: 'center', cellWidth: 10 },
                9: { halign: 'right', cellWidth: 16 },
                10: { halign: 'center', cellWidth: 10 },
                11: { halign: 'right', cellWidth: 24 },
            },
            margin: { left: M, right: M },
            theme: 'grid',
        });

        y = (doc as any).lastAutoTable?.finalY || y + 30;

        // Status stamp
        if (document.status === 'VOIDED') {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...BLACK);
            doc.text('********** ANULADA **********', pw / 2, y + 4, { align: 'center' });
            y += 7;
        }

        y += 2;

        // =====================================================
        // 4. TOTALS + VALOR EN LETRAS
        // =====================================================
        const subtotal = Number(document.subtotal) || 0;
        const taxes = Number(document.taxes) || 0;
        const total = Number(document.total) || 0;

        const leftW = CW * 0.52;
        const rW = CW * 0.48;
        const rX = M + leftW;

        // Left: Total items + Valor en letras
        doc.setDrawColor(...BLUE);
        doc.setLineWidth(0.3);

        // Row: Total items / Valor en Letras header
        doc.setFillColor(...BLUE_LIGHT);
        doc.rect(M, y, leftW, 5.5, 'FD');
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text('Total Item', M + P, y + 3.5);
        doc.setTextColor(...BLACK);
        doc.text(String(document.lines?.length || 0), M + 20, y + 3.5);
        doc.setTextColor(...BLUE);
        doc.text('Valor en Letras', M + 35, y + 3.5);

        // Valor en letras content
        doc.rect(M, y + 5.5, leftW, 8, 'D');
        doc.setFontSize(5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLACK);
        const letras = numberToWords(total);
        const lLines = doc.splitTextToSize(letras, leftW - 4);
        doc.text(lLines, M + P, y + 9);

        // Right: Totals table
        const totals = [
            { label: 'SUBTOTAL', value: fmt(subtotal), bold: false },
            { label: 'DESCUENTO', value: fmt(0), bold: false },
            { label: 'IVA', value: fmt(taxes), bold: false },
            { label: 'TOTAL DE LA OPERACIÓN', value: fmt(total), bold: true },
            { label: 'RETEFUENTE', value: fmt(0), bold: false },
            { label: 'RETEIVA', value: fmt(0), bold: false },
            { label: 'RETEICA', value: fmt(0), bold: false },
            { label: 'TOTAL MENOS RETENCIONES', value: fmt(total), bold: true },
        ];

        const rH = 3.4;
        let tY = y;
        for (const t of totals) {
            doc.setDrawColor(...BLUE);
            doc.setLineWidth(0.2);
            if (t.bold) {
                doc.setFillColor(...BLUE_LIGHT);
                doc.rect(rX, tY, rW, rH, 'FD');
            } else {
                doc.rect(rX, tY, rW, rH);
            }
            doc.setFontSize(5.5);
            doc.setFont('helvetica', t.bold ? 'bold' : 'normal');
            doc.setTextColor(...BLACK);
            doc.text(t.label, rX + P, tY + 2.5);
            doc.text(t.value, rX + rW - P, tY + 2.5, { align: 'right' });
            tY += rH;
        }

        y = Math.max(y + 14, tY) + 4;

        // =====================================================
        // 5. LEGAL NOTICE
        // =====================================================
        doc.setFontSize(5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY);
        doc.text(
            'LA PRESENTE FACTURA DE VENTA ELECTRÓNICA SE ASEMEJA EN TODOS SUS EFECTOS LEGALES A UNA LETRA DE CAMBIO',
            pw / 2, y, { align: 'center' }
        );
        doc.text(
            'ART. 774 DEL CÓDIGO DE COMERCIO SEGÚN LEY 1231 DE JULIO 17 DEL 2008',
            pw / 2, y + 3, { align: 'center' }
        );
        y += 7;

        // Bank accounts + Contact info (two columns)
        const bankW = CW * 0.52;
        const ctW = CW * 0.48;
        const ctX = M + bankW;

        doc.setFillColor(...BLUE_LIGHT);
        doc.rect(M, y, bankW, 16, 'F');
        doc.setDrawColor(...BLUE);
        doc.setLineWidth(0.3);
        doc.rect(M, y, bankW, 16);
        doc.rect(ctX, y, ctW, 16);

        // Bank info
        doc.setFontSize(5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text(`Favor consignar a las cuentas bancarias a nombre de ${company.name}`, M + P, y + 3.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK);
        doc.text('Consulte cuentas bancarias con el área administrativa', M + P, y + 8);
        if (company.phone) doc.text(`Tel: ${company.phone}`, M + P, y + 12);

        // Contact info
        doc.setFontSize(5);
        doc.setTextColor(...BLACK);
        let ccY = y + 3.5;
        if (company.address) {
            doc.text(`${company.address}${company.city ? ' - ' + company.city : ''}`, ctX + P, ccY);
            ccY += 3.5;
        }
        if (company.phone) {
            doc.text(`Teléfono: ${company.phone}`, ctX + P, ccY);
            ccY += 3.5;
        }
        if (company.email) {
            doc.text(`Email: ${company.email}`, ctX + P, ccY);
        }

        y += 18;

        // =====================================================
        // 6. CUFE / Electronic Document Footer
        // =====================================================
        if (document.electronic_document?.cufe) {
            doc.setDrawColor(...BLUE);
            doc.setLineWidth(0.3);
            doc.rect(M, y, CW, 14);

            doc.setFontSize(5.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...BLUE);
            doc.text('Representación Gráfica de la Factura de Venta Electrónica', M + P, y + 4);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...BLACK);
            doc.setFontSize(5);
            doc.text(`Fecha y Hora de Generación: ${new Date().toLocaleString('es-CO')}`, M + P, y + 7.5);
            doc.text(`Medios de Pago: Acuerdo mutuo`, M + P, y + 10.5);

            // CUFE
            doc.setFontSize(4);
            doc.setTextColor(...GRAY);
            doc.text(`CUFE: ${document.electronic_document.cufe}`, M + P, y + 13);
        }

        // =====================================================
        // SAVE FILE
        // =====================================================
        const docNum = document.number || 'SIN-NUMERO';
        doc.save(`${document.doc_type}_${docNum}.pdf`);
    }
};
