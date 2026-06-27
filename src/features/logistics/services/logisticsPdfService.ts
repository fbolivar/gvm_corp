import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Colors (estilo WO / formatos de impresión) ──────────────────────────────
const COLORS = {
    black: [17, 17, 17] as [number, number, number],
    dark: [60, 60, 60] as [number, number, number],
    grayHeader: [233, 244, 252] as [number, number, number],   // azul muy suave (sub-encabezados)
    grayDark: [0, 150, 230] as [number, number, number],       // #0096E6 azul corporativo (bandas)
    greenBand: [233, 244, 252] as [number, number, number],    // azul suave (caja número)
    greenNumber: [0, 150, 230] as [number, number, number],    // #0096E6 (año / acento)
    brand: [0, 150, 230] as [number, number, number],          // #0096E6
    white: [255, 255, 255] as [number, number, number],
    muted: [107, 114, 128] as [number, number, number],
};

const MARGIN = 10; // mm
const PW = 210;
const PH = 297;

// Number to words (Colombian pesos)
const UNITS = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE'];
const TENS = ['', '', 'VEINTI', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const HUNDREDS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function hundredsToWords(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';
    if (n <= 20) return UNITS[n];
    if (n < 100) {
        const t = Math.floor(n / 10);
        const u = n % 10;
        if (t === 2) return u === 0 ? 'VEINTE' : `VEINTI${UNITS[u]}`;
        return u === 0 ? TENS[t] : `${TENS[t]} Y ${UNITS[u]}`;
    }
    const h = Math.floor(n / 100);
    const rest = n % 100;
    return rest === 0 ? HUNDREDS[h] : `${HUNDREDS[h]} ${hundredsToWords(rest)}`;
}

function numberToWords(n: number): string {
    n = Math.floor(Math.abs(n));
    if (n === 0) return 'CERO';
    const millones = Math.floor(n / 1_000_000);
    const miles = Math.floor((n % 1_000_000) / 1000);
    const resto = n % 1000;
    const parts: string[] = [];
    if (millones > 0) parts.push(millones === 1 ? 'UN MILLON' : `${hundredsToWords(millones)} MILLONES`);
    if (miles > 0) parts.push(miles === 1 ? 'MIL' : `${hundredsToWords(miles)} MIL`);
    if (resto > 0) parts.push(hundredsToWords(resto));
    return parts.join(' ');
}

function amountInWords(amount: number): string {
    return `${numberToWords(amount)} PESOS M/CTE`;
}

function fmtDateLong(iso: string | null | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]} de ${d.getFullYear()}`;
}

function fmtNumber(n: number): string {
    return n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function parseShipmentNumber(raw: string | null, fallback: string): { year: string; number: string } {
    const s = (raw || '').trim();
    const m = s.match(/(\d{4}).*?(\d+)$/);
    if (m) return { year: m[1], number: m[2] };
    const digits = s.match(/(\d+)$/);
    if (digits) return { year: new Date().getFullYear().toString(), number: digits[1] };
    return { year: new Date().getFullYear().toString(), number: fallback.slice(-6).toUpperCase() };
}

function profileName(p: { full_name?: string | null; email?: string | null } | null | undefined): string {
    if (!p) return '—';
    if (p.full_name) return p.full_name.toUpperCase();
    if (p.email) return p.email.split('@')[0].toUpperCase();
    return '—';
}

// ─── Helpers de dibujo ────────────────────────────────────────────────────────

function drawBorderedCell(doc: jsPDF, x: number, y: number, w: number, h: number) {
    doc.setDrawColor(...COLORS.black);
    doc.setLineWidth(0.2);
    doc.rect(x, y, w, h);
}

function drawGrayHeader(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, dark = false) {
    drawBorderedCell(doc, x, y, w, h);
    if (dark) {
        doc.setFillColor(...COLORS.grayDark);
        doc.rect(x, y, w, h, 'F');
        doc.setTextColor(...COLORS.white);
    } else {
        doc.setFillColor(...COLORS.grayHeader);
        doc.rect(x, y, w, h, 'F');
        doc.setTextColor(...COLORS.dark);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(label.toUpperCase(), x + w / 2, y + h / 2 + 1.2, { align: 'center' });
}

function drawValueCell(doc: jsPDF, x: number, y: number, w: number, h: number, value: string, opts?: { bold?: boolean; center?: boolean; fontSize?: number }) {
    drawBorderedCell(doc, x, y, w, h);
    doc.setTextColor(...COLORS.black);
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setFontSize(opts?.fontSize ?? 9);
    const align = opts?.center ? 'center' : 'left';
    const textX = opts?.center ? x + w / 2 : x + 2;
    const lines = doc.splitTextToSize(value || '—', w - 4);
    doc.text(lines[0] ?? '—', textX, y + h / 2 + 1.2, { align });
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantInfoLike {
    name?: string | null;
    nit?: string | null;
    dv?: string | null;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
    logo_url?: string | null;
}

export const logisticsPdfService = {
    async generateRemision(shipment: any, tenant?: TenantInfoLike | null) {
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

        const tenantName = tenant?.name ?? 'GVM CORPORATION';
        const tenantNit = tenant?.nit ?? '—';
        const tenantDv = tenant?.dv ? ` ${tenant.dv}` : '';
        const tenantAddress = tenant?.address ?? '';
        const tenantPhone = tenant?.phone ?? '';

        const party = shipment.order?.party;
        const partyName = (party?.legal_name ?? '—').toUpperCase();
        const partyNit = party?.nit ?? party?.doc_number ?? '—';
        const partyAddress = party?.address ?? '—';
        const partyCity = party?.city ?? '—';
        const partyPhone = party?.phone ?? '—';

        const { year, number } = parseShipmentNumber(
            shipment.tracking_number ?? shipment.order?.number ?? null,
            shipment.id ?? ''
        );
        const orderNumber = shipment.order?.number ?? '—';
        const carrierName = shipment.carrier?.name ?? 'Transporte Propio';
        const warehouseName = shipment.warehouse?.name ?? '—';
        const issueDate = shipment.shipped_at ?? shipment.created_at ?? new Date().toISOString();

        const items: Array<{ product?: { name?: string; sku?: string; uom?: string; cost?: number }; qty_ordered: number; qty_shipped: number }>
            = shipment.items ?? [];
        const totalValue = items.reduce((s, i) => s + (Number(i.product?.cost ?? 0) * Number(i.qty_shipped ?? 0)), 0);

        let y = MARGIN;

        // ─── Top header ─────────────────────────────────────────────────────
        const headerH = 26;
        const logoW = 36;
        const rightBoxW = 56;
        const centerW = PW - 2 * MARGIN - logoW - rightBoxW;

        // Logo cell (left)
        drawBorderedCell(doc, MARGIN, y, logoW, headerH);
        if (tenant?.logo_url) {
            try {
                const imgData = await fetchImageAsDataUrl(tenant.logo_url);
                if (imgData) {
                    doc.addImage(imgData, 'PNG', MARGIN + 3, y + 3, logoW - 6, headerH - 6);
                }
            } catch { /* ignore logo errors */ }
        } else {
            doc.setTextColor(...COLORS.greenNumber);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.text('GVM', MARGIN + logoW / 2, y + headerH / 2 + 2, { align: 'center' });
        }

        // Center: empresa + nit + direccion
        drawBorderedCell(doc, MARGIN + logoW, y, centerW, headerH);
        doc.setTextColor(...COLORS.black);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(tenantName, MARGIN + logoW + centerW / 2, y + 8, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Nit  ${tenantNit}${tenantDv}`, MARGIN + logoW + centerW / 2, y + 14, { align: 'center' });
        doc.setFontSize(8);
        const locLine = [tenantAddress, tenantPhone ? `TEL ${tenantPhone}` : ''].filter(Boolean).join(' · ');
        if (locLine) doc.text(locLine, MARGIN + logoW + centerW / 2, y + 20, { align: 'center' });

        // Right: caja "GUÍA DE REMISIÓN" + año + número
        drawBorderedCell(doc, MARGIN + logoW + centerW, y, rightBoxW, headerH);
        doc.setFillColor(...COLORS.greenBand);
        doc.rect(MARGIN + logoW + centerW, y, rightBoxW, 10, 'F');
        doc.setTextColor(...COLORS.black);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('GUÍA DE REMISIÓN', MARGIN + logoW + centerW + rightBoxW / 2, y + 6.5, { align: 'center' });
        // Divider line
        doc.setDrawColor(...COLORS.black);
        doc.line(MARGIN + logoW + centerW, y + 10, MARGIN + logoW + centerW + rightBoxW, y + 10);
        // Year + number
        const halfW = rightBoxW / 2;
        doc.line(MARGIN + logoW + centerW + halfW, y + 10, MARGIN + logoW + centerW + halfW, y + headerH);
        doc.setTextColor(...COLORS.greenNumber);
        doc.setFontSize(14);
        doc.text(year, MARGIN + logoW + centerW + halfW / 2, y + 19, { align: 'center' });
        doc.setTextColor(...COLORS.black);
        doc.text(number, MARGIN + logoW + centerW + halfW + halfW / 2, y + 19, { align: 'center' });

        y += headerH;

        // ─── DESTINATARIO ───────────────────────────────────────────────────
        const sectionH = 6;
        drawGrayHeader(doc, MARGIN, y, PW - 2 * MARGIN, sectionH, 'DESTINATARIO', true);
        y += sectionH;
        drawValueCell(doc, MARGIN, y, PW - 2 * MARGIN, 7, partyName, { bold: true });
        y += 7;

        // NIT / ORDEN DE VENTA
        const colW = (PW - 2 * MARGIN) / 2;
        drawGrayHeader(doc, MARGIN, y, colW, sectionH, 'NIT', true);
        drawGrayHeader(doc, MARGIN + colW, y, colW, sectionH, 'ORDEN DE VENTA No.', true);
        y += sectionH;
        drawValueCell(doc, MARGIN, y, colW, 7, partyNit, { bold: true });
        drawValueCell(doc, MARGIN + colW, y, colW, 7, orderNumber, { bold: true, center: true });
        y += 7;

        // DIRECCION / CIUDAD / TELEFONO
        const col3W = (PW - 2 * MARGIN) / 3;
        drawGrayHeader(doc, MARGIN, y, col3W, sectionH, 'DIRECCION', true);
        drawGrayHeader(doc, MARGIN + col3W, y, col3W, sectionH, 'CIUDAD', true);
        drawGrayHeader(doc, MARGIN + 2 * col3W, y, col3W, sectionH, 'TELÉFONO', true);
        y += sectionH;
        drawValueCell(doc, MARGIN, y, col3W, 7, partyAddress);
        drawValueCell(doc, MARGIN + col3W, y, col3W, 7, partyCity);
        drawValueCell(doc, MARGIN + 2 * col3W, y, col3W, 7, partyPhone);
        y += 7;

        // ─── DETALLES DE ENVÍO ──────────────────────────────────────────────
        drawGrayHeader(doc, MARGIN, y, PW - 2 * MARGIN, sectionH, 'DETALLES DE ENVÍO', true);
        y += sectionH;
        const col4W = (PW - 2 * MARGIN) / 4;
        drawGrayHeader(doc, MARGIN, y, col4W, sectionH, 'FECHA DESPACHO');
        drawGrayHeader(doc, MARGIN + col4W, y, col4W, sectionH, 'BODEGA ORIGEN');
        drawGrayHeader(doc, MARGIN + 2 * col4W, y, col4W, sectionH, 'TRANSPORTADORA');
        drawGrayHeader(doc, MARGIN + 3 * col4W, y, col4W, sectionH, 'Nº GUÍA');
        y += sectionH;
        drawValueCell(doc, MARGIN, y, col4W, 7, fmtDateLong(issueDate), { center: true, fontSize: 7.5 });
        drawValueCell(doc, MARGIN + col4W, y, col4W, 7, warehouseName, { center: true });
        drawValueCell(doc, MARGIN + 2 * col4W, y, col4W, 7, carrierName, { center: true, bold: true });
        drawValueCell(doc, MARGIN + 3 * col4W, y, col4W, 7, shipment.tracking_number || `SHPT-${number}`, { center: true, bold: true });
        y += 7;

        // ─── RESPONSABLES ──────────────────────────────────────────────────
        drawGrayHeader(doc, MARGIN, y, PW - 2 * MARGIN, sectionH, 'RESPONSABLES OPERATIVOS', true);
        y += sectionH;
        drawGrayHeader(doc, MARGIN, y, col4W, sectionH, 'PREPARÓ');
        drawGrayHeader(doc, MARGIN + col4W, y, col4W, sectionH, 'VERIFICÓ');
        drawGrayHeader(doc, MARGIN + 2 * col4W, y, col4W, sectionH, 'DESPACHÓ');
        drawGrayHeader(doc, MARGIN + 3 * col4W, y, col4W, sectionH, 'ENTREGÓ A');
        y += sectionH;
        drawValueCell(doc, MARGIN, y, col4W, 8, profileName(shipment.prepared_by_profile), { bold: true, center: true, fontSize: 8 });
        drawValueCell(doc, MARGIN + col4W, y, col4W, 8, profileName(shipment.verified_by_profile), { bold: true, center: true, fontSize: 8 });
        drawValueCell(doc, MARGIN + 2 * col4W, y, col4W, 8, profileName(shipment.dispatched_by_profile), { bold: true, center: true, fontSize: 8 });
        drawValueCell(doc, MARGIN + 3 * col4W, y, col4W, 8, (shipment.delivered_by_name ?? '—').toUpperCase(), { bold: true, center: true, fontSize: 8 });
        y += 8;

        // ─── TABLA DE PRODUCTOS ─────────────────────────────────────────────
        autoTable(doc, {
            startY: y,
            head: [['SKU', 'Descripción', 'U.M.', 'Pedido', 'Despachado', 'Valor Unit.', 'Total']],
            body: items.length > 0 ? items.map((it) => {
                const qty = Number(it.qty_shipped ?? 0);
                const unit = Number(it.product?.cost ?? 0);
                return [
                    it.product?.sku ?? '—',
                    (it.product?.name ?? '—').toUpperCase(),
                    it.product?.uom ?? 'Und.',
                    fmtNumber(Number(it.qty_ordered ?? 0)),
                    fmtNumber(qty),
                    fmtNumber(unit),
                    fmtNumber(qty * unit),
                ];
            }) : [['—', '—', '—', '—', '—', '—', '—']],
            styles: {
                fontSize: 8,
                cellPadding: 2,
                lineColor: COLORS.black,
                lineWidth: 0.15,
                textColor: COLORS.black,
            },
            headStyles: {
                fillColor: COLORS.brand,
                textColor: COLORS.white,
                fontStyle: 'bold',
                fontSize: 7.5,
                halign: 'left',
                lineColor: COLORS.brand,
                lineWidth: 0.2,
            },
            columnStyles: {
                0: { cellWidth: 22 },
                2: { halign: 'center', cellWidth: 12 },
                3: { halign: 'right', cellWidth: 18 },
                4: { halign: 'right', cellWidth: 22, fontStyle: 'bold' },
                5: { halign: 'right', cellWidth: 22 },
                6: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
            },
            margin: { left: MARGIN, right: MARGIN },
        });

        let afterTableY: number = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? (y + 10);

        // ─── Footer: valor en letras + total ────────────────────────────────
        afterTableY += 2;
        const footerH = 12;
        const leftFooterW = (PW - 2 * MARGIN) * 0.6;
        const rightFooterW = (PW - 2 * MARGIN) * 0.4;

        drawBorderedCell(doc, MARGIN, afterTableY, leftFooterW, footerH);
        drawGrayHeader(doc, MARGIN, afterTableY, 30, 5, 'VALOR EN LETRAS');
        doc.setTextColor(...COLORS.black);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        const words = amountInWords(totalValue);
        const wordLines = doc.splitTextToSize(words, leftFooterW - 4);
        doc.text(wordLines.slice(0, 2), MARGIN + 2, afterTableY + 8);

        drawGrayHeader(doc, MARGIN + leftFooterW, afterTableY, rightFooterW, 6, 'TOTAL DEL DOCUMENTO');
        drawBorderedCell(doc, MARGIN + leftFooterW, afterTableY + 6, rightFooterW, 6);
        doc.setTextColor(...COLORS.black);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(fmtNumber(totalValue), MARGIN + leftFooterW + rightFooterW - 3, afterTableY + 10.5, { align: 'right' });

        afterTableY += footerH + 4;

        // ─── Notas (si hay) ─────────────────────────────────────────────────
        if (shipment.notes) {
            drawGrayHeader(doc, MARGIN, afterTableY, PW - 2 * MARGIN, 5, 'OBSERVACIONES');
            afterTableY += 5;
            drawBorderedCell(doc, MARGIN, afterTableY, PW - 2 * MARGIN, 10);
            doc.setTextColor(...COLORS.black);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            const notesLines = doc.splitTextToSize(shipment.notes, PW - 2 * MARGIN - 4);
            doc.text(notesLines.slice(0, 2), MARGIN + 2, afterTableY + 4);
            afterTableY += 12;
        }

        // ─── Firmas ─────────────────────────────────────────────────────────
        // Si no hay espacio, nueva página
        if (afterTableY > PH - 42) {
            doc.addPage();
            afterTableY = 30;
        }
        afterTableY += 14;

        const sigW = (PW - 2 * MARGIN) / 2 - 4;
        doc.setDrawColor(...COLORS.black);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, afterTableY, MARGIN + sigW, afterTableY);
        doc.line(PW - MARGIN - sigW, afterTableY, PW - MARGIN, afterTableY);
        doc.setTextColor(...COLORS.dark);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('ENTREGADO POR', MARGIN, afterTableY + 4);
        doc.text('RECIBIDO A CONFORMIDAD', PW - MARGIN - sigW, afterTableY + 4);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.muted);
        doc.text('Firma, nombre y sello', MARGIN, afterTableY + 8);
        doc.text('Firma, C.C. y sello del cliente', PW - MARGIN - sigW, afterTableY + 8);

        // Page numbers footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setTextColor(...COLORS.muted);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(`${tenantName} · NIT ${tenantNit}${tenantDv}`, MARGIN, PH - 5);
            doc.text(`Página ${i} de ${pageCount}`, PW - MARGIN, PH - 5, { align: 'right' });
        }

        doc.save(`Remision_${number}_${(partyName || 'Cliente').substring(0, 20)}.pdf`);
    },
};

// ─── Util: cargar imagen como DataURL para jsPDF ─────────────────────────────

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise<string | null>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string) ?? null);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}
