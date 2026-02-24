import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ReportHeaderOptions {
    title: string;
    companyName: string;
    companyNit?: string;
    companyAddress?: string;
    companyPhone?: string;
    logoUrl?: string;
    period: string;
}

export const pdfReportService = {
    /**
     * Convierte una URL de imagen a Base64 para jsPDF
     */
    async loadImage(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
            img.src = url;
        });
    },

    /**
     * Genera un reporte base con encabezado corporativo industrial Premium V3
     */
    async createBaseReport(options: ReportHeaderOptions): Promise<jsPDF> {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // --- INDUSTRIAL DESIGN ELEMENTS V3 ---
        const primaryColor = [15, 23, 42]; // Slate 900
        const accentColor = [79, 70, 229];  // Indigo 600
        const lightGray = [248, 250, 252]; // Slate 50
        const darkGray = [30, 41, 59];    // Slate 800

        // 1. Header Background (Industrial Slate)
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 45, 'F');

        // 2. Vertical Side Stripe (Industrial Accent)
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.rect(0, 0, 4, 297, 'F');

        // 3. Logo & Company Identity
        let textStartX = 14;
        if (options.logoUrl) {
            try {
                const logoBase64 = await this.loadImage(options.logoUrl);
                doc.addImage(logoBase64, 'PNG', 14, 8, 25, 25, undefined, 'FAST');
                textStartX = 45; // Shift text to the right when logo is present
            } catch (e) {
                console.warn("Logo could not be loaded, skipping.");
            }
        }

        // Company Name
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(options.companyName.toUpperCase(), textStartX, 20);

        // Nit & Info (Under Company Name)
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184); // Slate 400
        const companyInfoLines = [];
        if (options.companyNit) companyInfoLines.push(`NIT: ${options.companyNit}`);
        if (options.companyAddress) companyInfoLines.push(options.companyAddress);
        if (options.companyPhone) companyInfoLines.push(`TEL: ${options.companyPhone}`);

        doc.text(companyInfoLines.join('  |  '), textStartX, 26);
        doc.text("SISTEMA DE GESTIÓN EMPRESARIAL V3.0", textStartX, 31);

        // 4. Report Label Badge (Right aligned)
        const titleText = options.title.toUpperCase();
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const titleWidth = doc.getTextWidth(titleText);

        // Badge Container
        doc.setFillColor(darkGray[0], darkGray[1], darkGray[2]);
        doc.roundedRect(pageWidth - titleWidth - 25, 12, titleWidth + 20, 10, 2, 2, 'F');

        doc.setTextColor(255, 255, 255);
        doc.text(titleText, pageWidth - 15, 18.5, { align: 'right' });

        // Period & Date
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text(`PERIODO: ${options.period}`, pageWidth - 15, 28, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(`Generado: ${format(new Date(), "PPpp", { locale: es })}`, pageWidth - 15, 33, { align: 'right' });

        // Decorative Line Under Header
        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setLineWidth(1);
        doc.line(0, 45, pageWidth, 45);

        return doc;
    },

    /**
     * Genera el PDF del Balance de Prueba
     */
    async generateTrialBalance(data: any[], options: ReportHeaderOptions) {
        const doc = await this.createBaseReport(options);

        autoTable(doc, {
            startY: 55,
            head: [['CÓDIGO', 'CUENTA MAESTRA', 'SALDO ANTERIOR', 'DÉBITOS', 'CRÉDITOS', 'NUEVO SALDO']],
            body: data.map(row => [
                { content: row.code, styles: { fontStyle: 'bold', textColor: [79, 70, 229] } },
                row.name.toUpperCase(),
                { content: row.initial_balance?.toLocaleString('es-CO', { minimumFractionDigits: 2 }) || '0', styles: { halign: 'right' } },
                { content: row.debits?.toLocaleString('es-CO', { minimumFractionDigits: 2 }) || '0', styles: { halign: 'right' } },
                { content: row.credits?.toLocaleString('es-CO', { minimumFractionDigits: 2 }) || '0', styles: { halign: 'right' } },
                { content: row.final_balance?.toLocaleString('es-CO', { minimumFractionDigits: 2 }) || '0', styles: { halign: 'right', fontStyle: 'bold' } }
            ]),
            styles: { fontSize: 7, cellPadding: 4, font: 'helvetica' },
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14 },
            didDrawPage: (data: any) => {
                const str = `Página ${doc.getNumberOfPages()} | Reporte de Integridad V3`;
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.text(str, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
            }
        });

        doc.save(`Balance_Prueba_${format(new Date(), 'yyyyMMdd')}.pdf`);
    },

    /**
     * Genera el PDF de P&G o Balance General
     */
    async generateFinancialStatement(sections: { title: string, rows: any[], total: number }[], options: ReportHeaderOptions) {
        const doc = await this.createBaseReport(options);
        let currentY = 55;

        sections.forEach((section) => {
            autoTable(doc, {
                startY: currentY,
                head: [[{ content: section.title.toUpperCase(), colSpan: 2, styles: { fillColor: [79, 70, 229] } }, { content: 'LIQUIDACIÓN', styles: { halign: 'right', fillColor: [79, 70, 229] } }]],
                body: section.rows.map(row => [
                    row.code || '',
                    row.name.toUpperCase() || '',
                    { content: (row.amount || row.balance).toLocaleString('es-CO', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: row.code?.length <= 2 ? 'bold' : 'normal' } }
                ]),
                foot: [['', `SUBTOTAL ${section.title.toUpperCase()}`, { content: section.total.toLocaleString('es-CO', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } }]],
                theme: 'striped',
                headStyles: { textColor: 255, fontStyle: 'bold', fontSize: 9 },
                footStyles: { textColor: 15, fontStyle: 'bold', fontSize: 9 },
                styles: { fontSize: 8, cellPadding: 4 },
                margin: { left: 14, right: 14 }
            });

            currentY = (doc as any).lastAutoTable.finalY + 15;
        });

        doc.save(`${options.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    },

    /**
     * Genera el PDF del Libro Auxiliar
     */
    async generateAuxiliaryLedger(data: any[], options: ReportHeaderOptions) {
        const doc = await this.createBaseReport(options);

        const tableRows = data.map(r => [
            r.date ? format(new Date(r.date), 'dd/MM/yyyy') : '',
            r.journal_number || '',
            `${r.account_code}\n${r.account_name.toUpperCase()}`,
            r.party.toUpperCase() || '',
            r.description.toUpperCase() || '',
            { content: r.debit > 0 ? r.debit.toLocaleString('es-CO', { minimumFractionDigits: 2 }) : '', styles: { halign: 'right' } },
            { content: r.credit > 0 ? r.credit.toLocaleString('es-CO', { minimumFractionDigits: 2 }) : '', styles: { halign: 'right' } }
        ]);

        const totalDebit = data.reduce((sum, r) => sum + r.debit, 0);
        const totalCredit = data.reduce((sum, r) => sum + r.credit, 0);

        autoTable(doc, {
            startY: 55,
            head: [['FECHA', 'ASIENTO', 'CUENTA PUC', 'SOPORTE/TERCERO', 'CONCEPTO TRIBUTARIO', 'DÉBITO', 'CRÉDITO']],
            body: tableRows,
            foot: [['', '', '', '', 'TOTALES CONSOLIDADOS',
                { content: totalDebit.toLocaleString('es-CO', { minimumFractionDigits: 2 }), styles: { halign: 'right' } },
                { content: totalCredit.toLocaleString('es-CO', { minimumFractionDigits: 2 }), styles: { halign: 'right' } }
            ]],
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 7, cellPadding: 3 },
            bodyStyles: { fontSize: 6.5 },
            footStyles: { fillColor: [241, 245, 249], textColor: 0, fontStyle: 'bold', fontSize: 7.5 },
            margin: { left: 14, right: 14 }
        });

        doc.save(`${options.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    },

    /**
     * Genera un Certificado de Retención en la Fuente con estética Premium Industrial V3
     */
    async generateWithholdingCertificate(data: any) {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        const primaryColor = [15, 23, 42];
        const accentColor = [79, 70, 229];
        const lightGray = [248, 250, 252];

        // Industrial Header Background
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(0, 0, pageWidth, 55, 'F');

        // Logo support
        let textStartX = 14;
        if (data.company_info.logo_url) {
            try {
                const logo = await this.loadImage(data.company_info.logo_url);
                doc.addImage(logo, 'PNG', 14, 10, 25, 25);
                textStartX = 45;
            } catch (e) { }
        }

        // Company Details (White text on Dark)
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255);
        doc.text(data.company_info.name.toUpperCase(), textStartX, 25);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(`NIT: ${data.company_info.nit}-${data.company_info.dv}`, textStartX, 32);
        doc.text(data.company_info.address || 'DIRECCIÓN NO REGISTRADA', textStartX, 37);
        doc.text(`${data.company_info.city || ''}  |  TEL: ${data.company_info.phone || ''}`, textStartX, 42);

        // Period Badge
        doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.roundedRect(pageWidth - 60, 15, 46, 25, 2, 2, 'F');
        doc.setTextColor(255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('AÑO FISCAL', pageWidth - 37, 24, { align: 'center' });
        doc.setFontSize(14);
        doc.text(data.period, pageWidth - 37, 33, { align: 'center' });

        // Certificate Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('CERTIFICADO DE RETENCIÓN EN LA FUENTE', pageWidth / 2, 75, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bolditalic');
        doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.text('RENTA Y COMPLEMENTARIOS - V3 PROTOCOL', pageWidth / 2, 82, { align: 'center' });

        // Body Text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(50);
        const bodyText = `Certificamos que a la entidad identificada como ${data.party.legal_name.toUpperCase()}, con NIT/CC número ${data.party.doc_number}${data.party.dv ? '-' + data.party.dv : ''}, le fueron practicadas retenciones en la fuente a título de Renta durante el periodo fiscal ${data.period}.`;
        const splitText = doc.splitTextToSize(bodyText, pageWidth - 40);
        doc.text(splitText, 20, 100);

        autoTable(doc, {
            startY: 120,
            head: [['CONCEPTO TRIBUTARIO', 'BASE GRAVABLE', 'TARIFA', 'VALOR FINAL RETENIDO']],
            body: data.items.map((i: any) => [
                { content: i.account_name.toUpperCase(), styles: { fontStyle: 'bold' } },
                { content: i.base_amount.toLocaleString('es-CO', { minimumFractionDigits: 2 }), styles: { halign: 'right' } },
                { content: `${i.rate}%`, styles: { halign: 'center' } },
                { content: i.tax_amount.toLocaleString('es-CO', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold', textColor: [79, 70, 229] } }
            ]),
            foot: [[
                { content: 'TOTAL RETENIDO CONSOLIDADO', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } as any },
                { content: data.total_withheld.toLocaleString('es-CO', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontStyle: 'bold', fillColor: primaryColor } as any }
            ]],
            theme: 'striped',
            headStyles: { fillColor: primaryColor as any, textColor: 255, fontSize: 8.5, fontStyle: 'bold', cellPadding: 4 },
            margin: { left: 20, right: 20 }
        });

        // Legal Footer
        const finalY = (doc as any).lastAutoTable.finalY + 30;
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text(`Expedido en ${data.city_of_issue} el ${format(new Date(), 'dd')} de ${format(new Date(), 'MMMM', { locale: es })} de ${format(new Date(), 'yyyy')}.`, 20, finalY);

        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.line(20, finalY + 30, 90, finalY + 30);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('CERTIFICACIÓN ELECTRÓNICA V3', 20, finalY + 36);

        // Security Box
        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.roundedRect(20, 255, pageWidth - 40, 25, 2, 2, 'FD');
        doc.setFontSize(7.5);
        doc.setTextColor(70);
        const disclaimer = 'Este certificado se expide bajo los estándares de la Ley 527 de 1999 y cumple con los requisitos del Artículo 381 del Estatuto Tributario. La integridad del documento está garantizada por el protocolo SaaS Factory V3.';
        const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - 60);
        doc.text(splitDisclaimer, pageWidth / 2, 263, { align: 'center' });

        doc.save(`Certificado_ReteFuente_${data.party.doc_number}_${data.period}.pdf`);
    },

    /**
     * Genera el PDF de Valoración de Inventarios (Kardex Consolidado)
     */
    async generateInventoryValuation(data: any[], options: ReportHeaderOptions) {
        const doc = await this.createBaseReport(options);

        autoTable(doc, {
            startY: 55,
            head: [['ID SKU', 'PRODUCTO / ESPECIFICACIÓN', 'CATEGORÍA', 'STOCK FÍSICO', 'COSTO UNIT.', 'VALOR TOTAL']],
            body: data.map(row => [
                { content: row.sku, styles: { fontStyle: 'bold', textColor: [79, 70, 229] } },
                row.name.toUpperCase(),
                row.category?.toUpperCase() || 'N/A',
                { content: row.stock?.toString() || '0', styles: { halign: 'center' } },
                { content: row.cost?.toLocaleString('es-CO', { minimumFractionDigits: 2 }) || '0', styles: { halign: 'right' } },
                { content: row.total_value?.toLocaleString('es-CO', { minimumFractionDigits: 2 }) || '0', styles: { halign: 'right', fontStyle: 'bold' } }
            ]),
            styles: { fontSize: 7, cellPadding: 4, font: 'helvetica' },
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14 }
        });

        const totalValue = data.reduce((sum, r) => sum + (r.total_value || 0), 0);
        const finalY = (doc as any).lastAutoTable.finalY + 12;

        doc.setFillColor(15, 23, 42);
        doc.roundedRect(doc.internal.pageSize.width - 90, finalY, 76, 12, 2, 2, 'F');
        doc.setTextColor(255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text("CAPITAL EN STOCK:", doc.internal.pageSize.width - 85, finalY + 8);
        doc.setFontSize(11);
        doc.text(`$${totalValue.toLocaleString('es-CO', { minimumFractionDigits: 0 })}`, doc.internal.pageSize.width - 18, finalY + 8, { align: 'right' });

        doc.save(`Valoracion_Inventario_${format(new Date(), 'yyyyMMdd')}.pdf`);
    },

    /**
     * Genera un Comprobante de Tesorería (Ingreso/Egreso)
     */
    async generateTreasuryVoucher(data: any, options: ReportHeaderOptions) {
        const doc = await this.createBaseReport(options);
        const pageWidth = doc.internal.pageSize.width;

        // 1. Transaction Summary Box
        doc.setFillColor(241, 245, 249); // Slate 100
        doc.roundedRect(14, 55, pageWidth - 28, 40, 3, 3, 'F');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("INFORMACIÓN DEL MOVIMIENTO", 20, 65);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);

        // Left Column
        doc.text(`Tercero: ${data.party?.legal_name?.toUpperCase() || 'N/A'}`, 20, 75);
        doc.text(`NIT/CC: ${data.party?.doc_number || 'N/A'}`, 20, 80);
        doc.text(`Ref. Recibo: ${data.reference_number || 'TRX-DEFAULT'}`, 20, 85);

        // Right Column
        doc.text(`Fecha Valor: ${format(new Date(data.date), 'dd/MM/yyyy')}`, pageWidth - 20, 75, { align: 'right' });
        doc.text(`Nodo Financiero: ${data.account?.name?.toUpperCase() || 'N/A'}`, pageWidth - 20, 80, { align: 'right' });
        doc.text(`Tipo: ${data.transaction_type === 'RECEIPT' ? 'INGRESO' : 'EGRESO'}`, pageWidth - 20, 85, { align: 'right' });

        // 2. Detailed Breakdown Table
        autoTable(doc, {
            startY: 105,
            head: [['DESCRIPCIÓN / CONCEPTO', 'VALOR BRUTO', 'RETENCIONES', 'VALOR NETO']],
            body: [[
                data.description?.toUpperCase() || 'MOVIMIENTO DE TESORERÍA',
                { content: `$${(data.amount + (data.withholdings?.reduce((s: number, w: any) => s + Number(w.applied_amount), 0) || 0)).toLocaleString('es-CO')}`, styles: { halign: 'right' } },
                { content: `$${(data.withholdings?.reduce((s: number, w: any) => s + Number(w.applied_amount), 0) || 0).toLocaleString('es-CO')}`, styles: { halign: 'right', textColor: [225, 29, 72] } },
                { content: `$${data.amount.toLocaleString('es-CO')}`, styles: { halign: 'right', fontStyle: 'bold' } }
            ]],
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 5 }
        });

        // 3. Withholdings Table (Optional)
        if (data.withholdings && data.withholdings.length > 0) {
            const currentY = (doc as any).lastAutoTable.finalY + 15;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text("DETALLE DE RETENCIONES APLICADAS", 14, currentY);

            autoTable(doc, {
                startY: currentY + 5,
                head: [['TIPO DE RETENCIÓN', 'BASE GRAVABLE', 'TARIFA', 'VALOR RETENIDO']],
                body: data.withholdings.map((w: any) => [
                    (w.tax_configuration?.tax_name || w.tax_withholding?.name || 'RETENCIÓN').toUpperCase(),
                    { content: `$${Number(w.base_amount).toLocaleString('es-CO')}`, styles: { halign: 'right' } },
                    { content: `${w.tax_rate || 0}%`, styles: { halign: 'center' } },
                    { content: `$${Number(w.applied_amount).toLocaleString('es-CO')}`, styles: { halign: 'right', fontStyle: 'bold' } }
                ]),
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229], fontSize: 7.5 },
                styles: { fontSize: 7, cellPadding: 3 }
            });
        }

        // 4. Signatures Section
        const finalY = (doc as any).lastAutoTable.finalY + 40;

        doc.setDrawColor(200);
        doc.line(20, finalY, 80, finalY);
        doc.line(pageWidth - 80, finalY, pageWidth - 20, finalY);

        doc.setFontSize(7);
        doc.text("ENTREGADO / AUTORIZADO", 50, finalY + 5, { align: 'center' });
        doc.text("RECIBIDO / BENEFICIARIO", pageWidth - 50, finalY + 5, { align: 'center' });

        doc.save(`Comprobante_${data.reference_number || 'Voucher'}_${format(new Date(data.date), 'yyyyMMdd')}.pdf`);
    }
};
