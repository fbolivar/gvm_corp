import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { ITAsset } from '../types';
import { STATUS_LABELS, CATEGORY_LABELS, CONDITION_LABELS } from '../types';

interface CompanyInfo {
    name: string;
    nit?: string;
    address?: string;
    phone?: string;
    logoUrl?: string;
}

// Corporate colors
const SLATE_900 = 'FF0F172A';
const INDIGO_600 = 'FF4F46E5';
const SLATE_50 = 'FFF8FAFC';
const SLATE_400 = 'FF94A3B8';
const WHITE = 'FFFFFFFF';
const EMERALD = 'FF10B981';
const AMBER = 'FFF59E0B';
const ROSE = 'FFE11D48';

const STATUS_COLORS: Record<string, string> = {
    AVAILABLE: EMERALD,
    ASSIGNED: INDIGO_600,
    IN_MAINTENANCE: AMBER,
    RETIRED: SLATE_400,
    LOST: ROSE,
};

async function fetchLogoAsBase64(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

export const technologyExcelService = {
    async exportFormattedExcel(assets: ITAsset[], company: CompanyInfo) {
        const wb = new ExcelJS.Workbook();
        wb.creator = 'GVM ERP V3';
        wb.created = new Date();

        const ws = wb.addWorksheet('Activos IT', {
            properties: { defaultColWidth: 16 },
        });

        // ── Column definitions ──
        ws.columns = [
            { key: 'code', width: 14 },
            { key: 'name', width: 28 },
            { key: 'category', width: 14 },
            { key: 'brand', width: 16 },
            { key: 'model', width: 16 },
            { key: 'serial', width: 20 },
            { key: 'status', width: 14 },
            { key: 'condition', width: 12 },
            { key: 'cost', width: 16 },
            { key: 'purchase_date', width: 14 },
            { key: 'warranty', width: 14 },
            { key: 'notes', width: 24 },
        ];

        const totalCols = 12; // A through L
        let row = 1;

        // ── Logo ──
        if (company.logoUrl) {
            const b64 = await fetchLogoAsBase64(company.logoUrl);
            if (b64) {
                const ext = b64.includes('image/png') ? 'png' : 'jpeg';
                const imageId = wb.addImage({ base64: b64.split(',')[1], extension: ext });
                ws.addImage(imageId, {
                    tl: { col: 0, row: 0 },
                    ext: { width: 80, height: 80 },
                });
                // Reserve space for logo
                ws.getRow(1).height = 22;
                ws.getRow(2).height = 22;
                ws.getRow(3).height = 22;
            }
        }

        // ── Row 1: Company Name ──
        ws.mergeCells(row, 2, row, totalCols);
        const nameCell = ws.getCell(row, 2);
        nameCell.value = company.name.toUpperCase();
        nameCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: WHITE } };
        nameCell.alignment = { vertical: 'middle' };
        // Dark header background for first 3 rows
        for (let c = 1; c <= totalCols; c++) {
            ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_900 } };
        }
        ws.getRow(row).height = 28;
        row++;

        // ── Row 2: NIT | Address | Phone ──
        ws.mergeCells(row, 2, row, totalCols);
        const infoCell = ws.getCell(row, 2);
        const infoParts: string[] = [];
        if (company.nit) infoParts.push(`NIT: ${company.nit}`);
        if (company.address) infoParts.push(company.address);
        if (company.phone) infoParts.push(`TEL: ${company.phone}`);
        infoCell.value = infoParts.join('  |  ');
        infoCell.font = { name: 'Calibri', size: 9, color: { argb: SLATE_400 } };
        infoCell.alignment = { vertical: 'middle' };
        for (let c = 1; c <= totalCols; c++) {
            ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_900 } };
        }
        ws.getRow(row).height = 18;
        row++;

        // ── Row 3: Report title + date ──
        ws.mergeCells(row, 1, row, 8);
        const titleCell = ws.getCell(row, 1);
        titleCell.value = 'INVENTARIO DE ACTIVOS IT';
        titleCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } };
        titleCell.alignment = { vertical: 'middle' };

        ws.mergeCells(row, 9, row, totalCols);
        const dateCell = ws.getCell(row, 9);
        dateCell.value = `Generado: ${format(new Date(), 'PPpp', { locale: es })}`;
        dateCell.font = { name: 'Calibri', size: 8, color: { argb: SLATE_400 } };
        dateCell.alignment = { vertical: 'middle', horizontal: 'right' };

        for (let c = 1; c <= totalCols; c++) {
            ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO_600 } };
        }
        ws.getRow(row).height = 22;
        row++;

        // ── Row 4: Empty spacer ──
        ws.getRow(row).height = 6;
        row++;

        // ── Row 5: KPIs ──
        const kpiData = [
            { label: 'Total Activos', value: assets.length, color: SLATE_900 },
            { label: 'Disponibles', value: assets.filter(a => a.status === 'AVAILABLE').length, color: EMERALD },
            { label: 'Asignados', value: assets.filter(a => a.status === 'ASSIGNED').length, color: INDIGO_600 },
            { label: 'Mantenimiento', value: assets.filter(a => a.status === 'IN_MAINTENANCE').length, color: AMBER },
        ];

        kpiData.forEach((kpi, i) => {
            const col = 1 + i * 3;
            // Label
            ws.mergeCells(row, col, row, col + 2);
            const labelCell = ws.getCell(row, col);
            labelCell.value = kpi.label.toUpperCase();
            labelCell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: SLATE_400 } };
            labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
            for (let c = col; c <= col + 2; c++) {
                ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_50 } };
                ws.getCell(row, c).border = { top: { style: 'medium', color: { argb: kpi.color } } };
            }
        });
        ws.getRow(row).height = 16;
        row++;

        kpiData.forEach((kpi, i) => {
            const col = 1 + i * 3;
            ws.mergeCells(row, col, row, col + 2);
            const valCell = ws.getCell(row, col);
            valCell.value = kpi.value;
            valCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: kpi.color } };
            valCell.alignment = { horizontal: 'center', vertical: 'middle' };
            for (let c = col; c <= col + 2; c++) {
                ws.getCell(row, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_50 } };
            }
        });
        ws.getRow(row).height = 28;
        row++;

        // ── Row 7: Spacer ──
        ws.getRow(row).height = 6;
        row++;

        // ── Data header row ──
        const headers = ['CODIGO', 'NOMBRE', 'CATEGORIA', 'MARCA', 'MODELO', 'SERIAL', 'ESTADO', 'CONDICION', 'COSTO', 'F. COMPRA', 'GARANTIA', 'NOTAS'];
        const headerRow = ws.getRow(row);
        headers.forEach((h, i) => {
            const cell = headerRow.getCell(i + 1);
            cell.value = h;
            cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE_900 } };
            cell.alignment = { horizontal: i === 8 ? 'right' : 'left', vertical: 'middle' };
            cell.border = {
                bottom: { style: 'thin', color: { argb: INDIGO_600 } },
            };
        });
        headerRow.height = 22;
        row++;

        // ── Data rows ──
        assets.forEach((a, idx) => {
            const dataRow = ws.getRow(row);
            const isAlt = idx % 2 === 0;
            const bgColor = isAlt ? SLATE_50 : WHITE;

            const values = [
                a.asset_code,
                a.name,
                CATEGORY_LABELS[a.category] || a.category,
                a.brand || '',
                a.model || '',
                a.serial_number || '',
                STATUS_LABELS[a.status] || a.status,
                CONDITION_LABELS[a.condition] || a.condition,
                a.purchase_cost || 0,
                a.purchase_date ? format(new Date(a.purchase_date), 'dd/MM/yyyy') : '',
                a.warranty_expiry ? format(new Date(a.warranty_expiry), 'dd/MM/yyyy') : '',
                a.notes || '',
            ];

            values.forEach((v, i) => {
                const cell = dataRow.getCell(i + 1);
                cell.value = v;
                cell.font = { name: 'Calibri', size: 9, color: { argb: SLATE_900 } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
                cell.alignment = { vertical: 'middle' };
                cell.border = {
                    bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
                };
            });

            // Code column bold + indigo
            dataRow.getCell(1).font = { name: 'Calibri', size: 9, bold: true, color: { argb: INDIGO_600 } };

            // Cost right-aligned with number format
            const costCell = dataRow.getCell(9);
            costCell.numFmt = '$#,##0';
            costCell.alignment = { horizontal: 'right', vertical: 'middle' };

            // Status with color
            const statusCell = dataRow.getCell(7);
            statusCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: STATUS_COLORS[a.status] || SLATE_900 } };

            dataRow.height = 18;
            row++;
        });

        // ── Totals row ──
        const totalRow = ws.getRow(row);
        ws.mergeCells(row, 1, row, 8);
        const totalLabel = totalRow.getCell(1);
        totalLabel.value = `TOTAL ACTIVOS: ${assets.length}`;
        totalLabel.font = { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } };
        totalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO_600 } };
        totalLabel.alignment = { vertical: 'middle' };

        const totalCost = assets.reduce((s, a) => s + (a.purchase_cost || 0), 0);
        const totalCostCell = totalRow.getCell(9);
        totalCostCell.value = totalCost;
        totalCostCell.numFmt = '$#,##0';
        totalCostCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: WHITE } };
        totalCostCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO_600 } };
        totalCostCell.alignment = { horizontal: 'right', vertical: 'middle' };

        for (let c = 10; c <= totalCols; c++) {
            totalRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO_600 } };
        }
        totalRow.height = 24;

        // ── Download ──
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Inventario_Activos_IT_${format(new Date(), 'yyyyMMdd')}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },
};
