'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import {
    Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
    Loader2, DollarSign, X, RefreshCw, Download, Tag,
} from 'lucide-react'
import { importPriceListAction, PriceRow, PriceImportResult } from './priceImportAction'
import { toast } from 'sonner'

interface PriceList { id: string; name: string; is_default: boolean }
interface Props { priceLists: PriceList[] }

const SKU_HEADERS = ['sku', 'codigo', 'código', 'referencia', 'ref', 'cod']
const PRICE_HEADERS = ['precio', 'price', 'valor', 'vlr']

function parseXlsxFile(buffer: ArrayBuffer): PriceRow[] {
    const XLSX = require('xlsx') as typeof import('xlsx')
    const wb = XLSX.read(new Uint8Array(buffer))
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', raw: false })
    if (raw.length === 0) return []

    const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
    const header = (raw[0] as unknown[]).map((h) => norm(String(h ?? '')))
    const findCol = (cands: string[]) => header.findIndex((h) => h && cands.some((c) => h.includes(c)))

    let skuCol = findCol(SKU_HEADERS.map(norm))
    let priceCol = findCol(PRICE_HEADERS.map(norm))
    let start = 1
    if (skuCol === -1 && priceCol === -1) { skuCol = 0; priceCol = 1; start = 0 }
    else { if (skuCol === -1) skuCol = 0; if (priceCol === -1) priceCol = 1 }

    const rows: PriceRow[] = []
    for (let i = start; i < raw.length; i++) {
        const row = raw[i] as unknown[]
        const sku = String(row[skuCol] ?? '').trim()
        // limpia separadores de miles y símbolos de moneda
        const rawPrice = String(row[priceCol] ?? '').replace(/[^\d.-]/g, '')
        const price = Number(rawPrice)
        if (!sku || !isFinite(price)) continue
        rows.push({ sku, price })
    }
    return rows
}

function downloadTemplate() {
    const XLSX = require('xlsx') as typeof import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([['SKU', 'Precio'], ['BEBED-2032', 6625], ['AGDES-654', 3200]])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Precios')
    XLSX.writeFile(wb, 'plantilla-precios.xlsx')
}

export function PriceListImporter({ priceLists }: Props) {
    const [listId, setListId] = useState<string>(priceLists.find((l) => l.is_default)?.id ?? priceLists[0]?.id ?? '')
    const [rows, setRows] = useState<PriceRow[] | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)
    const [importing, setImporting] = useState(false)
    const [result, setResult] = useState<PriceImportResult | null>(null)
    const [dragOver, setDragOver] = useState(false)

    const currentList = priceLists.find((l) => l.id === listId)

    const handleFile = useCallback(async (file: File) => {
        if (!file.name.match(/\.(xlsx|xls)$/i)) { toast.error('Solo se aceptan archivos Excel (.xlsx o .xls)'); return }
        setResult(null); setFileName(file.name)
        const parsed = parseXlsxFile(await file.arrayBuffer())
        if (parsed.length === 0) { toast.error('No se detectaron filas con SKU y precio'); setFileName(null); return }
        setRows(parsed)
    }, [])

    const handleImport = async () => {
        if (!rows || !listId) return
        setImporting(true)
        try {
            const res = await importPriceListAction(listId, rows)
            setResult(res)
            if (res.errors.length === 0 && res.not_found.length === 0) toast.success(`${res.updated + res.inserted} precios cargados en ${res.listName}`)
            else if (res.updated + res.inserted > 0) toast.warning(`Cargado con avisos · ${res.not_found.length} SKU no encontrados`)
            else toast.error('No se cargó ningún precio')
        } catch (e) { toast.error('Error inesperado al importar'); console.error(e) } finally { setImporting(false) }
    }

    const reset = () => { setRows(null); setFileName(null); setResult(null) }

    // ── Selector de lista (siempre visible) ──
    const listSelector = (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Tag className="h-3 w-3" /> Lista de precios a actualizar
            </label>
            <select
                value={listId}
                onChange={(e) => { setListId(e.target.value); reset() }}
                className="w-full h-10 rounded-xl border border-slate-200 bg-white text-sm px-3 outline-none font-semibold"
            >
                {priceLists.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}{l.is_default ? ' (por defecto)' : ''}</option>
                ))}
            </select>
            {currentList?.is_default && (
                <p className="text-[11px] text-amber-600">Es la lista por defecto: también actualizará el <strong>precio de venta</strong> que usan los documentos.</p>
            )}
        </div>
    )

    // ── RESULT ──
    if (result) {
        const clean = result.errors.length === 0 && result.not_found.length === 0
        return (
            <div className="space-y-4">
                {listSelector}
                <div className={cn('rounded-2xl border p-6 flex items-start gap-4', clean ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}>
                    {clean ? <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />}
                    <div className="space-y-1">
                        <p className={cn('text-sm font-bold', clean ? 'text-emerald-900' : 'text-amber-900')}>Precios cargados en {result.listName}</p>
                        <p className="text-xs text-slate-500">{fileName}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Actualizados', value: result.updated, color: 'text-indigo-600' },
                        { label: 'Nuevos', value: result.inserted, color: 'text-emerald-600' },
                        { label: 'Precio venta', value: result.selling_updated, color: 'text-sky-600' },
                        { label: 'SKU no encontrados', value: result.not_found.length, color: 'text-rose-600' },
                    ].map((k) => (
                        <div key={k.label} className="bg-white rounded-xl border border-slate-100 p-4 text-center">
                            <p className={cn('text-2xl font-bold font-mono tabular-nums', k.color)}>{k.value}</p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{k.label}</p>
                        </div>
                    ))}
                </div>
                {result.not_found.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-100 p-4">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">SKU no encontrados ({result.not_found.length})</p>
                        <div className="max-h-40 overflow-y-auto flex flex-wrap gap-1.5">
                            {result.not_found.slice(0, 60).map((s, i) => <span key={i} className="text-[11px] font-mono bg-rose-50 text-rose-600 rounded-md px-2 py-0.5">{s}</span>)}
                            {result.not_found.length > 60 && <span className="text-[11px] text-slate-400">+{result.not_found.length - 60} más…</span>}
                        </div>
                    </div>
                )}
                <Button onClick={reset} variant="outline" className="h-9 rounded-xl text-xs gap-2"><RefreshCw className="h-3.5 w-3.5" /> Cargar otro archivo</Button>
            </div>
        )
    }

    // ── PREVIEW ──
    if (rows) {
        return (
            <div className="space-y-4">
                {listSelector}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                        <div>
                            <p className="text-sm font-bold text-slate-900">{fileName}</p>
                            <p className="text-xs text-slate-400">{rows.length.toLocaleString('es-CO')} precios detectados</p>
                        </div>
                    </div>
                    <button onClick={reset} className="text-slate-300 hover:text-slate-500"><X className="h-4 w-4" /></button>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                    <table className="w-full">
                        <thead><tr className="border-b border-slate-50 bg-slate-50">
                            <th className="px-4 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase">SKU</th>
                            <th className="px-4 py-2 text-right text-[10px] font-semibold text-slate-400 uppercase">Precio</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {rows.slice(0, 8).map((r, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-2.5 text-xs font-mono font-medium text-slate-700">{r.sku}</td>
                                    <td className="px-4 py-2.5 text-right text-xs font-mono text-slate-600">${r.price.toLocaleString('es-CO')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={handleImport} disabled={importing} className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold gap-2">
                        {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Cargando...</> : <><DollarSign className="h-4 w-4" /> Cargar en {currentList?.name}</>}
                    </Button>
                    <Button onClick={reset} variant="outline" disabled={importing} className="h-10 rounded-xl text-sm">Cancelar</Button>
                </div>
            </div>
        )
    }

    // ── UPLOAD ──
    return (
        <div className="space-y-4">
            {listSelector}
            <div
                className={cn('border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer', dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                onClick={() => document.getElementById('price-file-input')?.click()}
            >
                <input id="price-file-input" type="file" accept=".xlsx,.xls" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
                <div className="flex flex-col items-center gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center"><DollarSign className="h-7 w-7 text-indigo-500" /></div>
                    <div>
                        <p className="text-sm font-bold text-slate-900">{dragOver ? 'Suelta el archivo aquí' : 'Arrastra el Excel o haz clic para seleccionar'}</p>
                        <p className="text-xs text-slate-400 mt-1">Dos columnas: <strong>SKU</strong> y <strong>Precio</strong> · .xlsx o .xls</p>
                    </div>
                    <Button variant="outline" className="h-9 rounded-xl text-xs gap-2 pointer-events-none"><Upload className="h-3.5 w-3.5" /> Seleccionar archivo</Button>
                </div>
            </div>
            <div className="flex justify-center">
                <Button onClick={(e) => { e.stopPropagation(); downloadTemplate() }} variant="ghost" className="h-9 rounded-xl text-xs gap-2 text-slate-500 hover:text-slate-900">
                    <Download className="h-3.5 w-3.5" /> Descargar plantilla de ejemplo
                </Button>
            </div>
        </div>
    )
}
