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
    companyName: string;
    companyNit?: string;
    signerName?: string;
    signerTitle?: string;
    today?: string;
}

const CONTRACT_LABELS: Record<string, string> = {
    INDEFINIDO:           'término indefinido',
    FIJO:                 'término fijo',
    OBRA_LABOR:           'obra o labor contratada',
    APRENDIZAJE:          'aprendizaje',
    PRESTACION_SERVICIOS: 'prestación de servicios',
};

const fmtCOP = (n: number) =>
    `$${n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP`;

const fmtDate = (iso: string) => {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
};

function buildBase(doc: jsPDF, title: string, data: CertificateData): number {
    const W = doc.internal.pageSize.width;
    const today = data.today ?? new Date().toISOString().split('T')[0];

    // Header background
    doc.setFillColor(0, 150, 230);
    doc.rect(0, 0, W, 42, 'F');

    // Accent stripe
    doc.setFillColor(0, 150, 230);
    doc.rect(0, 0, 4, 297, 'F');

    // Company name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(data.companyName.toUpperCase(), 14, 18);

    if (data.companyNit) {
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`NIT: ${data.companyNit}`, 14, 26);
    }

    // Date top-right
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(fmtDate(today), W - 14, 18, { align: 'right' });

    // Title bar
    doc.setFillColor(0, 150, 230);
    doc.rect(4, 44, W - 4, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), 14, 53.5);

    return 72; // y cursor after header
}

function addSignature(doc: jsPDF, data: CertificateData, y: number): void {
    const signerName = data.signerName ?? 'Representante Legal';
    const signerTitle = data.signerTitle ?? 'Recursos Humanos';
    const today = data.today ?? new Date().toISOString().split('T')[0];
    const W = doc.internal.pageSize.width;

    // Signature block
    const sigY = y + 30;
    doc.setDrawColor(0, 150, 230);
    doc.setLineWidth(0.3);
    doc.line(14, sigY, 100, sigY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(signerName.toUpperCase(), 14, sigY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(signerTitle, 14, sigY + 12);
    doc.text(data.companyName, 14, sigY + 18);

    // Footer
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 277, W, 20, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Expedido el ${fmtDate(today)} por ${data.companyName} · Documento generado electrónicamente`, 14, 286);
    doc.text('Este documento no requiere firma húmeda por ser generado mediante sistema de gestión certificado.', 14, 292);
}

export const certificateService = {
    generateLaboralCertificate(data: CertificateData) {
        const doc = new jsPDF();
        let y = buildBase(doc, 'Certificado Laboral', data);
        const W = doc.internal.pageSize.width;
        const margin = 14;
        const maxWidth = W - margin * 2;

        const contractLabel = CONTRACT_LABELS[data.contractType] ?? data.contractType;
        const transport = data.transportAllowance && data.salary <= PAYROLL_CONSTANTS.SMLV_2026 * 2
            ? PAYROLL_CONSTANTS.TRANSPORT_ALLOWANCE_2026
            : 0;

        // Salutation
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);

        const lines: { text: string; bold?: boolean; indent?: number }[] = [
            { text: 'A QUIEN CORRESPONDA:', bold: true },
            { text: '' },
            {
                text: `La empresa ${data.companyName}${data.companyNit ? `, identificada con NIT ${data.companyNit},` : ','} `
                    + `certifica que el(la) señor(a):`,
            },
            { text: '' },
            { text: data.employeeName.toUpperCase(), bold: true, indent: 8 },
            {
                text: `Identificado(a) con ${data.employeeDocType || 'C.C.'} No. ${data.employeeDoc}`,
                indent: 8,
            },
            { text: '' },
            {
                text: `Se encuentra vinculado(a) a esta empresa mediante CONTRATO DE TRABAJO a ${contractLabel}, `
                    + `iniciando labores el ${fmtDate(data.startDate)}, devengando un salario mensual de `,
            },
            { text: fmtCOP(data.salary), bold: true, indent: 8 },
            ...(transport > 0 ? [
                { text: '' },
                {
                    text: `Adicionalmente, recibe un auxilio de transporte de ${fmtCOP(transport)} mensuales, `
                        + `para un total de ingresos mensuales de:`,
                },
                { text: fmtCOP(data.salary + transport), bold: true, indent: 8 },
            ] : []),
            { text: '' },
            {
                text: 'La presente certificación se expide a solicitud del interesado(a) para los fines que estime conveniente.',
            },
            { text: '' },
            { text: 'Atentamente,' },
        ];

        for (const line of lines) {
            if (line.text === '') {
                y += 5;
                continue;
            }
            const x = margin + (line.indent ?? 0);
            if (line.bold) {
                doc.setFont('helvetica', 'bold');
            } else {
                doc.setFont('helvetica', 'normal');
            }
            const wrapped = doc.splitTextToSize(line.text, maxWidth - (line.indent ?? 0));
            doc.text(wrapped, x, y);
            y += wrapped.length * 6;
        }

        addSignature(doc, data, y);
        doc.save(`certificado-laboral-${data.employeeName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    },

    generateIncomeCertificate(data: CertificateData) {
        const doc = new jsPDF();
        let y = buildBase(doc, 'Certificado de Ingresos y Retenciones', data);
        const W = doc.internal.pageSize.width;
        const margin = 14;
        const maxWidth = W - margin * 2;

        const transport = data.transportAllowance && data.salary <= PAYROLL_CONSTANTS.SMLV_2026 * 2
            ? PAYROLL_CONSTANTS.TRANSPORT_ALLOWANCE_2026
            : 0;
        const ibc      = data.salary;
        const health   = ibc * PAYROLL_CONSTANTS.HEALTH_RATE_EMPLOYEE;
        const pension  = ibc * PAYROLL_CONSTANTS.PENSION_RATE_EMPLOYEE;
        const netMonthly = data.salary + transport - health - pension;

        const rows: [string, string][] = [
            ['Salario Básico Mensual',                  fmtCOP(data.salary)],
            ...(transport > 0 ? [['Auxilio de Transporte', fmtCOP(transport)] as [string, string]] : []),
            ['Aporte Salud Empleado (4%)',               `- ${fmtCOP(health)}`],
            ['Aporte Pensión Empleado (4%)',             `- ${fmtCOP(pension)}`],
            ['─────────────────────────────────────',   '─────────────'],
            ['INGRESO NETO MENSUAL ESTIMADO',           fmtCOP(netMonthly)],
            ['INGRESO BRUTO ANUAL ESTIMADO',            fmtCOP(data.salary * 12)],
        ];

        // Salutation
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);

        const header = [
            { text: 'A QUIEN CORRESPONDA:', bold: true },
            { text: '' },
            {
                text: `La empresa ${data.companyName}${data.companyNit ? `, NIT ${data.companyNit},` : ','} `
                    + `certifica los ingresos del(la) trabajador(a):`,
            },
            { text: '' },
            { text: data.employeeName.toUpperCase(), bold: true, indent: 8 },
            { text: `${data.employeeDocType || 'C.C.'} No. ${data.employeeDoc}`, indent: 8 },
            { text: '' },
            { text: 'RESUMEN DE INGRESOS Y DEDUCCIONES MENSUALES', bold: true },
            { text: '' },
        ];

        for (const line of header) {
            if (line.text === '') { y += 5; continue; }
            const x = margin + (line.indent ?? 0);
            doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
            const wrapped = doc.splitTextToSize(line.text, maxWidth - (line.indent ?? 0));
            doc.text(wrapped, x, y);
            y += wrapped.length * 6;
        }

        // Table
        for (const [label, value] of rows) {
            const isTotal = label.startsWith('INGRESO') || label.startsWith('─');
            doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
            doc.setFontSize(isTotal ? 10 : 9);
            if (isTotal && !label.startsWith('─')) {
                doc.setFillColor(248, 250, 252);
                doc.rect(margin, y - 5, maxWidth, 8, 'F');
            }
            doc.setTextColor(15, 23, 42);
            doc.text(label, margin + 2, y);
            doc.text(value, W - margin, y, { align: 'right' });
            y += 7;
        }

        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        const disclaimer = 'Nota: Los valores corresponden al ingreso mensual fijo. Las horas extra, comisiones y bonificaciones '
            + 'no recurrentes no están incluidas en este certificado.';
        const dLines = doc.splitTextToSize(disclaimer, maxWidth);
        doc.text(dLines, margin, y);
        y += dLines.length * 5 + 8;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text('La presente certificación se expide a solicitud del interesado(a).', margin, y);
        y += 8;
        doc.text('Atentamente,', margin, y);

        addSignature(doc, data, y);
        doc.save(`certificado-ingresos-${data.employeeName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    },
};
