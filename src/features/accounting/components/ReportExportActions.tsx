"use client"

import { Button } from "@/shared/components/ui/button"
import { Download, FileText } from "lucide-react"
import { pdfReportService } from "../services/pdfReportService"
import { excelReportService } from "../services/excelReportService"

interface Section {
    title: string
    rows: any[]
    total: number
}

interface Props {
    title: string
    companyName: string
    companyNit?: string
    companyAddress?: string
    companyPhone?: string
    period: string
    sections: Section[]
    rawData?: any[]
    fileName?: string
}

export function ReportExportActions({
    title,
    companyName,
    companyNit,
    companyAddress,
    companyPhone,
    period,
    sections,
    rawData,
    fileName,
    logoUrl
}: Props & { logoUrl?: string }) {
    const handlePdf = async () => {
        await pdfReportService.generateFinancialStatement(sections, {
            title,
            companyName,
            companyNit,
            companyAddress,
            companyPhone,
            period,
            logoUrl
        });
    };

    const handleExcel = () => {
        const dataToExport = rawData || sections.flatMap(s => [
            { Cuenta: `--- ${s.title.toUpperCase()} ---`, Valor: '' },
            ...s.rows.map(r => ({ Cuenta: r.name, Valor: r.balance || r.amount })),
            { Cuenta: `TOTAL ${s.title.toUpperCase()}`, Valor: s.total }
        ]);

        excelReportService.exportToExcel(dataToExport, fileName || title.replace(/\s/g, '_'), 'Reporte');
    };

    return (
        <div className="flex gap-2">
            <Button
                variant="outline"
                size="sm"
                className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 gap-2 h-9 px-4 rounded-xl"
                onClick={handlePdf}
            >
                <Download className="h-4 w-4 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">PDF</span>
            </Button>
            <Button
                variant="outline"
                size="sm"
                className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 gap-2 h-9 px-4 rounded-xl"
                onClick={handleExcel}
            >
                <FileText className="h-4 w-4 text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Excel</span>
            </Button>
        </div>
    );
}
