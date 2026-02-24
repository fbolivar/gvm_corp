import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export const excelReportService = {
    /**
     * Genera un archivo Excel a partir de un JSON de datos
     */
    exportToExcel(data: any[], fileName: string, sheetName: string = 'Datos') {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // Generar buffer y descargar
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${fileName}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};
