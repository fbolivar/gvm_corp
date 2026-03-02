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

// ─── Client row type ─────────────────────────────────────────────────────────

interface ClientRow {
  nombre: string
  tipo_documento: string
  numero_documento: string
  email: string
  telefono: string
  ciudad: string
}

// ─── Product row type ────────────────────────────────────────────────────────

interface ProductRow {
  nombre: string
  sku: string
  precio_venta: string
  costo: string
  stock: string
  categoria: string
}

// ─── Transaction row type ────────────────────────────────────────────────────

interface TransactionRow {
  descripcion: string
  monto: string
  tipo: string
  fecha: string
}

// ─── Helper ──────────────────────────────────────────────────────────────────

function parseNumber(value: string): number {
  const n = parseFloat(String(value).replace(/,/g, '.').trim())
  return isNaN(n) ? 0 : n
}

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

// ─── importClientsAction ─────────────────────────────────────────────────────

export async function importClientsAction(rows: ClientRow[]): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: tenantId } = await supabase.rpc('get_my_tenant_id')

  const errors: ImportError[] = []
  const validRows: Record<string, unknown>[] = []

  rows.forEach((row, idx) => {
    const rowNum = idx + 2 // +2 because row 1 is the header

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
      party_type: 'CLIENT',
      city: row.ciudad?.trim() || null,
    })
  })

  if (validRows.length === 0) {
    return { inserted: 0, errors }
  }

  const { error: dbError } = await supabase
    .from('parties')
    .insert(validRows)

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

    const unitPrice = parseNumber(row.precio_venta)
    const unitCost = parseNumber(row.costo)
    const stockQty = parseNumber(row.stock)

    validRows.push({
      tenant_id: tenantId,
      name: row.nombre.trim(),
      sku: row.sku?.trim() || null,
      unit_price: unitPrice,
      unit_cost: unitCost,
      stock_quantity: stockQty,
      category: row.categoria?.trim() || null,
    })
  })

  if (validRows.length === 0) {
    return { inserted: 0, errors }
  }

  const { error: dbError } = await supabase
    .from('products')
    .insert(validRows)

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

  const { error: dbError } = await supabase
    .from('treasury_transactions')
    .insert(validRows)

  if (dbError) {
    errors.push({ row: 0, message: `Error de base de datos: ${dbError.message}` })
    return { inserted: 0, errors }
  }

  return { inserted: validRows.length, errors }
}
