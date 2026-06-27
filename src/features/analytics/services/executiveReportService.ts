
import jsPDF from 'jspdf';
import { ExecutiveSummary } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const executiveReportService = {
    generateBoardReport(summary: ExecutiveSummary, language: 'es' | 'en' = 'es') {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const primaryColor = [0, 150, 230]; // Indigo-600
        const textColor = [15, 23, 42]; // Slate-900
        const secondaryTextColor = [100, 116, 139]; // Slate-500
        const lightBg = [248, 250, 252]; // Slate-50

        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        let currentY = 0;

        // --- HELPER: Draw Header ---
        const drawHeader = (title: string) => {
            doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.rect(0, 0, pageWidth, 40, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text(title.toUpperCase(), margin, 25);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(format(new Date(), 'pppp', { locale: language === 'es' ? es : undefined }).toUpperCase(), margin, 32);

            currentY = 55;
        };

        // --- PAGE 1: COVER & EXECUTIVE SUMMARY ---
        drawHeader(language === 'es' ? 'Reporte de Gestión Ejecutiva' : 'Executive Management Report');

        // Section: Financial Highlights
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(language === 'es' ? 'RESUMEN FINANCIERO' : 'FINANCIAL HIGHLIGHTS', margin, currentY);
        currentY += 10;

        // KPI Boxes
        const drawKPIBox = (x: number, y: number, label: string, value: string, color: number[]) => {
            const boxW = (pageWidth - (margin * 2) - 10) / 3;
            doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
            doc.roundedRect(x, y, boxW, 25, 3, 3, 'F');

            doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text(label.toUpperCase(), x + 5, y + 8);

            doc.setTextColor(color[0], color[1], color[2]);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(value, x + 5, y + 18);
        };

        drawKPIBox(margin, currentY, language === 'es' ? 'Cuentas x Cobrar' : 'Receivables', `$${summary.total_ar.toLocaleString('es-CO')}`, textColor);
        drawKPIBox(margin + ((pageWidth - (margin * 2) - 10) / 3) + 5, currentY, language === 'es' ? 'Cuentas x Pagar' : 'Payables', `$${summary.total_ap.toLocaleString('es-CO')}`, [225, 29, 72]);
        drawKPIBox(margin + 2 * (((pageWidth - (margin * 2) - 10) / 3) + 5), currentY, language === 'es' ? 'Flujo Neto' : 'Net Flow', `$${summary.net_cash_flow.toLocaleString('es-CO')}`, [16, 185, 129]);

        currentY += 40;

        // Section: Portfolio IQ (IA Agent)
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFontSize(14);
        doc.text(language === 'es' ? 'PORTFOLIO IQ (GESTIÓN AUTÓNOMA)' : 'PORTFOLIO IQ (AI AGENT)', margin, currentY);
        currentY += 10;

        doc.setFillColor(245, 247, 255);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 35, 3, 3, 'F');

        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(10);
        doc.text(language === 'es' ? 'El agente de cobranza procesó:' : 'The collection agent processed:', margin + 10, currentY + 12);

        doc.setFontSize(18);
        doc.text(`${summary.agent_metrics?.totalActions || 0}`, margin + 10, currentY + 22);
        doc.setFontSize(8);
        doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
        doc.text(language === 'es' ? 'ACCIONES DE COBRO REALIZADAS' : 'COLLECTION ACTIONS PERFORMED', margin + 10, currentY + 28);

        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(18);
        doc.text(`${summary.agent_metrics?.recoveryRate || 0}%`, margin + 80, currentY + 22);
        doc.setFontSize(8);
        doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
        doc.text(language === 'es' ? 'TASA DE RECUPERACIÓN' : 'RECOVERY RATE', margin + 80, currentY + 28);

        doc.setTextColor(16, 185, 129);
        doc.setFontSize(18);
        doc.text(`$${(summary.agent_metrics?.totalRecoveredAmount || 0).toLocaleString('es-CO')}`, margin + 130, currentY + 22);
        doc.setFontSize(8);
        doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
        doc.text(language === 'es' ? 'TOTAL RECUPERADO' : 'TOTAL RECOVERED', margin + 130, currentY + 28);

        currentY += 50;

        // Section: Treasury & Survival
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFontSize(14);
        doc.text(language === 'es' ? 'TESORERÍA Y SUPERVIVENCIA' : 'TREASURY & SURVIVAL', margin, currentY);
        currentY += 10;

        const survivalDays = summary.liquidity_metrics?.survival_days || 0;
        const survivalColor = survivalDays > 30 ? [16, 185, 129] : (survivalDays > 15 ? [245, 158, 11] : [225, 29, 72]);

        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 30, 3, 3, 'F');

        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(10);
        doc.text(language === 'es' ? 'Días de Supervivencia (Basado en Burn Rate):' : 'Survival Days (Based on Burn Rate):', margin + 10, currentY + 12);

        doc.setTextColor(survivalColor[0], survivalColor[1], survivalColor[2]);
        doc.setFontSize(20);
        doc.text(`${survivalDays} Días`, margin + 10, currentY + 23);

        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(10);
        doc.text(language === 'es' ? 'Disponibilidad vs Pasivos:' : 'Liquidity vs Liabilities:', margin + 100, currentY + 12);
        doc.setFontSize(12);
        doc.text(`$${(summary.liquidity_metrics?.immediate_liquidity || 0).toLocaleString('es-CO')} / $${(summary.liquidity_metrics?.short_term_liabilities || 0).toLocaleString('es-CO')}`, margin + 100, currentY + 21);

        currentY += 45;

        // Section: Logistics
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFontSize(14);
        doc.text(language === 'es' ? 'ÚLTIMA MILLA Y LOGÍSTICA' : 'LAST MILE & LOGISTICS', margin, currentY);
        currentY += 10;

        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
        doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 25, 3, 3, 'F');

        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFontSize(9);
        doc.text(language === 'es' ? 'PENDIENTES: ' : 'PENDING: ', margin + 10, currentY + 15);
        doc.setFont('helvetica', 'bold');
        doc.text(`${summary.logistics_metrics?.pending_dispatch || 0}`, margin + 35, currentY + 15);

        doc.setFont('helvetica', 'normal');
        doc.text(language === 'es' ? 'EN TRÁNSITO: ' : 'IN TRANSIT: ', margin + 60, currentY + 15);
        doc.setFont('helvetica', 'bold');
        doc.text(`${summary.logistics_metrics?.in_transit || 0}`, margin + 85, currentY + 15);

        doc.setFont('helvetica', 'normal');
        doc.text(language === 'es' ? 'ENTREGADOS HOY: ' : 'DELIVERED TODAY: ', margin + 110, currentY + 15);
        doc.setFont('helvetica', 'bold');
        doc.text(`${summary.logistics_metrics?.delivered_today || 0}`, margin + 145, currentY + 15);

        doc.setFont('helvetica', 'normal');
        doc.text(language === 'es' ? 'LEAD TIME PROM: ' : 'AVG LEAD TIME: ', margin + 10, currentY + 20);
        doc.setFont('helvetica', 'bold');
        doc.text(`${summary.logistics_metrics?.avg_delivery_days || 0} Días`, margin + 45, currentY + 20);

        // Footer
        doc.setFontSize(7);
        doc.setTextColor(secondaryTextColor[0], secondaryTextColor[1], secondaryTextColor[2]);
        const footerText = language === 'es'
            ? 'Documento generado automáticamente por GVM AI SaaS Factory. Confidencial.'
            : 'Document automatically generated by GVM AI SaaS Factory. Confidential.';
        doc.text(footerText, pageWidth / 2, 285, { align: 'center' });

        // Save
        doc.save(`Reporte_Gerencial_${format(new Date(), 'yyyy-MM')}.pdf`);
    }
};
