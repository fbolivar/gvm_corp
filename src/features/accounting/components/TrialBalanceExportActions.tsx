'use client'

import { Button } from '@/shared/components/ui/button'
import { Download, FileText } from 'lucide-react'
import { pdfReportService, type ReportHeaderOptions } from '../services/pdfReportService'
import { excelReportService } from '../services/excelReportService'

interface TrialBalanceRow {
    code: string
    name: string
    initial_balance: number
    debits: number
    credits: number
    final_balance: number
}

interface Props {
    data: TrialBalanceRow[]
    options: ReportHeaderOptions
    fileName: string
}

export function TrialBalanceExportActions({ data, options, fileName }: Props) {
    const handlePdf = async () => {
        await pdfReportService.generateTrialBalance(data, options)
    }

    const handleExcel = () => {
        excelReportService.exportToExcel(
            data.map(r => ({
                'Código':         r.code,
                'Cuenta':         r.name,
                'Saldo Anterior': r.initial_balance ?? 0,
                'Débitos':        r.debits ?? 0,
                'Créditos':       r.credits ?? 0,
                'Saldo Final':    r.final_balance ?? 0,
            })),
            fileName,
            'Balance de Comprobación'
        )
    }

    return (
        <div className="flex gap-2">
            <Button
                variant="outline" size="sm"
                onClick={handlePdf}
                className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 gap-2 h-9 px-4 rounded-xl"
            >
                <Download className="h-4 w-4 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">PDF</span>
            </Button>
            <Button
                variant="outline" size="sm"
                onClick={handleExcel}
                className="bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300 gap-2 h-9 px-4 rounded-xl"
            >
                <FileText className="h-4 w-4 text-blue-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Excel</span>
            </Button>
        </div>
    )
}
