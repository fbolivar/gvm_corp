import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document } from '../types';
import { numberToWords } from '@/shared/utils/numberToWords';

type RGB = [number, number, number];

// Paleta base (se sobreescribe con los colores de marca del tenant)
const INK: RGB = [31, 41, 55];        // texto principal
const MUTED: RGB = [120, 128, 140];   // etiquetas/secundario
const LINE: RGB = [223, 227, 235];    // bordes suaves
const SOFT: RGB = [246, 247, 251];    // fondo sutil de filas/bloques
const WHITE: RGB = [255, 255, 255];

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
    primary_color?: string | null;
    accent_color?: string | null;
}

export interface DianResolutionPdfInfo {
    resolution_number: string;
    prefix: string | null;
    start_range: number;
    end_range: number;
    start_date: string;
    end_date: string;
}

function hexToRgb(hex: string | null | undefined, fallback: RGB): RGB {
    if (!hex) return fallback;
    const m = hex.replace('#', '').match(/^([0-9a-fA-F]{6})$/);
    if (!m) return fallback;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function fmtInt(n: number): string {
    return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(iso: string | null | undefined): string {
    if (!iso) return '';
    // Fechas de solo día se parsean como locales para no correrlas un día (bug UTC).
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// IVA de una línea: tax_config puede venir como array [{rate}] u objeto.
function lineIvaRate(line: { tax_config?: unknown }): number {
    const tc = line.tax_config as unknown;
    const first = Array.isArray(tc) ? tc[0] : tc;
    const r = Number((first as { rate?: number; iva?: number })?.rate ?? (first as { iva?: number })?.iva ?? 0);
    return Number.isFinite(r) ? r : 0;
}

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
        const M = 12;
        const CW = pw - M * 2;

        const company = tenant || { name: 'EMPRESA S.A.S', nit: '000000000', dv: '0' } as TenantPdfInfo;
        const PRIMARY: RGB = [0, 150, 230];   // #0096E6 — azul corporativo GVM
        const ACCENT = hexToRgb(company.accent_color, [16, 185, 129]);    // esmeralda
        const PRIMARY_SOFT: RGB = [
            Math.round(PRIMARY[0] + (255 - PRIMARY[0]) * 0.88),
            Math.round(PRIMARY[1] + (255 - PRIMARY[1]) * 0.88),
            Math.round(PRIMARY[2] + (255 - PRIMARY[2]) * 0.88),
        ];

        const docTypeLabels: Record<string, string> = {
            'INVOICE': 'FACTURA ELECTRÓNICA DE VENTA',
            'CREDIT_NOTE': 'NOTA CRÉDITO ELECTRÓNICA',
            'DEBIT_NOTE': 'NOTA DÉBITO ELECTRÓNICA',
            'QUOTATION': 'COTIZACIÓN COMERCIAL',
            'PURCHASE_ORDER': 'ORDEN DE COMPRA',
            'VENDOR_BILL': 'FACTURA DE COMPRA',
            'SALES_ORDER': 'PEDIDO DE VENTA',
            'RECEIPT': 'RECIBO DE CAJA',
            'DOC_SUPPORT': 'DOCUMENTO SOPORTE',
            'DELIVERY_NOTE': 'REMISIÓN',
        };

        let y = M;

        // =====================================================
        // HEADER — logo · empresa · badge de documento
        // =====================================================
        // Logo (imagen) o iniciales
        const logoH = 22;
        const logoMaxW = 44;
        let logoDrawn = false;
        if (company.logo_url) {
            const logo = await loadLogo(company.logo_url);
            if (logo) {
                const ratio = Math.min(logoMaxW / logo.w, logoH / logo.h);
                const w = logo.w * ratio;
                const h = logo.h * ratio;
                try { doc.addImage(logo.data, logo.format, M, y, w, h); logoDrawn = true; } catch { /* fallback */ }
            }
        }
        if (!logoDrawn) {
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...PRIMARY);
            const initials = company.name.split(' ').filter(w => w.length > 1).map(w => w[0]).join('').slice(0, 4);
            doc.text(initials, M, y + 14);
        }

        // Empresa (a la derecha del logo)
        const infoX = M + logoMaxW + 6;
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PRIMARY);
        const nameLines = doc.splitTextToSize(company.name.toUpperCase(), 95);
        let iy = y + 4;
        for (const nl of nameLines.slice(0, 2)) { doc.text(nl, infoX, iy); iy += 5; }

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MUTED);
        doc.text(`NIT ${company.nit}-${company.dv}  ·  Responsable de IVA`, infoX, iy); iy += 3.8;
        const loc = [company.address, company.city, company.department].filter(Boolean).join(', ');
        if (loc) { doc.text(loc, infoX, iy); iy += 3.8; }
        const contact = [company.phone ? `Tel: ${company.phone}` : '', company.email || ''].filter(Boolean).join('   ·   ');
        if (contact) { doc.text(contact, infoX, iy); iy += 3.8; }

        // Badge de documento (derecha)
        const badgeW = 56;
        const badgeH = 24;
        const badgeX = pw - M - badgeW;
        doc.setFillColor(...PRIMARY);
        doc.roundedRect(badgeX, y, badgeW, badgeH, 2.5, 2.5, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...WHITE);
        const dl = doc.splitTextToSize(docTypeLabels[document.doc_type] || 'DOCUMENTO', badgeW - 6);
        doc.text(dl, badgeX + badgeW / 2, y + 6, { align: 'center' });
        doc.setFontSize(15);
        const prefix = resolution?.prefix ? `${resolution.prefix} ` : '';
        doc.text(`${prefix}${document.number || ''}`, badgeX + badgeW / 2, y + badgeH - 6, { align: 'center' });

        y = Math.max(iy, y + badgeH) + 3;

        // Línea divisoria con acento
        doc.setDrawColor(...PRIMARY);
        doc.setLineWidth(0.8);
        doc.line(M, y, M + CW, y);
        doc.setDrawColor(...ACCENT);
        doc.setLineWidth(0.8);
        doc.line(M, y, M + CW * 0.28, y);
        y += 5;

        if (resolution) {
            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...MUTED);
            doc.text(
                `Autorización DIAN ${resolution.resolution_number} · Rango ${resolution.start_range}-${resolution.end_range} · Vence ${fmtDate(resolution.end_date)}`,
                M, y);
            y += 4;
        }

        // =====================================================
        // CLIENTE — bloque limpio con fondo sutil
        // =====================================================
        const clientH = 26;
        doc.setFillColor(...SOFT);
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, y, CW, clientH, 2, 2, 'FD');

        const colGap = 8;
        const colW = (CW - colGap) / 2;
        const lx = M + 4;
        const rx = M + colW + colGap;
        const field = (lab: string, val: string, x: number, yy: number, labW = 26) => {
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...MUTED);
            doc.text(lab.toUpperCase(), x, yy);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...INK);
            doc.text(val || '-', x + labW, yy);
        };

        const party = document.party as Record<string, unknown> | undefined;
        field('Cliente', document.party?.legal_name || '', lx, y + 6);
        field('NIT / CC', document.party?.doc_number || '', lx, y + 12);
        field('Dirección', (party?.address as string) || '', lx, y + 18);
        field('Ciudad', (party?.city as string) || '', lx, y + 24);

        field('Teléfono', document.party?.phone || '', rx, y + 6);
        field('Fecha', fmtDate(document.issue_date), rx, y + 12);
        field('Forma de pago', 'Contado', rx, y + 18, 30);
        field('Concepto', (document.notes_public || '').substring(0, 38), rx, y + 24);

        y += clientH + 5;

        // =====================================================
        // TABLA DE ÍTEMS
        // =====================================================
        const tHead = [['#', 'Código', 'Descripción', 'Cant.', 'U. Med', 'Vr Unitario', 'IVA', 'Vr IVA', 'Dcto %', 'Total']];

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
            const prod = (line as { product?: { sku?: string } | { sku?: string }[] | null }).product;
            const sku = (Array.isArray(prod) ? prod[0]?.sku : prod?.sku) || '';
            return [
                String(i + 1),
                sku,
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
                cellPadding: { top: 2.6, bottom: 2.6, left: 2.5, right: 2.5 },
                font: 'helvetica',
                textColor: INK as unknown as [number, number, number],
                lineColor: LINE as unknown as [number, number, number],
                lineWidth: 0.1,
            },
            headStyles: {
                fillColor: PRIMARY as unknown as [number, number, number],
                textColor: WHITE as unknown as [number, number, number],
                fontStyle: 'bold',
                fontSize: 7.5,
                halign: 'center',
                valign: 'middle',
                cellPadding: 2.8,
                lineWidth: 0,
            },
            alternateRowStyles: { fillColor: SOFT as unknown as [number, number, number] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 8 },
                1: { cellWidth: 22, fontStyle: 'bold' },
                2: { cellWidth: 'auto' },
                3: { halign: 'right', cellWidth: 15 },
                4: { halign: 'center', cellWidth: 13 },
                5: { halign: 'right', cellWidth: 22 },
                6: { halign: 'center', cellWidth: 12 },
                7: { halign: 'right', cellWidth: 20 },
                8: { halign: 'center', cellWidth: 13 },
                9: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
            },
            margin: { left: M, right: M },
            theme: 'grid',
        });

        y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y + 30;

        if (document.status === 'VOIDED') {
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...MUTED);
            doc.text('•  ANULADA  •', pw / 2, y + 6, { align: 'center' });
            y += 10;
        }

        y += 4;

        // =====================================================
        // TOTALES + VALOR EN LETRAS
        // =====================================================
        const subtotal = calcSubtotal || Number(document.subtotal) || 0;
        const taxes = calcTaxes || Number(document.taxes) || 0;
        const total = subtotal + taxes;

        const totalsW = 72;
        const totalsX = pw - M - totalsW;
        const leftBoxW = totalsX - M - 6;

        // Izquierda: valor en letras
        doc.setFillColor(...SOFT);
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.3);
        doc.roundedRect(M, y, leftBoxW, 24, 2, 2, 'FD');
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...MUTED);
        doc.text('SON', M + 4, y + 6);
        doc.text(`TOTAL ÍTEMS: ${document.lines?.length || 0}`, M + 4, y + 21);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...INK);
        doc.text(doc.splitTextToSize(numberToWords(total), leftBoxW - 8), M + 4, y + 11);

        // Derecha: desglose
        const rows: { l: string; v: string; strong?: boolean }[] = [
            { l: 'Subtotal', v: fmtInt(subtotal) },
            { l: 'Descuento', v: fmtInt(0) },
            { l: 'IVA', v: fmtInt(taxes) },
        ];
        let ty = y;
        const rowH = 5.2;
        for (const r of rows) {
            doc.setDrawColor(...LINE);
            doc.setLineWidth(0.2);
            doc.line(totalsX, ty + rowH, totalsX + totalsW, ty + rowH);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...MUTED);
            doc.text(r.l, totalsX + 2, ty + 3.6);
            doc.setTextColor(...INK);
            doc.text(r.v, totalsX + totalsW - 2, ty + 3.6, { align: 'right' });
            ty += rowH;
        }
        // Total a pagar destacado
        ty += 1;
        doc.setFillColor(...PRIMARY);
        doc.roundedRect(totalsX, ty, totalsW, 8.5, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...WHITE);
        doc.text('TOTAL A PAGAR', totalsX + 2.5, ty + 5.6);
        doc.text(`$ ${fmtInt(total)}`, totalsX + totalsW - 2.5, ty + 5.6, { align: 'right' });

        y = Math.max(y + 24, ty + 8.5) + 6;

        // =====================================================
        // DISCLAIMER (cotizaciones) + NOTA LEGAL
        // =====================================================
        if (document.doc_type === 'QUOTATION') {
            doc.setFillColor(...PRIMARY_SOFT);
            doc.setDrawColor(...ACCENT);
            doc.setLineWidth(0.4);
            doc.roundedRect(M, y, CW, 9, 2, 2, 'FD');
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...PRIMARY);
            doc.text('Esta cotización tiene una validez de 8 días calendario a partir de la fecha de emisión.', pw / 2, y + 5.6, { align: 'center' });
            y += 13;
        }

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MUTED);
        doc.text('La presente se asemeja en todos sus efectos legales a una letra de cambio (Art. 774 C.Co, Ley 1231/2008).', pw / 2, y, { align: 'center' });
        y += 6;

        // Footer contacto
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.3);
        doc.line(M, y, M + CW, y);
        y += 4.5;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PRIMARY);
        doc.text(company.name, M, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MUTED);
        const foot = [loc, company.phone ? `Tel: ${company.phone}` : '', company.email || ''].filter(Boolean).join('   ·   ');
        doc.text(foot, M, y + 4);

        if (document.electronic_document?.cufe) {
            doc.setFontSize(5);
            doc.setTextColor(...MUTED);
            doc.text(`CUFE: ${document.electronic_document.cufe}`, M, y + 8.5);
        }

        const docNum = document.number || 'SIN-NUMERO';
        doc.save(`${document.doc_type}_${docNum}.pdf`);
    }
};
