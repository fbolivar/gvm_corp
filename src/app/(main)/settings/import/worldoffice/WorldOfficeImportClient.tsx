'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  Sparkles,
  Users,
  Scale,
  FileBarChart,
  Wallet,
  Package,
  Building2,
} from 'lucide-react'
import { PageHeader } from '@/shared/components/ui/page-header'
import { Button } from '@/shared/components/ui/button'
import { toast } from 'sonner'
import {
  previewWorldOfficePucAction,
  importWorldOfficePucAction,
  previewWorldOfficePartiesAction,
  importWorldOfficePartiesAction,
  previewWorldOfficeBalanceAction,
  importBalanceChunkAction,
  previewWorldOfficeReceivablesAction,
  importReceivablesChunkAction,
  previewWorldOfficeInventoryAction,
  importInventoryChunkAction,
  previewWorldOfficeFixedAssetsAction,
  importFixedAssetsChunkAction,
  type ReceivableRow,
  type InventoryRow,
  type FixedAssetRow,
} from '@/features/import/worldofficeActions'

type Tab = 'puc' | 'parties' | 'balance' | 'receivables' | 'inventory' | 'fixed_assets' | 'entries'

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; disabled?: boolean }[] = [
  { key: 'puc', label: 'Plan de cuentas', icon: BookOpen },
  { key: 'parties', label: 'Terceros', icon: Users },
  { key: 'balance', label: 'Saldos iniciales', icon: Scale },
  { key: 'receivables', label: 'Cartera detalle', icon: Wallet },
  { key: 'inventory', label: 'Inventario', icon: Package },
  { key: 'fixed_assets', label: 'Activos fijos', icon: Building2 },
  { key: 'entries', label: 'Asientos contables', icon: FileBarChart, disabled: true },
]

const CLASS_LABELS: Record<string, string> = {
  '1': 'Activos',
  '2': 'Pasivos',
  '3': 'Patrimonio',
  '4': 'Ingresos',
  '5': 'Gastos',
  '6': 'Costos de venta',
  '7': 'Costos de producción',
  '8': 'Cuentas orden deudoras',
  '9': 'Cuentas orden acreedoras',
}

interface PucRow {
  code: string
  name: string
  parent_code: string | null
  inac: boolean
  hidden: boolean
  requires_party: boolean
  group_label: string | null
  type: string | null
}

export function WorldOfficeImportClient() {
  const [activeTab, setActiveTab] = useState<Tab>('puc')

  return (
    <div className="page-container max-w-5xl">
      <PageHeader
        title="Importar desde WorldOffice"
        description="Migra los datos contables desde exports CSV de World Office 9."
        icon={Sparkles}
        breadcrumbs={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Importación', href: '/settings/import' },
          { label: 'WorldOffice' },
        ]}
        actions={
          <Button asChild variant="outline">
            <Link href="/settings/import">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Atrás
            </Link>
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon
          const isActive = activeTab === t.key
          return (
            <button
              key={t.key}
              type="button"
              disabled={t.disabled}
              onClick={() => !t.disabled && setActiveTab(t.key)}
              className={[
                'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap',
                isActive
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-900',
                t.disabled && 'opacity-40 cursor-not-allowed',
              ].join(' ')}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {t.disabled && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Próximamente</span>}
            </button>
          )
        })}
      </div>

      {activeTab === 'puc' && <PucImporter />}
      {activeTab === 'parties' && <PartiesImporter />}
      {activeTab === 'balance' && <BalanceImporter />}
      {activeTab === 'receivables' && <ReceivablesImporter />}
      {activeTab === 'inventory' && <InventoryImporter />}
      {activeTab === 'fixed_assets' && <FixedAssetsImporter />}
    </div>
  )
}

function PucImporter() {
  const [csvContent, setCsvContent] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ total: number; sample: PucRow[]; summary: Record<string, number> } | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ processed: number; linked: number } | null>(null)

  const handleFile = async (file: File) => {
    setLoading(true)
    setPreview(null)
    setImportResult(null)
    try {
      const text = await file.text()
      setCsvContent(text)
      setFileName(file.name)

      const res = await previewWorldOfficePucAction(text)
      if (!res.success) {
        toast.error(res.error)
        setCsvContent(null)
        setFileName(null)
        return
      }
      setPreview({ total: res.total, sample: res.sample, summary: res.summary })
      toast.success(`Detectadas ${res.total} cuentas`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error leyendo archivo')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!csvContent) return
    if (!confirm(`¿Importar ${preview?.total ?? 0} cuentas al plan de cuentas? Esto actualiza si existen y agrega las nuevas.`)) return
    setImporting(true)
    try {
      const res = await importWorldOfficePucAction(csvContent)
      if (!res.success) {
        toast.error(res.error || 'Error en importación')
        return
      }
      toast.success(`${res.processed} cuentas procesadas · ${res.linked_parents} jerarquías vinculadas`)
      setImportResult({
        processed: res.processed ?? 0,
        linked: res.linked_parents ?? 0,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setImporting(false)
    }
  }

  const reset = () => {
    setCsvContent(null)
    setFileName(null)
    setPreview(null)
    setImportResult(null)
  }

  // Paso 3: éxito
  if (importResult) {
    return (
      <div className="surface-card p-8 text-center">
        <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-4">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="text-h2 mb-1">Plan de cuentas importado</h2>
        <p className="text-sm text-slate-500 mb-4">
          Se procesaron <strong>{importResult.processed}</strong> cuentas y se vincularon
          {' '}<strong>{importResult.linked}</strong> relaciones padre-hijo.
        </p>
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" onClick={reset}>
            Importar otro archivo
          </Button>
          <Button asChild>
            <Link href="/accounting/accounts">
              Ver plan de cuentas
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Paso 1/2: upload + preview
  return (
    <div className="space-y-6">
      {/* Instrucciones */}
      <div className="surface-card p-5 bg-sky-50/60 border-sky-200">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-sky-700 shrink-0 mt-0.5" />
          <div className="text-sm text-sky-900 space-y-1">
            <p className="font-semibold">Cómo exportar el PUC desde WorldOffice 9</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs text-sky-800">
              <li>Menú principal → <strong>Informes</strong> → <strong>Cuentas Contables</strong></li>
              <li>Selecciona <strong>Ver todo</strong> y marca <strong>&quot;Al exportar mostrar en todos los registros los valores de las agrupaciones&quot;</strong></li>
              <li>Clic en <strong>Exportar a Excel</strong> y guarda el archivo</li>
              <li>Abre el Excel y guárdalo como <strong>CSV (delimitado por ;)</strong> o cárgalo directo aquí</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Upload */}
      {!preview && (
        <div className="surface-card p-8">
          <label
            htmlFor="puc-file"
            className="block border-2 border-dashed border-slate-200 rounded-xl p-10 text-center hover:border-slate-400 transition-colors cursor-pointer"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Procesando archivo...</span>
              </div>
            ) : (
              <>
                <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-5 w-5 text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-900 mb-1">
                  Arrastra el archivo o haz clic para seleccionar
                </p>
                <p className="text-xs text-slate-500">
                  Acepta .csv y .txt (delimitados por ; — formato World Office)
                </p>
              </>
            )}
            <input
              id="puc-file"
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
          </label>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-4">
          <div className="surface-card p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="h-4 w-4 text-slate-700" />
                  <span className="text-sm font-semibold text-slate-900">{fileName}</span>
                </div>
                <p className="text-xs text-slate-500">
                  <strong className="tabular-nums">{preview.total}</strong> cuentas detectadas
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={reset}>
                Cambiar archivo
              </Button>
            </div>

            {/* Resumen por clase */}
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Distribución por clase</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {Object.entries(preview.summary)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([cls, count]) => (
                    <div key={cls} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                      <p className="text-[11px] text-slate-500 truncate">
                        <span className="font-mono font-semibold text-slate-700">{cls}</span>
                        {' · '}{CLASS_LABELS[cls] || 'Otros'}
                      </p>
                      <p className="text-base font-bold text-slate-900 tabular-nums">{count}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Sample preview */}
          <div className="surface-card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-h3">Vista previa (primeras {preview.sample.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-left">
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">Código</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">Nombre</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">Padre</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">Grupo</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide text-center">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.sample.map((r, i) => (
                    <tr key={`${r.code}-${i}`} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 text-xs font-mono text-slate-900">{r.code}</td>
                      <td className="px-3 py-2 text-xs text-slate-700">{r.name}</td>
                      <td className="px-3 py-2 text-xs font-mono text-slate-500">{r.parent_code || '—'}</td>
                      <td className="px-3 py-2 text-xs text-slate-600">{r.type || '—'}</td>
                      <td className="px-3 py-2 text-xs text-slate-600">{r.group_label || '—'}</td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {r.inac && <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">Inac</span>}
                          {r.hidden && <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600">Oculta</span>}
                          {r.requires_party && <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-sky-50 text-sky-700">Tercero</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Acción */}
          <div className="surface-card p-5 bg-amber-50/60 border-amber-200">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-1">Listo para importar</p>
                <p className="text-xs">
                  Se crearán o actualizarán <strong>{preview.total}</strong> cuentas en tu plan contable.
                  Si alguna cuenta ya existe (mismo código), se actualizarán sus datos con los de WorldOffice.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={reset} disabled={importing}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" /> Importar {preview.total} cuentas</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// TERCEROS — upsert no-destructivo sobre parties
// ============================================================

interface PartyRow {
  legal_name: string
  doc_type: string
  doc_number: string
  dv: string | null
  address: string | null
  phone: string | null
  city: string | null
}

const DOC_TYPE_LABEL: Record<string, string> = {
  NIT: 'NIT',
  CC: 'Cédula',
  CE: 'Cédula Extranjería',
  PP: 'Pasaporte',
  TI: 'Tarjeta Identidad',
  PEP: 'Permiso Esp. Permanencia',
}

function fmtMoney(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function PartiesImporter() {
  const [csvContent, setCsvContent] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    total: number
    sample: PartyRow[]
    summary: Record<string, number>
    already_exist: number
    new_ones: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number; skipped: number } | null>(null)

  const handleFile = async (file: File) => {
    setLoading(true)
    setPreview(null)
    setImportResult(null)
    try {
      const text = await file.text()
      setCsvContent(text)
      setFileName(file.name)

      const res = await previewWorldOfficePartiesAction(text)
      if (!res.success) {
        toast.error(res.error)
        setCsvContent(null)
        setFileName(null)
        return
      }
      setPreview({
        total: res.total,
        sample: res.sample,
        summary: res.summary,
        already_exist: res.already_exist,
        new_ones: res.new_ones,
      })
      toast.success(`Detectados ${res.total} terceros · ${res.already_exist} ya existen, ${res.new_ones} nuevos`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error leyendo archivo')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!csvContent || !preview) return
    if (!confirm(`¿Importar ${preview.total} terceros?\n\n· ${preview.new_ones} serán creados\n· ${preview.already_exist} serán enriquecidos (no destructivo)\n\nLos terceros existentes mantendrán su info actual y solo se completarán campos vacíos con datos de WorldOffice.`)) return
    setImporting(true)
    try {
      const res = await importWorldOfficePartiesAction(csvContent)
      if (!res.success) {
        toast.error(res.error || 'Error en importación')
        return
      }
      toast.success(`${res.inserted} creados · ${res.updated} actualizados`)
      setImportResult({
        inserted: res.inserted,
        updated: res.updated,
        skipped: res.skipped,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setImporting(false)
    }
  }

  const reset = () => {
    setCsvContent(null)
    setFileName(null)
    setPreview(null)
    setImportResult(null)
  }

  if (importResult) {
    return (
      <div className="surface-card p-8 text-center">
        <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-4">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="text-h2 mb-1">Terceros importados</h2>
        <p className="text-sm text-slate-500 mb-4">
          <strong>{importResult.inserted}</strong> creados ·{' '}
          <strong>{importResult.updated}</strong> actualizados
          {importResult.skipped > 0 && <> · {importResult.skipped} omitidos</>}
        </p>
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" onClick={reset}>Importar otro archivo</Button>
          <Button asChild>
            <Link href="/parties">Ver terceros</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="surface-card p-5 bg-sky-50/60 border-sky-200">
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-sky-700 shrink-0 mt-0.5" />
          <div className="text-sm text-sky-900 space-y-1">
            <p className="font-semibold">Cómo exportar el listado de terceros desde WorldOffice 9</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs text-sky-800">
              <li>Menú principal → <strong>Informes</strong> → <strong>Terceros</strong></li>
              <li>En <strong>Ver solo con la propiedad</strong>: clic en <strong>Marcar Todo</strong> (12 tipos)</li>
              <li><strong>Opciones del Informe</strong>: selecciona <strong>Lista de Terceros con direcciones</strong></li>
              <li><strong>Estado</strong>: selecciona <strong>Todos</strong> (activos + inactivos)</li>
              <li>Marca el checkbox <strong>&quot;Al exportar mostrar en todos los registros los valores de las agrupaciones&quot;</strong></li>
              <li>Clic en <strong>Exportar a Excel</strong> y guarda como CSV delimitado por <code>;</code></li>
            </ol>
            <p className="text-xs mt-1 italic">⚠️ Estrategia no destructiva: los terceros ya existentes NO se sobreescriben — solo se completan sus campos vacíos con datos de WO.</p>
          </div>
        </div>
      </div>

      {!preview && (
        <div className="surface-card p-8">
          <label
            htmlFor="parties-file"
            className="block border-2 border-dashed border-slate-200 rounded-xl p-10 text-center hover:border-slate-400 transition-colors cursor-pointer"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Procesando archivo...</span>
              </div>
            ) : (
              <>
                <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-5 w-5 text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-900 mb-1">
                  Arrastra el archivo o haz clic para seleccionar
                </p>
                <p className="text-xs text-slate-500">
                  Acepta .csv y .txt delimitados por <code>;</code>
                </p>
              </>
            )}
            <input
              id="parties-file"
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
          </label>
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="surface-card p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="h-4 w-4 text-slate-700" />
                  <span className="text-sm font-semibold text-slate-900">{fileName}</span>
                </div>
                <p className="text-xs text-slate-500">
                  <strong className="tabular-nums">{preview.total}</strong> terceros detectados
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={reset}>
                Cambiar archivo
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                <p className="text-[11px] text-emerald-700">Nuevos</p>
                <p className="text-base font-bold text-emerald-900 tabular-nums">{preview.new_ones}</p>
              </div>
              <div className="bg-sky-50 border border-sky-100 rounded-lg px-3 py-2">
                <p className="text-[11px] text-sky-700">Ya existen</p>
                <p className="text-base font-bold text-sky-900 tabular-nums">{preview.already_exist}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 md:col-span-2">
                <p className="text-[11px] text-slate-500 mb-1">Por tipo de documento</p>
                <p className="text-xs text-slate-700 flex flex-wrap gap-x-2">
                  {Object.entries(preview.summary).map(([k, v]) => (
                    <span key={k}>
                      <strong>{DOC_TYPE_LABEL[k] || k}:</strong> {v}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </div>

          <div className="surface-card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-h3">Vista previa ({preview.sample.length} de {preview.total})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-left">
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">Nombre</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">Doc</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">Número</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">Ciudad</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">Teléfono</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.sample.map((r, i) => (
                    <tr key={`${r.doc_number}-${i}`} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 text-xs text-slate-900 font-medium truncate max-w-[280px]">{r.legal_name}</td>
                      <td className="px-3 py-2 text-xs text-slate-700">{DOC_TYPE_LABEL[r.doc_type] || r.doc_type}</td>
                      <td className="px-3 py-2 text-xs font-mono text-slate-700">
                        {r.doc_number}{r.dv && <span className="text-slate-400">-{r.dv}</span>}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-600">{r.city || '—'}</td>
                      <td className="px-3 py-2 text-xs text-slate-600 font-mono">{r.phone || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="surface-card p-5 bg-amber-50/60 border-amber-200">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-1">Listo para importar</p>
                <p className="text-xs">
                  Se crearán <strong>{preview.new_ones}</strong> terceros nuevos y se enriquecerán
                  {' '}<strong>{preview.already_exist}</strong> existentes (solo campos vacíos). Los datos
                  actuales no se sobreescriben.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={reset} disabled={importing}>
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando...</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" /> Importar {preview.total} terceros</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// SALDOS INICIALES — Balance de Prueba
// ============================================================

interface BalanceRow {
  account_code: string
  account_name: string | null
  party_doc_number: string
  party_name: string
  party_doc_type: string | null
  saldo_inicial: number
  debitos: number
  creditos: number
  saldo_final: number
}

interface BalanceMeta {
  cutoff_date: string | null
  period_start: string | null
  period_end: string | null
  company_name: string | null
}

function BalanceImporter() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    meta: BalanceMeta
    total: number
    sample: BalanceRow[]
    rows: BalanceRow[]
    accounts_count: number
    parties_count: number
    total_debits: number
    total_credits: number
    accounts_matched: number
    parties_matched: number
    diagnostics: { skipped_no_context: number; skipped_bad_format: number; samples: string[] }
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null)
  const [cutoffOverride, setCutoffOverride] = useState<string>('')
  const [importResult, setImportResult] = useState<{ processed: number; difference: number } | null>(null)

  const handleFile = async (file: File) => {
    setLoading(true)
    setPreview(null)
    setImportResult(null)
    try {
      const text = await file.text()
      setFileName(file.name)

      const res = await previewWorldOfficeBalanceAction(text)
      if (!res.success) {
        toast.error(res.error)
        setFileName(null)
        return
      }
      setPreview(res)
      if (res.meta.cutoff_date) setCutoffOverride(res.meta.cutoff_date)
      toast.success(`${res.total} movimientos · ${res.accounts_count} cuentas · ${res.parties_count} terceros`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!preview || !preview.rows) return
    const diff = preview.total_debits - preview.total_credits
    const diffMsg = Math.abs(diff) > 1
      ? `\n\n⚠️ Advertencia: débitos - créditos = ${fmtMoney(diff)} (debería ser cercano a 0).`
      : ''
    if (!confirm(`¿Importar saldos iniciales al corte ${cutoffOverride}?\n\n· ${preview.total} movimientos\n· ${preview.accounts_count} cuentas\n· ${preview.parties_count} terceros${diffMsg}`)) return

    setImporting(true)
    setImportProgress({ done: 0, total: preview.rows.length })
    const periodStart = preview.meta.period_start || cutoffOverride
    const periodEnd = preview.meta.period_end || cutoffOverride
    const CHUNK = 500
    let processed = 0
    let totalDebits = 0
    let totalCredits = 0

    try {
      for (let i = 0; i < preview.rows.length; i += CHUNK) {
        const chunk = preview.rows.slice(i, i + CHUNK)
        const res = await importBalanceChunkAction(chunk, cutoffOverride, periodStart, periodEnd)
        if (!res.success) {
          toast.error(`Lote ${Math.floor(i / CHUNK) + 1}: ${res.error}`)
          setImportProgress(null)
          return
        }
        processed += res.processed
        totalDebits += res.total_debits
        totalCredits += res.total_credits
        setImportProgress({ done: i + chunk.length, total: preview.rows.length })
      }
      toast.success(`${processed} saldos importados`)
      setImportResult({ processed, difference: totalDebits - totalCredits })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setImporting(false)
      setImportProgress(null)
    }
  }

  const reset = () => {
    setFileName(null)
    setPreview(null)
    setImportResult(null)
    setCutoffOverride('')
  }

  if (importResult) {
    return (
      <div className="surface-card p-8 text-center">
        <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-4">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="text-h2 mb-1">Saldos iniciales importados</h2>
        <p className="text-sm text-slate-500 mb-1">
          <strong>{importResult.processed}</strong> movimientos al corte <strong>{cutoffOverride}</strong>
        </p>
        {Math.abs(importResult.difference) > 1 && (
          <p className="text-xs text-amber-700 mb-4">
            Diferencia débitos-créditos: {fmtMoney(importResult.difference)}
          </p>
        )}
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" onClick={reset}>Importar otro</Button>
          <Button asChild>
            <Link href="/accounting/reports/trial-balance">Ver balance</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="surface-card p-5 bg-sky-50/60 border-sky-200">
        <div className="flex items-start gap-3">
          <Scale className="h-5 w-5 text-sky-700 shrink-0 mt-0.5" />
          <div className="text-sm text-sky-900 space-y-1">
            <p className="font-semibold">Cómo exportar el Balance de Prueba desde WorldOffice 9</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs text-sky-800">
              <li>Menú principal → <strong>Informes</strong> → <strong>Contabilidad Financieros</strong> → <strong>Balance de Prueba</strong></li>
              <li><strong>Fechas</strong>: Inicial 1/Enero/2026 · Final 31/Marzo/2026 (o último cierre)</li>
              <li><strong>Cuentas</strong>: Desde 1 Hasta 96 · <strong>Nivel</strong>: 5 (auxiliar)</li>
              <li>☑ <strong>Detallar Terceros</strong> · ☑ <strong>Mostrar Nits</strong></li>
              <li>Clic en <strong>Exportar a Excel</strong>, guarda como CSV delimitado por <code>;</code></li>
            </ol>
          </div>
        </div>
      </div>

      {!preview && (
        <div className="surface-card p-8">
          <label
            htmlFor="balance-file"
            className="block border-2 border-dashed border-slate-200 rounded-xl p-10 text-center hover:border-slate-400 transition-colors cursor-pointer"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-slate-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Analizando balance... (puede tardar)</span>
              </div>
            ) : (
              <>
                <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-5 w-5 text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-900 mb-1">
                  Sube el Balance de Prueba exportado desde WO
                </p>
                <p className="text-xs text-slate-500">
                  Acepta .csv y .txt delimitados por <code>;</code>
                </p>
              </>
            )}
            <input
              id="balance-file"
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
          </label>
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="surface-card p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileSpreadsheet className="h-4 w-4 text-slate-700" />
                  <span className="text-sm font-semibold text-slate-900">{fileName}</span>
                </div>
                {preview.meta.period_start && preview.meta.period_end && (
                  <p className="text-xs text-slate-500">
                    Período: <strong>{preview.meta.period_start}</strong> → <strong>{preview.meta.period_end}</strong>
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={reset}>Cambiar archivo</Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                <p className="text-[11px] text-slate-500">Movimientos</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">{preview.total.toLocaleString('es-CO')}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                <p className="text-[11px] text-slate-500">Cuentas</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {preview.accounts_count}
                  <span className="text-xs text-emerald-600 ml-1">({preview.accounts_matched} ✓)</span>
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                <p className="text-[11px] text-slate-500">Terceros</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {preview.parties_count}
                  <span className="text-xs text-emerald-600 ml-1">({preview.parties_matched} ✓)</span>
                </p>
              </div>
              <div className={`border rounded-lg px-3 py-2 ${Math.abs(preview.total_debits - preview.total_credits) < 1 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-200'}`}>
                <p className="text-[11px] text-slate-600">Control DB-CR</p>
                <p className="text-sm font-bold text-slate-900 tabular-nums truncate">
                  {fmtMoney(preview.total_debits - preview.total_credits)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>Débitos: <strong className="text-slate-900">{fmtMoney(preview.total_debits)}</strong></div>
              <div>Créditos: <strong className="text-slate-900">{fmtMoney(preview.total_credits)}</strong></div>
            </div>
          </div>

          <div className="surface-card p-5">
            <label htmlFor="cutoff" className="block text-xs font-medium text-slate-700 mb-1.5">
              Fecha de corte (snapshot contable)
            </label>
            <input
              id="cutoff"
              type="date"
              value={cutoffOverride}
              onChange={e => setCutoffOverride(e.target.value)}
              className="h-10 border border-slate-200 rounded-lg px-3 text-sm focus:border-slate-400 focus:outline-none"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Desde esta fecha, todas las transacciones nuevas se registran solo en GVM Corp.
            </p>
          </div>

          <div className="surface-card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="text-h3">Vista previa ({preview.sample.length} de {preview.total})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-left">
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">Cuenta</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">Tercero</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide text-right">Saldo inicial</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide text-right">Débito</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide text-right">Crédito</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wide text-right">Saldo final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.sample.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 text-xs font-mono text-slate-700">{r.account_code}</td>
                      <td className="px-3 py-2 text-xs text-slate-900 truncate max-w-[220px]">
                        {r.party_name}
                        <span className="text-slate-400 ml-1 font-mono">{r.party_doc_number}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums">{fmtMoney(r.saldo_inicial)}</td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums text-emerald-700">{r.debitos > 0 ? fmtMoney(r.debitos) : '—'}</td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums text-rose-700">{r.creditos > 0 ? fmtMoney(r.creditos) : '—'}</td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums font-semibold">{fmtMoney(r.saldo_final)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {(preview.diagnostics.skipped_no_context > 0 || preview.diagnostics.skipped_bad_format > 0) && (
            <div className="surface-card p-5 bg-rose-50/60 border-rose-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
                <div className="text-sm text-rose-900 flex-1">
                  <p className="font-semibold mb-1">Diagnóstico — líneas ignoradas</p>
                  <p className="text-xs mb-3">
                    Sin contexto de cuenta: <strong>{preview.diagnostics.skipped_no_context}</strong> · Formato no reconocido: <strong>{preview.diagnostics.skipped_bad_format}</strong>
                  </p>
                  {preview.diagnostics.samples.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium mb-2">Ver muestras ({preview.diagnostics.samples.length})</summary>
                      <pre className="bg-white border border-rose-100 rounded p-2 overflow-x-auto text-[10px] leading-relaxed font-mono max-h-[320px] overflow-y-auto">
                        {preview.diagnostics.samples.join('\n')}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="surface-card p-5 bg-amber-50/60 border-amber-200">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-1">Listo para importar</p>
                <p className="text-xs">
                  Se registrarán {preview.total} movimientos al corte{' '}
                  <strong>{cutoffOverride || '(define la fecha)'}</strong>. Si ya hay un corte en esa fecha, se actualizará.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={reset} disabled={importing}>Cancelar</Button>
              <Button onClick={handleImport} disabled={importing || !cutoffOverride}>
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {importProgress
                      ? `Importando ${importProgress.done.toLocaleString()}/${importProgress.total.toLocaleString()}...`
                      : 'Importando...'}
                  </>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" /> Importar {preview.total} saldos</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// CARTERA — Edades de Cartera por Cobrar (WO)
// ============================================================

function ReceivablesImporter() {
  const [carteraType, setCarteraType] = useState<'INVOICE' | 'VENDOR_BILL'>('INVOICE')
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    meta: { cutoff_date: string | null; company_name: string | null }
    total: number
    sample: ReceivableRow[]
    rows: ReceivableRow[]
    parties_count: number
    parties_matched: number
    total_balance: number
    buckets: { bucket: string; count: number; total: number }[]
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [importResult, setImportResult] = useState<{ processed: number; unmatched: number; total_balance: number } | null>(null)

  const handleFile = async (file: File) => {
    setLoading(true)
    setPreview(null)
    setImportResult(null)
    try {
      const text = await file.text()
      setFileName(file.name)
      const res = await previewWorldOfficeReceivablesAction(text)
      if (!res.success) {
        toast.error(res.error)
        setFileName(null)
        return
      }
      setPreview(res)
      toast.success(`${res.total} facturas · ${res.parties_count} clientes · ${res.parties_matched} matched`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!preview?.rows) return
    if (!confirm(`¿Importar ${preview.total} facturas pendientes (saldo $${preview.total_balance.toLocaleString('es-CO')})?`)) return

    setImporting(true)
    setProgress({ done: 0, total: preview.rows.length })
    const CHUNK = 300
    let processed = 0
    let unmatched = 0
    let totalBalance = 0
    try {
      for (let i = 0; i < preview.rows.length; i += CHUNK) {
        const chunk = preview.rows.slice(i, i + CHUNK)
        const res = await importReceivablesChunkAction(chunk, carteraType)
        if (!res.success) {
          toast.error(`Lote ${Math.floor(i / CHUNK) + 1}: ${res.error}`)
          setProgress(null)
          return
        }
        processed += res.processed
        unmatched += res.unmatched_party
        totalBalance += res.total_balance
        setProgress({ done: i + chunk.length, total: preview.rows.length })
      }
      toast.success(`${processed} facturas importadas`)
      setImportResult({ processed, unmatched, total_balance: totalBalance })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setImporting(false)
      setProgress(null)
    }
  }

  const reset = () => {
    setFileName(null)
    setPreview(null)
    setImportResult(null)
  }

  if (importResult) {
    return (
      <div className="surface-card p-8 text-center">
        <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-4">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="text-h2 mb-1">Cartera importada</h2>
        <p className="text-sm text-slate-500 mb-1">
          <strong>{importResult.processed}</strong> facturas · saldo total <strong>{fmtMoney(importResult.total_balance)}</strong>
        </p>
        {importResult.unmatched > 0 && (
          <p className="text-xs text-amber-700 mb-4">
            ⚠️ {importResult.unmatched} facturas sin tercero matched (party_id NULL)
          </p>
        )}
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" onClick={reset}>Importar otro</Button>
          <Button asChild>
            <Link href="/treasury/cartera">Ver cartera</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toggle Cobrar / Pagar */}
      <div className="surface-card p-4">
        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">Tipo de cartera</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setCarteraType('INVOICE'); reset() }}
            disabled={importing || loading}
            className={`px-4 py-3 rounded-lg border text-sm font-medium transition ${
              carteraType === 'INVOICE'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            📥 Por Cobrar (Clientes)
          </button>
          <button
            type="button"
            onClick={() => { setCarteraType('VENDOR_BILL'); reset() }}
            disabled={importing || loading}
            className={`px-4 py-3 rounded-lg border text-sm font-medium transition ${
              carteraType === 'VENDOR_BILL'
                ? 'bg-rose-50 border-rose-200 text-rose-900 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            📤 Por Pagar (Proveedores)
          </button>
        </div>
      </div>

      <div className="surface-card p-5 bg-sky-50/60 border-sky-200">
        <div className="flex items-start gap-3">
          <Wallet className="h-5 w-5 text-sky-700 shrink-0 mt-0.5" />
          <div className="text-sm text-sky-900 space-y-1">
            <p className="font-semibold">Cómo exportar Edades de Cartera desde WorldOffice 9</p>
            <p className="text-xs">1. Tesorería → <strong>Cartera Morosa a 5 Columnas</strong> (o Edades de Cartera)</p>
            <p className="text-xs">2. <strong>Fecha de Corte</strong>: 31/03/2026 · <strong>Marcar Todo</strong> Vendedor y Cuenta Contable</p>
            <p className="text-xs">3. Intervalos: 0-30, 31-60, 61-90, 91-120, +121 · Tipo Informe: <strong>{carteraType === 'INVOICE' ? 'Cliente' : 'Proveedor'}</strong></p>
            <p className="text-xs">4. Cuentas: <strong>{carteraType === 'INVOICE' ? '13 DEUDORES' : '22 PROVEEDORES o 23 CXP'}</strong></p>
            <p className="text-xs">5. <strong>Ordenado por</strong>: Tercero · Click <strong>Exportar a Excel</strong></p>
          </div>
        </div>
      </div>

      {!preview && (
        <div className="surface-card p-8 text-center">
          <input
            type="file"
            accept=".csv,.txt"
            id="receivables-upload"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            disabled={loading}
          />
          <label htmlFor="receivables-upload" className="cursor-pointer inline-flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
            </div>
            <span className="text-sm font-medium">{loading ? 'Procesando...' : 'Subir CSV de Edades de Cartera'}</span>
            <span className="text-xs text-slate-500">{fileName || 'cartera-clientes-wo.csv'}</span>
          </label>
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="surface-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-slate-600" />
                  {fileName}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Corte: <strong>{preview.meta.cutoff_date || '—'}</strong></p>
              </div>
              <Button variant="outline" size="sm" onClick={reset}>Cambiar archivo</Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                <p className="text-[11px] text-slate-500">Facturas</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">{preview.total.toLocaleString('es-CO')}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                <p className="text-[11px] text-slate-500">Clientes</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {preview.parties_count}
                  <span className="text-xs text-emerald-600 ml-1">({preview.parties_matched} ✓)</span>
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 col-span-2">
                <p className="text-[11px] text-slate-600">Saldo total</p>
                <p className="text-lg font-bold text-emerald-700 tabular-nums">{fmtMoney(preview.total_balance)}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-5 gap-2 text-[10px]">
              {preview.buckets.map(b => (
                <div key={b.bucket} className="bg-slate-50 rounded-md px-2 py-1.5">
                  <p className="text-slate-500">{b.bucket}</p>
                  <p className="font-bold text-slate-900">{b.count}</p>
                  <p className="text-slate-600 tabular-nums">{fmtMoney(b.total)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="text-h3">Vista previa ({preview.sample.length} de {preview.total})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-left">
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase">Cliente</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase">Doc</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase">Vence</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase text-right">Saldo</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase text-right">Días</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.sample.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 text-xs text-slate-900 truncate max-w-[280px]">{r.party_name}</td>
                      <td className="px-3 py-2 text-xs font-mono text-slate-700">{r.doc_code}-{r.number}</td>
                      <td className="px-3 py-2 text-xs text-slate-600">{r.due_date}</td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums font-semibold">{fmtMoney(r.total)}</td>
                      <td className={`px-3 py-2 text-xs text-right tabular-nums ${r.days_overdue > 30 ? 'text-rose-700 font-semibold' : 'text-slate-600'}`}>{r.days_overdue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="surface-card p-5 bg-amber-50/60 border-amber-200">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-1">Listo para importar</p>
                <p className="text-xs">
                  Se crearán {preview.total} documentos en estado ACCEPTED. Si ya existe el número, se actualizará el saldo.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={reset} disabled={importing}>Cancelar</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {progress ? `Importando ${progress.done.toLocaleString()}/${progress.total.toLocaleString()}...` : 'Importando...'}
                  </>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" /> Importar {preview.total} {carteraType === 'INVOICE' ? 'facturas' : 'cuentas por pagar'}</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// INVENTARIO — Existencias por Bodega (WO)
// ============================================================

function InventoryImporter() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    meta: { cutoff_date: string | null; company_name: string | null }
    total: number
    sample: InventoryRow[]
    rows: InventoryRow[]
    bodegas_count: number
    bodegas: { name: string; products: number; value: number; matched: boolean }[]
    products_count: number
    products_matched: number
    total_qty: number
    total_value: number
    skipped_counts: { totals: number; contabilizaciones: number; activos_fijos: number; no_sku: number }
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [importResult, setImportResult] = useState<{ processed: number; new_products: number; new_warehouses: number; total_value: number } | null>(null)

  const handleFile = async (file: File) => {
    setLoading(true); setPreview(null); setImportResult(null)
    try {
      const text = await file.text()
      setFileName(file.name)
      const res = await previewWorldOfficeInventoryAction(text)
      if (!res.success) {
        toast.error(res.error); setFileName(null); return
      }
      setPreview(res)
      toast.success(`${res.total} líneas · ${res.bodegas_count} bodegas · ${res.products_matched}/${res.products_count} productos matched`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally { setLoading(false) }
  }

  const handleImport = async () => {
    if (!preview?.rows) return
    if (!confirm(`¿Importar inventario de ${preview.bodegas_count} bodegas (${preview.total} líneas, $${preview.total_value.toLocaleString('es-CO')})?\n\nEsto reemplazará el stock existente para los productos y bodegas listados.`)) return

    setImporting(true)
    setProgress({ done: 0, total: preview.rows.length })
    const CHUNK = 300
    let processed = 0, newProducts = 0, newWarehouses = 0, totalValue = 0
    try {
      for (let i = 0; i < preview.rows.length; i += CHUNK) {
        const chunk = preview.rows.slice(i, i + CHUNK)
        const res = await importInventoryChunkAction(chunk)
        if (!res.success) {
          toast.error(`Lote ${Math.floor(i / CHUNK) + 1}: ${res.error}`)
          setProgress(null); return
        }
        processed += res.processed
        newProducts += res.new_products
        newWarehouses += res.new_warehouses
        totalValue += res.total_value
        setProgress({ done: i + chunk.length, total: preview.rows.length })
      }
      toast.success(`${processed} líneas de stock importadas`)
      setImportResult({ processed, new_products: newProducts, new_warehouses: newWarehouses, total_value: totalValue })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setImporting(false); setProgress(null)
    }
  }

  const reset = () => { setFileName(null); setPreview(null); setImportResult(null) }

  if (importResult) {
    return (
      <div className="surface-card p-8 text-center">
        <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-4">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="text-h2 mb-1">Inventario importado</h2>
        <p className="text-sm text-slate-500 mb-1">
          <strong>{importResult.processed.toLocaleString('es-CO')}</strong> líneas · valor total <strong>{fmtMoney(importResult.total_value)}</strong>
        </p>
        {(importResult.new_products > 0 || importResult.new_warehouses > 0) && (
          <p className="text-xs text-slate-600 mb-4">
            {importResult.new_products} productos nuevos · {importResult.new_warehouses} bodegas nuevas
          </p>
        )}
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" onClick={reset}>Importar otro</Button>
          <Button asChild><Link href="/inventory">Ver inventario</Link></Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="surface-card p-5 bg-sky-50/60 border-sky-200">
        <div className="flex items-start gap-3">
          <Package className="h-5 w-5 text-sky-700 shrink-0 mt-0.5" />
          <div className="text-sm text-sky-900 space-y-1">
            <p className="font-semibold">Cómo exportar Existencias por Bodega desde WorldOffice 9</p>
            <p className="text-xs">1. Inventarios → <strong>Inventarios Por Bodega</strong></p>
            <p className="text-xs">2. <strong>Estilo</strong>: Ver saldo positivo Mayor a 0 · <strong>Fecha</strong>: 31/03/2026</p>
            <p className="text-xs">3. <strong>Bodega</strong>: Marcar Todo · Excluir ACTIVOS FIJOS y CONTABILIZACIONES (ya está)</p>
            <p className="text-xs">4. <strong>Ordenado por</strong>: Código Producto · Click <strong>Exportar a Excel</strong></p>
          </div>
        </div>
      </div>

      {!preview && (
        <div className="surface-card p-8 text-center">
          <input
            type="file" accept=".csv,.txt" id="inventory-upload" className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} disabled={loading}
          />
          <label htmlFor="inventory-upload" className="cursor-pointer inline-flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
            </div>
            <span className="text-sm font-medium">{loading ? 'Procesando...' : 'Subir CSV de Existencias por Bodega'}</span>
            <span className="text-xs text-slate-500">{fileName || 'inventario-wo.csv'}</span>
          </label>
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="surface-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-slate-600" />
                  {fileName}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Corte: <strong>{preview.meta.cutoff_date || '—'}</strong></p>
              </div>
              <Button variant="outline" size="sm" onClick={reset}>Cambiar archivo</Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                <p className="text-[11px] text-slate-500">Líneas</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">{preview.total.toLocaleString('es-CO')}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                <p className="text-[11px] text-slate-500">Productos</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">
                  {preview.products_count.toLocaleString('es-CO')}
                  <span className="text-xs text-emerald-600 ml-1">({preview.products_matched} ✓)</span>
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                <p className="text-[11px] text-slate-500">Bodegas</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">{preview.bodegas_count}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                <p className="text-[11px] text-slate-600">Valor inventario</p>
                <p className="text-lg font-bold text-emerald-700 tabular-nums">{fmtMoney(preview.total_value)}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-700 mb-2">Bodegas en el archivo</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {preview.bodegas.map(b => (
                  <div key={b.name} className={`rounded-md px-2 py-1.5 text-[11px] border ${b.matched ? 'bg-emerald-50/40 border-emerald-100' : 'bg-amber-50/40 border-amber-100'}`}>
                    <p className="font-medium text-slate-900">{b.matched ? '✓' : '⚠'} {b.name}</p>
                    <p className="text-slate-600">{b.products} prods · {fmtMoney(b.value)}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Las bodegas con ⚠ no existen en BD; se crearán automáticamente.</p>
            </div>

            {(preview.skipped_counts.contabilizaciones + preview.skipped_counts.activos_fijos + preview.skipped_counts.no_sku) > 0 && (
              <div className="mt-3 text-[11px] text-slate-500">
                Filas omitidas: contabilizaciones={preview.skipped_counts.contabilizaciones} · activos fijos={preview.skipped_counts.activos_fijos} · sin SKU={preview.skipped_counts.no_sku}
              </div>
            )}
          </div>

          <div className="surface-card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="text-h3">Vista previa ({preview.sample.length} de {preview.total})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-left">
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase">Bodega</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase">SKU</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase">Producto</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase text-right">Cant.</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase text-right">Costo prom.</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.sample.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 text-xs text-slate-700">{r.bodega}</td>
                      <td className="px-3 py-2 text-xs font-mono text-slate-700">{r.sku}</td>
                      <td className="px-3 py-2 text-xs text-slate-900 truncate max-w-[280px]">{r.name}</td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums">{r.qty.toLocaleString('es-CO')}</td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums text-slate-600">{fmtMoney(r.avg_cost)}</td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums font-semibold">{fmtMoney(r.total_value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="surface-card p-5 bg-amber-50/60 border-amber-200">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-1">Listo para importar</p>
                <p className="text-xs">
                  Se reemplazará el stock existente para los productos y bodegas listados. Productos sin match se crearán nuevos.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={reset} disabled={importing}>Cancelar</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {progress ? `Importando ${progress.done.toLocaleString()}/${progress.total.toLocaleString()}...` : 'Importando...'}
                  </>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" /> Importar {preview.total} líneas</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const CATEGORY_LABELS: Record<string, string> = {
  LAND: 'Terrenos',
  BUILDING: 'Edificios',
  VEHICLE: 'Vehículos',
  EQUIPMENT: 'Maquinaria',
  FURNITURE: 'Muebles',
  COMPUTER: 'Computación',
  OTHER: 'Otros',
}

function FixedAssetsImporter() {
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    meta: { cutoff_date: string | null; company_name: string | null }
    total: number
    sample: FixedAssetRow[]
    rows: FixedAssetRow[]
    totals: { cost: number; depreciation: number; net: number }
    by_category: { category: string; count: number; cost: number }[]
    skipped: { no_code: number; no_cost: number }
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [importResult, setImportResult] = useState<{ processed: number; total_cost: number; total_depreciation: number } | null>(null)

  const handleFile = async (file: File) => {
    setLoading(true); setPreview(null); setImportResult(null)
    try {
      const text = await file.text()
      setFileName(file.name)
      const res = await previewWorldOfficeFixedAssetsAction(text)
      if (!res.success) {
        toast.error(res.error); setFileName(null); return
      }
      setPreview(res)
      toast.success(`${res.total} activos · ${fmtMoney(res.totals.cost)} costo histórico`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally { setLoading(false) }
  }

  const handleImport = async () => {
    if (!preview?.rows) return
    if (!confirm(`¿Importar ${preview.total} activos fijos (costo total ${fmtMoney(preview.totals.cost)})?\n\nEsto actualiza los existentes por código (ACTIF-XXX) y agrega los nuevos.`)) return

    setImporting(true)
    setProgress({ done: 0, total: preview.rows.length })
    const CHUNK = 100
    let processed = 0, totalCost = 0, totalDep = 0
    try {
      for (let i = 0; i < preview.rows.length; i += CHUNK) {
        const chunk = preview.rows.slice(i, i + CHUNK)
        const res = await importFixedAssetsChunkAction(chunk)
        if (!res.success) {
          toast.error(`Lote ${Math.floor(i / CHUNK) + 1}: ${res.error}`)
          setProgress(null); return
        }
        processed += res.processed
        totalCost += res.total_cost
        totalDep += res.total_depreciation
        setProgress({ done: i + chunk.length, total: preview.rows.length })
      }
      toast.success(`${processed} activos fijos importados`)
      setImportResult({ processed, total_cost: totalCost, total_depreciation: totalDep })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setImporting(false); setProgress(null)
    }
  }

  const reset = () => { setFileName(null); setPreview(null); setImportResult(null) }

  if (importResult) {
    return (
      <div className="surface-card p-8 text-center">
        <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto mb-4">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="text-h2 mb-1">Activos fijos importados</h2>
        <p className="text-sm text-slate-500 mb-1">
          <strong>{importResult.processed.toLocaleString('es-CO')}</strong> activos · costo <strong>{fmtMoney(importResult.total_cost)}</strong>
        </p>
        <p className="text-xs text-slate-500 mb-4">
          Depreciación acumulada: {fmtMoney(importResult.total_depreciation)} · Neto: {fmtMoney(importResult.total_cost - importResult.total_depreciation)}
        </p>
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button variant="outline" onClick={reset}>Importar otro</Button>
          <Button asChild><Link href="/accounting/fixed-assets">Ver activos fijos</Link></Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="surface-card p-5 bg-sky-50/60 border-sky-200">
        <div className="flex items-start gap-3">
          <Building2 className="h-5 w-5 text-sky-700 shrink-0 mt-0.5" />
          <div className="text-sm text-sky-900 space-y-1">
            <p className="font-semibold">Cómo exportar Activos Fijos desde WorldOffice 9</p>
            <p className="text-xs">1. Informes → <strong>Contabilidad Financieros</strong> → <strong>Libro Auxiliar</strong></p>
            <p className="text-xs">2. <strong>Cuentas</strong>: 1504 a 1599 · <strong>Fechas</strong>: 01/01 a 31/03/2026</p>
            <p className="text-xs">3. <strong>Tipo Informe</strong>: Por Activo Fijo · <strong>Exportar a Excel</strong></p>
          </div>
        </div>
      </div>

      {!preview && (
        <div className="surface-card p-8 text-center">
          <input
            type="file" accept=".csv,.txt" id="fixed-assets-upload" className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} disabled={loading}
          />
          <label htmlFor="fixed-assets-upload" className="cursor-pointer inline-flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
            </div>
            <span className="text-sm font-medium">{loading ? 'Procesando...' : 'Subir CSV de Libro Auxiliar (15xx)'}</span>
            <span className="text-xs text-slate-500">{fileName || 'activos-fijos-wo.csv'}</span>
          </label>
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="surface-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-slate-600" />
                  {fileName}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">Corte: <strong>{preview.meta.cutoff_date || '—'}</strong></p>
              </div>
              <Button variant="outline" size="sm" onClick={reset}>Cambiar archivo</Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                <p className="text-[11px] text-slate-500">Activos</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">{preview.total.toLocaleString('es-CO')}</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                <p className="text-[11px] text-slate-500">Costo histórico</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">{fmtMoney(preview.totals.cost)}</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <p className="text-[11px] text-amber-700">Dep. acumulada</p>
                <p className="text-lg font-bold text-amber-700 tabular-nums">{fmtMoney(preview.totals.depreciation)}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                <p className="text-[11px] text-slate-600">Valor neto</p>
                <p className="text-lg font-bold text-emerald-700 tabular-nums">{fmtMoney(preview.totals.net)}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-700 mb-2">Distribución por categoría</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {preview.by_category.map(c => (
                  <div key={c.category} className="bg-slate-50 border border-slate-100 rounded-md px-2 py-1.5 text-[11px]">
                    <p className="font-medium text-slate-900">{CATEGORY_LABELS[c.category] || c.category}</p>
                    <p className="text-slate-600">{c.count} activos · {fmtMoney(c.cost)}</p>
                  </div>
                ))}
              </div>
            </div>

            {(preview.skipped.no_code + preview.skipped.no_cost) > 0 && (
              <div className="mt-3 text-[11px] text-slate-500">
                Omitidos: sin código ACTIF={preview.skipped.no_code} · sin costo={preview.skipped.no_cost}
              </div>
            )}
          </div>

          <div className="surface-card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h3 className="text-h3">Vista previa ({preview.sample.length} de {preview.total})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-left">
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase">Código</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase">Activo</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase">Categoría</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase">Cuenta</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase text-right">Costo</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase text-right">Dep. acum.</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase text-right">Vida útil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.sample.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 text-xs font-mono text-slate-700">{r.code}</td>
                      <td className="px-3 py-2 text-xs text-slate-900 truncate max-w-[280px]">{r.name}</td>
                      <td className="px-3 py-2 text-xs text-slate-700">{CATEGORY_LABELS[r.category] || r.category}</td>
                      <td className="px-3 py-2 text-xs font-mono text-slate-500">{r.cost_account}</td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums">{fmtMoney(r.acquisition_cost)}</td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums text-amber-700">{fmtMoney(r.accumulated_depreciation)}</td>
                      <td className="px-3 py-2 text-xs text-right tabular-nums text-slate-600">{r.useful_life_years}a</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="surface-card p-5 bg-amber-50/60 border-amber-200">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold mb-1">Listo para importar</p>
                <p className="text-xs">
                  Cada activo se identifica por código (ACTIF-XXX). Si existe se actualiza; si no, se crea. La depreciación acumulada refleja el corte al 31/03/2026.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={reset} disabled={importing}>Cancelar</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {progress ? `Importando ${progress.done}/${progress.total}...` : 'Importando...'}
                  </>
                ) : (
                  <><CheckCircle2 className="h-4 w-4 mr-2" /> Importar {preview.total} activos</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
