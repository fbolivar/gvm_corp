'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { exportDocumentsAction, exportPurchaseOrdersAction, exportTransfersAction, type OrderExportFilters } from '../exportActions'
import { documentsExcelService, type ExcelExportOpts } from '../services/documentsExcelService'

interface Props {
    source: 'documents' | 'purchase' | 'transfers'
    docType?: string
    filters?: OrderExportFilters
    company: { name: string; nit?: string | null; address?: string | null; phone?: string | null; logoUrl?: string | null }
    opts: ExcelExportOpts
}

export function DocumentExportButton({ source, docType, filters, company, opts }: Props) {
    const [loading, setLoading] = useState(false)

    async function handleExport() {
        setLoading(true)
        try {
            const data = source === 'purchase'
                ? await exportPurchaseOrdersAction()
                : source === 'transfers'
                    ? await exportTransfersAction(filters ?? {})
                    : await exportDocumentsAction(docType ?? 'SALES_ORDER', filters ?? {})
            if (!data || data.rows.length === 0) {
                toast.error('No hay registros para exportar')
                return
            }
            await documentsExcelService.export(data, company, opts)
            toast.success(
                `${data.rows.length} registro(s) y ${data.lines.length} línea(s) de producto exportados a Excel`
            )
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'No se pudo generar el Excel')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button variant="outline" onClick={handleExport} disabled={loading}
            className="h-9 rounded-xl text-xs font-semibold gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
            Exportar Excel
        </Button>
    )
}
