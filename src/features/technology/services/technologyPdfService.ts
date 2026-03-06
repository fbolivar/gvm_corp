import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { pdfReportService, type ReportHeaderOptions } from '@/features/accounting/services/pdfReportService';
import type { ITAsset, ITMaintenanceSchedule } from '../types';
import { STATUS_LABELS, CATEGORY_LABELS, CONDITION_LABELS } from '../types';

interface AssetReportKPIs {
    total: number;
    available: number;
    assigned: number;
    inMaintenance: number;
}

// ── Corporate color palette ──
const COLORS = {
    primary: [15, 23, 42] as [number, number, number],       // Slate 900
    accent: [79, 70, 229] as [number, number, number],       // Indigo 600
    dark: [30, 41, 59] as [number, number, number],          // Slate 800
    muted: [148, 163, 184] as [number, number, number],      // Slate 400
    light: [248, 250, 252] as [number, number, number],      // Slate 50
    white: [255, 255, 255] as [number, number, number],
    emerald: [16, 185, 129] as [number, number, number],
    indigo: [79, 70, 229] as [number, number, number],
    amber: [245, 158, 11] as [number, number, number],
    rose: [225, 29, 72] as [number, number, number],
};

const STATUS_CELL_COLORS: Record<string, [number, number, number]> = {
    AVAILABLE: COLORS.emerald,
    ASSIGNED: COLORS.indigo,
    IN_MAINTENANCE: COLORS.amber,
    RETIRED: COLORS.muted,
    LOST: COLORS.rose,
};

export const technologyPdfService = {
    /**
     * Builds a custom two-row header that never overlaps,
     * regardless of company name length.
     *
     * Row 1 (h=38): Company identity + period badge
     * Row 2 (h=14): Report title bar (full-width accent)
     */
    async buildHeader(doc: jsPDF, options: ReportHeaderOptions): Promise<number> {
        const pw = doc.internal.pageSize.width;

        // ── Row 1: Company bar ──
        doc.setFillColor(...COLORS.primary);
        doc.rect(0, 0, pw, 38, 'F');

        // Side stripe
        doc.setFillColor(...COLORS.accent);
        doc.rect(0, 0, 4, 297, 'F');

        // Logo
        let tx = 14;
        if (options.logoUrl) {
            try {
                const b64 = await pdfReportService.loadImage(options.logoUrl);
                doc.addImage(b64, 'PNG', 14, 6, 22, 22, undefined, 'FAST');
                tx = 42;
            } catch { /* skip */ }
        }

        // Company name — clamp to max width to prevent overflow
        const maxNameWidth = pw - tx - 70; // leave room for period badge
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.white);

        // Try font 16 first, shrink if needed
        let fontSize = 16;
        doc.setFontSize(fontSize);
        while (doc.getTextWidth(options.companyName.toUpperCase()) > maxNameWidth && fontSize > 10) {
            fontSize -= 0.5;
            doc.setFontSize(fontSize);
        }
        doc.text(options.companyName.toUpperCase(), tx, 17);

        // Sub-info line
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.muted);
        const info: string[] = [];
        if (options.companyNit) info.push(`NIT: ${options.companyNit}`);
        if (options.companyAddress) info.push(options.companyAddress);
        if (options.companyPhone) info.push(`TEL: ${options.companyPhone}`);
        if (info.length) doc.text(info.join('  |  '), tx, 23);
        doc.text('SISTEMA DE GESTION EMPRESARIAL V3.0', tx, 28);

        // Period badge (right)
        doc.setFillColor(...COLORS.dark);
        doc.roundedRect(pw - 62, 8, 50, 22, 2, 2, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.accent);
        doc.text(options.period.toUpperCase(), pw - 37, 17, { align: 'center' });
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.muted);
        doc.text(format(new Date(), 'PPpp', { locale: es }), pw - 37, 24, { align: 'center' });

        // ── Row 2: Report title bar (accent) ──
        doc.setFillColor(...COLORS.accent);
        doc.rect(0, 38, pw, 13, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.white);
        doc.text(options.title.toUpperCase(), pw / 2, 46.5, { align: 'center' });

        return 58; // content starts after header
    },

    async generateAssetReport(
        assets: ITAsset[],
        kpis: AssetReportKPIs,
        maintenanceSchedules: ITMaintenanceSchedule[],
        options: ReportHeaderOptions,
    ) {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;
        const margin = 14;

        let currentY = await this.buildHeader(doc, options);

        // ── KPI Boxes (4 across) ──
        const gap = 4;
        const boxW = (pageWidth - margin * 2 - gap * 3) / 4;
        const boxH = 22;

        const kpiItems = [
            { label: 'Total Activos', value: String(kpis.total), color: COLORS.primary },
            { label: 'Disponibles', value: String(kpis.available), color: COLORS.emerald },
            { label: 'Asignados', value: String(kpis.assigned), color: COLORS.indigo },
            { label: 'En Mantenimiento', value: String(kpis.inMaintenance), color: COLORS.amber },
        ];

        kpiItems.forEach((kpi, i) => {
            const x = margin + i * (boxW + gap);
            doc.setFillColor(...COLORS.light);
            doc.roundedRect(x, currentY, boxW, boxH, 2, 2, 'F');

            // Accent top border
            doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
            doc.rect(x, currentY, boxW, 2, 'F');

            doc.setTextColor(...COLORS.muted);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.text(kpi.label.toUpperCase(), x + 4, currentY + 9);

            doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(kpi.value, x + 4, currentY + 19);
        });

        currentY += boxH + 8;

        // ── Section title: Assets ──
        doc.setFillColor(...COLORS.primary);
        doc.roundedRect(margin, currentY - 1, 3, 10, 1, 1, 'F');
        doc.setTextColor(...COLORS.primary);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('INVENTARIO DE ACTIVOS', margin + 6, currentY + 6);
        currentY += 12;

        // ── Assets Table ──
        autoTable(doc, {
            startY: currentY,
            head: [['CODIGO', 'NOMBRE', 'CATEGORIA', 'MARCA / MODELO', 'SERIAL', 'ESTADO', 'CONDICION', 'COSTO']],
            body: assets.map(a => [
                { content: a.asset_code, styles: { fontStyle: 'bold' as const, textColor: COLORS.accent } },
                a.name.toUpperCase(),
                CATEGORY_LABELS[a.category] || a.category,
                [a.brand, a.model].filter(Boolean).join(' / ') || '\u2014',
                a.serial_number || '\u2014',
                { content: STATUS_LABELS[a.status] || a.status, styles: { textColor: STATUS_CELL_COLORS[a.status] || COLORS.primary } },
                CONDITION_LABELS[a.condition] || a.condition,
                { content: `$${Math.round(a.purchase_cost).toLocaleString('es-CO')}`, styles: { halign: 'right' as const } },
            ]),
            styles: { fontSize: 7, cellPadding: 3, font: 'helvetica' },
            headStyles: { fillColor: [...COLORS.primary], textColor: [...COLORS.white], fontStyle: 'bold', fontSize: 7.5 },
            alternateRowStyles: { fillColor: [...COLORS.light] },
            margin: { left: margin, right: margin },
            didDrawPage: () => {
                doc.setFontSize(7);
                doc.setTextColor(...COLORS.muted);
                doc.text(
                    `Generado: ${format(new Date(), 'PPpp', { locale: es })}  |  Pagina ${doc.getNumberOfPages()}`,
                    pageWidth / 2,
                    pageHeight - 8,
                    { align: 'center' },
                );
            },
        });

        // ── Total cost badge ──
        const totalCost = assets.reduce((s, a) => s + (a.purchase_cost || 0), 0);
        const tableEndY = (doc as unknown as Record<string, { finalY: number }>).lastAutoTable.finalY + 6;

        doc.setFillColor(...COLORS.accent);
        doc.roundedRect(pageWidth - 92, tableEndY, 78, 12, 2, 2, 'F');
        doc.setTextColor(...COLORS.white);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('INVERSION TOTAL:', pageWidth - 88, tableEndY + 8);
        doc.setFontSize(11);
        doc.text(`$${Math.round(totalCost).toLocaleString('es-CO')}`, pageWidth - 18, tableEndY + 8, { align: 'right' });

        // ── Maintenance Table (SCHEDULED / OVERDUE) ──
        const pendingMaint = maintenanceSchedules.filter(m => m.status === 'SCHEDULED' || m.status === 'OVERDUE');

        if (pendingMaint.length > 0) {
            let maintY = tableEndY + 24;

            if (maintY > pageHeight - 60) {
                doc.addPage();
                maintY = 20;
            }

            // Section title
            doc.setFillColor(...COLORS.accent);
            doc.roundedRect(margin, maintY - 1, 3, 10, 1, 1, 'F');
            doc.setTextColor(...COLORS.primary);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('MANTENIMIENTOS PROGRAMADOS', margin + 6, maintY + 6);
            maintY += 12;

            autoTable(doc, {
                startY: maintY,
                head: [['ACTIVO', 'TIPO', 'FRECUENCIA', 'PROXIMA FECHA', 'ESTADO']],
                body: pendingMaint.map(m => {
                    const asset = assets.find(a => a.id === m.asset_id);
                    const isOverdue = m.status === 'OVERDUE';
                    return [
                        asset?.name?.toUpperCase() || m.asset_id.slice(0, 8),
                        m.maintenance_type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo',
                        `${m.frequency_days} dias`,
                        format(new Date(m.next_due_at), 'dd/MM/yyyy'),
                        {
                            content: isOverdue ? 'VENCIDO' : 'Programado',
                            styles: { textColor: isOverdue ? COLORS.rose : COLORS.emerald },
                        },
                    ];
                }),
                styles: { fontSize: 7, cellPadding: 3, font: 'helvetica' },
                headStyles: { fillColor: [...COLORS.accent], textColor: [...COLORS.white], fontStyle: 'bold', fontSize: 7.5 },
                alternateRowStyles: { fillColor: [...COLORS.light] },
                margin: { left: margin, right: margin },
            });
        }

        doc.save(`Inventario_Activos_IT_${format(new Date(), 'yyyyMMdd')}.pdf`);
    },
};
