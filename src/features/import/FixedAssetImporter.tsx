'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/lib/utils'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Package, X, RefreshCw, Download } from 'lucide-react'
import { importFixedAssetsAction, AssetImportRow, AssetImportResult } from './assetImportAction'
import { toast } from 'sonner'

const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[_\s.]+/g, '')

function parseDate(v: string): string {
    const s = String(v || '').trim()
    if (!s) return ''
    const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(s)
    if (dmy) {
        const y = dmy[3].length === 2 ? '20' + dmy[3] : dmy[3]
        return `${y}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`
    }
    const ymd = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/.exec(s)
    if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`
    return s
}
const num = (v: unknown) => Number(String(v ?? '').replace(/[^\d.-]/g, '')) || 0

function parseXlsx(buffer: ArrayBuffer): AssetImportRow[] {
    const XLSX = require('xlsx') as typeof import('xlsx')
    const wb = XLSX.read(new Uint8Array(buffer))
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', raw: false })
    if (raw.length === 0) return []
    const header = (raw[0] as unknown[]).map((h) => norm(String(h ?? '')))
    const col = (...frags: string[]) => header.findIndex((h) => h && frags.some((f) => h.includes(f)))

    const iCode = col('codigo', 'cod', 'ref')
    const iName = col('nombre', 'descrip', 'activo')
    const iCat = col('categor', 'clasif', 'tipo', 'grupo')
    const iDate = col('fechacompra', 'fechaadq', 'fecha', 'ingreso')
    const iCost = col('costo', 'valoradq', 'adquisic', 'valor')
    const iYears = col('vidautilanos', 'anos', 'vidaanos')
    const iMonths = col('meses', 'vidautilmeses', 'vidameses')
    const iSalv = col('residual', 'salvamento')
    const iAcc = col('depreciacionacum', 'depracum', 'acumulad')

    const rows: AssetImportRow[] = []
    for (let i = 1; i < raw.length; i++) {
        const r = raw[i] as unknown[]
        const code = String(r[iCode] ?? '').trim()
        const name = String(r[iName] ?? '').trim()
        if (!code || !name) continue
        const years = iYears >= 0 && r[iYears] ? num(r[iYears]) : (iMonths >= 0 && r[iMonths] ? Math.round((num(r[iMonths]) / 12) * 100) / 100 : 0)
        rows.push({
            code,
            name,
            category: iCat >= 0 ? String(r[iCat] ?? '') : '',
            acquisition_date: iDate >= 0 ? parseDate(String(r[iDate] ?? '')) : '',
            acquisition_cost: iCost >= 0 ? num(r[iCost]) : 0,
            useful_life_years: years,
            salvage_value: iSalv >= 0 ? num(r[iSalv]) : 0,
            accumulated_depreciation: iAcc >= 0 ? num(r[iAcc]) : 0,
        })
    }
    return rows
}

function downloadTemplate() {
    const XLSX = require('xlsx') as typeof import('xlsx')
    const ws = XLSX.utils.aoa_to_sheet([
        ['Codigo', 'Nombre', 'Categoria', 'Fecha compra', 'Costo', 'Vida util (años)', 'Valor residual', 'Depreciacion acumulada'],
        ['ACTIV001', 'Computador Dell', 'Equipos de Computo', '15/01/2024', 3000000, 3, 300000, 500000],
        ['ACTIV002', 'Camioneta Hilux', 'Vehiculo', '01/06/2023', 120000000, 5, 12000000, 20000000],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Activos')
    XLSX.writeFile(wb, 'plantilla-activos-fijos.xlsx')
}

export function FixedAssetImporter() {
    const [rows, setRows] = useState<AssetImportRow[] | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)
    const [importing, setImporting] = useState(false)
    const [result, setResult] = useState<AssetImportResult | null>(null)
    const [dragOver, setDragOver] = useState(false)

    const handleFile = useCallback(async (file: File) => {
        if (!file.name.match(/\.(xlsx|xls)$/i)) { toast.error('Solo se aceptan archivos Excel (.xlsx o .xls)'); return }
        setResult(null); setFileName(file.name)
        const parsed = parseXlsx(await file.arrayBuffer())
        if (parsed.length === 0) { toast.error('No se detectaron activos (revisa que haya Código y Nombre)'); setFileName(null); return }
        setRows(parsed)
    }, [])

    const handleImport = async () => {
        if (!rows) return
        setImporting(true)
        try {
            const res = await importFixedAssetsAction(rows)
            setResult(res)
            if (res.errors.length === 0 && res.skipped_existing.length === 0) toast.success(`${res.inserted} activos importados`)
            else if (res.inserted > 0) toast.warning(`${res.inserted} importados · ${res.skipped_existing.length} ya existían`)
            else toast.error('No se importó ningún activo')
        } catch (e) { toast.error('Error inesperado al importar'); console.error(e) } finally { setImporting(false) }
    }

    const reset = () => { setRows(null); setFileName(null); setResult(null) }

    if (result) {
        const clean = result.errors.length === 0 && result.skipped_existing.length === 0
        return (
            <div className="space-y-4">
                <div className={cn('rounded-2xl border p-6 flex items-start gap-4', clean ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}>
                    {clean ? <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />}
                    <div><p className={cn('text-sm font-bold', clean ? 'text-emerald-900' : 'text-amber-900')}>Importación de activos fijos</p><p className="text-xs text-slate-500">{fileName}</p></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Importados', value: result.inserted, color: 'text-emerald-600' },
                        { label: 'Ya existían', value: result.skipped_existing.length, color: 'text-amber-600' },
                        { label: 'Omitidos', value: result.skipped, color: 'text-slate-500' },
                    ].map((k) => (
                        <div key={k.label} className="bg-white rounded-xl border border-slate-100 p-4 text-center">
                            <p className={cn('text-2xl font-bold font-mono tabular-nums', k.color)}>{k.value}</p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">{k.label}</p>
                        </div>
                    ))}
                </div>
                {result.errors.length > 0 && <div className="bg-rose-50 rounded-xl border border-rose-200 p-4 max-h-40 overflow-y-auto">{result.errors.slice(0, 10).map((e, i) => <p key={i} className="text-xs text-rose-700">{e}</p>)}</div>}
                <Button onClick={reset} variant="outline" className="h-9 rounded-xl text-xs gap-2"><RefreshCw className="h-3.5 w-3.5" /> Importar otro archivo</Button>
            </div>
        )
    }

    if (rows) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-emerald-600" /><div><p className="text-sm font-bold text-slate-900">{fileName}</p><p className="text-xs text-slate-400">{rows.length.toLocaleString('es-CO')} activos detectados</p></div></div>
                    <button onClick={reset} className="text-slate-300 hover:text-slate-500"><X className="h-4 w-4" /></button>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 overflow-x-auto">
                    <table className="w-full min-w-[560px]">
                        <thead><tr className="border-b border-slate-50 bg-slate-50">
                            {['Código', 'Nombre', 'Categoría', 'Costo', 'Vida (a)', 'Residual'].map(h => <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase">{h}</th>)}
                        </tr></thead>
                        <tbody className="divide-y divide-slate-50">
                            {rows.slice(0, 8).map((r, i) => (
                                <tr key={i} className="text-xs">
                                    <td className="px-3 py-2 font-mono font-medium text-slate-700">{r.code}</td>
                                    <td className="px-3 py-2 text-slate-600 max-w-[180px] truncate">{r.name}</td>
                                    <td className="px-3 py-2 text-slate-500">{r.category}</td>
                                    <td className="px-3 py-2 text-right font-mono text-slate-600">${r.acquisition_cost.toLocaleString('es-CO')}</td>
                                    <td className="px-3 py-2 text-right font-mono text-slate-600">{r.useful_life_years}</td>
                                    <td className="px-3 py-2 text-right font-mono text-slate-600">${r.salvage_value.toLocaleString('es-CO')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-800">La categoría se mapea automáticamente (Vehículo, Cómputo, Muebles, etc.). Los códigos que ya existan se omiten.</div>
                <div className="flex items-center gap-3">
                    <Button onClick={handleImport} disabled={importing} className="h-10 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold gap-2">
                        {importing ? <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</> : <><Package className="h-4 w-4" /> Importar activos</>}
                    </Button>
                    <Button onClick={reset} variant="outline" disabled={importing} className="h-10 rounded-xl text-sm">Cancelar</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div
                className={cn('border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer', dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                onClick={() => document.getElementById('asset-file-input')?.click()}
            >
                <input id="asset-file-input" type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
                <div className="flex flex-col items-center gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-indigo-50 flex items-center justify-center"><Package className="h-7 w-7 text-indigo-500" /></div>
                    <div>
                        <p className="text-sm font-bold text-slate-900">{dragOver ? 'Suelta el archivo aquí' : 'Arrastra el Excel o haz clic para seleccionar'}</p>
                        <p className="text-xs text-slate-400 mt-1">Código, Nombre, Categoría, Fecha, Costo, Vida útil, Valor residual, Dep. acumulada</p>
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
