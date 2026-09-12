'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import {
    Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
    Loader2, ScanBarcode, X, RefreshCw, Download,
} from 'lucide-react'
import { importProductBarcodesAction, BarcodeRow, BarcodeImportResult } from './barcodeImportAction'
import { toast } from 'sonner'

interface Preview {
    rows: BarcodeRow[]
    sample: BarcodeRow[]
}

// Encabezados aceptados para cada columna (búsqueda por "incluye").
const SKU_HEADERS = ['sku', 'referencia', 'codigo interno', 'código interno', 'cod interno', 'ref']
const BARCODE_HEADERS = ['barra', 'barcode', 'ean', 'codigo de barras', 'código de barras']

function parseXlsxFile(buffer: ArrayBuffer): BarcodeRow[] {
    const XLSX = require('xlsx') as typeof import('xlsx')
    const wb = XLSX.read(new Uint8Array(buffer))
    const ws = wb.Sheets[wb.SheetNames[0]]
    // raw:false → conserva el texto mostrado (evita notación científica y ceros perdidos)
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', raw: false })
    if (raw.length === 0) return []

    const header = (raw[0] as unknown[]).map(h => String(h ?? '').toLowerCase().trim())
    const findCol = (cands: string[]) => header.findIndex(h => h && cands.some(c => h.includes(c)))

    let skuCol = findCol(SKU_HEADERS)
    let barCol = findCol(BARCODE_HEADERS)
    let start = 1
    if (skuCol === -1 && barCol === -1) {
        // Sin encabezado reconocible → asumir col A = SKU, col B = código
        skuCol = 0; barCol = 1; start = 0
    } else {
        if (skuCol === -1) skuCol = 0
        if (barCol === -1) barCol = 1
    }

    const rows: BarcodeRow[] = []
    for (let i = start; i < raw.length; i++) {
        const row = raw[i] as unknown[]
        const sku = String(row[skuCol] ?? '').trim()
        const barcode = String(row[barCol] ?? '').trim()
        if (!sku || !barcode) continue
        rows.push({ sku, barcode })
    }
    return rows
}

function downloadTemplate() {
    const XLSX = require('xlsx') as typeof import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([
        ['SKU', 'Codigo de barras'],
        ['BEBED-1500', '7701234567890'],
        ['AGDES-654', '7709876543210'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
    XLSX.writeFile(wb, 'plantilla-codigos-barras.xlsx')
}

export function ProductBarcodeImporter() {
    const [preview, setPreview] = useState<Preview | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)
    const [importing, setImporting] = useState(false)
    const [result, setResult] = useState<BarcodeImportResult | null>(null)
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

        if (rows.length === 0) {
            toast.error('No se detectaron filas con SKU y código de barras')
            setFileName(null)
            return
        }

        setPreview({ rows, sample: rows.slice(0, 8) })
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
            const res = await importProductBarcodesAction(preview.rows)
            setResult(res)
            if (res.errors.length === 0 && res.not_found.length === 0) {
                toast.success(`${res.updated} códigos de barras cargados`)
            } else if (res.updated > 0) {
                toast.warning(`${res.updated} cargados · ${res.not_found.length} SKU no encontrados`)
            } else {
                toast.error('No se cargó ningún código')
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
        const clean = result.errors.length === 0 && result.not_found.length === 0
        return (
            <div className="space-y-4">
                <div className={cn(
                    'rounded-2xl border p-6 flex items-start gap-4',
                    clean ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
                )}>
                    {clean
                        ? <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                        : <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />}
                    <div className="space-y-1">
                        <p className={cn('text-sm font-bold', clean ? 'text-emerald-900' : 'text-amber-900')}>
                            {clean ? 'Códigos de barras cargados correctamente' : 'Carga con advertencias'}
                        </p>
                        <p className="text-xs text-slate-500">{fileName}</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Actualizados', value: result.updated, color: 'text-emerald-600' },
                        { label: 'SKU no encontrados', value: result.not_found.length, color: 'text-rose-600' },
                        { label: 'Filas omitidas', value: result.skipped, color: 'text-amber-600' },
                    ].map(k => (
                        <div key={k.label} className="bg-white rounded-xl border border-slate-100 p-4 text-center">
                            <p className={cn('text-2xl font-bold font-mono tabular-nums', k.color)}>{k.value}</p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{k.label}</p>
                        </div>
                    ))}
                </div>

                {result.not_found.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-100 p-4">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            SKU no encontrados en el catálogo ({result.not_found.length})
                        </p>
                        <div className="max-h-40 overflow-y-auto flex flex-wrap gap-1.5">
                            {result.not_found.slice(0, 60).map((s, i) => (
                                <span key={i} className="text-[11px] font-mono bg-rose-50 text-rose-600 rounded-md px-2 py-0.5">{s}</span>
                            ))}
                            {result.not_found.length > 60 && (
                                <span className="text-[11px] text-slate-400">+{result.not_found.length - 60} más…</span>
                            )}
                        </div>
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
                            <p className="text-xs text-slate-400">{preview.rows.length.toLocaleString('es-CO')} filas con SKU + código detectadas</p>
                        </div>
                    </div>
                    <button onClick={reset} className="text-slate-300 hover:text-slate-500 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Vista previa (primeras filas)</p>
                    </div>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-50">
                                <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase">SKU</th>
                                <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase">Código de barras</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {preview.sample.map((r, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-2.5 text-xs font-mono font-medium text-slate-700">{r.sku}</td>
                                    <td className="px-4 py-2.5 text-xs font-mono text-slate-600">{r.barcode}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                    <p className="text-xs text-indigo-800">
                        Se emparejará cada fila por <strong>SKU</strong> y se escribirá el código de barras en el producto.
                        Los SKU que no existan en el catálogo se reportarán al final (no se crean productos).
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={handleImport}
                        disabled={importing}
                        className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold gap-2"
                    >
                        {importing
                            ? <><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</>
                            : <><ScanBarcode className="h-4 w-4" /> Cargar códigos de barras</>}
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
        <div className="space-y-4">
            <div
                className={cn(
                    'border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer',
                    dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('barcode-file-input')?.click()}
            >
                <input
                    id="barcode-file-input"
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
                        <ScanBarcode className="h-7 w-7 text-indigo-500" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-900">
                            {dragOver ? 'Suelta el archivo aquí' : 'Arrastra el Excel o haz clic para seleccionar'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            Dos columnas: <strong>SKU</strong> y <strong>Código de barras</strong> · .xlsx o .xls
                        </p>
                    </div>
                    <Button variant="outline" className="h-9 rounded-xl text-xs gap-2 pointer-events-none">
                        <Upload className="h-3.5 w-3.5" /> Seleccionar archivo
                    </Button>
                </div>
            </div>

            <div className="flex justify-center">
                <Button
                    onClick={(e) => { e.stopPropagation(); downloadTemplate() }}
                    variant="ghost"
                    className="h-9 rounded-xl text-xs gap-2 text-slate-500 hover:text-slate-900"
                >
                    <Download className="h-3.5 w-3.5" /> Descargar plantilla de ejemplo
                </Button>
            </div>
        </div>
    )
}
