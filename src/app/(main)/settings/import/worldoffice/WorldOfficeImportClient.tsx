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
  importWorldOfficeBalanceAction,
} from '@/features/import/worldofficeActions'

type Tab = 'puc' | 'parties' | 'balance' | 'entries'

const TABS: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; disabled?: boolean }[] = [
  { key: 'puc', label: 'Plan de cuentas', icon: BookOpen },
  { key: 'parties', label: 'Terceros', icon: Users },
  { key: 'balance', label: 'Saldos iniciales', icon: Scale },
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
            <p className="text-xs mt-1 italic">⚠️ Estrategia no destructiva: los terceros ya migrados de Dolibarr NO se sobreescriben — solo se completan sus campos vacíos con datos de WO.</p>
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
  const [csvContent, setCsvContent] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    meta: BalanceMeta
    total: number
    sample: BalanceRow[]
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
  const [cutoffOverride, setCutoffOverride] = useState<string>('')
  const [importResult, setImportResult] = useState<{ processed: number; difference: number } | null>(null)

  const handleFile = async (file: File) => {
    setLoading(true)
    setPreview(null)
    setImportResult(null)
    try {
      const text = await file.text()
      setCsvContent(text)
      setFileName(file.name)

      const res = await previewWorldOfficeBalanceAction(text)
      if (!res.success) {
        toast.error(res.error)
        setCsvContent(null)
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
    if (!csvContent || !preview) return
    const diff = preview.total_debits - preview.total_credits
    const diffMsg = Math.abs(diff) > 1
      ? `\n\n⚠️ Advertencia: débitos - créditos = ${fmtMoney(diff)} (debería ser cercano a 0).`
      : ''
    if (!confirm(`¿Importar saldos iniciales al corte ${cutoffOverride}?\n\n· ${preview.total} movimientos\n· ${preview.accounts_count} cuentas\n· ${preview.parties_count} terceros${diffMsg}`)) return

    setImporting(true)
    try {
      const res = await importWorldOfficeBalanceAction(csvContent, cutoffOverride)
      if (!res.success) {
        toast.error(res.error || 'Error')
        return
      }
      toast.success(`${res.processed} saldos importados`)
      setImportResult({ processed: res.processed, difference: res.difference })
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
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando...</>
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
