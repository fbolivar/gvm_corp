'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  importDolibarrTercerosAction,
  importDolibarrWarehousesAction,
  importDolibarrProductsAction,
  importDolibarrPricesAction,
  importDolibarrStockAction,
  importDolibarrLotsAction,
  importDolibarrAccountsAction,
  importDolibarrInvoicesAction,
  importDolibarrReceivablesAction,
  importDolibarrBookkeepingAction,
  type ImportResult,
} from '@/features/import/dolibarrActions'

// ─── Dataset definitions ─────────────────────────────────────────────────────

type DatasetKey =
  | 'bodegas'
  | 'terceros'
  | 'productos'
  | 'precios'
  | 'puc'
  | 'stock'
  | 'lotes'
  | 'facturas'
  | 'cartera'
  | 'asientos'

interface Dataset {
  key: DatasetKey
  title: string
  description: string
  requiredColumns: string[]
  dependsOn?: DatasetKey[]
  suggestedFileName: string
  action: (rows: unknown[]) => Promise<ImportResult>
}

const DATASETS: Dataset[] = [
  {
    key: 'bodegas',
    title: '1. Bodegas',
    description: 'Almacenes exportados desde Dolibarr',
    requiredColumns: ['code', 'name'],
    suggestedFileName: '04_almacenes.csv',
    action: async (rows) => importDolibarrWarehousesAction(rows as never),
  },
  {
    key: 'puc',
    title: '2. Plan de Cuentas (PUC)',
    description: 'Plan contable desde Dolibarr',
    requiredColumns: ['code', 'name'],
    suggestedFileName: '11_plan_contable.csv',
    action: async (rows) => importDolibarrAccountsAction(rows as never),
  },
  {
    key: 'terceros',
    title: '3. Terceros (Clientes + Proveedores)',
    description: 'Societés de Dolibarr',
    requiredColumns: ['legal_name'],
    suggestedFileName: '01_terceros.csv',
    action: async (rows) => importDolibarrTercerosAction(rows as never),
  },
  {
    key: 'productos',
    title: '4. Productos y Servicios',
    description: 'Productos y servicios de Dolibarr',
    requiredColumns: ['sku', 'name'],
    suggestedFileName: '03_productos.csv',
    action: async (rows) => importDolibarrProductsAction(rows as never),
  },
  {
    key: 'precios',
    title: '4b. Precios de Venta (nivel 1)',
    description: 'Actualiza selling_price de productos (multi-precio nivel 1)',
    requiredColumns: ['sku', 'selling_price'],
    dependsOn: ['productos'],
    suggestedFileName: '03b_precios_segmento.csv',
    action: async (rows) => importDolibarrPricesAction(rows as never),
  },
  {
    key: 'stock',
    title: '5. Inventario Inicial',
    description: 'Stock actual por bodega',
    requiredColumns: ['sku', 'warehouse_code', 'qty'],
    dependsOn: ['bodegas', 'productos'],
    suggestedFileName: '05_stock.csv',
    action: async (rows) => importDolibarrStockAction(rows as never),
  },
  {
    key: 'lotes',
    title: '5b. Lotes y Vencimientos',
    description: 'Lotes con fechas de vencimiento (crítico veterinario)',
    requiredColumns: ['sku', 'warehouse_code', 'lot_number', 'qty', 'expiry_date'],
    dependsOn: ['bodegas', 'productos'],
    suggestedFileName: '05b_lotes.csv',
    action: async (rows) => importDolibarrLotsAction(rows as never),
  },
  {
    key: 'facturas',
    title: '6. Facturas de Venta',
    description: 'Facturas históricas con cliente',
    requiredColumns: ['doc_number', 'client_nit'],
    dependsOn: ['terceros'],
    suggestedFileName: '07_facturas_venta.csv',
    action: async (rows) => importDolibarrInvoicesAction(rows as never),
  },
  {
    key: 'cartera',
    title: '7. Cartera por Cobrar',
    description: 'Documentos pendientes de cobro',
    requiredColumns: ['doc_number', 'party_nit', 'balance_pending'],
    dependsOn: ['terceros'],
    suggestedFileName: '06_cartera_cobrar.csv',
    action: async (rows) => importDolibarrReceivablesAction(rows as never),
  },
  {
    key: 'asientos',
    title: '8. Asientos Contables',
    description: 'Libro diario de Dolibarr',
    requiredColumns: ['entry_number', 'entry_date', 'account_code'],
    dependsOn: ['puc'],
    suggestedFileName: '12_asientos_contables.csv',
    action: async (rows) => importDolibarrBookkeepingAction(rows as never),
  },
]

// ─── CSV Parser ─────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) return []

  const headers = parseLine(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim()
    })
    rows.push(row)
  }
  return rows
}

function parseLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

// ─── Component ──────────────────────────────────────────────────────────────

interface DatasetState {
  file: File | null
  rows: Record<string, string>[]
  status: 'idle' | 'loading' | 'success' | 'error'
  result: ImportResult | null
}

export function DolibarrImporter() {
  const [datasets, setDatasets] = useState<Record<DatasetKey, DatasetState>>(
    Object.fromEntries(
      DATASETS.map(d => [d.key, { file: null, rows: [], status: 'idle' as const, result: null }])
    ) as unknown as Record<DatasetKey, DatasetState>
  )
  const [running, setRunning] = useState(false)

  const handleFile = useCallback(async (key: DatasetKey, file: File) => {
    const text = await file.text()
    const rows = parseCSV(text)
    setDatasets(prev => ({
      ...prev,
      [key]: { file, rows, status: 'idle', result: null },
    }))
    toast.success(`${file.name}: ${rows.length} filas cargadas`)
  }, [])

  const removeFile = (key: DatasetKey) => {
    setDatasets(prev => ({
      ...prev,
      [key]: { file: null, rows: [], status: 'idle', result: null },
    }))
  }

  const runImport = async (key: DatasetKey) => {
    const ds = datasets[key]
    const def = DATASETS.find(d => d.key === key)!
    if (!ds.file || ds.rows.length === 0) {
      toast.error('Primero carga un archivo CSV')
      return
    }

    setDatasets(prev => ({ ...prev, [key]: { ...prev[key], status: 'loading' } }))

    try {
      const result = await def.action(ds.rows)
      const realErrors = result.errors.filter(e => !e.message.startsWith('INFO:'))
      setDatasets(prev => ({
        ...prev,
        [key]: { ...prev[key], status: realErrors.length > 0 ? 'error' : 'success', result },
      }))

      if (realErrors.length === 0) {
        toast.success(`${def.title}: ${result.inserted} registros importados`)
      } else {
        toast.warning(`${def.title}: ${result.inserted} OK, ${realErrors.length} errores`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setDatasets(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          status: 'error',
          result: { inserted: 0, errors: [{ row: 0, message: msg }] },
        },
      }))
      toast.error(`Error importando ${def.title}`)
    }
  }

  const runAll = async () => {
    setRunning(true)
    for (const def of DATASETS) {
      const ds = datasets[def.key]
      if (!ds.file || ds.rows.length === 0) continue
      await runImport(def.key)
    }
    setRunning(false)
  }

  const totalFiles = Object.values(datasets).filter(d => d.file).length
  const totalInserted = Object.values(datasets).reduce(
    (acc, d) => acc + (d.result?.inserted || 0),
    0
  )
  const totalErrors = Object.values(datasets).reduce(
    (acc, d) => acc + (d.result?.errors.length || 0),
    0
  )

  return (
    <div className="space-y-6">
      {/* Global summary */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Resumen de carga</h2>
          <p className="text-sm text-slate-500">
            {totalFiles} / {DATASETS.length} archivos listos · {totalInserted} registros importados · {totalErrors} errores
          </p>
        </div>
        <button
          type="button"
          onClick={runAll}
          disabled={running || totalFiles === 0}
          className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          {running ? 'Importando...' : 'Importar todo en orden'}
        </button>
      </div>

      {/* Datasets */}
      <div className="space-y-4">
        {DATASETS.map(def => {
          const ds = datasets[def.key]
          return (
            <div
              key={def.key}
              className="bg-white border-2 border-slate-200 rounded-2xl p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900">{def.title}</h3>
                    {ds.status === 'success' && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    )}
                    {ds.status === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
                    {ds.status === 'loading' && (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{def.description}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Columnas requeridas: <code className="bg-slate-100 px-1 rounded">{def.requiredColumns.join(', ')}</code>
                  </p>
                  {def.dependsOn && (
                    <p className="text-xs text-amber-700 mt-1">
                      ⚠ Requiere importar primero: {def.dependsOn.join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!ds.file ? (
                    <label className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 cursor-pointer text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Cargar CSV
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (f) handleFile(def.key, f)
                        }}
                      />
                    </label>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => runImport(def.key)}
                        disabled={ds.status === 'loading'}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:bg-slate-300"
                      >
                        Importar
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFile(def.key)}
                        className="p-2 text-slate-400 hover:text-red-600"
                        title="Quitar archivo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* File info */}
              {ds.file && (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-xl p-3">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">{ds.file.name}</span>
                  <span className="text-slate-400">·</span>
                  <span>{ds.rows.length} filas</span>
                  <span className="text-slate-400">·</span>
                  <span>{(ds.file.size / 1024).toFixed(1)} KB</span>
                </div>
              )}

              {/* Result summary */}
              {ds.result && (
                <div
                  className={`mt-3 p-4 rounded-xl text-sm ${
                    ds.result.errors.length === 0
                      ? 'bg-emerald-50 text-emerald-900'
                      : 'bg-amber-50 text-amber-900'
                  }`}
                >
                  <p className="font-bold">
                    {ds.result.inserted} registros importados
                    {ds.result.errors.length > 0 && ` · ${ds.result.errors.length} errores`}
                  </p>
                  {ds.result.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer font-medium">Ver errores</summary>
                      <ul className="mt-2 space-y-1 text-xs max-h-40 overflow-y-auto">
                        {ds.result.errors.slice(0, 50).map((err, i) => (
                          <li key={i}>
                            Fila {err.row}: {err.message}
                          </li>
                        ))}
                        {ds.result.errors.length > 50 && (
                          <li className="italic">... y {ds.result.errors.length - 50} errores más</li>
                        )}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Help */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <Download className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-blue-900 mb-2">¿Cómo obtener los archivos CSV de Dolibarr?</h3>
            <p className="text-sm text-blue-800 mb-2">
              Revisa los documentos en <code className="bg-white px-1 rounded">docs/implementacion/dolibarr/</code>:
            </p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc ml-4">
              <li><strong>04_GUIA_EXPORTACION_UI.md</strong> — Paso a paso para el admin Dolibarr</li>
              <li><strong>02_QUERIES_SQL_DOLIBARR.md</strong> — Queries SQL directos</li>
              <li><strong>03_MAPEO_CAMPOS.md</strong> — Referencia de campos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
