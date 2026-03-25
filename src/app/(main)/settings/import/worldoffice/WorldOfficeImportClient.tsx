'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Database,
  Server,
  Key,
  User,
  Users,
  Package,
  BookOpen,
  UserCheck,
  CheckSquare,
  Rocket,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  RotateCcw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  AlertTriangle,
  Zap,
  Square,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectionConfig {
  server: string
  port: string
  instance: string
  database: string
  user: string
  password: string
  trustedConnection: boolean
}

interface TablePreview {
  key: string
  name: string
  count: number
  columns: string[]
  sample: Record<string, unknown>[]
}

interface ImportResult {
  table: string
  imported: number
  errors: number
  total: number
  status: 'pending' | 'running' | 'done' | 'error'
  errorDetails?: string[]
}

type WizardStep = 1 | 2 | 3

// ─── Constants ────────────────────────────────────────────────────────────────

const IMPORT_TABLES = [
  {
    key: 'terceros',
    label: 'Terceros',
    description: 'Clientes, proveedores y contactos',
    icon: Users,
    accent: 'blue',
  },
  {
    key: 'productos',
    label: 'Productos',
    description: 'Inventario y catálogo de productos',
    icon: Package,
    accent: 'violet',
  },
  {
    key: 'plan_cuentas',
    label: 'Plan de Cuentas',
    description: 'Cuentas contables PUC',
    icon: BookOpen,
    accent: 'emerald',
  },
  {
    key: 'empleados',
    label: 'Empleados',
    description: 'Nómina y contratos',
    icon: UserCheck,
    accent: 'amber',
  },
] as const

type TableKey = (typeof IMPORT_TABLES)[number]['key']

const ACCENT_CLASSES: Record<string, { bg: string; border: string; text: string; icon: string; badge: string }> = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    text: 'text-blue-700',
    icon: 'bg-blue-100 text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
  },
  violet: {
    bg: 'bg-violet-50',
    border: 'border-violet-400',
    text: 'text-violet-700',
    icon: 'bg-violet-100 text-violet-600',
    badge: 'bg-violet-100 text-violet-700',
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-400',
    text: 'text-emerald-700',
    icon: 'bg-emerald-100 text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-400',
    text: 'text-amber-700',
    icon: 'bg-amber-100 text-amber-600',
    badge: 'bg-amber-100 text-amber-700',
  },
}

// ─── API helper ───────────────────────────────────────────────────────────────

async function callApi(body: Record<string, unknown>) {
  const res = await fetch('/api/import/worldoffice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: WizardStep }) {
  const steps = [
    { n: 1 as WizardStep, label: 'Conexión' },
    { n: 2 as WizardStep, label: 'Seleccionar' },
    { n: 3 as WizardStep, label: 'Importar' },
  ]

  return (
    <nav aria-label="Pasos del asistente" className="flex items-center gap-0 mb-8">
      {steps.map((s, idx) => (
        <div key={s.n} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center text-xs font-black transition-all',
                current === s.n
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-200'
                  : current > s.n
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-100 text-slate-400'
              )}
              aria-current={current === s.n ? 'step' : undefined}
            >
              {current > s.n ? <CheckCircle2 className="h-4 w-4" /> : s.n}
            </div>
            <span
              className={cn(
                'text-[10px] font-black uppercase tracking-widest hidden sm:block',
                current === s.n ? 'text-amber-600' : current > s.n ? 'text-emerald-600' : 'text-slate-400'
              )}
            >
              {s.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={cn(
                'h-px w-8 sm:w-16 mx-3 transition-all',
                current > s.n ? 'bg-emerald-400' : 'bg-slate-200'
              )}
            />
          )}
        </div>
      ))}
    </nav>
  )
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({
  preview,
  onClose,
}: {
  preview: TablePreview
  onClose: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Vista previa de ${preview.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-0.5">
              Vista previa
            </p>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
              {preview.name}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {preview.count.toLocaleString('es-CO')} registros en WorldOffice
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar vista previa"
            className="h-10 w-10 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
          >
            <XCircle className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        <div className="overflow-auto flex-1 p-0">
          {preview.sample.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold">Sin datos de muestra</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0">
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 w-10">
                    #
                  </th>
                  {preview.columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.sample.map((row, i) => (
                  <tr
                    key={i}
                    className={cn(
                      'border-b border-slate-50',
                      i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    )}
                  >
                    <td className="px-4 py-2 text-[10px] font-black text-slate-300">{i + 1}</td>
                    {preview.columns.map((col) => (
                      <td
                        key={col}
                        className="px-4 py-2 text-[11px] text-slate-600 font-medium max-w-[160px] truncate"
                      >
                        {String(row[col] ?? '') || <span className="text-slate-300 italic">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WorldOfficeImportClient() {
  // Wizard state
  const [step, setStep] = useState<WizardStep>(1)

  // Step 1: connection
  const [config, setConfig] = useState<ConnectionConfig>({
    server: '192.168.0.50',
    port: '49992',
    instance: 'WORLDOFFICE',
    database: 'GVM CORPORATION GLOBAL',
    user: 'sa',
    password: '',
    trustedConnection: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [testing, setTesting] = useState(false)
  const [connected, setConnected] = useState(false)
  const [connectionMsg, setConnectionMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Step 2: table selection & preview
  const [previews, setPreviews] = useState<Map<TableKey, TablePreview>>(new Map())
  const [loadingPreview, setLoadingPreview] = useState<TableKey | null>(null)
  const [openPreview, setOpenPreview] = useState<TablePreview | null>(null)
  const [selectedTables, setSelectedTables] = useState<Set<TableKey>>(new Set())
  const [expandedDetails, setExpandedDetails] = useState<Set<TableKey>>(new Set())

  // Step 3: import progress
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ImportResult[]>([])
  const [importDone, setImportDone] = useState(false)

  // ── Helpers ──────────────────────────────────────────────────────────────

  const updateConfig = useCallback(
    <K extends keyof ConnectionConfig>(key: K, value: ConnectionConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  function toggleTable(key: TableKey) {
    setSelectedTables((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function toggleDetails(key: TableKey) {
    setExpandedDetails((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // ── Step 1: Test connection ──────────────────────────────────────────────

  async function handleTestConnection() {
    setTesting(true)
    setConnectionMsg(null)
    setConnected(false)
    try {
      const result = await callApi({ action: 'test', connection: config })
      if (result.success) {
        setConnected(true)
        setConnectionMsg({
          ok: true,
          text: result.database
            ? `Conectado a "${result.database}" — ${result.version ?? ''}`
            : 'Conexion exitosa',
        })
      } else {
        setConnectionMsg({ ok: false, text: result.error ?? 'No se pudo conectar' })
      }
    } catch (err) {
      setConnectionMsg({
        ok: false,
        text: err instanceof Error ? err.message : 'Error de red',
      })
    } finally {
      setTesting(false)
    }
  }

  function handleGoToStep2() {
    if (!connected) return
    setStep(2)
  }

  // ── Step 2: Preview ──────────────────────────────────────────────────────

  async function handlePreview(key: TableKey) {
    if (loadingPreview) return
    setLoadingPreview(key)
    try {
      const result = await callApi({ action: 'preview', table_key: key, connection: config })
      if (result.error) throw new Error(result.error)
      const preview: TablePreview = {
        key,
        name: IMPORT_TABLES.find((t) => t.key === key)?.label ?? key,
        count: result.total ?? result.count ?? result.rows?.length ?? 0,
        columns: result.columns ?? (result.rows?.length ? Object.keys(result.rows[0]) : []),
        sample: result.rows ?? [],
      }
      setPreviews((prev) => new Map(prev).set(key, preview))
      setOpenPreview(preview)
    } catch (err) {
      // Fallback: show placeholder preview so user knows it was reached
      const placeholder: TablePreview = {
        key,
        name: IMPORT_TABLES.find((t) => t.key === key)?.label ?? key,
        count: 0,
        columns: [],
        sample: [],
      }
      setPreviews((prev) => new Map(prev).set(key, placeholder))
      setOpenPreview(placeholder)
    } finally {
      setLoadingPreview(null)
    }
  }

  function handleGoToStep3() {
    if (selectedTables.size === 0) return
    setStep(3)
    setResults([])
    setImportDone(false)
  }

  // ── Step 3: Import ───────────────────────────────────────────────────────

  async function handleStartImport() {
    setImporting(true)
    setImportDone(false)

    const initial: ImportResult[] = [...selectedTables].map((key) => ({
      table: IMPORT_TABLES.find((t) => t.key === key)?.label ?? key,
      imported: 0,
      errors: 0,
      total: previews.get(key)?.count ?? 0,
      status: 'pending',
    }))
    setResults(initial)

    const updated = [...initial]

    for (let i = 0; i < updated.length; i++) {
      // Mark running
      updated[i] = { ...updated[i], status: 'running' }
      setResults([...updated])

      const key = [...selectedTables][i]
      try {
        const result = await callApi({ action: 'import', table_key: key, connection: config })
        updated[i] = {
          ...updated[i],
          status: result.error ? 'error' : 'done',
          imported: result.inserted ?? result.imported ?? 0,
          errors: result.errors?.length ?? result.error_count ?? 0,
          total: result.total ?? updated[i].total,
          errorDetails: result.errors?.map((e: { message?: string } | string) =>
            typeof e === 'string' ? e : e.message ?? String(e)
          ),
        }
      } catch (err) {
        updated[i] = {
          ...updated[i],
          status: 'error',
          errors: 1,
          errorDetails: [err instanceof Error ? err.message : 'Error inesperado'],
        }
      }

      setResults([...updated])
    }

    setImporting(false)
    setImportDone(true)
  }

  // ── Reset ────────────────────────────────────────────────────────────────

  function handleFullReset() {
    setStep(1)
    setConnected(false)
    setConnectionMsg(null)
    setPreviews(new Map())
    setSelectedTables(new Set())
    setExpandedDetails(new Set())
    setResults([])
    setImportDone(false)
  }

  // ── Summary totals ───────────────────────────────────────────────────────

  const totalImported = results.reduce((s, r) => s + r.imported, 0)
  const totalErrors = results.reduce((s, r) => s + r.errors, 0)

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      {/* Preview modal */}
      {openPreview && (
        <PreviewModal preview={openPreview} onClose={() => setOpenPreview(null)} />
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 md:pt-12">
        {/* Breadcrumb */}
        <Link
          href="/settings/import"
          className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-amber-600 transition-colors mb-6"
        >
          <ArrowLeft className="h-3 w-3" />
          Volver al importador manual
        </Link>

        {/* Hero header */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2.5rem] p-8 md:p-10 mb-8 overflow-hidden shadow-2xl">
          {/* Decorative glow */}
          <div className="absolute -top-10 -right-10 h-52 w-52 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 h-40 w-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-amber-900/30 shrink-0">
                <Database className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">
                  Configuración / Importación
                </p>
                <h1 className="text-2xl font-black text-white uppercase tracking-tight leading-snug">
                  Migración WorldOffice
                </h1>
                <p className="text-sm text-slate-400 font-medium mt-1">
                  Conexión directa a SQL Server — extracción automática
                </p>
              </div>
            </div>
            {connected && (
              <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl px-4 py-2 shrink-0">
                <Wifi className="h-4 w-4 text-emerald-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Conectado
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} />

        {/* ══ STEP 1: Conexión ══════════════════════════════════════════════ */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-amber-100 rounded-2xl flex items-center justify-center">
                  <Server className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                    Paso 1 de 3
                  </p>
                  <CardTitle>Conexión a WorldOffice</CardTitle>
                </div>
              </div>
              <CardDescription className="mt-1 ml-[3.25rem]">
                Ingresa los datos de tu servidor SQL Server de WorldOffice
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Grid form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Servidor */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="wo-server"
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
                  >
                    Servidor
                  </label>
                  <div className="relative">
                    <Server className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                    <Input
                      id="wo-server"
                      value={config.server}
                      onChange={(e) => updateConfig('server', e.target.value)}
                      placeholder="192.168.0.50"
                      className="pl-11 h-12 rounded-2xl font-bold"
                    />
                  </div>
                </div>

                {/* Puerto */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="wo-port"
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
                  >
                    Puerto
                  </label>
                  <Input
                    id="wo-port"
                    value={config.port}
                    onChange={(e) => updateConfig('port', e.target.value)}
                    placeholder="49992"
                    className="h-12 rounded-2xl font-bold"
                  />
                </div>

                {/* Instancia */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="wo-instance"
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
                  >
                    Instancia
                  </label>
                  <div className="relative">
                    <Database className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                    <Input
                      id="wo-instance"
                      value={config.instance}
                      onChange={(e) => updateConfig('instance', e.target.value)}
                      placeholder="WORLDOFFICE"
                      className="pl-11 h-12 rounded-2xl font-bold"
                    />
                  </div>
                </div>

                {/* Base de datos */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="wo-database"
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
                  >
                    Base de datos
                  </label>
                  <Input
                    id="wo-database"
                    value={config.database}
                    onChange={(e) => updateConfig('database', e.target.value)}
                    placeholder="GVM CORPORATION GLOBAL"
                    className="h-12 rounded-2xl font-bold"
                  />
                </div>

                {/* Usuario */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="wo-user"
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
                  >
                    Usuario
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                    <Input
                      id="wo-user"
                      value={config.user}
                      onChange={(e) => updateConfig('user', e.target.value)}
                      placeholder="sa"
                      className="pl-11 h-12 rounded-2xl font-bold"
                    />
                  </div>
                </div>

                {/* Contraseña */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="wo-password"
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
                    <Input
                      id="wo-password"
                      type={showPassword ? 'text' : 'password'}
                      value={config.password}
                      onChange={(e) => updateConfig('password', e.target.value)}
                      placeholder="••••••••"
                      className="pl-11 pr-12 h-12 rounded-2xl font-bold"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Windows auth checkbox */}
              <label className="flex items-center gap-3 cursor-pointer group select-none w-fit">
                <div
                  role="checkbox"
                  aria-checked={config.trustedConnection}
                  tabIndex={0}
                  onClick={() => updateConfig('trustedConnection', !config.trustedConnection)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter')
                      updateConfig('trustedConnection', !config.trustedConnection)
                  }}
                  className={cn(
                    'h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                    config.trustedConnection
                      ? 'bg-amber-500 border-amber-500'
                      : 'bg-white border-slate-300 group-hover:border-amber-400'
                  )}
                >
                  {config.trustedConnection && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  )}
                </div>
                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                  Usar autenticación Windows
                </span>
              </label>

              {/* Info notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">
                    Importante
                  </p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    La conexión se realiza desde el servidor Next.js local. Solo funciona si el
                    servidor de WorldOffice es accesible desde esta máquina. Las credenciales no
                    se guardan.
                  </p>
                </div>
              </div>

              {/* Connection result */}
              {connectionMsg && (
                <div
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-bold',
                    connectionMsg.ok
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-700'
                  )}
                  role="status"
                  aria-live="polite"
                >
                  {connectionMsg.ok ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-rose-500 shrink-0" />
                  )}
                  <span className="text-xs leading-snug">{connectionMsg.text}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleTestConnection}
                  disabled={testing || !config.server || (!config.trustedConnection && !config.user)}
                  className="flex-1 h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all"
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Probando conexión...
                    </>
                  ) : (
                    <>
                      <Server className="h-4 w-4 mr-2" />
                      Probar Conexión
                    </>
                  )}
                </Button>

                {connected && (
                  <Button
                    onClick={handleGoToStep2}
                    className="flex-1 h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-amber-200 transition-all"
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Seleccionar datos
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ══ STEP 2: Seleccionar Datos ══════════════════════════════════════ */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-amber-100 rounded-2xl flex items-center justify-center">
                    <CheckSquare className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                      Paso 2 de 3
                    </p>
                    <CardTitle>Datos a Importar</CardTitle>
                  </div>
                </div>
                <button
                  onClick={() => setStep(1)}
                  aria-label="Volver al paso 1"
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Conexión
                </button>
              </div>
              <CardDescription className="mt-1 ml-[3.25rem]">
                Selecciona qué tablas deseas migrar. Puedes previsualizar antes de importar.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Table cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {IMPORT_TABLES.map((table) => {
                  const Icon = table.icon
                  const isSelected = selectedTables.has(table.key)
                  const preview = previews.get(table.key)
                  const accent = ACCENT_CLASSES[table.accent]
                  const isLoadingThis = loadingPreview === table.key
                  const isExpanded = expandedDetails.has(table.key)

                  return (
                    <div
                      key={table.key}
                      className={cn(
                        'rounded-[1.5rem] border-2 transition-all overflow-hidden',
                        isSelected
                          ? `${accent.border} ${accent.bg}`
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      {/* Card top row */}
                      <button
                        type="button"
                        onClick={() => toggleTable(table.key)}
                        aria-pressed={isSelected}
                        className="w-full flex items-center gap-4 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset rounded-[1.5rem]"
                      >
                        {/* Selection indicator */}
                        <div
                          className={cn(
                            'h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                            isSelected
                              ? `bg-amber-500 border-amber-500`
                              : 'bg-white border-slate-300'
                          )}
                          aria-hidden="true"
                        >
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                        </div>

                        {/* Icon */}
                        <div
                          className={cn(
                            'h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-all',
                            isSelected ? accent.icon : 'bg-slate-100 text-slate-400'
                          )}
                          aria-hidden="true"
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              'text-sm font-black uppercase tracking-wider leading-snug',
                              isSelected ? accent.text : 'text-slate-700'
                            )}
                          >
                            {table.label}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {table.description}
                          </p>
                          {preview && (
                            <p
                              className={cn(
                                'text-[10px] font-black mt-1',
                                isSelected ? accent.text : 'text-slate-400'
                              )}
                            >
                              {preview.count.toLocaleString('es-CO')} registros
                            </p>
                          )}
                        </div>
                      </button>

                      {/* Preview & expand row */}
                      <div className="px-5 pb-4 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            preview
                              ? setOpenPreview(preview)
                              : handlePreview(table.key)
                          }
                          disabled={isLoadingThis}
                          className={cn(
                            'flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors',
                            isSelected
                              ? `${accent.text} opacity-90 hover:opacity-100`
                              : 'text-slate-400 hover:text-slate-700'
                          )}
                          aria-label={`Vista previa de ${table.label}`}
                        >
                          {isLoadingThis ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                          {preview ? 'Ver muestra' : 'Vista previa'}
                        </button>

                        {preview && preview.sample.length > 0 && (
                          <>
                            <span className="text-slate-200 text-xs">|</span>
                            <button
                              type="button"
                              onClick={() => toggleDetails(table.key)}
                              className={cn(
                                'flex items-center gap-1 text-[10px] font-black uppercase tracking-widest transition-colors',
                                isSelected
                                  ? `${accent.text} opacity-90 hover:opacity-100`
                                  : 'text-slate-400 hover:text-slate-700'
                              )}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  Ocultar
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  Columnas
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>

                      {/* Expanded columns list */}
                      {isExpanded && preview && preview.columns.length > 0 && (
                        <div className="px-5 pb-5">
                          <div className="flex flex-wrap gap-1.5">
                            {preview.columns.map((col) => (
                              <span
                                key={col}
                                className={cn(
                                  'text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full',
                                  isSelected ? accent.badge : 'bg-slate-100 text-slate-500'
                                )}
                              >
                                {col}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* CTA */}
              <div className="flex items-center justify-between pt-4">
                <p className="text-xs font-bold text-slate-400">
                  {selectedTables.size === 0
                    ? 'Selecciona al menos una tabla'
                    : `${selectedTables.size} tabla${selectedTables.size > 1 ? 's' : ''} seleccionada${selectedTables.size > 1 ? 's' : ''}`}
                </p>
                <Button
                  onClick={handleGoToStep3}
                  disabled={selectedTables.size === 0}
                  className="h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] px-8 shadow-lg shadow-amber-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ══ STEP 3: Importar ══════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-amber-100 rounded-2xl flex items-center justify-center">
                      <Rocket className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                        Paso 3 de 3
                      </p>
                      <CardTitle>Ejecutar Importación</CardTitle>
                    </div>
                  </div>
                  {!importing && !importDone && (
                    <button
                      onClick={() => setStep(2)}
                      aria-label="Volver al paso 2"
                      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      Selección
                    </button>
                  )}
                </div>
                <CardDescription className="mt-1 ml-[3.25rem]">
                  Resumen de lo que se importará a GVM Corp
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Summary table */}
                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Tablas seleccionadas
                    </p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {[...selectedTables].map((key) => {
                      const meta = IMPORT_TABLES.find((t) => t.key === key)!
                      const Icon = meta.icon
                      const preview = previews.get(key)
                      const accent = ACCENT_CLASSES[meta.accent]
                      return (
                        <div key={key} className="flex items-center gap-4 px-5 py-4">
                          <div
                            className={cn(
                              'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                              accent.icon
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black uppercase tracking-wide text-slate-700">
                              {meta.label}
                            </p>
                            <p className="text-xs text-slate-400 font-medium">{meta.description}</p>
                          </div>
                          <div className="text-right">
                            {preview ? (
                              <p
                                className={cn(
                                  'text-lg font-black tabular-nums',
                                  accent.text
                                )}
                              >
                                {preview.count.toLocaleString('es-CO')}
                              </p>
                            ) : (
                              <p className="text-xs text-slate-400 font-bold">Sin previsualizar</p>
                            )}
                            {preview && (
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                registros
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Start button */}
                {!importing && !importDone && (
                  <Button
                    onClick={handleStartImport}
                    className="w-full h-16 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-amber-200 transition-all"
                  >
                    <Zap className="h-5 w-5 mr-3" />
                    Iniciar Importación
                  </Button>
                )}

                {/* Progress rows */}
                {results.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                      Progreso
                    </p>
                    {results.map((r) => (
                      <div
                        key={r.table}
                        className={cn(
                          'rounded-2xl border-2 px-5 py-4 transition-all',
                          r.status === 'done'
                            ? 'border-emerald-200 bg-emerald-50'
                            : r.status === 'running'
                              ? 'border-amber-200 bg-amber-50'
                              : r.status === 'error'
                                ? 'border-rose-200 bg-rose-50'
                                : 'border-slate-100 bg-slate-50'
                        )}
                      >
                        <div className="flex items-center gap-4">
                          {/* Status icon */}
                          <div className="shrink-0">
                            {r.status === 'pending' && (
                              <Square className="h-5 w-5 text-slate-300" />
                            )}
                            {r.status === 'running' && (
                              <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                            )}
                            {r.status === 'done' && (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            )}
                            {r.status === 'error' && (
                              <XCircle className="h-5 w-5 text-rose-500" />
                            )}
                          </div>

                          {/* Name & counts */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black uppercase tracking-wide text-slate-700">
                              {r.table}
                            </p>
                            {(r.status === 'done' || r.status === 'error') && (
                              <p className="text-xs font-bold text-slate-500 mt-0.5">
                                <span className="text-emerald-600">{r.imported.toLocaleString('es-CO')} importados</span>
                                {r.errors > 0 && (
                                  <span className="text-rose-500 ml-2">
                                    · {r.errors} error{r.errors > 1 ? 'es' : ''}
                                  </span>
                                )}
                              </p>
                            )}
                            {r.status === 'running' && (
                              <p className="text-xs font-bold text-amber-600 mt-0.5">Importando...</p>
                            )}
                            {r.status === 'pending' && (
                              <p className="text-xs font-bold text-slate-400 mt-0.5">En espera</p>
                            )}
                          </div>

                          {/* Progress badge */}
                          {r.status === 'done' && r.total > 0 && (
                            <div className="shrink-0 text-right">
                              <p className="text-xs font-black text-emerald-600 tabular-nums">
                                {r.imported}/{r.total}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Error details */}
                        {r.errorDetails && r.errorDetails.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-rose-200">
                            <p className="text-[9px] font-black uppercase tracking-widest text-rose-400 mb-2">
                              Detalle de errores
                            </p>
                            <ul className="space-y-1">
                              {r.errorDetails.slice(0, 5).map((detail, i) => (
                                <li
                                  key={i}
                                  className="text-[10px] text-rose-600 font-medium flex items-start gap-2"
                                >
                                  <span className="shrink-0 text-rose-300">·</span>
                                  {detail}
                                </li>
                              ))}
                              {r.errorDetails.length > 5 && (
                                <li className="text-[10px] text-rose-400 font-bold">
                                  + {r.errorDetails.length - 5} más
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Final summary */}
            {importDone && (
              <Card>
                <CardContent className="pt-8">
                  <div className="text-center mb-6">
                    <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                      Importación Completada
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                      Los datos han sido migrados a GVM Corp
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                      <p className="text-4xl font-black text-emerald-600 tabular-nums">
                        {totalImported.toLocaleString('es-CO')}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mt-1">
                        Importados
                      </p>
                    </div>
                    <div
                      className={cn(
                        'rounded-2xl p-6 text-center border',
                        totalErrors > 0
                          ? 'bg-rose-50 border-rose-200'
                          : 'bg-slate-50 border-slate-200'
                      )}
                    >
                      <p
                        className={cn(
                          'text-4xl font-black tabular-nums',
                          totalErrors > 0 ? 'text-rose-600' : 'text-slate-400'
                        )}
                      >
                        {totalErrors.toLocaleString('es-CO')}
                      </p>
                      <p
                        className={cn(
                          'text-[10px] font-black uppercase tracking-widest mt-1',
                          totalErrors > 0 ? 'text-rose-400' : 'text-slate-400'
                        )}
                      >
                        Errores
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleFullReset}
                      className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Nueva Importación
                    </Button>
                    <Link
                      href="/settings/import"
                      className="flex-1 h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Importador Manual
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
