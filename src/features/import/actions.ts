'use server'

import { createClient } from '@/lib/supabase/server'

// ─── Shared types ────────────────────────────────────────────────────────────

export interface ImportResult {
  inserted: number
  errors: ImportError[]
}

export interface ImportError {
  row: number
  message: string
}

// ─── Row types ────────────────────────────────────────────────────────────────

interface ClientRow {
  nombre: string
  tipo_documento: string
  numero_documento: string
  email: string
  telefono: string
  ciudad: string
  direccion: string
  plazo_pago: string
  cupo_credito: string
  tipo_tercero: string
  regimen_tributario: string
  actividad_economica: string
}

interface ProductRow {
  nombre: string
  sku: string
  precio_venta: string
  costo: string
  stock: string
  categoria: string
  tipo_iva: string
  descripcion: string
  unidad_medida: string
}

interface TransactionRow {
  descripcion: string
  monto: string
  tipo: string
  fecha: string
}

interface EmployeeRow {
  nombre: string
  tipo_documento: string
  numero_documento: string
  email: string
  cargo: string
  departamento: string
  salario_base: string
  fecha_ingreso: string
  tipo_contrato: string
}

interface BankAccountRow {
  nombre: string
  numero_cuenta: string
  banco: string
  tipo_cuenta: string
  moneda: string
  saldo: string
}

interface OpeningEntryRow {
  cuenta_puc: string
  descripcion: string
  debito: string
  credito: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNumber(value: string): number {
  const n = parseFloat(String(value ?? '').replace(/,/g, '.').trim())
  return isNaN(n) ? 0 : n
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test((value ?? '').trim())
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function mapPartyType(value: string): string {
  const v = (value ?? '').toLowerCase()
  if (v.includes('ambos') || v.includes('both')) return 'BOTH'
  if (v.includes('proveedor')) return 'SUPPLIER'
  if (v.includes('cliente')) return 'CUSTOMER'
  return 'CUSTOMER'
}

function mapTaxCategory(value: string): string {
  const v = (value ?? '').trim().toUpperCase()
  if (v === '19' || v === 'IVA_19' || v === 'IVA19') return 'IVA_19'
  if (v === '5' || v === 'IVA_5' || v === 'IVA5') return 'IVA_5'
  return 'IVA_0'
}

// ─── importClientsAction ─────────────────────────────────────────────────────

export async function importClientsAction(rows: ClientRow[]): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: tenantId } = await supabase.rpc('get_my_tenant_id')

  const errors: ImportError[] = []
  const validRows: Record<string, unknown>[] = []

  rows.forEach((row, idx) => {
    const rowNum = idx + 2

    if (!row.nombre?.trim()) {
      errors.push({ row: rowNum, message: 'El campo "nombre" es obligatorio' })
      return
    }
    if (!row.numero_documento?.trim()) {
      errors.push({ row: rowNum, message: 'El campo "numero_documento" es obligatorio' })
      return
    }

    validRows.push({
      tenant_id: tenantId,
      legal_name: row.nombre.trim(),
      doc_type: row.tipo_documento?.trim() || 'NIT',
      doc_number: row.numero_documento.trim(),
      email: row.email?.trim() || null,
      phone: row.telefono?.trim() || null,
      party_type: mapPartyType(row.tipo_tercero ?? ''),
      city: row.ciudad?.trim() || null,
      address: row.direccion?.trim() || null,
      payment_term_days: row.plazo_pago ? parseNumber(row.plazo_pago) : null,
      credit_limit: row.cupo_credito ? parseNumber(row.cupo_credito) : null,
      tax_regime: row.regimen_tributario?.trim() || null,
      economic_activity: row.actividad_economica?.trim() || null,
    })
  })

  if (validRows.length === 0) {
    return { inserted: 0, errors }
  }

  const { error: dbError } = await supabase.from('parties').insert(validRows)

  if (dbError) {
    errors.push({ row: 0, message: `Error de base de datos: ${dbError.message}` })
    return { inserted: 0, errors }
  }

  return { inserted: validRows.length, errors }
}

// ─── importProductsAction ────────────────────────────────────────────────────

export async function importProductsAction(rows: ProductRow[]): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: tenantId } = await supabase.rpc('get_my_tenant_id')

  const errors: ImportError[] = []
  const validRows: Record<string, unknown>[] = []

  rows.forEach((row, idx) => {
    const rowNum = idx + 2

    if (!row.nombre?.trim()) {
      errors.push({ row: rowNum, message: 'El campo "nombre" es obligatorio' })
      return
    }

    validRows.push({
      tenant_id: tenantId,
      name: row.nombre.trim(),
      sku: row.sku?.trim() || null,
      unit_price: parseNumber(row.precio_venta),
      unit_cost: parseNumber(row.costo),
      stock_quantity: parseNumber(row.stock),
      category: row.categoria?.trim() || null,
      tax_category: mapTaxCategory(row.tipo_iva ?? ''),
      description: row.descripcion?.trim() || null,
      unit: row.unidad_medida?.trim() || null,
    })
  })

  if (validRows.length === 0) {
    return { inserted: 0, errors }
  }

  const { error: dbError } = await supabase.from('products').insert(validRows)

  if (dbError) {
    errors.push({ row: 0, message: `Error de base de datos: ${dbError.message}` })
    return { inserted: 0, errors }
  }

  return { inserted: validRows.length, errors }
}

// ─── importTransactionsAction ────────────────────────────────────────────────

export async function importTransactionsAction(rows: TransactionRow[]): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: tenantId } = await supabase.rpc('get_my_tenant_id')

  const errors: ImportError[] = []
  const validRows: Record<string, unknown>[] = []
  const VALID_TYPES = ['RECEIPT', 'PAYMENT']

  rows.forEach((row, idx) => {
    const rowNum = idx + 2

    if (!row.descripcion?.trim()) {
      errors.push({ row: rowNum, message: 'El campo "descripcion" es obligatorio' })
      return
    }

    const tipo = row.tipo?.trim().toUpperCase()
    if (!VALID_TYPES.includes(tipo)) {
      errors.push({ row: rowNum, message: `Tipo inválido "${row.tipo}". Usa RECEIPT o PAYMENT` })
      return
    }

    if (!isValidDate(row.fecha)) {
      errors.push({ row: rowNum, message: `Fecha inválida "${row.fecha}". Formato esperado: YYYY-MM-DD` })
      return
    }

    const amount = parseNumber(row.monto)
    if (amount <= 0) {
      errors.push({ row: rowNum, message: `Monto inválido "${row.monto}". Debe ser un número positivo` })
      return
    }

    validRows.push({
      tenant_id: tenantId,
      description: row.descripcion.trim(),
      amount,
      transaction_type: tipo,
      date: row.fecha.trim(),
      account_id: null,
    })
  })

  if (validRows.length === 0) {
    return { inserted: 0, errors }
  }

  const { error: dbError } = await supabase.from('treasury_transactions').insert(validRows)

  if (dbError) {
    errors.push({ row: 0, message: `Error de base de datos: ${dbError.message}` })
    return { inserted: 0, errors }
  }

  return { inserted: validRows.length, errors }
}

// ─── importEmployeesAction ───────────────────────────────────────────────────

export async function importEmployeesAction(rows: EmployeeRow[]): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: tenantId } = await supabase.rpc('get_my_tenant_id')

  const errors: ImportError[] = []
  const validRows: Record<string, unknown>[] = []
  const today = todayISO()

  rows.forEach((row, idx) => {
    const rowNum = idx + 2

    if (!row.nombre?.trim()) {
      errors.push({ row: rowNum, message: 'El campo "nombre" es obligatorio' })
      return
    }
    if (!row.numero_documento?.trim()) {
      errors.push({ row: rowNum, message: 'El campo "numero_documento" es obligatorio' })
      return
    }

    const nameParts = row.nombre.trim().split(' ')
    const first_name = nameParts[0] ?? ''
    const last_name = nameParts.slice(1).join(' ') || ''

    const startDate = row.fecha_ingreso?.trim()
    const resolvedStartDate =
      startDate && isValidDate(startDate) ? startDate : today

    validRows.push({
      tenant_id: tenantId,
      first_name,
      last_name,
      doc_type: row.tipo_documento?.trim() || 'CC',
      doc_number: row.numero_documento.trim(),
      email: row.email?.trim() || null,
      position: row.cargo?.trim() || null,
      department: row.departamento?.trim() || null,
      base_salary: parseNumber(row.salario_base),
      start_date: resolvedStartDate,
      contract_type: row.tipo_contrato?.trim().toUpperCase() || 'INDEFINIDO',
    })
  })

  if (validRows.length === 0) {
    return { inserted: 0, errors }
  }

  const { error: dbError } = await supabase.from('employees').insert(validRows)

  if (dbError) {
    errors.push({ row: 0, message: `Error de base de datos: ${dbError.message}` })
    return { inserted: 0, errors }
  }

  return { inserted: validRows.length, errors }
}

// ─── importBankAccountsAction ────────────────────────────────────────────────

export async function importBankAccountsAction(rows: BankAccountRow[]): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: tenantId } = await supabase.rpc('get_my_tenant_id')

  const errors: ImportError[] = []
  const validRows: Record<string, unknown>[] = []

  rows.forEach((row, idx) => {
    const rowNum = idx + 2

    if (!row.nombre?.trim()) {
      errors.push({ row: rowNum, message: 'El campo "nombre" es obligatorio' })
      return
    }
    if (!row.numero_cuenta?.trim()) {
      errors.push({ row: rowNum, message: 'El campo "numero_cuenta" es obligatorio' })
      return
    }

    validRows.push({
      tenant_id: tenantId,
      name: row.nombre.trim(),
      account_number: row.numero_cuenta.trim(),
      bank_name: row.banco?.trim() || null,
      account_type: row.tipo_cuenta?.trim().toUpperCase() || 'CHECKING',
      currency: row.moneda?.trim().toUpperCase() || 'COP',
      balance: parseNumber(row.saldo),
    })
  })

  if (validRows.length === 0) {
    return { inserted: 0, errors }
  }

  const { error: dbError } = await supabase.from('treasury_accounts').insert(validRows)

  if (dbError) {
    errors.push({ row: 0, message: `Error de base de datos: ${dbError.message}` })
    return { inserted: 0, errors }
  }

  return { inserted: validRows.length, errors }
}

// ─── importOpeningEntryAction ────────────────────────────────────────────────

export async function importOpeningEntryAction(rows: OpeningEntryRow[]): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: tenantId } = await supabase.rpc('get_my_tenant_id')

  const errors: ImportError[] = []

  if (rows.length === 0) {
    return { inserted: 0, errors: [{ row: 0, message: 'No hay filas para importar' }] }
  }

  // Validate required fields and accumulate totals
  let totalDebit = 0
  let totalCredit = 0

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx]
    const rowNum = idx + 2

    if (!row.cuenta_puc?.trim()) {
      errors.push({ row: rowNum, message: 'El campo "cuenta_puc" es obligatorio' })
    }

    totalDebit += parseNumber(row.debito)
    totalCredit += parseNumber(row.credito)
  }

  if (errors.length > 0) {
    return { inserted: 0, errors }
  }

  // Validate debit == credit (allow small floating-point tolerance)
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return {
      inserted: 0,
      errors: [
        {
          row: 0,
          message: `El asiento no cuadra: total débitos ${totalDebit.toFixed(2)} ≠ total créditos ${totalCredit.toFixed(2)}`,
        },
      ],
    }
  }

  // Lookup all referenced account codes in one query
  const codes = [...new Set(rows.map((r) => r.cuenta_puc.trim()))]

  const { data: accounts, error: lookupError } = await supabase
    .from('chart_accounts')
    .select('id, code')
    .eq('tenant_id', tenantId)
    .in('code', codes)

  if (lookupError) {
    return {
      inserted: 0,
      errors: [{ row: 0, message: `Error buscando cuentas PUC: ${lookupError.message}` }],
    }
  }

  const accountMap = new Map<string, string>(
    (accounts ?? []).map((a: { id: string; code: string }) => [a.code, a.id])
  )

  // Verify all codes were found
  for (let idx = 0; idx < rows.length; idx++) {
    const code = rows[idx].cuenta_puc.trim()
    if (!accountMap.has(code)) {
      errors.push({ row: idx + 2, message: `Cuenta PUC "${code}" no encontrada en el plan de cuentas` })
    }
  }

  if (errors.length > 0) {
    return { inserted: 0, errors }
  }

  // Create the single journal entry
  const today = todayISO()

  const { data: entry, error: entryError } = await supabase
    .from('journal_entries')
    .insert({
      tenant_id: tenantId,
      description: 'Asiento de apertura — Migración',
      date: today,
      status: 'POSTED',
    })
    .select('id')
    .single()

  if (entryError || !entry) {
    return {
      inserted: 0,
      errors: [{ row: 0, message: `Error creando asiento: ${entryError?.message ?? 'sin respuesta'}` }],
    }
  }

  // Build journal lines
  const lines = rows.map((row) => ({
    tenant_id: tenantId,
    journal_entry_id: entry.id,
    account_id: accountMap.get(row.cuenta_puc.trim()),
    description: row.descripcion?.trim() || null,
    debit: parseNumber(row.debito),
    credit: parseNumber(row.credito),
  }))

  const { error: linesError } = await supabase.from('journal_lines').insert(lines)

  if (linesError) {
    // Attempt to roll back the header entry
    await supabase.from('journal_entries').delete().eq('id', entry.id)
    return {
      inserted: 0,
      errors: [{ row: 0, message: `Error insertando líneas: ${linesError.message}` }],
    }
  }

  return { inserted: lines.length, errors }
}
