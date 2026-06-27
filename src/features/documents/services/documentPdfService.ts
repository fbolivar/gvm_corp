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

// El IVA de una línea: tax_config puede venir como array [{rate}] o como objeto.
function lineIvaRate(line: { tax_config?: unknown }): number {
    const tc = line.tax_config as unknown;
    const first = Array.isArray(tc) ? tc[0] : tc;
    const r = Number((first as { rate?: number; iva?: number })?.rate ?? (first as { iva?: number })?.iva ?? 0);
    return Number.isFinite(r) ? r : 0;
}

// Carga una imagen (logo) como dataURL para incrustarla en el PDF.
async function loadLogo(url: string): Promise<{ data: string; format: string; w: number; h: number } | null> {
    try {
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const blob = await resp.blob();
        const data: string = await new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result as string);
            r.onerror = reject;
            r.readAsDataURL(blob);
        });
        const dim = await new Promise<{ w: number; h: number }>((resolve) => {
            const im = new Image();
            im.onload = () => resolve({ w: im.naturalWidth, h: im.naturalHeight });
            im.onerror = () => resolve({ w: 0, h: 0 });
            im.src = data;
        });
        if (!dim.w || !dim.h) return null;
        const mime = data.substring(data.indexOf('/') + 1, data.indexOf(';'));
        const format = mime.toUpperCase() === 'JPG' ? 'JPEG' : mime.toUpperCase();
        return { data, format, w: dim.w, h: dim.h };
    } catch {
        return null;
    }
}

export const documentPdfService = {
    async generatePdf(
        document: Document,
        tenant?: TenantPdfInfo | null,
        resolution?: DianResolutionPdfInfo | null
    ) {
        const doc = new jsPDF('p', 'mm', 'letter');
        const pw = doc.internal.pageSize.width;
        const M = 10;
        const CW = pw - M * 2;

        const company = tenant || { name: 'EMPRESA S.A.S', nit: '000000000', dv: '0' } as TenantPdfInfo;

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
            'DELIVERY_NOTE': 'Remisión No',
        };

        // =====================================================
        // 1. HEADER: Logo | Company Info | Doc No + Resolución
        // =====================================================
        let y = M;
        const headerH = 44;

        doc.setDrawColor(...BLUE);
        doc.setLineWidth(0.5);
        doc.rect(M, y, CW, headerH);

        const logoW = 48;
        doc.line(M + logoW, y, M + logoW, y + headerH);

        // Logo (imagen real si existe; si no, iniciales)
        let logoDrawn = false;
        if (company.logo_url) {
            const logo = await loadLogo(company.logo_url);
            if (logo) {
                const boxW = logoW - 8;
                const boxH = headerH - 10;
                const ratio = Math.min(boxW / logo.w, boxH / logo.h);
                const w = logo.w * ratio;
                const h = logo.h * ratio;
                const lx = M + (logoW - w) / 2;
                const ly = y + (headerH - h) / 2;
                try {
                    doc.addImage(logo.data, logo.format, lx, ly, w, h);
                    logoDrawn = true;
                } catch { /* fallback abajo */ }
            }
        }
        if (!logoDrawn) {
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...BLUE);
            const initials = company.name.split(' ').filter(w => w.length > 1).map(w => w[0]).join('').slice(0, 4);
            doc.text(initials, M + logoW / 2, y + 22, { align: 'center' });
            doc.setFontSize(7);
            doc.setTextColor(...GRAY);
            doc.setFont('helvetica', 'normal');
            doc.text('Logo Empresa', M + logoW / 2, y + 30, { align: 'center' });
        }

        const rightW = 62;
        const rightX = pw - M - rightW;
        doc.line(rightX, y, rightX, y + headerH);

        // Center: Company info (más grande)
        const centerX = M + logoW + 1;
        const centerW = rightX - centerX - 1;
        const cMid = centerX + centerW / 2;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLACK);
        const nameLines = doc.splitTextToSize(company.name.toUpperCase(), centerW - 4);
        let ly = y + 7;
        for (const nl of nameLines.slice(0, 2)) {
            doc.text(nl, cMid, ly, { align: 'center' });
            ly += 5;
        }

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY);
        ly += 0.5;
        doc.text('RESPONSABLES DE IVA - NO SOMOS AGENTES DE RETENCIÓN', cMid, ly, { align: 'center' }); ly += 3.5;

        doc.setFontSize(7.5);
        doc.setTextColor(...BLACK);
        if (company.address) {
            const loc = `${company.address}${company.city ? ', ' + company.city : ''}${company.department ? ', ' + company.department : ''}`;
            doc.text(loc, cMid, ly, { align: 'center' }); ly += 3.8;
        }
        if (company.phone) { doc.text(`Tel: ${company.phone}`, cMid, ly, { align: 'center' }); ly += 3.8; }
        if (company.email) { doc.text(`Email: ${company.email}`, cMid, ly, { align: 'center' }); ly += 3.8; }

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLACK);
        doc.text(`NIT. ${company.nit} - ${company.dv}`, cMid, y + headerH - 3, { align: 'center' });

        // Right: Doc label + number + resolution
        const rMid = rightX + rightW / 2;
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLACK);
        const docLabel = docTypeLabels[document.doc_type] || 'Documento No';
        doc.text(doc.splitTextToSize(docLabel, rightW - 6), rMid, y + 6, { align: 'center' });

        const prefix = resolution?.prefix || '';
        const numStr = prefix ? `${prefix} No. ${document.number}` : `No. ${document.number}`;
        doc.setFontSize(15);
        doc.text(numStr, rMid, y + 18, { align: 'center' });

        if (resolution) {
            doc.setFontSize(5.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...GRAY);
            const rl = [
                `Autorización de Numeración`,
                `Facturación Electrónica No. ${resolution.resolution_number}`,
                `Desde ${resolution.start_range} hasta ${resolution.end_range}`,
                `Vence ${fmtDate(resolution.end_date)}`,
            ];
            let ry = y + 24;
            for (const r of rl) { doc.text(r, rMid, ry, { align: 'center' }); ry += 3.2; }
        }

        y += headerH + 1.5;

        // =====================================================
        // 2. CLIENT INFO
        // =====================================================
        const cH = 32;
        doc.setFillColor(...BLUE_LIGHT);
        doc.rect(M, y, CW, cH, 'F');
        doc.setDrawColor(...BLUE);
        doc.setLineWidth(0.3);
        doc.rect(M, y, CW, cH);

        const half = CW / 2;
        doc.line(M, y + 8, M + CW, y + 8);
        doc.line(M, y + 16, M + CW, y + 16);
        doc.line(M, y + 24, M + CW, y + 24);
        doc.line(M + half, y, M + half, y + 24);

        const P = 2;
        const LBL = 7;     // label font
        const VAL = 8.5;   // value font

        const label = (t: string, x: number, yy: number) => {
            doc.setFontSize(LBL); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLUE);
            doc.text(t, x, yy);
        };
        const value = (t: string, x: number, yy: number) => {
            doc.setFontSize(VAL); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BLACK);
            doc.text(t || '', x, yy);
        };

        // Left column
        label('CLIENTE', M + P, y + 5.5); value(document.party?.legal_name || '', M + 24, y + 5.5);
        label('NIT', M + P, y + 13.5); value(`${document.party?.doc_number || ''}`, M + 24, y + 13.5);
        label('DIRECCIÓN', M + P, y + 21.5);
        value(((document.party as Record<string, unknown>)?.address as string) || '', M + 28, y + 21.5);
        label('CIUDAD', M + P, y + 29.5);
        value(((document.party as Record<string, unknown>)?.city as string) || '', M + 24, y + 29.5);

        // Right column
        label('POR CONCEPTO DE', M + half + P, y + 5.5);
        value((document.notes_public || '').substring(0, 45), M + half + 38, y + 5.5);
        label('TELÉFONO', M + half + P, y + 13.5); value(document.party?.phone || '', M + half + 28, y + 13.5);
        label('FECHA', M + half + P, y + 21.5); value(fmtDate(document.issue_date), M + half + 28, y + 21.5);
        label('FORMA DE PAGO', M + half + P, y + 29.5); value('Contado', M + half + 38, y + 29.5);

        y += cH + 2;

        // =====================================================
        // 3. ITEMS TABLE (sin Código / Lote / Fecha)
        // =====================================================
        const tHead = [['Item', 'Descripción', 'Cantidad', 'U Med', 'Vr Unitario', 'IVA', 'Vr IVA', 'Dcto%', 'Total']];

        let calcSubtotal = 0;
        let calcTaxes = 0;
        const tBody = (document.lines || []).map((line, i) => {
            const qty = Number(line.qty) || 0;
            const price = Number(line.unit_price) || 0;
            const base = qty * price;
            const iva = lineIvaRate(line);
            const ivaAmt = base * (iva / 100);
            calcSubtotal += base;
            calcTaxes += ivaAmt;
            return [
                String(i + 1),
                line.description || '',
                fmtInt(qty),
                'Und.',
                fmtInt(price),
                `${iva}%`,
                fmtInt(ivaAmt),
                '0',
                fmtInt(Number(line.line_total) || base + ivaAmt),
            ];
        });

        autoTable(doc, {
            startY: y,
            head: tHead,
            body: tBody,
            styles: {
                fontSize: 8,
                cellPadding: 2.2,
                font: 'helvetica',
                textColor: [...BLACK] as [number, number, number],
                lineColor: [...BLUE] as [number, number, number],
                lineWidth: 0.2,
            },
            headStyles: {
                fillColor: [...BLUE] as [number, number, number],
                textColor: [...WHITE] as [number, number, number],
                fontStyle: 'bold',
                fontSize: 7.5,
                halign: 'center',
                valign: 'middle',
                cellPadding: 2.5,
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 12 },
                1: { cellWidth: 'auto' },
                2: { halign: 'right', cellWidth: 20 },
                3: { halign: 'center', cellWidth: 14 },
                4: { halign: 'right', cellWidth: 24 },
                5: { halign: 'center', cellWidth: 14 },
                6: { halign: 'right', cellWidth: 22 },
                7: { halign: 'center', cellWidth: 14 },
                8: { halign: 'right', cellWidth: 28 },
            },
            margin: { left: M, right: M },
            theme: 'grid',
        });

        y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 30;

        if (document.status === 'VOIDED') {
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...BLACK);
            doc.text('********** ANULADA **********', pw / 2, y + 5, { align: 'center' });
            y += 9;
        }

        y += 3;

        // =====================================================
        // 4. TOTALS + VALOR EN LETRAS (IVA calculado desde líneas)
        // =====================================================
        const subtotal = calcSubtotal || Number(document.subtotal) || 0;
        const taxes = calcTaxes || Number(document.taxes) || 0;
        const total = subtotal + taxes;

        const leftW = CW * 0.5;
        const rW = CW * 0.5;
        const rX = M + leftW;

        // Left: Total items + Valor en letras
        doc.setDrawColor(...BLUE);
        doc.setLineWidth(0.3);
        doc.setFillColor(...BLUE_LIGHT);
        doc.rect(M, y, leftW, 7, 'FD');
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text('Total Item', M + P, y + 4.5);
        doc.setTextColor(...BLACK);
        doc.text(String(document.lines?.length || 0), M + 24, y + 4.5);
        doc.setTextColor(...BLUE);
        doc.text('Valor en Letras', M + 40, y + 4.5);

        doc.rect(M, y + 7, leftW, 13, 'D');
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLACK);
        const lLines = doc.splitTextToSize(numberToWords(total), leftW - 4);
        doc.text(lLines, M + P, y + 11.5);

        // Right: Totals table
        const totals = [
            { label: 'SUBTOTAL', value: fmtInt(subtotal), bold: false },
            { label: 'DESCUENTO', value: fmtInt(0), bold: false },
            { label: 'IVA', value: fmtInt(taxes), bold: false },
            { label: 'TOTAL DE LA OPERACIÓN', value: fmtInt(total), bold: true },
            { label: 'TOTAL A PAGAR', value: fmtInt(total), bold: true },
        ];

        const rH = 5;
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
            doc.setFontSize(t.bold ? 8.5 : 8);
            doc.setFont('helvetica', t.bold ? 'bold' : 'normal');
            doc.setTextColor(...BLACK);
            doc.text(t.label, rX + P, tY + 3.4);
            doc.text(t.value, rX + rW - P, tY + 3.4, { align: 'right' });
            tY += rH;
        }

        y = Math.max(y + 20, tY) + 5;

        // =====================================================
        // 5. LEGAL NOTICE
        // =====================================================
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY);
        doc.text('LA PRESENTE SE ASEMEJA EN TODOS SUS EFECTOS LEGALES A UNA LETRA DE CAMBIO (ART. 774 C.CO, LEY 1231/2008)', pw / 2, y, { align: 'center' });
        y += 6;

        // Contacto / cuentas
        const bankW = CW * 0.5;
        const ctW = CW * 0.5;
        const ctX = M + bankW;
        doc.setFillColor(...BLUE_LIGHT);
        doc.rect(M, y, bankW, 18, 'F');
        doc.setDrawColor(...BLUE);
        doc.setLineWidth(0.3);
        doc.rect(M, y, bankW, 18);
        doc.rect(ctX, y, ctW, 18);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE);
        doc.text(`Datos de ${company.name}`, M + P, y + 5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...BLACK);
        doc.text('Consulte cuentas bancarias con el área administrativa', M + P, y + 10);

        doc.setTextColor(...BLACK);
        let ccY = y + 5;
        if (company.address) { doc.text(`${company.address}${company.city ? ' - ' + company.city : ''}`, ctX + P, ccY); ccY += 4.5; }
        if (company.phone) { doc.text(`Teléfono: ${company.phone}`, ctX + P, ccY); ccY += 4.5; }
        if (company.email) { doc.text(`Email: ${company.email}`, ctX + P, ccY); }

        y += 20;

        // =====================================================
        // 6. CUFE
        // =====================================================
        if (document.electronic_document?.cufe) {
            doc.setDrawColor(...BLUE);
            doc.setLineWidth(0.3);
            doc.rect(M, y, CW, 16);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...BLUE);
            doc.text('Representación Gráfica de la Factura Electrónica', M + P, y + 5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...BLACK);
            doc.setFontSize(6.5);
            doc.text(`Fecha y Hora de Generación: ${new Date().toLocaleString('es-CO')}`, M + P, y + 9.5);
            doc.setFontSize(5);
            doc.setTextColor(...GRAY);
            doc.text(`CUFE: ${document.electronic_document.cufe}`, M + P, y + 13.5);
        }

        const docNum = document.number || 'SIN-NUMERO';
        doc.save(`${document.doc_type}_${docNum}.pdf`);
    }
};
