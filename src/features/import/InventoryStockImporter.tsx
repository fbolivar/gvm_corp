'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import {
    Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
    Loader2, Package, Warehouse, X, RefreshCw,
} from 'lucide-react'
import { importInventoryStockAction, InventoryRow, InventoryImportResult } from './inventoryImportAction'
import { toast } from 'sonner'

interface Preview {
    total_rows: number
    warehouses: { label: string; count: number; units: number }[]
    rows: InventoryRow[]
}

function parseXlsxFile(buffer: ArrayBuffer): InventoryRow[] {
    // xlsx is available as a global-compatible ESM module
    const XLSX = require('xlsx') as typeof import('xlsx')
    const wb = XLSX.read(new Uint8Array(buffer))
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })

    const rows: InventoryRow[] = []
    // Row 0: company header, Row 1: date header, Row 2: column names → skip all three
    for (let i = 3; i < raw.length; i++) {
        const row = raw[i] as unknown[]
        const warehouseFull = String(row[0] ?? '').trim()
        const descFull      = String(row[1] ?? '').trim()
        const qtyRaw        = row[2]

        if (!warehouseFull || !descFull) continue
        const qty = Number(qtyRaw)
        if (isNaN(qty)) continue

        // "Bodega:  FUSA" → "FUSA"
        const warehouse_label = warehouseFull.replace(/^Bodega:\s*/i, '').trim()

        // "AGDES-654 AGUA DESTILADA * 500 ML" → sku="AGDES-654", name="AGUA DESTILADA * 500 ML"
        const match = descFull.match(/^(\S+)\s+(.+)$/)
        const sku  = match ? match[1] : descFull
        const name = match ? match[2] : descFull

        rows.push({ warehouse_label, sku, name, qty })
    }
    return rows
}

export function InventoryStockImporter() {
    const [preview, setPreview] = useState<Preview | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)
    const [importing, setImporting] = useState(false)
    const [result, setResult] = useState<InventoryImportResult | null>(null)
    const [dragOver, setDragOver] = useState(false)

    const handleFile = useCallback(async (file: File) => {
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            toast.error('Solo se aceptan archivos Excel (.xlsx o .xls)')
            return
        }
        setResult(null)
        setFileName(file.name)

        const buffer = await file.arrayBuffer()
        const rows = parseXlsxFile(buffer)

        // Group by warehouse for preview
        const warehouseGroups = new Map<string, { count: number; units: number }>()
        for (const row of rows) {
            const g = warehouseGroups.get(row.warehouse_label) ?? { count: 0, units: 0 }
            g.count++
            g.units += row.qty
            warehouseGroups.set(row.warehouse_label, g)
        }

        setPreview({
            total_rows: rows.length,
            warehouses: [...warehouseGroups.entries()].map(([label, g]) => ({ label, ...g })),
            rows,
        })
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }, [handleFile])

    const handleImport = async () => {
        if (!preview) return
        setImporting(true)
        try {
            const res = await importInventoryStockAction(preview.rows)
            setResult(res)
            if (res.errors.length === 0) {
                toast.success(`Inventario actualizado: ${res.adjusted} ajustes aplicados`)
            } else if (res.adjusted > 0) {
                toast.warning(`Importación con advertencias (${res.errors.length} errores)`)
            } else {
                toast.error('Error en la importación')
            }
        } catch (e) {
            toast.error('Error inesperado al importar')
            console.error(e)
        } finally {
            setImporting(false)
        }
    }

    const reset = () => {
        setPreview(null)
        setFileName(null)
        setResult(null)
    }

    // — RESULT VIEW —
    if (result) {
        const success = result.errors.length === 0
        return (
            <div className="space-y-4">
                <div className={cn(
                    'rounded-2xl border p-6 flex items-start gap-4',
                    success ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
                )}>
                    {success
                        ? <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                        : <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                    }
                    <div className="space-y-1">
                        <p className={cn('text-sm font-bold', success ? 'text-emerald-900' : 'text-amber-900')}>
                            {success ? 'Inventario actualizado correctamente' : 'Importación con advertencias'}
                        </p>
                        <p className="text-xs text-slate-500">{fileName}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                        { label: 'Ajustes aplicados', value: result.adjusted, color: 'text-indigo-600' },
                        { label: 'Productos nuevos', value: result.new_products, color: 'text-emerald-600' },
                        { label: 'Productos en cero', value: result.zeroed_out, color: 'text-amber-600' },
                    ].map(k => (
                        <div key={k.label} className="bg-white rounded-xl border border-slate-100 p-4 text-center">
                            <p className={cn('text-2xl font-bold font-mono tabular-nums', k.color)}>{k.value}</p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{k.label}</p>
                        </div>
                    ))}
                </div>

                {result.warehouses_matched.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-1">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Bodegas actualizadas</p>
                        {result.warehouses_matched.map(w => (
                            <div key={w} className="flex items-center gap-2 text-xs text-slate-600">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                {w}
                            </div>
                        ))}
                        {result.warehouses_not_found.map(w => (
                            <div key={w} className="flex items-center gap-2 text-xs text-rose-600">
                                <X className="h-3.5 w-3.5 shrink-0" />
                                No encontrada: {w}
                            </div>
                        ))}
                    </div>
                )}

                {result.errors.length > 0 && (
                    <div className="bg-rose-50 rounded-xl border border-rose-200 p-4 space-y-1 max-h-40 overflow-y-auto">
                        {result.errors.slice(0, 20).map((e, i) => (
                            <p key={i} className="text-xs text-rose-700">{e}</p>
                        ))}
                    </div>
                )}

                <Button onClick={reset} variant="outline" className="h-9 rounded-xl text-xs gap-2">
                    <RefreshCw className="h-3.5 w-3.5" /> Importar otro archivo
                </Button>
            </div>
        )
    }

    // — PREVIEW VIEW —
    if (preview) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                        <div>
                            <p className="text-sm font-bold text-slate-900">{fileName}</p>
                            <p className="text-xs text-slate-400">{preview.total_rows.toLocaleString('es-CO')} productos detectados</p>
                        </div>
                    </div>
                    <button onClick={reset} className="text-slate-300 hover:text-slate-500 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Bodegas en el archivo</p>
                    </div>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-50">
                                <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase">Bodega (Excel)</th>
                                <th className="px-4 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase">Productos</th>
                                <th className="px-4 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase">Unidades</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {preview.warehouses.map(w => (
                                <tr key={w.label}>
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            <Warehouse className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                                            <span className="text-xs font-medium text-slate-700">{w.label}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-xs font-mono text-slate-600">{w.count.toLocaleString('es-CO')}</td>
                                    <td className="px-4 py-2.5 text-right text-xs font-mono text-slate-600">{w.units.toLocaleString('es-CO')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs text-amber-800">
                        <strong>Atención:</strong> Esta importación actualizará el stock de todas las bodegas del archivo con la existencia exacta del Excel.
                        Los productos con existencia diferente recibirán un movimiento de ajuste.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleImport}
                        disabled={importing}
                        className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold gap-2"
                    >
                        {importing
                            ? <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</>
                            : <><Package className="h-4 w-4" /> Actualizar Inventario</>
                        }
                    </Button>
                    <Button onClick={reset} variant="outline" disabled={importing} className="h-10 rounded-xl text-sm">
                        Cancelar
                    </Button>
                </div>
            </div>
        )
    }

    // — UPLOAD VIEW —
    return (
        <div
            className={cn(
                'border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer',
                dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('inventory-file-input')?.click()}
        >
            <input
                id="inventory-file-input"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFile(file)
                    e.target.value = ''
                }}
            />
            <div className="flex flex-col items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                    <FileSpreadsheet className="h-7 w-7 text-indigo-500" />
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-900">
                        {dragOver ? 'Suelta el archivo aquí' : 'Arrastra el archivo Excel o haz clic para seleccionar'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        Archivo exportado desde el sistema de inventario · .xlsx o .xls
                    </p>
                </div>
                <Button variant="outline" className="h-9 rounded-xl text-xs gap-2 pointer-events-none">
                    <Upload className="h-3.5 w-3.5" /> Seleccionar archivo
                </Button>
            </div>
        </div>
    )
}
