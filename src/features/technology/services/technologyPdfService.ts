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

export const technologyPdfService = {
    async generateAssetReport(
        assets: ITAsset[],
        kpis: AssetReportKPIs,
        maintenanceSchedules: ITMaintenanceSchedule[],
        options: ReportHeaderOptions,
    ) {
        const doc = await pdfReportService.createBaseReport(options);
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;

        const primaryColor = [15, 23, 42] as const;
        const lightBg = [248, 250, 252] as const;
        const secondaryText = [100, 116, 139] as const;

        // ── KPI Boxes (4 across) ──
        let currentY = 52;
        const margin = 14;
        const gap = 4;
        const boxW = (pageWidth - margin * 2 - gap * 3) / 4;
        const boxH = 22;

        const kpiItems = [
            { label: 'Total Activos', value: String(kpis.total), color: [15, 23, 42] },
            { label: 'Disponibles', value: String(kpis.available), color: [16, 185, 129] },
            { label: 'Asignados', value: String(kpis.assigned), color: [79, 70, 229] },
            { label: 'En Mantenimiento', value: String(kpis.inMaintenance), color: [245, 158, 11] },
        ];

        kpiItems.forEach((kpi, i) => {
            const x = margin + i * (boxW + gap);
            doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
            doc.roundedRect(x, currentY, boxW, boxH, 2, 2, 'F');

            doc.setTextColor(secondaryText[0], secondaryText[1], secondaryText[2]);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.text(kpi.label.toUpperCase(), x + 4, currentY + 8);

            doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(kpi.value, x + 4, currentY + 18);
        });

        currentY += boxH + 8;

        // ── Assets Table ──
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('INVENTARIO DE ACTIVOS', margin, currentY);
        currentY += 4;

        const statusColors: Record<string, [number, number, number]> = {
            AVAILABLE: [16, 185, 129],
            ASSIGNED: [79, 70, 229],
            IN_MAINTENANCE: [245, 158, 11],
            RETIRED: [148, 163, 184],
            LOST: [225, 29, 72],
        };

        autoTable(doc, {
            startY: currentY,
            head: [['CÓDIGO', 'NOMBRE', 'CATEGORÍA', 'MARCA / MODELO', 'SERIAL', 'ESTADO', 'CONDICIÓN', 'COSTO']],
            body: assets.map(a => [
                { content: a.asset_code, styles: { fontStyle: 'bold' as const, textColor: [79, 70, 229] } },
                a.name.toUpperCase(),
                CATEGORY_LABELS[a.category] || a.category,
                [a.brand, a.model].filter(Boolean).join(' / ') || '—',
                a.serial_number || '—',
                { content: STATUS_LABELS[a.status] || a.status, styles: { textColor: statusColors[a.status] || [15, 23, 42] } },
                CONDITION_LABELS[a.condition] || a.condition,
                { content: `$${Math.round(a.purchase_cost).toLocaleString('es-CO')}`, styles: { halign: 'right' as const } },
            ]),
            styles: { fontSize: 7, cellPadding: 3, font: 'helvetica' },
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: margin, right: margin },
            didDrawPage: () => {
                // Footer on every page
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.text(
                    `Generado: ${format(new Date(), 'PPpp', { locale: es })}  |  Página ${doc.getNumberOfPages()}`,
                    pageWidth / 2,
                    pageHeight - 8,
                    { align: 'center' },
                );
            },
        });

        // Total cost summary
        const totalCost = assets.reduce((s, a) => s + (a.purchase_cost || 0), 0);
        const tableEndY = (doc as unknown as Record<string, { finalY: number }>).lastAutoTable.finalY + 6;

        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.roundedRect(pageWidth - 90, tableEndY, 76, 12, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('INVERSIÓN TOTAL:', pageWidth - 86, tableEndY + 8);
        doc.setFontSize(11);
        doc.text(`$${Math.round(totalCost).toLocaleString('es-CO')}`, pageWidth - 18, tableEndY + 8, { align: 'right' });

        // ── Maintenance Table (only SCHEDULED / OVERDUE) ──
        const pendingMaint = maintenanceSchedules.filter(m => m.status === 'SCHEDULED' || m.status === 'OVERDUE');

        if (pendingMaint.length > 0) {
            let maintY = tableEndY + 22;

            // Check if we need a new page
            if (maintY > pageHeight - 60) {
                doc.addPage();
                maintY = 20;
            }

            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('MANTENIMIENTOS PROGRAMADOS', margin, maintY);
            maintY += 4;

            autoTable(doc, {
                startY: maintY,
                head: [['ACTIVO', 'TIPO', 'FRECUENCIA', 'PRÓXIMA FECHA', 'ESTADO']],
                body: pendingMaint.map(m => {
                    const asset = assets.find(a => a.id === m.asset_id);
                    const isOverdue = m.status === 'OVERDUE';
                    return [
                        asset?.name?.toUpperCase() || m.asset_id.slice(0, 8),
                        m.maintenance_type === 'PREVENTIVE' ? 'Preventivo' : 'Correctivo',
                        `${m.frequency_days} días`,
                        format(new Date(m.next_due_at), 'dd/MM/yyyy'),
                        {
                            content: isOverdue ? 'VENCIDO' : 'Programado',
                            styles: { textColor: isOverdue ? [225, 29, 72] as [number, number, number] : [16, 185, 129] as [number, number, number] },
                        },
                    ];
                }),
                styles: { fontSize: 7, cellPadding: 3, font: 'helvetica' },
                headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: margin, right: margin },
            });
        }

        doc.save(`Inventario_Activos_IT_${format(new Date(), 'yyyyMMdd')}.pdf`);
    },
};
