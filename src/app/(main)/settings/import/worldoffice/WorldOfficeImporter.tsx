'use client'

import { useState } from 'react'
import {
  Server, Database, Key, User, CheckCircle2, XCircle, Loader2, Users,
  Package, UserCheck, BookOpen, ArrowRight, RotateCcw, Download, AlertTriangle,
  Table2, Eye, Upload,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/lib/utils'
// ─── Local Types ─────────────────────────────────────────────────────────────

interface ImportResult {
  inserted: number
  errors: { row: number; message: string }[]
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = 'connect' | 'discover' | 'preview' | 'importing' | 'result'

interface ConnectionConfig {
  server: string
  instance: string
  database: string
  user: string
  password: string
}

interface TableInfo {
  name: string
  row_count: number
}

interface ExtractableType {
  key: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  importAction: string
}

const EXTRACTABLE_TYPES: ExtractableType[] = [
  { key: 'terceros', label: 'Terceros', description: 'Clientes, proveedores, contactos', icon: Users, importAction: 'clients' },
  { key: 'productos', label: 'Productos', description: 'Inventario y catálogo', icon: Package, importAction: 'products' },
  { key: 'empleados', label: 'Empleados', description: 'Nómina y RRHH', icon: UserCheck, importAction: 'employees' },
  { key: 'plan_cuentas', label: 'Saldos Contables', description: 'Asiento de apertura', icon: BookOpen, importAction: 'opening_entry' },
]

// ─── API call helper ─────────────────────────────────────────────────────────

async function callApi(body: Record<string, unknown>) {
  const res = await fetch('/api/import/worldoffice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function WorldOfficeImporter() {
  const [step, setStep] = useState<Step>('connect')
  const [config, setConfig] = useState<ConnectionConfig>({
    server: '192.168.0.50',
    instance: 'WORLDOFFICE',
    database: 'GVM CORPORATION GLOBAL',
    user: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionInfo, setConnectionInfo] = useState<{ database: string; version: string } | null>(null)
  const [tables, setTables] = useState<TableInfo[]>([])
  const [detected, setDetected] = useState<string[]>([])
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [extractedRows, setExtractedRows] = useState<Record<string, unknown>[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // ── Step 1: Test connection ──────────────────────────────────────────────

  async function handleTestConnection() {
    setLoading(true)
    setError(null)
    try {
      const result = await callApi({ action: 'test', ...config })
      if (result.success) {
        setConnectionInfo({ database: result.database, version: result.version })
        // Immediately discover tables
        const discoverResult = await callApi({ action: 'discover', ...config })
        if (discoverResult.tables) {
          setTables(discoverResult.tables)
          setDetected(discoverResult.detected || [])
          setStep('discover')
        } else {
          setError(discoverResult.error || 'No se pudieron listar las tablas')
        }
      } else {
        setError(result.error || 'No se pudo conectar')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: Extract data ─────────────────────────────────────────────────

  async function handleExtract(typeKey: string) {
    setSelectedType(typeKey)
    setLoading(true)
    setError(null)
    try {
      const result = await callApi({ action: 'extract', table_key: typeKey, ...config })
      if (result.error) {
        setError(`No se encontró la tabla de ${typeKey}. Es posible que tu versión de WorldOffice use nombres diferentes. Intenta con la importación manual por Excel.`)
        return
      }
      if (result.rows && result.rows.length > 0) {
        setExtractedRows(result.rows)
        setStep('preview')
      } else {
        setError(`La tabla de ${typeKey} está vacía.`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error extrayendo datos')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: Import into GVM ──────────────────────────────────────────────

  async function handleImport() {
    if (!selectedType || extractedRows.length === 0) return
    setStep('importing')
    setError(null)

    try {
      const result = await callApi({ action: 'import', table_key: selectedType, ...config })

      if (result.success) {
        setImportResult({
          inserted: result.total_imported ?? 0,
          errors: (result.results ?? []).flatMap((r: { error_details?: string[] }) =>
            (r.error_details ?? []).map((msg: string) => ({ row: 0, message: msg }))
          ),
        })
      } else {
        setImportResult({
          inserted: result.total_imported ?? 0,
          errors: [{ row: 0, message: result.error || 'Error en la importación' }],
        })
      }
      setStep('result')
    } catch (err) {
      setImportResult({
        inserted: 0,
        errors: [{ row: 0, message: err instanceof Error ? err.message : 'Error inesperado' }],
      })
      setStep('result')
    }
  }

  // ── Reset ────────────────────────────────────────────────────────────────

  function handleReset() {
    setStep('discover')
    setSelectedType(null)
    setExtractedRows([])
    setImportResult(null)
    setError(null)
  }

  function handleFullReset() {
    setStep('connect')
    setConnectionInfo(null)
    setTables([])
    setDetected([])
    setSelectedType(null)
    setExtractedRows([])
    setImportResult(null)
    setError(null)
  }

  // ── Download extracted as CSV ────────────────────────────────────────────

  function handleDownloadCsv() {
    if (extractedRows.length === 0) return
    const headers = Object.keys(extractedRows[0])
    const csvLines = [
      headers.join(','),
      ...extractedRows.map(row => headers.map(h => {
        const val = String(row[h] ?? '').replace(/,/g, ';')
        return val
      }).join(',')),
    ]
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `worldoffice_${selectedType}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 to-slate-900 rounded-[2rem] p-8 mb-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 opacity-5 pointer-events-none">
          <Database className="h-48 w-48 text-white -mt-8 -mr-8" />
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="h-14 w-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
            <Server className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight italic uppercase">
              Migración WorldOffice
            </h1>
            <p className="text-blue-300 text-sm font-medium mt-0.5">
              Conexión directa a SQL Server — Extrae datos automáticamente
            </p>
          </div>
        </div>
        {connectionInfo && (
          <div className="mt-4 flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold text-white">{connectionInfo.database}</span>
            <span className="text-[10px] text-blue-300 truncate">{connectionInfo.version}</span>
          </div>
        )}
      </div>

      {/* Main card */}
      <div className="bg-white rounded-[2rem] p-8 shadow-lg border border-slate-100">

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-xl p-4">
            <AlertTriangle className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-rose-700">Error</p>
              <p className="text-xs text-rose-600 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-600">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── STEP: CONNECT ── */}
        {step === 'connect' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                Paso 1
              </h2>
              <p className="text-lg font-black text-slate-900 italic uppercase tracking-tight">
                Conectar a WorldOffice SQL Server
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Ingresa los datos de conexión de tu servidor de WorldOffice
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Servidor (IP)
                </label>
                <div className="relative">
                  <Server className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                  <Input
                    value={config.server}
                    onChange={e => setConfig(c => ({ ...c, server: e.target.value }))}
                    placeholder="192.168.0.50"
                    className="pl-11 h-12 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Instancia SQL
                </label>
                <div className="relative">
                  <Database className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                  <Input
                    value={config.instance}
                    onChange={e => setConfig(c => ({ ...c, instance: e.target.value }))}
                    placeholder="WORLDOFFICE"
                    className="pl-11 h-12 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Base de Datos
                </label>
                <div className="relative">
                  <Table2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                  <Input
                    value={config.database}
                    onChange={e => setConfig(c => ({ ...c, database: e.target.value }))}
                    placeholder="GVM CORPORATION GLOBAL"
                    className="pl-11 h-12 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Usuario SQL
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                  <Input
                    value={config.user}
                    onChange={e => setConfig(c => ({ ...c, user: e.target.value }))}
                    placeholder="sa"
                    className="pl-11 h-12 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                  <Input
                    type="password"
                    value={config.password}
                    onChange={e => setConfig(c => ({ ...c, password: e.target.value }))}
                    placeholder="********"
                    className="pl-11 h-12 rounded-xl font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Importante</p>
              <p className="text-xs text-amber-700">
                Esta conexión se realiza desde tu navegador a través del servidor local (npm run dev).
                Solo funciona si tu PC está en la misma red que el servidor de WorldOffice.
                Las credenciales NO se guardan.
              </p>
            </div>

            <Button
              onClick={handleTestConnection}
              disabled={loading || !config.server || !config.user || !config.password}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Conectando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Probar Conexión
                </span>
              )}
            </Button>
          </div>
        )}

        {/* ── STEP: DISCOVER ── */}
        {step === 'discover' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                  Paso 2
                </h2>
                <p className="text-lg font-black text-slate-900 italic uppercase tracking-tight">
                  Selecciona qué datos migrar
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {tables.length} tablas encontradas en WorldOffice
                </p>
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Conectado</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {EXTRACTABLE_TYPES.map(type => {
                const isDetected = detected.includes(type.key)
                const Icon = type.icon
                return (
                  <button
                    key={type.key}
                    onClick={() => handleExtract(type.key)}
                    disabled={loading}
                    className={cn(
                      'flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left group',
                      isDetected
                        ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-400 hover:bg-emerald-50'
                        : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50',
                      loading && 'opacity-50 cursor-wait'
                    )}
                  >
                    <div className={cn(
                      'h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-all',
                      isDetected
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black uppercase tracking-wider italic text-slate-700">
                          {type.label}
                        </p>
                        {isDetected && (
                          <span className="text-[8px] font-black uppercase bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full tracking-widest">
                            Detectado
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{type.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                  </button>
                )
              })}
            </div>

            {/* Tables summary */}
            <details className="group">
              <summary className="cursor-pointer text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 flex items-center gap-1.5">
                <Eye className="h-3 w-3" />
                Ver todas las tablas ({tables.length})
              </summary>
              <div className="mt-3 max-h-60 overflow-y-auto rounded-xl border border-slate-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-2 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Tabla</th>
                      <th className="px-4 py-2 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">Filas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables.map((t, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-1.5 font-mono text-[11px] text-slate-600">{t.name}</td>
                        <td className="px-4 py-1.5 text-right tabular-nums text-slate-400">{t.row_count?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            <button
              onClick={handleFullReset}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="h-3 w-3" />
              Cambiar conexión
            </button>
          </div>
        )}

        {/* ── STEP: PREVIEW ── */}
        {step === 'preview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                  Paso 3
                </h2>
                <p className="text-lg font-black text-slate-900 italic uppercase tracking-tight">
                  Vista previa — {EXTRACTABLE_TYPES.find(t => t.key === selectedType)?.label}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {extractedRows.length} registros extraídos de WorldOffice
                </p>
              </div>
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2">
                <span className="text-2xl font-black text-blue-600">{extractedRows.length}</span>
                <span className="text-[10px] font-black uppercase text-blue-400 leading-tight tracking-widest">
                  registros
                </span>
              </div>
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-3 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 w-10">#</th>
                    {extractedRows.length > 0 && Object.keys(extractedRows[0]).map(h => (
                      <th key={h} className="px-3 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {extractedRows.slice(0, 15).map((row, i) => (
                    <tr key={i} className={cn(
                      'border-b border-slate-50 transition-colors',
                      i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    )}>
                      <td className="px-3 py-2 text-[10px] font-black text-slate-300">{i + 1}</td>
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-3 py-2 text-[11px] text-slate-600 font-medium max-w-[140px] truncate">
                          {String(val ?? '') || <span className="text-slate-300 italic">-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {extractedRows.length > 15 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  + {extractedRows.length - 15} registros adicionales
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3 w-3" />
                  Volver
                </button>
                <button
                  onClick={handleDownloadCsv}
                  className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-700 transition-colors flex items-center gap-1.5"
                >
                  <Download className="h-3 w-3" />
                  Descargar CSV
                </button>
              </div>
              <Button
                onClick={handleImport}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 py-2.5 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-200 transition-all"
              >
                <Upload className="h-3.5 w-3.5 mr-2" />
                Importar {extractedRows.length} registros a GVM Corp
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP: IMPORTING ── */}
        {step === 'importing' && (
          <div className="py-16 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
            <p className="text-sm font-black text-slate-700 italic uppercase tracking-wide">
              Importando {extractedRows.length} registros...
            </p>
            <p className="text-xs text-slate-400">Esto puede tomar unos segundos</p>
          </div>
        )}

        {/* ── STEP: RESULT ── */}
        {step === 'result' && importResult && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-3xl font-black text-emerald-600">{importResult.inserted}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mt-1">
                  Importados
                </p>
              </div>
              <div className={cn(
                'rounded-2xl p-6 text-center border',
                importResult.errors.length > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'
              )}>
                <XCircle className={cn('h-8 w-8 mx-auto mb-2', importResult.errors.length > 0 ? 'text-rose-500' : 'text-slate-300')} />
                <p className={cn('text-3xl font-black', importResult.errors.length > 0 ? 'text-rose-600' : 'text-slate-400')}>
                  {importResult.errors.length}
                </p>
                <p className={cn('text-[10px] font-black uppercase tracking-widest mt-1', importResult.errors.length > 0 ? 'text-rose-400' : 'text-slate-400')}>
                  Errores
                </p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="rounded-2xl border border-rose-100 overflow-hidden">
                <div className="bg-rose-50 px-4 py-2.5 border-b border-rose-100">
                  <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">Detalle de errores</p>
                </div>
                <div className="divide-y divide-rose-50 max-h-52 overflow-y-auto">
                  {importResult.errors.slice(0, 50).map((err, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 bg-white">
                      <span className="text-[9px] font-black bg-rose-100 text-rose-500 rounded-md px-1.5 py-0.5 whitespace-nowrap mt-0.5">
                        {err.row > 0 ? `Fila ${err.row}` : 'BD'}
                      </span>
                      <p className="text-xs text-slate-600 font-medium">{err.message}</p>
                    </div>
                  ))}
                  {importResult.errors.length > 50 && (
                    <div className="px-4 py-3 text-center text-[10px] font-black text-rose-400">
                      + {importResult.errors.length - 50} errores más
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-center gap-3 pt-2">
              <Button
                onClick={handleReset}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-8 py-2.5 font-black uppercase tracking-widest text-[10px] shadow-lg transition-all flex items-center gap-2"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Importar otro tipo
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
