'use server'

import { createClient } from '@/lib/supabase/server'

// ═══════════════════════════════════════════════════════════════════════════════
// Dolibarr Import Server Actions
// Each action imports one CSV type from Dolibarr export
// Some types depend on others (e.g. inventory needs products + warehouses first)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ImportResult {
  inserted: number
  updated?: number
  errors: ImportError[]
}

export interface ImportError {
  row: number
  message: string
}

export interface DolibarrImportBatch {
  terceros?: DolibarrPartyRow[]
  productos?: DolibarrProductRow[]
  bodegas?: DolibarrWarehouseRow[]
  stock?: DolibarrStockRow[]
  facturasVenta?: DolibarrInvoiceRow[]
  facturasCompra?: DolibarrPurchaseInvoiceRow[]
  cartera?: DolibarrReceivableRow[]
  carteraPagar?: DolibarrPayableRow[]
  planContable?: DolibarrAccountRow[]
  asientos?: DolibarrBookkeepingRow[]
  usuarios?: DolibarrUserRow[]
}

// ─── Dolibarr row types ──────────────────────────────────────────────────────

export interface DolibarrPartyRow {
  dolibarr_id?: string
  party_role?: string
  party_type?: string
  legal_name?: string
  trade_name?: string
  doc_number?: string
  nit?: string
  email?: string
  phone?: string
  address?: string
  zip?: string
  city?: string
  department?: string
  code_client?: string
  code_fournisseur?: string
  is_customer?: string
  is_vendor?: string
  created_at?: string
}

export interface DolibarrProductRow {
  dolibarr_id?: string
  sku?: string
  name?: string
  description?: string
  type?: string
  uom?: string
  status?: string
  sale_price?: string
  cost?: string
  vat_rate?: string
  barcode?: string
  stock_qty?: string
  stock_alert?: string
}

export interface DolibarrWarehouseRow {
  dolibarr_id?: string
  code?: string
  name?: string
  description?: string
  address?: string
  city?: string
  phone?: string
}

export interface DolibarrStockRow {
  sku?: string
  product_name?: string
  warehouse_code?: string
  warehouse_name?: string
  qty?: string
  unit_cost?: string
  total_value?: string
}

export interface DolibarrInvoiceRow {
  dolibarr_id?: string
  doc_number?: string
  reference?: string
  client_name?: string
  client_nit?: string
  issue_date?: string
  due_date?: string
  subtotal?: string
  taxes?: string
  total?: string
  is_paid?: string
  status?: string
  invoice_type?: string
  notes?: string
}

export interface DolibarrPurchaseInvoiceRow {
  dolibarr_id?: string
  doc_number?: string
  supplier_ref?: string
  vendor_name?: string
  vendor_nit?: string
  issue_date?: string
  due_date?: string
  subtotal?: string
  taxes?: string
  total?: string
  is_paid?: string
  status?: string
}

export interface DolibarrReceivableRow {
  doc_number?: string
  party_nit?: string
  party_name?: string
  issue_date?: string
  due_date?: string
  subtotal?: string
  taxes?: string
  total?: string
  balance_pending?: string
  days_overdue?: string
}

export interface DolibarrPayableRow {
  doc_number?: string
  vendor_nit?: string
  vendor_name?: string
  issue_date?: string
  due_date?: string
  subtotal?: string
  taxes?: string
  total?: string
  balance_pending?: string
  days_overdue?: string
}

export interface DolibarrAccountRow {
  dolibarr_id?: string
  code?: string
  name?: string
  short_name?: string
  account_category?: string
  parent_code?: string
  active?: string
  nature?: string
}

export interface DolibarrBookkeepingRow {
  dolibarr_id?: string
  entry_number?: string
  entry_date?: string
  reference?: string
  description?: string
  account_code?: string
  account_name?: string
  debit?: string
  credit?: string
  aux_account?: string
  aux_label?: string
}

export interface DolibarrUserRow {
  dolibarr_id?: string
  login?: string
  first_name?: string
  last_name?: string
  full_name?: string
  email?: string
  admin?: string
  is_active?: string
  job?: string
  office_phone?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNumber(value: string | undefined): number {
  if (!value) return 0
  const n = parseFloat(String(value).replace(/,/g, '.').replace(/\s/g, '').trim())
  return isNaN(n) ? 0 : n
}

function parseBool(value: string | undefined): boolean {
  if (!value) return false
  const v = String(value).toLowerCase().trim()
  return v === 'true' || v === '1' || v === 't' || v === 'sí' || v === 'si' || v === 'yes'
}

function normalizeDate(value: string | undefined): string | null {
  if (!value) return null
  const v = String(value).trim()
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.substring(0, 10)
  // DD/MM/YYYY
  const match = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    const [, d, m, y] = match
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

function normalizePhone(value: string | undefined): string | null {
  if (!value) return null
  const v = String(value).replace(/\s|-/g, '').trim()
  if (!v) return null
  // If starts with 3 and 10 digits, assume Colombian mobile
  if (/^3\d{9}$/.test(v)) return `+57${v}`
  // If already has +, keep
  if (v.startsWith('+')) return v
  return v
}

function extractNIT(nit: string | undefined, docNumber: string | undefined): { nit: string | null; dv: string | null } {
  const source = (nit || docNumber || '').replace(/[^0-9-]/g, '').trim()
  if (!source) return { nit: null, dv: null }

  // Split on dash if present: "900123456-1"
  if (source.includes('-')) {
    const [n, d] = source.split('-')
    return { nit: n, dv: d || null }
  }
  return { nit: source, dv: null }
}

function mapPartyType(value: string | undefined): 'PERSON' | 'COMPANY' {
  const v = (value || '').toUpperCase().trim()
  if (v === 'PERSON' || v === 'PERSONA' || v === 'NATURAL') return 'PERSON'
  return 'COMPANY'
}

function mapDocumentStatus(value: string | undefined): string {
  const v = (value || '').toUpperCase().trim()
  const valid = ['DRAFT', 'SIGNED', 'SENT', 'ACCEPTED', 'REJECTED', 'VOIDED']
  if (valid.includes(v)) return v
  if (v === 'PAID') return 'ACCEPTED'
  if (v === 'VALIDATED') return 'ACCEPTED'
  if (v === 'CANCELLED') return 'VOIDED'
  return 'DRAFT'
}

function mapProductType(value: string | undefined): 'GOOD' | 'SERVICE' {
  const v = (value || '').toUpperCase().trim()
  if (v === 'SERVICE' || v === 'SERVICIO') return 'SERVICE'
  return 'GOOD'
}

function deriveAccountNature(code: string): 'DEBIT' | 'CREDIT' {
  if (!code) return 'DEBIT'
  const first = code.toString().charAt(0)
  if (first === '1' || first === '5' || first === '6' || first === '7') return 'DEBIT'
  return 'CREDIT'
}

// ─── IMPORT: TERCEROS (PARTIES) ──────────────────────────────────────────────

// Normaliza una fila con headers en español de Dolibarr 22.0.3 → DolibarrPartyRow
// Este cliente (GVM) guarda:
//   - NIT en "RUT" (no en "ID profesional 1")
//   - Móvil en "Teléfono" (campo "Móvil" vacío)
//   - Fechas como "2022-08-31 00:00:00" (hay que truncar a YYYY-MM-DD)
//   - "Alias" usado como nota operativa ("BLOQUEADO POR CARTERA") — ignorar si contiene esas keywords
function normalizeDolibarrPartyRow(raw: Record<string, string>): DolibarrPartyRow {
  const row = raw as Record<string, string | undefined>
  const get = (key: string) => (row[key] ?? '').trim()

  // Alias solo se usa si NO es una nota operativa
  const aliasRaw = get('Alias') || get('trade_name')
  const aliasLooksLikeNote = /BLOQUEAD|CARTERA|ANULAD|SUSPEND|PENDIENTE/i.test(aliasRaw)
  const tradeName = aliasLooksLikeNote ? '' : aliasRaw

  // NIT: prioridad RUT > ID profesional 1 > ID profesional 2
  const nit =
    get('RUT') ||
    get('ID profesional 1') ||
    get('ID profesional 2') ||
    get('nit') ||
    ''

  // Teléfono y móvil: el cliente los intercambió — si Móvil está vacío, usa Teléfono
  const telefono = get('Teléfono') || get('phone')
  const movil = get('Móvil')
  const phone = movil || telefono

  // Fecha: truncar datetime a date
  const fechaRaw = get('Fecha de creación') || get('created_at')
  const fecha = fechaRaw ? fechaRaw.substring(0, 10) : ''

  return {
    dolibarr_id: get('Id') || get('dolibarr_id'),
    legal_name: get('Nombre') || get('legal_name'),
    trade_name: tradeName,
    doc_number: nit || get('Código de cliente') || get('Código de proveedor'),
    nit,
    email: get('Correo') || get('email'),
    phone,
    address: get('Dirección') || get('address'),
    zip: get('Código postal') || get('zip'),
    city: get('Población') || get('city'),
    department: get('Departamento') || get('department'),
    code_client: get('Código de cliente') || get('code_client'),
    code_fournisseur: get('Código de proveedor') || get('code_fournisseur'),
    is_customer: get('Cliente') || get('is_customer'),
    is_vendor: get('Proveedor') || get('is_vendor'),
    created_at: fecha,
    party_type: get('Tipo de entidad comercial') || get('party_type'),
  }
}

export async function importDolibarrTercerosAction(
  rows: DolibarrPartyRow[] | Record<string, string>[]
): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
  if (!tenantId) return { inserted: 0, errors: [{ row: 0, message: 'No se pudo obtener tenant_id' }] }

  const errors: ImportError[] = []
  const validRows: Record<string, unknown>[] = []
  const externalIds: Record<string, unknown>[] = []

  // Detecta si viene con headers españoles del export Dolibarr 22.0.3
  const sample = (rows[0] ?? {}) as Record<string, string | undefined>
  const isSpanishExport = 'Nombre' in sample || 'Id' in sample || 'RUT' in sample

  rows.forEach((raw, idx) => {
    const rowNum = idx + 2
    const row: DolibarrPartyRow = isSpanishExport
      ? normalizeDolibarrPartyRow(raw as Record<string, string>)
      : (raw as DolibarrPartyRow)

    // Saltar registros marcados como "anulado" o sin nombre
    const name = row.legal_name?.trim() || ''
    if (!name || /^anulad/i.test(name)) {
      return // silencioso, no es error
    }

    const { nit, dv } = extractNIT(row.nit, row.doc_number)
    const docNumber = nit || row.doc_number?.trim() || `DOLI-${row.dolibarr_id || idx}`

    validRows.push({
      tenant_id: tenantId,
      party_type: mapPartyType(row.party_type),
      legal_name: name,
      trade_name: row.trade_name?.trim() || null,
      doc_type: 'NIT',
      doc_number: docNumber,
      nit: nit,
      dv: dv,
      email: row.email?.trim() || null,
      phone: normalizePhone(row.phone),
      is_customer: parseBool(row.is_customer),
      is_vendor: parseBool(row.is_vendor),
    })

    if (row.dolibarr_id) {
      externalIds.push({
        tenant_id: tenantId,
        source_system: 'DOLIBARR',
        source_table: 'llx_societe',
        source_id: row.dolibarr_id,
        doc_number: docNumber, // temporary — will resolve to party_id below
      })
    }
  })

  if (validRows.length === 0) return { inserted: 0, errors }

  // Deduplicar por (doc_type, doc_number) — Dolibarr suele tener el mismo NIT
  // registrado en varias filas (cliente + proveedor, o duplicados históricos).
  // Postgres rechaza upsert si hay duplicados en el mismo batch.
  // Conservamos el último y mergemos is_customer/is_vendor de todos.
  const dedupedMap = new Map<string, Record<string, unknown>>()
  let duplicates = 0
  for (const row of validRows) {
    const key = `${row.doc_type}|${row.doc_number}`
    const prev = dedupedMap.get(key)
    if (prev) {
      duplicates++
      dedupedMap.set(key, {
        ...prev,
        ...row,
        is_customer: Boolean(prev.is_customer) || Boolean(row.is_customer),
        is_vendor: Boolean(prev.is_vendor) || Boolean(row.is_vendor),
      })
    } else {
      dedupedMap.set(key, row)
    }
  }
  const dedupedRows = Array.from(dedupedMap.values())

  if (duplicates > 0) {
    errors.push({
      row: 0,
      message: `INFO: ${duplicates} duplicados por NIT fueron fusionados (mismo tercero registrado varias veces en Dolibarr)`,
    })
  }

  // Upsert parties (by tenant_id + doc_type + doc_number)
  const { data: inserted, error: insertErr } = await supabase
    .from('parties')
    .upsert(dedupedRows, { onConflict: 'tenant_id,doc_type,doc_number', ignoreDuplicates: false })
    .select('id, doc_number')

  if (insertErr) {
    errors.push({ row: 0, message: `Error BD terceros: ${insertErr.message}` })
    return { inserted: 0, errors }
  }

  // Build doc_number → party_id map to link external IDs
  const partyMap = new Map<string, string>()
  inserted?.forEach(p => partyMap.set(p.doc_number as string, p.id as string))

  const finalExternalIds = externalIds
    .map(e => {
      const partyId = partyMap.get(e.doc_number as string)
      if (!partyId) return null
      return {
        tenant_id: e.tenant_id,
        party_id: partyId,
        source_system: e.source_system,
        source_table: e.source_table,
        source_id: e.source_id,
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  if (finalExternalIds.length > 0) {
    await supabase.from('party_external_ids').upsert(finalExternalIds, {
      onConflict: 'tenant_id,source_system,source_table,source_id',
      ignoreDuplicates: false,
    })
  }

  return { inserted: inserted?.length || 0, errors }
}

// ─── IMPORT: WAREHOUSES ──────────────────────────────────────────────────────

export async function importDolibarrWarehousesAction(
  rows: DolibarrWarehouseRow[]
): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
  if (!tenantId) return { inserted: 0, errors: [{ row: 0, message: 'No se pudo obtener tenant_id' }] }

  const errors: ImportError[] = []
  const validRows: Record<string, unknown>[] = []

  rows.forEach((row, idx) => {
    const rowNum = idx + 2

    if (!row.name?.trim()) {
      errors.push({ row: rowNum, message: 'El campo name es obligatorio' })
      return
    }

    validRows.push({
      tenant_id: tenantId,
      code: row.code?.trim() || `WH-${String(idx + 1).padStart(3, '0')}`,
      name: row.name.trim(),
    })
  })

  if (validRows.length === 0) return { inserted: 0, errors }

  const { error } = await supabase
    .from('warehouses')
    .upsert(validRows, { onConflict: 'tenant_id,code', ignoreDuplicates: false })

  if (error) {
    errors.push({ row: 0, message: `Error BD bodegas: ${error.message}` })
    return { inserted: 0, errors }
  }

  return { inserted: validRows.length, errors }
}

// ─── IMPORT: PRODUCTS ────────────────────────────────────────────────────────

export async function importDolibarrProductsAction(
  rows: DolibarrProductRow[]
): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
  if (!tenantId) return { inserted: 0, errors: [{ row: 0, message: 'No se pudo obtener tenant_id' }] }

  const errors: ImportError[] = []
  const validRows: Record<string, unknown>[] = []

  rows.forEach((row, idx) => {
    const rowNum = idx + 2

    if (!row.name?.trim()) {
      errors.push({ row: rowNum, message: 'El campo name es obligatorio' })
      return
    }
    if (!row.sku?.trim()) {
      errors.push({ row: rowNum, message: 'El campo sku es obligatorio' })
      return
    }

    validRows.push({
      tenant_id: tenantId,
      sku: row.sku.trim(),
      name: row.name.trim(),
      type: mapProductType(row.type),
      uom: row.uom?.trim() || 'UNIT',
      status: row.status === 'inactive' ? 'inactive' : 'active',
      is_fixed_asset: false,
      track_serials: false,
    })
  })

  if (validRows.length === 0) return { inserted: 0, errors }

  const { error } = await supabase
    .from('products')
    .upsert(validRows, { onConflict: 'tenant_id,sku', ignoreDuplicates: false })

  if (error) {
    errors.push({ row: 0, message: `Error BD productos: ${error.message}` })
    return { inserted: 0, errors }
  }

  return { inserted: validRows.length, errors }
}

// ─── IMPORT: INVENTORY/STOCK (generates IN movements) ────────────────────────

export async function importDolibarrStockAction(
  rows: DolibarrStockRow[]
): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
  if (!tenantId) return { inserted: 0, errors: [{ row: 0, message: 'No se pudo obtener tenant_id' }] }

  const errors: ImportError[] = []

  // Fetch product SKU → id map
  const { data: productsList } = await supabase
    .from('products')
    .select('id, sku')
    .eq('tenant_id', tenantId)

  const productMap = new Map<string, string>()
  productsList?.forEach(p => productMap.set(p.sku, p.id))

  // Fetch warehouse code → id map
  const { data: warehousesList } = await supabase
    .from('warehouses')
    .select('id, code')
    .eq('tenant_id', tenantId)

  const warehouseMap = new Map<string, string>()
  warehousesList?.forEach(w => warehouseMap.set(w.code, w.id))

  const movements: Record<string, unknown>[] = []

  rows.forEach((row, idx) => {
    const rowNum = idx + 2

    if (!row.sku?.trim()) {
      errors.push({ row: rowNum, message: 'El campo sku es obligatorio' })
      return
    }

    const productId = productMap.get(row.sku.trim())
    if (!productId) {
      errors.push({ row: rowNum, message: `Producto no encontrado: ${row.sku}. Importa productos primero.` })
      return
    }

    const warehouseId = warehouseMap.get(row.warehouse_code?.trim() || '')
    if (!warehouseId) {
      errors.push({ row: rowNum, message: `Bodega no encontrada: ${row.warehouse_code}. Importa bodegas primero.` })
      return
    }

    const qty = parseNumber(row.qty)
    if (qty <= 0) return

    movements.push({
      tenant_id: tenantId,
      product_id: productId,
      warehouse_id: warehouseId,
      type: 'IN',
      qty,
      cost: parseNumber(row.unit_cost),
      ref_doc_type: 'OPENING_BALANCE',
      occurred_at: new Date().toISOString(),
    })
  })

  if (movements.length === 0) return { inserted: 0, errors }

  const { error } = await supabase.from('inventory_movements').insert(movements)

  if (error) {
    errors.push({ row: 0, message: `Error BD inventario: ${error.message}` })
    return { inserted: 0, errors }
  }

  return { inserted: movements.length, errors }
}

// ─── IMPORT: CHART OF ACCOUNTS (PUC) ─────────────────────────────────────────

export async function importDolibarrAccountsAction(
  rows: DolibarrAccountRow[]
): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
  if (!tenantId) return { inserted: 0, errors: [{ row: 0, message: 'No se pudo obtener tenant_id' }] }

  const errors: ImportError[] = []
  const validRows: Record<string, unknown>[] = []

  rows.forEach((row, idx) => {
    const rowNum = idx + 2

    if (!row.code?.trim()) {
      errors.push({ row: rowNum, message: 'El campo code es obligatorio' })
      return
    }
    if (!row.name?.trim()) {
      errors.push({ row: rowNum, message: 'El campo name es obligatorio' })
      return
    }

    const code = row.code.trim()
    const nature = row.nature?.trim().toUpperCase() === 'CREDIT' ? 'CREDIT' : deriveAccountNature(code)

    validRows.push({
      tenant_id: tenantId,
      code,
      name: row.name.trim(),
      nature,
      is_auxiliary: code.length >= 4,
    })
  })

  if (validRows.length === 0) return { inserted: 0, errors }

  const { error } = await supabase
    .from('chart_accounts')
    .upsert(validRows, { onConflict: 'tenant_id,code', ignoreDuplicates: false })

  if (error) {
    errors.push({ row: 0, message: `Error BD PUC: ${error.message}` })
    return { inserted: 0, errors }
  }

  return { inserted: validRows.length, errors }
}

// ─── IMPORT: INVOICES (sales) ────────────────────────────────────────────────

export async function importDolibarrInvoicesAction(
  rows: DolibarrInvoiceRow[]
): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
  if (!tenantId) return { inserted: 0, errors: [{ row: 0, message: 'No se pudo obtener tenant_id' }] }

  const errors: ImportError[] = []

  // Fetch party NIT → id map
  const { data: partiesList } = await supabase
    .from('parties')
    .select('id, nit, doc_number')
    .eq('tenant_id', tenantId)
    .eq('is_customer', true)

  const partyMap = new Map<string, string>()
  partiesList?.forEach(p => {
    if (p.nit) partyMap.set(p.nit, p.id)
    if (p.doc_number) partyMap.set(p.doc_number, p.id)
  })

  const validRows: Record<string, unknown>[] = []

  rows.forEach((row, idx) => {
    const rowNum = idx + 2

    if (!row.doc_number?.trim()) {
      errors.push({ row: rowNum, message: 'El campo doc_number es obligatorio' })
      return
    }

    const { nit } = extractNIT(row.client_nit, undefined)
    const partyId = partyMap.get(nit || '') || partyMap.get(row.client_nit || '')
    if (!partyId) {
      errors.push({ row: rowNum, message: `Cliente no encontrado: ${row.client_name} (${row.client_nit}). Importa terceros primero.` })
      return
    }

    const issueDate = normalizeDate(row.issue_date)
    if (!issueDate) {
      errors.push({ row: rowNum, message: `Fecha inválida: ${row.issue_date}` })
      return
    }

    validRows.push({
      tenant_id: tenantId,
      doc_type: 'INVOICE',
      number: row.doc_number.trim(),
      party_id: partyId,
      issue_date: issueDate,
      due_date: normalizeDate(row.due_date),
      currency: 'COP',
      subtotal: parseNumber(row.subtotal),
      taxes: parseNumber(row.taxes),
      total: parseNumber(row.total),
      status: mapDocumentStatus(row.status),
    })
  })

  if (validRows.length === 0) return { inserted: 0, errors }

  const { error } = await supabase
    .from('documents')
    .upsert(validRows, { onConflict: 'tenant_id,doc_type,number', ignoreDuplicates: true })

  if (error) {
    errors.push({ row: 0, message: `Error BD facturas: ${error.message}` })
    return { inserted: 0, errors }
  }

  return { inserted: validRows.length, errors }
}

// ─── IMPORT: RECEIVABLES (cartera por cobrar) ────────────────────────────────

export async function importDolibarrReceivablesAction(
  rows: DolibarrReceivableRow[]
): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
  if (!tenantId) return { inserted: 0, errors: [{ row: 0, message: 'No se pudo obtener tenant_id' }] }

  const errors: ImportError[] = []

  const { data: partiesList } = await supabase
    .from('parties')
    .select('id, nit, doc_number')
    .eq('tenant_id', tenantId)

  const partyMap = new Map<string, string>()
  partiesList?.forEach(p => {
    if (p.nit) partyMap.set(p.nit, p.id)
    if (p.doc_number) partyMap.set(p.doc_number, p.id)
  })

  const validRows: Record<string, unknown>[] = []

  rows.forEach((row, idx) => {
    const rowNum = idx + 2

    if (!row.doc_number?.trim()) {
      errors.push({ row: rowNum, message: 'El campo doc_number es obligatorio' })
      return
    }

    const { nit } = extractNIT(row.party_nit, undefined)
    const partyId = partyMap.get(nit || '') || partyMap.get(row.party_nit || '')
    if (!partyId) {
      errors.push({ row: rowNum, message: `Tercero no encontrado: ${row.party_name}` })
      return
    }

    const issueDate = normalizeDate(row.issue_date)
    if (!issueDate) {
      errors.push({ row: rowNum, message: `Fecha inválida` })
      return
    }

    const pending = parseNumber(row.balance_pending)
    if (pending <= 0) return

    validRows.push({
      tenant_id: tenantId,
      doc_type: 'INVOICE',
      number: row.doc_number.trim(),
      party_id: partyId,
      issue_date: issueDate,
      due_date: normalizeDate(row.due_date),
      currency: 'COP',
      subtotal: parseNumber(row.subtotal),
      taxes: parseNumber(row.taxes),
      total: parseNumber(row.total),
      status: 'ACCEPTED', // pending collection
    })
  })

  if (validRows.length === 0) return { inserted: 0, errors }

  const { error } = await supabase
    .from('documents')
    .upsert(validRows, { onConflict: 'tenant_id,doc_type,number', ignoreDuplicates: true })

  if (error) {
    errors.push({ row: 0, message: `Error BD cartera: ${error.message}` })
    return { inserted: 0, errors }
  }

  return { inserted: validRows.length, errors }
}

// ─── IMPORT: BOOKKEEPING (journal entries) ───────────────────────────────────

export async function importDolibarrBookkeepingAction(
  rows: DolibarrBookkeepingRow[]
): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
  if (!tenantId) return { inserted: 0, errors: [{ row: 0, message: 'No se pudo obtener tenant_id' }] }

  const errors: ImportError[] = []

  // Fetch chart_accounts code → id map
  const { data: accountsList } = await supabase
    .from('chart_accounts')
    .select('id, code')
    .eq('tenant_id', tenantId)

  const accountMap = new Map<string, string>()
  accountsList?.forEach(a => accountMap.set(a.code, a.id))

  // Group rows by entry_number
  type PendingEntry = {
    entry_number: string
    entry_date: string
    description: string
    lines: Array<{ account_id: string; debit: number; credit: number; description: string }>
  }
  const entries = new Map<string, PendingEntry>()

  rows.forEach((row, idx) => {
    const rowNum = idx + 2

    if (!row.entry_number?.trim()) {
      errors.push({ row: rowNum, message: 'El campo entry_number es obligatorio' })
      return
    }
    if (!row.account_code?.trim()) {
      errors.push({ row: rowNum, message: 'El campo account_code es obligatorio' })
      return
    }

    const accountId = accountMap.get(row.account_code.trim())
    if (!accountId) {
      errors.push({ row: rowNum, message: `Cuenta contable no encontrada: ${row.account_code}` })
      return
    }

    const entryDate = normalizeDate(row.entry_date)
    if (!entryDate) {
      errors.push({ row: rowNum, message: `Fecha inválida` })
      return
    }

    const entryNum = row.entry_number.trim()
    if (!entries.has(entryNum)) {
      entries.set(entryNum, {
        entry_number: entryNum,
        entry_date: entryDate,
        description: row.description?.trim() || `Asiento ${entryNum}`,
        lines: [],
      })
    }

    entries.get(entryNum)!.lines.push({
      account_id: accountId,
      debit: parseNumber(row.debit),
      credit: parseNumber(row.credit),
      description: row.description?.trim() || '',
    })
  })

  let insertedEntries = 0
  for (const [, entry] of entries) {
    const { data: je, error: jeErr } = await supabase
      .from('journal_entries')
      .insert({
        tenant_id: tenantId,
        entry_date: entry.entry_date,
        description: entry.description,
        number: entry.entry_number,
        period: entry.entry_date.substring(0, 7),
        status: 'POSTED',
      })
      .select('id')
      .single()

    if (jeErr || !je) {
      errors.push({ row: 0, message: `Error creando asiento ${entry.entry_number}: ${jeErr?.message}` })
      continue
    }

    const jeLines = entry.lines.map(l => ({
      tenant_id: tenantId,
      entry_id: je.id,
      account_id: l.account_id,
      debit: l.debit,
      credit: l.credit,
      description: l.description,
    }))

    const { error: lnErr } = await supabase.from('journal_lines').insert(jeLines)
    if (lnErr) {
      errors.push({ row: 0, message: `Error líneas asiento ${entry.entry_number}: ${lnErr.message}` })
    } else {
      insertedEntries++
    }
  }

  return { inserted: insertedEntries, errors }
}
