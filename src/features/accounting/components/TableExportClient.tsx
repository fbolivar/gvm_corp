'use client'

import { Button } from '@/shared/components/ui/button'
import { FileText, Printer } from 'lucide-react'
import { excelReportService } from '../services/excelReportService'

interface Props {
    rows: Record<string, string | number>[]
    fileName: string
    sheetName: string
    showPrint?: boolean
}

export function TableExportClient({ rows, fileName, sheetName, showPrint = true }: Props) {
    const handleExcel = () => {
        excelReportService.exportToExcel(rows, fileName, sheetName)
    }

    return (
        <div className="flex items-center gap-2">
            <Button
                variant="outline" size="sm"
                onClick={handleExcel}
                className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 gap-2 h-9 px-4 rounded-xl"
            >
                <FileText className="h-4 w-4 text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Excel</span>
            </Button>
            {showPrint && (
                <Button
                    variant="outline" size="sm"
                    onClick={() => window.print()}
                    className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 gap-2 h-9 px-4 rounded-xl"
                >
                    <Printer className="h-4 w-4 text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Imprimir</span>
                </Button>
            )}
        </div>
    )
}
