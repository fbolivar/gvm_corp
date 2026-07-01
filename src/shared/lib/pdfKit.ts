import jsPDF from 'jspdf';

/**
 * Kit de diseño compartido para todos los PDF de la app.
 * Identidad GVM: azul corporativo #0096E6 + acento esmeralda.
 * Provee: paleta, carga de logo, encabezado de marca, pie y estilos de tabla.
 */

export type RGB = [number, number, number];

export const PDF_PRIMARY: RGB = [0, 150, 230];   // #0096E6 azul corporativo
export const PDF_ACCENT: RGB = [16, 185, 129];   // esmeralda
export const PDF_INK: RGB = [31, 41, 55];
export const PDF_MUTED: RGB = [120, 128, 140];
export const PDF_LINE: RGB = [223, 227, 235];
export const PDF_SOFT: RGB = [246, 247, 251];
export const PDF_WHITE: RGB = [255, 255, 255];

export function pdfPrimarySoft(primary: RGB = PDF_PRIMARY): RGB {
    return [
        Math.round(primary[0] + (255 - primary[0]) * 0.88),
        Math.round(primary[1] + (255 - primary[1]) * 0.88),
        Math.round(primary[2] + (255 - primary[2]) * 0.88),
    ];
}

export interface PdfCompany {
    name: string;
    nit?: string | null;
    dv?: string | null;
    address?: string | null;
    city?: string | null;
    department?: string | null;
    phone?: string | null;
    email?: string | null;
    logo_url?: string | null;
}

export function pdfFmtInt(n: number): string {
    return (Number(n) || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function pdfFmtDate(iso: string | null | undefined): string {
    if (!iso) return '';
    // Fechas de solo día se parsean como locales para no correrlas un día (bug UTC).
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export async function loadLogo(url: string): Promise<{ data: string; format: string; w: number; h: number } | null> {
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

/**
 * Dibuja el encabezado de marca: logo + datos de empresa + badge de título.
 * Devuelve la coordenada Y donde puede continuar el contenido.
 */
export async function drawBrandHeader(
    doc: jsPDF,
    opts: {
        company: PdfCompany;
        title: string;
        number?: string;
        subtitle?: string;
        margin?: number;
    }
): Promise<number> {
    const { company, title, number, subtitle } = opts;
    const M = opts.margin ?? 12;
    const pw = doc.internal.pageSize.width;
    const CW = pw - M * 2;
    let y = M;

    // Logo o iniciales
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
        doc.setTextColor(...PDF_PRIMARY);
        const initials = company.name.split(' ').filter(w => w.length > 1).map(w => w[0]).join('').slice(0, 4);
        doc.text(initials || 'GVM', M, y + 14);
    }

    // Empresa
    const infoX = M + logoMaxW + 6;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_PRIMARY);
    const nameLines = doc.splitTextToSize(company.name.toUpperCase(), 95);
    let iy = y + 4;
    for (const nl of nameLines.slice(0, 2)) { doc.text(nl, infoX, iy); iy += 5; }

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_MUTED);
    if (company.nit) { doc.text(`NIT ${company.nit}${company.dv ? '-' + company.dv : ''}`, infoX, iy); iy += 3.8; }
    const loc = [company.address, company.city, company.department].filter(Boolean).join(', ');
    if (loc) { doc.text(loc, infoX, iy); iy += 3.8; }
    const contact = [company.phone ? `Tel: ${company.phone}` : '', company.email || ''].filter(Boolean).join('   ·   ');
    if (contact) { doc.text(contact, infoX, iy); iy += 3.8; }

    // Badge de título (derecha)
    const badgeW = 56;
    const badgeH = number ? 24 : 16;
    const badgeX = pw - M - badgeW;
    doc.setFillColor(...PDF_PRIMARY);
    doc.roundedRect(badgeX, y, badgeW, badgeH, 2.5, 2.5, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_WHITE);
    doc.text(doc.splitTextToSize(title.toUpperCase(), badgeW - 6), badgeX + badgeW / 2, y + 6, { align: 'center' });
    if (number) {
        doc.setFontSize(15);
        doc.text(number, badgeX + badgeW / 2, y + badgeH - 6, { align: 'center' });
    }

    y = Math.max(iy, y + badgeH) + 3;
    if (subtitle) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...PDF_MUTED);
        doc.text(subtitle, M, y);
        y += 4;
    }

    // Línea divisoria con acento
    doc.setDrawColor(...PDF_PRIMARY);
    doc.setLineWidth(0.8);
    doc.line(M, y, M + CW, y);
    doc.setDrawColor(...PDF_ACCENT);
    doc.line(M, y, M + CW * 0.28, y);
    return y + 5;
}

/** Pie de página con datos de contacto y línea divisoria. */
export function drawBrandFooter(doc: jsPDF, company: PdfCompany, opts?: { margin?: number; note?: string }): void {
    const M = opts?.margin ?? 12;
    const pw = doc.internal.pageSize.width;
    const ph = doc.internal.pageSize.height;
    const CW = pw - M * 2;
    const y = ph - 16;

    doc.setDrawColor(...PDF_LINE);
    doc.setLineWidth(0.3);
    doc.line(M, y, M + CW, y);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_PRIMARY);
    doc.text(company.name, M, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PDF_MUTED);
    const loc = [company.address, company.city].filter(Boolean).join(', ');
    const foot = [loc, company.phone ? `Tel: ${company.phone}` : '', company.email || ''].filter(Boolean).join('   ·   ');
    doc.text(foot, M, y + 8);
    if (opts?.note) doc.text(opts.note, M, y + 11.5);
}

/** Estilos de tabla de marca para jspdf-autotable. */
export function brandTableStyles() {
    return {
        styles: {
            fontSize: 8,
            cellPadding: { top: 2.6, bottom: 2.6, left: 2.5, right: 2.5 },
            font: 'helvetica',
            textColor: PDF_INK as unknown as [number, number, number],
            lineColor: PDF_LINE as unknown as [number, number, number],
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: PDF_PRIMARY as unknown as [number, number, number],
            textColor: PDF_WHITE as unknown as [number, number, number],
            fontStyle: 'bold' as const,
            fontSize: 7.5,
            halign: 'center' as const,
            valign: 'middle' as const,
            cellPadding: 2.8,
            lineWidth: 0,
        },
        alternateRowStyles: { fillColor: PDF_SOFT as unknown as [number, number, number] },
        theme: 'grid' as const,
    };
}
