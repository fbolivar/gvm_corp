import jsPDF from 'jspdf';
import { PAYROLL_CONSTANTS } from './payrollService';

export interface CertificateData {
    employeeName: string;
    employeeDoc: string;
    employeeDocType: string;
    contractType: string;
    startDate: string;
    salary: number;
    transportAllowance: boolean;

    // Bonificaciones y auxilios que se le agregan al empleado (mensuales)
    salaryBonus?: number;         // bonificación salarial
    nonSalaryBonus?: number;      // bonificación no salarial
    additionalAllowances?: number; // auxilios adicionales
    mobilityAllowance?: number;   // auxilio de rodamiento

    // Empresa
    companyName: string;
    companyNit?: string;
    companyAddress?: string;
    companyContact?: string;
    companyLogoUrl?: string | null;      // URL cruda (el botón la convierte)
    companyLogoDataUrl?: string | null;  // dataURL listo para el PDF

    // Firmante (jefe de RRHH)
    signerName?: string;
    signerTitle?: string;
    signerSignatureUrl?: string | null;  // URL cruda de la firma
    signatureDataUrl?: string | null;    // dataURL listo para el PDF

    // Firma electrónica / verificación
    today?: string;
    verificationCode?: string;
    qrDataUrl?: string | null;
}

const BLUE: [number, number, number] = [0, 150, 230];
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];

const CONTRACT_LABELS: Record<string, string> = {
    INDEFINIDO: 'término indefinido',
    FIJO: 'término fijo',
    OBRA_LABOR: 'obra o labor contratada',
    APRENDIZAJE: 'aprendizaje',
    PRESTACION_SERVICIOS: 'prestación de servicios',
};

const fmtCOP = (n: number) =>
    `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP`;

const fmtDate = (iso: string) => {
    const d = new Date(iso + (iso.length <= 10 ? 'T12:00:00' : ''));
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
};

/** Cabecera corporativa limpia (logo + identidad, sin bandas de color). Devuelve el cursor Y. */
function buildHeader(doc: jsPDF, title: string, data: CertificateData): number {
    const W = doc.internal.pageSize.width;
    const margin = 14;
    const today = data.today ?? new Date().toISOString().split('T')[0];

    // Logo (sin recorte)
    let textX = margin;
    if (data.companyLogoDataUrl) {
        try {
            doc.addImage(data.companyLogoDataUrl, 'PNG', margin, 12, 26, 26, undefined, 'FAST');
            textX = margin + 32;
        } catch {
            textX = margin;
        }
    }

    // Nombre de la empresa (oscuro, se ajusta si es largo)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...INK);
    const nameLines = doc.splitTextToSize(data.companyName.toUpperCase(), W - margin - textX);
    let ny = 19;
    doc.text(nameLines, textX, ny);
    ny += nameLines.length * 6 + 1;

    // Datos de contacto (gris)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    if (data.companyNit) { doc.text(`NIT ${data.companyNit}`, textX, ny); ny += 4.4; }
    if (data.companyAddress) { doc.text(data.companyAddress, textX, ny); ny += 4.4; }
    if (data.companyContact) { doc.text(data.companyContact, textX, ny); ny += 4.4; }

    // Línea divisoria fina
    const rule = Math.max(44, ny + 2);
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.5);
    doc.line(margin, rule, W - margin, rule);

    // Título + fecha en la misma fila (sin choque)
    const ty = rule + 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...INK);
    doc.text(title.toUpperCase(), margin, ty);
    // Acento fino bajo el título
    const tw = doc.getTextWidth(title.toUpperCase());
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(1.3);
    doc.line(margin, ty + 2.6, margin + Math.min(tw, 72), ty + 2.6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(`Bogotá D.C., ${fmtDate(today)}`, W - margin, ty, { align: 'right' });

    return ty + 14;
}

/** Bloque de datos del empleado en recuadro. */
function employeeBox(doc: jsPDF, data: CertificateData, y: number): number {
    const W = doc.internal.pageSize.width;
    const margin = 14;
    const transport = data.transportAllowance && data.salary <= PAYROLL_CONSTANTS.SMLV_2026 * 2
        ? PAYROLL_CONSTANTS.TRANSPORT_ALLOWANCE_2026 : 0;
    const salaryBonus = Number(data.salaryBonus) || 0;
    const nonSalaryBonus = Number(data.nonSalaryBonus) || 0;
    const additionalAllowances = Number(data.additionalAllowances) || 0;
    const mobilityAllowance = Number(data.mobilityAllowance) || 0;
    const extras = transport + salaryBonus + nonSalaryBonus + additionalAllowances + mobilityAllowance;
    const totalMensual = data.salary + extras;

    const rows: [string, string][] = [
        ['Nombre', data.employeeName.toUpperCase()],
        ['Identificación', `${data.employeeDocType || 'C.C.'} No. ${data.employeeDoc}`],
        ['Tipo de contrato', `Contrato de trabajo a ${CONTRACT_LABELS[data.contractType] ?? data.contractType}`],
        ['Fecha de ingreso', fmtDate(data.startDate)],
        ['Salario mensual', fmtCOP(data.salary)],
        ...(transport > 0 ? [['Auxilio de transporte', fmtCOP(transport)] as [string, string]] : []),
        ...(salaryBonus > 0 ? [['Bonificación salarial', fmtCOP(salaryBonus)] as [string, string]] : []),
        ...(nonSalaryBonus > 0 ? [['Bonificación no salarial', fmtCOP(nonSalaryBonus)] as [string, string]] : []),
        ...(additionalAllowances > 0 ? [['Auxilios adicionales', fmtCOP(additionalAllowances)] as [string, string]] : []),
        ...(mobilityAllowance > 0 ? [['Auxilio de rodamiento', fmtCOP(mobilityAllowance)] as [string, string]] : []),
        ...(extras > 0 ? [['Total mensual devengado', fmtCOP(totalMensual)] as [string, string]] : []),
    ];
    const boxH = rows.length * 8 + 8;
    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.3);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, W - margin * 2, boxH, 2, 2, 'FD');

    let ry = y + 9;
    for (const [k, v] of rows) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(k.toUpperCase(), margin + 4, ry);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(...INK);
        doc.text(v, margin + 55, ry);
        ry += 8;
    }
    return y + boxH + 8;
}

/** Firma del jefe de RRHH (imagen + nombre) + QR/código + pie. */
function signatureAndFooter(doc: jsPDF, data: CertificateData, y: number): void {
    const W = doc.internal.pageSize.width;
    const signerName = data.signerName || 'Responsable de Recursos Humanos';
    const signerTitle = data.signerTitle || 'Jefe de Recursos Humanos';
    const today = data.today ?? new Date().toISOString().split('T')[0];

    const sigY = Math.max(y + 26, 232);

    // Imagen de firma (si existe) sobre la línea
    if (data.signatureDataUrl) {
        try {
            doc.addImage(data.signatureDataUrl, 'PNG', 14, sigY - 20, 46, 18, undefined, 'FAST');
        } catch { /* ignore */ }
    }

    doc.setDrawColor(...BLUE);
    doc.setLineWidth(0.4);
    doc.line(14, sigY, 90, sigY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(signerName.toUpperCase(), 14, sigY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(signerTitle, 14, sigY + 11);
    doc.text(data.companyName, 14, sigY + 16);

    // QR + código de verificación (derecha)
    if (data.qrDataUrl) {
        try {
            doc.addImage(data.qrDataUrl, 'PNG', W - 44, sigY - 20, 26, 26, undefined, 'FAST');
        } catch { /* ignore */ }
    }
    if (data.verificationCode) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text('CÓDIGO DE VERIFICACIÓN', W - 31, sigY + 8, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...INK);
        doc.text(data.verificationCode, W - 31, sigY + 13, { align: 'center' });
    }

    // Pie
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 277, W, 20, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(
        `Expedido el ${fmtDate(today)} por ${data.companyName}. Documento con firma electrónica (Ley 527 de 1999).`,
        14, 285
    );
    doc.text(
        'La autenticidad puede verificarse con el código y el código QR. Documento generado electrónicamente.',
        14, 290
    );
}

export const certificateService = {
    generateLaboralCertificate(data: CertificateData) {
        const doc = new jsPDF();
        const W = doc.internal.pageSize.width;
        const margin = 14;
        const maxWidth = W - margin * 2;
        let y = buildHeader(doc, 'Certificado Laboral', data);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...INK);
        doc.text('A QUIEN CORRESPONDA:', margin, y);
        y += 9;

        doc.setFont('helvetica', 'normal');
        const intro = `La empresa ${data.companyName}${data.companyNit ? `, identificada con NIT ${data.companyNit},` : ','} `
            + `se permite certificar que el(la) señor(a) cuyos datos se relacionan a continuación se encuentra `
            + `vinculado(a) laboralmente a esta compañía:`;
        const introLines = doc.splitTextToSize(intro, maxWidth);
        doc.text(introLines, margin, y);
        y += introLines.length * 6 + 4;

        // Recuadro de datos del empleado
        y = employeeBox(doc, data, y);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...INK);
        const closing = `La presente certificación se expide a solicitud del(la) interesado(a), el ${fmtDate(data.today ?? new Date().toISOString().split('T')[0])}, para los fines que estime convenientes.`;
        const closingLines = doc.splitTextToSize(closing, maxWidth);
        doc.text(closingLines, margin, y);
        y += closingLines.length * 6 + 6;

        doc.text('Atentamente,', margin, y);

        signatureAndFooter(doc, data, y);
        doc.save(`certificado-laboral-${data.employeeName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    },

    generateIncomeCertificate(data: CertificateData) {
        const doc = new jsPDF();
        const W = doc.internal.pageSize.width;
        const margin = 14;
        const maxWidth = W - margin * 2;
        let y = buildHeader(doc, 'Certificado de Ingresos', data);

        const transport = data.transportAllowance && data.salary <= PAYROLL_CONSTANTS.SMLV_2026 * 2
            ? PAYROLL_CONSTANTS.TRANSPORT_ALLOWANCE_2026 : 0;
        const health = data.salary * PAYROLL_CONSTANTS.HEALTH_RATE_EMPLOYEE;
        const pension = data.salary * PAYROLL_CONSTANTS.PENSION_RATE_EMPLOYEE;
        const netMonthly = data.salary + transport - health - pension;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...INK);
        doc.text('A QUIEN CORRESPONDA:', margin, y);
        y += 9;

        doc.setFont('helvetica', 'normal');
        const intro = `La empresa ${data.companyName}${data.companyNit ? `, NIT ${data.companyNit},` : ','} certifica los ingresos del(la) trabajador(a):`;
        const introLines = doc.splitTextToSize(intro, maxWidth);
        doc.text(introLines, margin, y);
        y += introLines.length * 6 + 4;

        // Recuadro de datos
        y = employeeBox(doc, data, y);

        // Tabla de ingresos/deducciones
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...MUTED);
        doc.text('DETALLE DE INGRESOS Y DEDUCCIONES MENSUALES', margin, y);
        y += 3;
        doc.setDrawColor(...BLUE);
        doc.line(margin, y, W - margin, y);
        y += 6;

        const rows: [string, string, boolean][] = [
            ['Salario básico mensual', fmtCOP(data.salary), false],
            ...(transport > 0 ? [['Auxilio de transporte', fmtCOP(transport), false] as [string, string, boolean]] : []),
            ['Aporte salud empleado (4%)', `- ${fmtCOP(health)}`, false],
            ['Aporte pensión empleado (4%)', `- ${fmtCOP(pension)}`, false],
            ['INGRESO NETO MENSUAL ESTIMADO', fmtCOP(netMonthly), true],
            ['INGRESO BRUTO ANUAL ESTIMADO', fmtCOP(data.salary * 12), true],
        ];
        for (const [label, value, isTotal] of rows) {
            if (isTotal) {
                doc.setFillColor(240, 248, 254);
                doc.rect(margin, y - 5, maxWidth, 8, 'F');
            }
            doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
            doc.setFontSize(isTotal ? 10 : 9);
            doc.setTextColor(...INK);
            doc.text(label, margin + 2, y);
            doc.text(value, W - margin - 2, y, { align: 'right' });
            y += isTotal ? 9 : 7;
        }
        y += 4;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...MUTED);
        const disclaimer = 'Nota: los valores corresponden al ingreso mensual fijo. Horas extra, comisiones y bonificaciones no recurrentes no se incluyen en este certificado.';
        const dLines = doc.splitTextToSize(disclaimer, maxWidth);
        doc.text(dLines, margin, y);
        y += dLines.length * 5 + 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...INK);
        const closing = `La presente certificación se expide a solicitud del(la) interesado(a), el ${fmtDate(data.today ?? new Date().toISOString().split('T')[0])}.`;
        const cl = doc.splitTextToSize(closing, maxWidth);
        doc.text(cl, margin, y);
        y += cl.length * 6 + 4;
        doc.text('Atentamente,', margin, y);

        signatureAndFooter(doc, data, y);
        doc.save(`certificado-ingresos-${data.employeeName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    },
};
