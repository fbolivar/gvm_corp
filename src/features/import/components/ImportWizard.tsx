'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Download,
  Users,
  Package,
  Banknote,
  UserCheck,
  Landmark,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/ui/button'
import {
  importClientsAction,
  importProductsAction,
  importTransactionsAction,
  importEmployeesAction,
  importBankAccountsAction,
  importOpeningEntryAction,
  type ImportResult,
} from '../actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportType =
  | 'clients'
  | 'products'
  | 'transactions'
  | 'employees'
  | 'bank_accounts'
  | 'opening_entry'

type WizardStep = 1 | 2 | 3

interface ParsedRow {
  [key: string]: string
}

// ─── WorldOffice / generic column mapping ────────────────────────────────────

const COLUMN_MAPPINGS: Record<string, string> = {
  // Terceros
  'razon social': 'nombre',
  'razón social': 'nombre',
  razon_social: 'nombre',
  'nombre comercial': 'nombre',
  'nombre o razon social': 'nombre',
  nit: 'numero_documento',
  'nit/cc': 'numero_documento',
  cedula: 'numero_documento',
  cédula: 'numero_documento',
  'numero documento': 'numero_documento',
  'número documento': 'numero_documento',
  'no. documento': 'numero_documento',
  documento: 'numero_documento',
  'tipo documento': 'tipo_documento',
  'tipo doc': 'tipo_documento',
  'tipo id': 'tipo_documento',
  correo: 'email',
  'correo electronico': 'email',
  'correo electrónico': 'email',
  'e-mail': 'email',
  mail: 'email',
  telefono: 'telefono',
  teléfono: 'telefono',
  tel: 'telefono',
  celular: 'telefono',
  movil: 'telefono',
  móvil: 'telefono',
  ciudad: 'ciudad',
  municipio: 'ciudad',
  direccion: 'direccion',
  dirección: 'direccion',
  dir: 'direccion',
  // Products
  descripcion: 'descripcion',
  descripción: 'descripcion',
  producto: 'nombre',
  referencia: 'sku',
  codigo: 'sku',
  código: 'sku',
  cod: 'sku',
  ref: 'sku',
  precio: 'precio_venta',
  'precio venta': 'precio_venta',
  'precio de venta': 'precio_venta',
  pvp: 'precio_venta',
  'valor venta': 'precio_venta',
  costo: 'costo',
  'costo unitario': 'costo',
  'costo promedio': 'costo',
  'valor costo': 'costo',
  existencia: 'stock',
  existencias: 'stock',
  cantidad: 'stock',
  saldo: 'stock',
  grupo: 'categoria',
  categoria: 'categoria',
  categoría: 'categoria',
  familia: 'categoria',
  iva: 'tipo_iva',
  'tarifa iva': 'tipo_iva',
  '% iva': 'tipo_iva',
  'tipo iva': 'tipo_iva',
  unidad: 'unidad_medida',
  'unidad medida': 'unidad_medida',
  um: 'unidad_medida',
  // Employees
  cargo: 'cargo',
  puesto: 'cargo',
  posición: 'cargo',
  posicion: 'cargo',
  departamento: 'departamento',
  area: 'departamento',
  área: 'departamento',
  salario: 'salario_base',
  'salario basico': 'salario_base',
  'salario básico': 'salario_base',
  sueldo: 'salario_base',
  'fecha ingreso': 'fecha_ingreso',
  'fecha de ingreso': 'fecha_ingreso',
  'fecha inicio': 'fecha_ingreso',
  contrato: 'tipo_contrato',
  'tipo contrato': 'tipo_contrato',
  // Bank accounts
  cuenta: 'numero_cuenta',
  'numero cuenta': 'numero_cuenta',
  'número cuenta': 'numero_cuenta',
  'no. cuenta': 'numero_cuenta',
  banco: 'banco',
  entidad: 'banco',
  'tipo cuenta': 'tipo_cuenta',
  moneda: 'moneda',
  // Opening entry
  'cuenta puc': 'cuenta_puc',
  'codigo cuenta': 'cuenta_puc',
  'código cuenta': 'cuenta_puc',
  'cuenta contable': 'cuenta_puc',
  debito: 'debito',
  débito: 'debito',
  debe: 'debito',
  credito: 'credito',
  crédito: 'credito',
  haber: 'credito',
}

/** Normalizes a header string: trim, lowercase, remove accents for lookup */
function normalizeHeader(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Given raw header strings, return a map of originalHeader → gvmField (or same if not mapped) */
function buildHeaderMap(rawHeaders: string[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const raw of rawHeaders) {
    const normalized = normalizeHeader(raw)
    const mapped = COLUMN_MAPPINGS[normalized]
    map.set(raw, mapped ?? raw.trim().toLowerCase())
  }
  return map
}

// ─── CSV parser ────────────────────────────────────────────────────────────────

function parseCsv(text: string): { rows: ParsedRow[]; headerMap: Map<string, string> } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) return { rows: [], headerMap: new Map() }

  const rawHeaders = lines[0].split(',').map((h) => h.trim())
  const headerMap = buildHeaderMap(rawHeaders)

  const rows: ParsedRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim())
    const row: ParsedRow = {}
    rawHeaders.forEach((raw, idx) => {
      const gvmKey = headerMap.get(raw) ?? raw.trim().toLowerCase()
      row[gvmKey] = cells[idx] ?? ''
    })
    rows.push(row)
  }

  return { rows, headerMap }
}

// ─── XLSX parser ───────────────────────────────────────────────────────────────

function parseXlsx(buffer: ArrayBuffer): { rows: ParsedRow[]; headerMap: Map<string, string> } {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return { rows: [], headerMap: new Map() }

  const sheet = workbook.Sheets[sheetName]
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][]

  if (raw.length < 2) return { rows: [], headerMap: new Map() }

  const rawHeaders = (raw[0] as unknown[]).map((h) => String(h ?? '').trim())
  const headerMap = buildHeaderMap(rawHeaders)

  const rows: ParsedRow[] = []
  for (let i = 1; i < raw.length; i++) {
    const cells = raw[i] as unknown[]
    // Skip completely empty rows
    if (!cells || cells.every((c) => c === '' || c === null || c === undefined)) continue
    const row: ParsedRow = {}
    rawHeaders.forEach((raw_h, idx) => {
      const gvmKey = headerMap.get(raw_h) ?? raw_h.toLowerCase()
      row[gvmKey] = String(cells[idx] ?? '').trim()
    })
    rows.push(row)
  }

  return { rows, headerMap }
}

// ─── Templates ─────────────────────────────────────────────────────────────────

const TEMPLATES: Record<ImportType, { headers: string[]; sample: string[][] }> = {
  clients: {
    headers: ['nombre', 'tipo_documento', 'numero_documento', 'email', 'telefono', 'ciudad'],
    sample: [
      ['Empresa Ejemplo S.A.S', 'NIT', '900123456-1', 'contacto@empresa.com', '3001234567', 'Bogotá'],
      ['Juan Pérez', 'CC', '1234567890', 'juan@correo.com', '3109876543', 'Medellín'],
    ],
  },
  products: {
    headers: ['nombre', 'sku', 'precio_venta', 'costo', 'stock', 'categoria'],
    sample: [
      ['Camiseta Talla M', 'CAM-M-001', '45000', '20000', '100', 'Ropa'],
      ['Pantalón Slim', 'PAN-SL-002', '89000', '40000', '50', 'Ropa'],
    ],
  },
  transactions: {
    headers: ['descripcion', 'monto', 'tipo', 'fecha'],
    sample: [
      ['Pago proveedor telas', '1500000', 'PAYMENT', '2026-03-01'],
      ['Cobro cliente pedido 001', '3200000', 'RECEIPT', '2026-03-02'],
    ],
  },
  employees: {
    headers: [
      'nombre',
      'tipo_documento',
      'numero_documento',
      'email',
      'cargo',
      'departamento',
      'salario_base',
      'fecha_ingreso',
      'tipo_contrato',
    ],
    sample: [
      [
        'María García López',
        'CC',
        '52834567',
        'maria@gvm.com',
        'Contadora',
        'Contabilidad',
        '4500000',
        '2024-01-15',
        'INDEFINIDO',
      ],
    ],
  },
  bank_accounts: {
    headers: ['nombre', 'numero_cuenta', 'banco', 'tipo_cuenta', 'moneda', 'saldo'],
    sample: [
      ['Cuenta Corriente Principal', '123456789', 'Bancolombia', 'CHECKING', 'COP', '15000000'],
    ],
  },
  opening_entry: {
    headers: ['cuenta_puc', 'descripcion', 'debito', 'credito'],
    sample: [
      ['11050501', 'Saldo Bancolombia', '15000000', '0'],
      ['13050501', 'Cartera clientes', '8500000', '0'],
      ['22050501', 'Proveedores', '0', '12000000'],
      ['36050501', 'Resultado ejercicio', '0', '11500000'],
    ],
  },
}

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  ImportType,
  { label: string; description: string; icon: React.ComponentType<{ className?: string }> }
> = {
  clients: {
    label: 'Terceros',
    description: 'Clientes, proveedores y contactos',
    icon: Users,
  },
  products: {
    label: 'Productos',
    description: 'Catálogo de productos e inventario',
    icon: Package,
  },
  transactions: {
    label: 'Transacciones',
    description: 'Movimientos de tesorería',
    icon: Banknote,
  },
  employees: {
    label: 'Empleados',
    description: 'Nómina y recursos humanos',
    icon: UserCheck,
  },
  bank_accounts: {
    label: 'Cuentas Bancarias',
    description: 'Cuentas de tesorería',
    icon: Landmark,
  },
  opening_entry: {
    label: 'Asiento de Apertura',
    description: 'Saldos iniciales contables',
    icon: BookOpen,
  },
}

// ─── Template download ────────────────────────────────────────────────────────

function downloadTemplate(type: ImportType) {
  const { headers, sample } = TEMPLATES[type]
  const csvLines = [headers.join(','), ...sample.map((row) => row.join(','))]
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `plantilla_${type}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: WizardStep }) {
  const steps = [
    { num: 1 as WizardStep, label: 'Seleccionar' },
    { num: 2 as WizardStep, label: 'Preview' },
    { num: 3 as WizardStep, label: 'Resultado' },
  ]

  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((step, i) => {
        const isDone = current > step.num
        const isActive = current === step.num
        return (
          <div key={step.num} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'h-9 w-9 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300',
                  isDone && 'bg-emerald-500 text-white shadow-lg shadow-emerald-100',
                  isActive && 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110',
                  !isDone && !isActive && 'bg-slate-100 text-slate-400'
                )}
              >
                {isDone ? <CheckCircle2 className="h-4 w-4" /> : step.num}
              </div>
              <span
                className={cn(
                  'text-[9px] font-black uppercase tracking-widest',
                  isActive ? 'text-indigo-600' : isDone ? 'text-emerald-500' : 'text-slate-400'
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-px w-16 mb-5 transition-all duration-500',
                  isDone ? 'bg-emerald-400' : 'bg-slate-200'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Column mapping badge ─────────────────────────────────────────────────────

function ColumnMappingPanel({
  headerMap,
  expectedFields,
}: {
  headerMap: Map<string, string>
  expectedFields: string[]
}) {
  if (headerMap.size === 0) return null

  const entries = Array.from(headerMap.entries())
  const mappedGvmFields = new Set(entries.map(([, gvm]) => gvm))
  const unmappedExpected = expectedFields.filter((f) => !mappedGvmFields.has(f))

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
        Columnas detectadas
      </p>

      {/* Mapped columns */}
      <div className="flex flex-wrap gap-2">
        {entries.map(([source, gvm]) => {
          const isMapped = source.trim().toLowerCase() !== gvm
          return (
            <div
              key={source}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border',
                isMapped
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              )}
            >
              {isMapped ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
              ) : (
                <span className="h-3 w-3 rounded-full bg-slate-300 shrink-0 inline-block" />
              )}
              <span className="text-slate-400">{source}</span>
              {isMapped && (
                <>
                  <ArrowRight className="h-2.5 w-2.5 text-emerald-400" />
                  <span className="font-black text-emerald-600">{gvm}</span>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Missing expected fields */}
      {unmappedExpected.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {unmappedExpected.map((field) => (
            <div
              key={field}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border bg-amber-50 border-amber-200 text-amber-700"
            >
              <XCircle className="h-3 w-3 text-amber-400 shrink-0" />
              <span>{field}</span>
              <span className="text-amber-400 font-normal">no encontrado</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ImportWizard() {
  const [step, setStep] = useState<WizardStep>(1)
  const [importType, setImportType] = useState<ImportType | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [headerMap, setHeaderMap] = useState<Map<string, string>>(new Map())
  const [fileError, setFileError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── File handling ──────────────────────────────────────────────────────────

  function handleFile(file: File) {
    setFileError(null)

    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
    const isCsv = file.name.endsWith('.csv') || file.type === 'text/csv'

    if (!isXlsx && !isCsv) {
      setFileError('Solo se aceptan archivos .csv, .xlsx o .xls')
      return
    }

    if (isXlsx) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer
          const { rows: parsed, headerMap: hMap } = parseXlsx(buffer)
          if (parsed.length === 0) {
            setFileError('El archivo está vacío o tiene un formato incorrecto.')
            return
          }
          setRows(parsed)
          setHeaderMap(hMap)
          setStep(2)
        } catch {
          setFileError('No se pudo leer el archivo Excel. Verifica que no esté dañado.')
        }
      }
      reader.onerror = () => setFileError('No se pudo leer el archivo.')
      reader.readAsArrayBuffer(file)
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const { rows: parsed, headerMap: hMap } = parseCsv(text)
        if (parsed.length === 0) {
          setFileError('El archivo está vacío o tiene un formato incorrecto.')
          return
        }
        setRows(parsed)
        setHeaderMap(hMap)
        setStep(2)
      }
      reader.onerror = () => setFileError('No se pudo leer el archivo.')
      reader.readAsText(file, 'utf-8')
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  // ── Import execution ───────────────────────────────────────────────────────

  async function handleConfirmImport() {
    if (!importType || rows.length === 0) return
    setImporting(true)

    try {
      let res: ImportResult
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = rows as any

      if (importType === 'clients') {
        res = await importClientsAction(data)
      } else if (importType === 'products') {
        res = await importProductsAction(data)
      } else if (importType === 'transactions') {
        res = await importTransactionsAction(data)
      } else if (importType === 'employees') {
        res = await importEmployeesAction(data)
      } else if (importType === 'bank_accounts') {
        res = await importBankAccountsAction(data)
      } else {
        res = await importOpeningEntryAction(data)
      }

      setResult(res)
      setStep(3)
    } catch (err) {
      setResult({
        inserted: 0,
        errors: [{ row: 0, message: err instanceof Error ? err.message : 'Error inesperado' }],
      })
      setStep(3)
    } finally {
      setImporting(false)
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  function handleReset() {
    setStep(1)
    setImportType(null)
    setRows([])
    setHeaderMap(new Map())
    setFileError(null)
    setResult(null)
    setImporting(false)
  }

  // ── Preview helpers ────────────────────────────────────────────────────────

  const previewHeaders = rows.length > 0 ? Object.keys(rows[0]) : []
  const previewRows = rows.slice(0, 10)
  const expectedFields = importType ? TEMPLATES[importType].headers : []

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header card */}
      <div className="bg-slate-900 rounded-[2rem] p-8 mb-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 opacity-5 pointer-events-none">
          <Upload className="h-48 w-48 text-white -mt-8 -mr-8" />
        </div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/50 shrink-0">
            <Upload className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight italic uppercase">
              Centro de Importación
            </h1>
            <p className="text-slate-400 text-sm font-medium mt-0.5">
              Carga masiva de datos mediante archivos Excel o CSV
            </p>
          </div>
        </div>
      </div>

      {/* Wizard card */}
      <div className="bg-white rounded-[2rem] p-8 shadow-lg border border-slate-100">
        <StepIndicator current={step} />

        {/* ── STEP 1: Select type + upload ── */}
        {step === 1 && (
          <div className="space-y-8">
            {/* Type selector */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
                1. Selecciona el tipo de datos
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(Object.entries(TYPE_CONFIG) as [ImportType, (typeof TYPE_CONFIG)[ImportType]][]).map(
                  ([key, config]) => {
                    const Icon = config.icon
                    const isSelected = importType === key
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setImportType(key)
                          setFileError(null)
                        }}
                        className={cn(
                          'flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-200 text-center group',
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 shadow-md shadow-indigo-100'
                            : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                        )}
                      >
                        <div
                          className={cn(
                            'h-12 w-12 rounded-xl flex items-center justify-center transition-all',
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                              : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p
                            className={cn(
                              'text-sm font-black uppercase tracking-wider italic',
                              isSelected ? 'text-indigo-600' : 'text-slate-700'
                            )}
                          >
                            {config.label}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                            {config.description}
                          </p>
                        </div>
                      </button>
                    )
                  }
                )}
              </div>
            </div>

            {/* File upload zone */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  2. Carga tu archivo Excel o CSV
                </h2>
                {importType && (
                  <button
                    onClick={() => downloadTemplate(importType)}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Descargar plantilla
                  </button>
                )}
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => importType && fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200',
                  importType
                    ? 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 cursor-pointer'
                    : 'border-slate-100 opacity-40 cursor-not-allowed'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleInputChange}
                  className="hidden"
                  disabled={!importType}
                />
                <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-black text-slate-500 italic uppercase tracking-wide">
                  {importType
                    ? 'Arrastra tu archivo aquí o haz clic para seleccionar'
                    : 'Primero selecciona el tipo de datos'}
                </p>
                <p className="text-xs text-slate-400 mt-1.5">
                  Archivos .xlsx, .xls o .csv — máx. 5 MB
                </p>
              </div>

              {fileError && (
                <div className="mt-3 flex items-start gap-2 bg-rose-50 border border-rose-100 rounded-xl p-3.5">
                  <XCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                  <p className="text-xs font-semibold text-rose-600">{fileError}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 2: Preview ── */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase italic tracking-tight">
                  Vista previa
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  Mostrando las primeras {previewRows.length} de{' '}
                  <span className="font-black text-indigo-600">{rows.length} filas</span> listas
                  para importar
                </p>
              </div>
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2">
                <span className="text-2xl font-black text-indigo-600">{rows.length}</span>
                <span className="text-[10px] font-black uppercase text-indigo-400 leading-tight tracking-widest">
                  filas
                  <br />
                  total
                </span>
              </div>
            </div>

            {/* Column mapping panel */}
            <ColumnMappingPanel headerMap={headerMap} expectedFields={expectedFields} />

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 w-10">
                      #
                    </th>
                    {previewHeaders.map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr
                      key={i}
                      className={cn(
                        'border-b border-slate-50 transition-colors',
                        i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                        'hover:bg-indigo-50/40'
                      )}
                    >
                      <td className="px-4 py-2.5 text-[10px] font-black text-slate-300">
                        {i + 2}
                      </td>
                      {previewHeaders.map((h) => (
                        <td
                          key={h}
                          className="px-4 py-2.5 text-[11px] text-slate-600 font-medium max-w-[140px] truncate"
                        >
                          {row[h] || <span className="text-slate-300 italic">vacío</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 10 && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  + {rows.length - 10} filas adicionales no mostradas
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setStep(1)}
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="h-3 w-3" />
                Cambiar archivo
              </button>
              <Button
                onClick={handleConfirmImport}
                disabled={importing}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-2.5 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-indigo-200 transition-all"
              >
                {importing ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Importando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Confirmar importación
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Result ── */}
        {step === 3 && result && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-3xl font-black text-emerald-600">{result.inserted}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mt-1">
                  Filas importadas
                </p>
              </div>
              <div
                className={cn(
                  'rounded-2xl p-6 text-center border',
                  result.errors.length > 0
                    ? 'bg-rose-50 border-rose-100'
                    : 'bg-slate-50 border-slate-100'
                )}
              >
                <XCircle
                  className={cn(
                    'h-8 w-8 mx-auto mb-2',
                    result.errors.length > 0 ? 'text-rose-500' : 'text-slate-300'
                  )}
                />
                <p
                  className={cn(
                    'text-3xl font-black',
                    result.errors.length > 0 ? 'text-rose-600' : 'text-slate-400'
                  )}
                >
                  {result.errors.length}
                </p>
                <p
                  className={cn(
                    'text-[10px] font-black uppercase tracking-widest mt-1',
                    result.errors.length > 0 ? 'text-rose-400' : 'text-slate-400'
                  )}
                >
                  Errores
                </p>
              </div>
            </div>

            {/* Error list */}
            {result.errors.length > 0 && (
              <div className="rounded-2xl border border-rose-100 overflow-hidden">
                <div className="bg-rose-50 px-4 py-2.5 border-b border-rose-100">
                  <p className="text-[9px] font-black uppercase tracking-widest text-rose-500">
                    Detalle de errores
                  </p>
                </div>
                <div className="divide-y divide-rose-50 max-h-52 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3 bg-white">
                      <span className="text-[9px] font-black bg-rose-100 text-rose-500 rounded-md px-1.5 py-0.5 whitespace-nowrap mt-0.5">
                        {err.row > 0 ? `Fila ${err.row}` : 'BD'}
                      </span>
                      <p className="text-xs text-slate-600 font-medium">{err.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New import button */}
            <div className="flex justify-center pt-2">
              <Button
                onClick={handleReset}
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-8 py-2.5 font-black uppercase tracking-widest text-[10px] shadow-lg transition-all flex items-center gap-2"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Nueva importación
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
