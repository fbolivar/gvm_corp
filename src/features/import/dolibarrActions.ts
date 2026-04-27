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
  lotes?: DolibarrLotRow[]
  contactos?: DolibarrContactRow[]
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
  pmp?: string
  vat_rate?: string
  barcode?: string
  stock_qty?: string
  stock_alert?: string
  track_lots?: string
  default_warehouse?: string
  weight?: string
  note_private?: string
  note_public?: string
  created_at?: string
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

export interface DolibarrPriceRow {
  sku?: string
  selling_price?: string
  min_selling_price?: string
  price_level?: string
}

export interface DolibarrSalesOrderRow {
  razon_social?: string
  nit?: string
  ref?: string
  fecha_orden?: string
  subtotal?: string
  total?: string
  estado?: string
  nota_publica?: string
  descripcion_linea?: string
  id_linea?: string
  cantidad?: string
  importe_linea?: string
  tasa_iva?: string
  etiqueta_producto?: string
  producto_ref?: string
}

export interface DolibarrLotRow {
  sku?: string
  warehouse_code?: string
  lot_number?: string
  qty?: string
  expiry_date?: string
  sellby_date?: string
}

export interface DolibarrContactRow {
  dolibarr_id?: string
  parent_dolibarr_id?: string
  parent_name?: string
  first_name?: string
  last_name?: string
  job_title?: string
  email?: string
  phone?: string
  mobile?: string
  is_active?: string
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
  // Dolibarr "Tipo de terceros": TE_PRIVATE = individuo, TE_SMALL/MEDIUM/LARGE = empresa
  if (v === 'PERSON' || v === 'PERSONA' || v === 'NATURAL' || v === 'TE_PRIVATE') return 'PERSON'
  return 'COMPANY'
}

// Limpia direcciones Dolibarr: convierte '\n' literal en espacio y colapsa espacios
function cleanAddress(raw: string | undefined): string | null {
  if (!raw) return null
  const cleaned = String(raw)
    .replace(/\\n/g, ' ')      // literal \n
    .replace(/[\r\n]+/g, ' ')  // real newlines
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || null
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

  // Party type: prioridad "Tipo de entidad comercial" > "Tipo de terceros" (GVM usa este último)
  const partyType =
    get('Tipo de entidad comercial') ||
    get('Tipo de terceros') ||
    get('party_type')

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
    party_type: partyType,
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
      address: cleanAddress(row.address),
      city: row.city?.trim() || null,
      department: row.department?.trim() || null,
      country: 'CO',
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

// Normaliza headers españoles del export Dolibarr 22.0.3 para almacenes.
// Convención GVM (confirmada con productos de muestra):
//   "Nombre corto de la ubicación" → code (ej. "B01 BOGOTA") — lo que
//       los productos referencian en "Almacén predeterminado".
//   "Almacén de localización" → name (ej. "BODEGA CENTRO (Bogotá)") —
//       descripción más legible.
//   "ID de almacén" → dolibarr_id
//   "Descripción almacén" → description
//   "Dirección" → address, "Población" → city
function normalizeDolibarrWarehouseRow(raw: Record<string, string>): DolibarrWarehouseRow {
  const row = raw as Record<string, string | undefined>
  const get = (key: string) => (row[key] ?? '').trim()

  const code =
    get('Nombre corto de la ubicación') ||
    get('Nombre corto de la ubicacion') ||
    get('Ref.') ||
    get('Ref') ||
    get('code')

  const name =
    get('Almacén de localización') ||
    get('Almacen de localizacion') ||
    get('Etiqueta') ||
    get('name') ||
    code // fallback: si no hay nombre largo, usar el code como nombre

  return {
    dolibarr_id: get('ID de almacén') || get('ID de almacen') || get('Id') || get('dolibarr_id'),
    code,
    name,
    description: get('Descripción almacén') || get('Descripcion almacen') || get('description'),
    address: get('Dirección') || get('Direccion') || get('address'),
    city: get('Población') || get('Poblacion') || get('city'),
  }
}

export async function importDolibarrWarehousesAction(
  rows: DolibarrWarehouseRow[] | Record<string, string>[]
): Promise<ImportResult> {
  try {
    const supabase = await createClient()
    const { data: tenantId, error: tenantErr } = await supabase.rpc('get_my_tenant_id')
    if (tenantErr) {
      return { inserted: 0, errors: [{ row: 0, message: `Error tenant: ${tenantErr.message}` }] }
    }
    if (!tenantId) {
      return { inserted: 0, errors: [{ row: 0, message: 'No se pudo obtener tenant_id' }] }
    }

    const errors: ImportError[] = []
    const validRows: Record<string, unknown>[] = []

    const sample = (rows[0] ?? {}) as Record<string, string | undefined>
    const isSpanishExport =
      'Nombre corto de la ubicación' in sample ||
      'Nombre corto de la ubicacion' in sample ||
      'ID de almacén' in sample ||
      'Almacén de localización' in sample

    rows.forEach((raw, idx) => {
      const rowNum = idx + 2
      const row: DolibarrWarehouseRow = isSpanishExport
        ? normalizeDolibarrWarehouseRow(raw as Record<string, string>)
        : (raw as DolibarrWarehouseRow)

      if (!row.name?.trim()) {
        errors.push({ row: rowNum, message: 'El campo "name" (Nombre corto de la ubicación) es obligatorio' })
        return
      }

      validRows.push({
        tenant_id: tenantId,
        code: row.code?.trim() || `WH-${String(idx + 1).padStart(3, '0')}`,
        name: row.name.trim(),
      })
    })

    if (validRows.length === 0) return { inserted: 0, errors }

    // Dedup por code — si Dolibarr duplica, el último gana
    const dedupedMap = new Map<string, Record<string, unknown>>()
    let duplicates = 0
    for (const row of validRows) {
      const key = row.code as string
      if (dedupedMap.has(key)) duplicates++
      dedupedMap.set(key, row)
    }
    const dedupedRows = Array.from(dedupedMap.values())

    // Cargar bodegas existentes (suelen ser pocas, no necesita paginación grande)
    const { data: existing, error: selErr } = await supabase
      .from('warehouses')
      .select('id, code')
      .eq('tenant_id', tenantId)

    if (selErr) {
      return {
        inserted: 0,
        errors: [{ row: 0, message: `Error leyendo bodegas existentes: ${selErr.message}` }],
      }
    }

    const existingMap = new Map<string, string>()
    existing?.forEach((w) => existingMap.set(w.code as string, w.id as string))

    const toInsert = dedupedRows.filter((r) => !existingMap.has(r.code as string))
    const toUpdate = dedupedRows.filter((r) => existingMap.has(r.code as string))

    let insertedCount = 0
    let updatedCount = 0

    if (toInsert.length > 0) {
      const { error: insErr, data: insData } = await supabase
        .from('warehouses')
        .insert(toInsert)
        .select('id')
      if (insErr) {
        errors.push({ row: 0, message: `Error insertando bodegas: ${insErr.message}` })
      } else {
        insertedCount = insData?.length || 0
      }
    }

    for (const row of toUpdate) {
      const id = existingMap.get(row.code as string)
      if (!id) continue
      const { error: updErr } = await supabase
        .from('warehouses')
        .update({ name: row.name })
        .eq('id', id)
      if (updErr) {
        errors.push({ row: 0, message: `Error actualizando ${row.code}: ${updErr.message}` })
      } else {
        updatedCount++
      }
    }

    if (duplicates > 0) {
      errors.push({ row: 0, message: `INFO: ${duplicates} bodegas con código duplicado fusionadas` })
    }
    if (updatedCount > 0) {
      errors.push({ row: 0, message: `INFO: ${updatedCount} bodegas ya existían y fueron actualizadas` })
    }

    return { inserted: insertedCount + updatedCount, errors }
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e)
    return { inserted: 0, errors: [{ row: 0, message: `Excepción: ${msg}` }] }
  }
}

// ─── IMPORT: PRODUCTS ────────────────────────────────────────────────────────

// Normaliza headers españoles del export Dolibarr 22.0.3 → DolibarrProductRow
// Este cliente (GVM) tiene quirks específicos:
//   - Precio de venta en $0 (usan listas de precios por segmento)
//   - CostPrice vacío pero "Precio promedio ponderado" sí trae valor
//   - Descripciones con " \ Und." al final (residuo del export)
//   - Stock con valores imposibles tipo "5e20" (notación científica/corrupción)
//   - IVA 0% default (productos veterinarios exentos)
//   - "Use número de lote/serie" crítico (trazabilidad veterinaria)
//   - Tipo: 0=producto, 1=servicio (Dolibarr)
//   - En venta: 1=activo, 0=obsoleto
function normalizeDolibarrProductRow(raw: Record<string, string>): DolibarrProductRow {
  const row = raw as Record<string, string | undefined>
  const get = (key: string) => (row[key] ?? '').trim()

  // Descripción limpia: remover sufijos tipo " \ Und." o " \ Kg." del export
  const descRaw = get('Descripción') || get('description')
  const description = descRaw.replace(/\s*\\\s*[A-Za-záéíóúñ.]+\.?\s*$/i, '').trim()

  // Status: "En venta" (1/0)
  const enVenta = get('En venta') || get('status')
  const status = enVenta === '0' ? 'inactive' : 'active'

  // Tipo: Dolibarr usa 0=producto, 1=servicio
  const tipo = get('Tipo') || get('type')
  const typeMapped = tipo === '1' ? 'SERVICE' : 'GOOD'

  // Fecha: truncar datetime
  const fechaRaw = get('Fecha de creación') || get('created_at')
  const fecha = fechaRaw ? fechaRaw.substring(0, 10) : ''

  return {
    dolibarr_id: get('Id') || get('dolibarr_id'),
    sku: get('Ref.') || get('Ref') || get('sku'),
    name: get('Etiqueta') || get('name'),
    description,
    type: typeMapped,
    status,
    barcode: get('Código de barras') || get('barcode'),
    sale_price: get('Precio unitario (excl.)') || get('sale_price'),
    cost: get('CostPrice') || get('cost'),
    pmp: get('Precio promedio ponderado') || get('pmp'),
    vat_rate: get('Tasa IVA') || get('vat_rate'),
    stock_qty: get('Stock') || get('stock_qty'),
    stock_alert: get('Límite de stock para alerta') || get('stock_alert'),
    track_lots: get('Use número de lote/serie') || get('track_lots'),
    weight: get('Peso') || get('weight'),
    default_warehouse: get('Almacén predeterminado') || get('default_warehouse'),
    note_private: get('Nota (privada)') || get('note_private'),
    note_public: get('Nota (pública)') || get('note_public'),
    created_at: fecha,
  }
}

// Sanea valores de stock que vienen corruptos de Dolibarr.
// Casos: "5e20" (notación científica = 5×10^20), vacío, negativos.
// Retorna { value, wasSanitized } para poder logear warnings.
function sanitizeStockValue(raw: string | undefined): { value: number; wasSanitized: boolean } {
  if (!raw || raw.trim() === '') return { value: 0, wasSanitized: false }
  const n = parseFloat(String(raw).replace(/,/g, '.').trim())
  if (isNaN(n)) return { value: 0, wasSanitized: true }
  // Imposible físicamente: más de 10 millones de unidades en una bodega veterinaria
  if (Math.abs(n) > 10_000_000) return { value: 0, wasSanitized: true }
  return { value: n, wasSanitized: false }
}

export async function importDolibarrProductsAction(
  rows: DolibarrProductRow[] | Record<string, string>[]
): Promise<ImportResult> {
  try {
    const supabase = await createClient()
    const { data: tenantId, error: tenantErr } = await supabase.rpc('get_my_tenant_id')
    if (tenantErr) {
      return { inserted: 0, errors: [{ row: 0, message: `Error tenant: ${tenantErr.message}` }] }
    }
    if (!tenantId) {
      return { inserted: 0, errors: [{ row: 0, message: 'No se pudo obtener tenant_id' }] }
    }

    const errors: ImportError[] = []
    const validRows: Record<string, unknown>[] = []

    const sample = (rows[0] ?? {}) as Record<string, string | undefined>
    const isSpanishExport =
      'Ref.' in sample || 'Ref' in sample || 'Etiqueta' in sample || 'CostPrice' in sample

    let stockSanitized = 0
    let skippedServices = 0
    let skippedEmpty = 0

    rows.forEach((raw) => {
      const row: DolibarrProductRow = isSpanishExport
        ? normalizeDolibarrProductRow(raw as Record<string, string>)
        : (raw as DolibarrProductRow)

      const name = row.name?.trim() || ''
      const sku = row.sku?.trim() || ''

      if (!name || !sku) {
        skippedEmpty++
        return
      }
      if (/^anulad/i.test(name)) {
        skippedEmpty++
        return
      }

      const costPrice = parseNumber(row.cost)
      const pmp = parseNumber(row.pmp)
      const unitCost = costPrice > 0 ? costPrice : pmp

      const salePrice = parseNumber(row.sale_price)

      const stockResult = sanitizeStockValue(row.stock_qty)
      if (stockResult.wasSanitized) stockSanitized++

      const vatRate = parseNumber(row.vat_rate)

      const productType = mapProductType(row.type)
      if (productType === 'SERVICE') skippedServices++

      const minStock = parseNumber(row.stock_alert)

      // NOTA: el stock real vive en la tabla product_stock (no en products).
      // La columna products.stock_quantity no existe en este schema.
      // stockResult.value se usa solo para el conteo informativo de saneamiento.
      void stockResult.value

      validRows.push({
        tenant_id: tenantId,
        sku,
        name: name.slice(0, 255),
        description: row.description?.trim()?.slice(0, 2000) || null,
        type: productType,
        uom: 'UNIT',
        status: 'ACTIVE',
        cost: unitCost,
        selling_price: salePrice,
        tax_category: vatRate > 0 ? 'IVA_19' : 'EXENTO',
        min_stock: minStock,
        barcode: row.barcode?.trim() || null,
      })
    })

    if (validRows.length === 0) {
      return {
        inserted: 0,
        errors: [{ row: 0, message: `No hay filas válidas. Vacías: ${skippedEmpty}` }],
      }
    }

    // Dedup por SKU — último gana
    const dedupedMap = new Map<string, Record<string, unknown>>()
    let duplicates = 0
    for (const row of validRows) {
      const key = row.sku as string
      if (dedupedMap.has(key)) duplicates++
      dedupedMap.set(key, row)
    }
    const dedupedRows = Array.from(dedupedMap.values())

    // Cargar todos los productos del tenant y filtrar en memoria.
    // No usamos .in('sku', [...]) porque PostgREST falla con "Bad Request"
    // si la URL excede ~4KB (2700+ SKUs la rebasan con creces).
    // Paginamos en chunks de 1000 para respetar el límite default de Supabase.
    const existingMap = new Map<string, string>()
    const pageSize = 1000
    let page = 0
    while (true) {
      const { data, error: selErr } = await supabase
        .from('products')
        .select('id, sku')
        .eq('tenant_id', tenantId)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (selErr) {
        return {
          inserted: 0,
          errors: [{ row: 0, message: `Error leyendo productos existentes: ${selErr.message}` }],
        }
      }
      if (!data || data.length === 0) break
      data.forEach((p) => {
        if (p.sku) existingMap.set(p.sku as string, p.id as string)
      })
      if (data.length < pageSize) break
      page++
    }

    const toInsert = dedupedRows.filter((r) => !existingMap.has(r.sku as string))
    const toUpdate = dedupedRows.filter((r) => existingMap.has(r.sku as string))

    let insertedCount = 0
    let updatedCount = 0

    // INSERT en chunks de 500 (Supabase PostgREST limit)
    if (toInsert.length > 0) {
      const chunkSize = 500
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize)
        const { error: insErr, data: insData } = await supabase
          .from('products')
          .insert(chunk)
          .select('id')

        if (insErr) {
          errors.push({
            row: 0,
            message: `Error insertando productos (chunk ${i}-${i + chunk.length}): ${insErr.message}`,
          })
        } else {
          insertedCount += insData?.length || 0
        }
      }
    }

    // UPDATE individual por SKU — usa columnas canónicas que la UI reconoce
    for (const row of toUpdate) {
      const id = existingMap.get(row.sku as string)
      if (!id) continue
      const { error: updErr } = await supabase
        .from('products')
        .update({
          name: row.name,
          description: row.description,
          type: row.type,
          uom: row.uom,
          status: row.status,
          cost: row.cost,
          selling_price: row.selling_price,
          tax_category: row.tax_category,
          min_stock: row.min_stock,
          barcode: row.barcode,
        })
        .eq('id', id)

      if (updErr) {
        errors.push({ row: 0, message: `Error actualizando ${row.sku}: ${updErr.message}` })
      } else {
        updatedCount++
      }
    }

    if (duplicates > 0) {
      errors.push({ row: 0, message: `INFO: ${duplicates} SKUs duplicados fusionados` })
    }
    if (stockSanitized > 0) {
      errors.push({
        row: 0,
        message: `INFO: ${stockSanitized} productos con stock corrupto ajustados a 0. Se recomienda conteo físico.`,
      })
    }
    if (skippedServices > 0) {
      errors.push({ row: 0, message: `INFO: ${skippedServices} servicios detectados` })
    }
    if (skippedEmpty > 0) {
      errors.push({ row: 0, message: `INFO: ${skippedEmpty} filas vacías ignoradas` })
    }
    if (updatedCount > 0) {
      errors.push({ row: 0, message: `INFO: ${updatedCount} productos actualizados (ya existían)` })
    }

    return { inserted: insertedCount + updatedCount, errors }
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e)
    return { inserted: 0, errors: [{ row: 0, message: `Excepción: ${msg}` }] }
  }
}

// ─── IMPORT: INVENTORY/STOCK (generates IN movements) ────────────────────────

// Normaliza headers del export "Stock y ubicación (almacén) de productos".
// Headers reales:
//   - Ref. → sku
//   - Nombre corto de la ubicación → warehouse_code (B01 BOGOTA)
//   - Stock → qty
//   - Precio promedio ponderado → unit_cost
function normalizeDolibarrStockRow(raw: Record<string, string>): DolibarrStockRow {
  const row = raw as Record<string, string | undefined>
  const get = (key: string) => (row[key] ?? '').trim()

  return {
    sku: get('Ref.') || get('Ref') || get('sku'),
    product_name: get('Etiqueta') || get('product_name'),
    warehouse_code:
      get('Nombre corto de la ubicación') ||
      get('Nombre corto de la ubicacion') ||
      get('warehouse_code'),
    warehouse_name: get('Almacén de localización') || get('warehouse_name'),
    qty: get('Stock') || get('qty') || get('Cantidad'),
    unit_cost:
      get('Precio promedio ponderado') ||
      get('PMP') ||
      get('unit_cost') ||
      get('CostPrice'),
  }
}

export async function importDolibarrStockAction(
  rows: DolibarrStockRow[] | Record<string, string>[]
): Promise<ImportResult> {
  try {
    const supabase = await createClient()
    const { data: tenantId, error: tenantErr } = await supabase.rpc('get_my_tenant_id')
    if (tenantErr) {
      return { inserted: 0, errors: [{ row: 0, message: `Error tenant: ${tenantErr.message}` }] }
    }
    if (!tenantId) {
      return { inserted: 0, errors: [{ row: 0, message: 'No se pudo obtener tenant_id' }] }
    }

    const errors: ImportError[] = []

    const sample = (rows[0] ?? {}) as Record<string, string | undefined>
    const isSpanishExport =
      'Ref.' in sample ||
      'Nombre corto de la ubicación' in sample ||
      'Nombre corto de la ubicacion' in sample ||
      'Stock' in sample ||
      'Precio promedio ponderado' in sample

    // Paginated fetch of products — bypass 1000-row default
    const productMap = new Map<string, string>()
    {
      const pageSize = 1000
      let offset = 0
      while (true) {
        const { data, error } = await supabase
          .from('products')
          .select('id, sku')
          .eq('tenant_id', tenantId)
          .range(offset, offset + pageSize - 1)
        if (error) {
          return { inserted: 0, errors: [{ row: 0, message: `Error leyendo productos: ${error.message}` }] }
        }
        if (!data || data.length === 0) break
        data.forEach((p) => { if (p.sku) productMap.set(p.sku as string, p.id as string) })
        if (data.length < pageSize) break
        offset += pageSize
      }
    }

    const { data: warehousesList, error: whErr } = await supabase
      .from('warehouses')
      .select('id, code')
      .eq('tenant_id', tenantId)
    if (whErr) {
      return { inserted: 0, errors: [{ row: 0, message: `Error leyendo bodegas: ${whErr.message}` }] }
    }
    const warehouseMap = new Map<string, string>()
    warehousesList?.forEach((w) => warehouseMap.set(w.code as string, w.id as string))

    const movements: Record<string, unknown>[] = []
    let sanitized = 0
    let skippedZero = 0
    let skippedNegative = 0
    let productNotFound = 0
    let warehouseNotFound = 0

    const nowIso = new Date().toISOString()

    rows.forEach((raw, idx) => {
      const row: DolibarrStockRow = isSpanishExport
        ? normalizeDolibarrStockRow(raw as Record<string, string>)
        : (raw as DolibarrStockRow)

      const sku = row.sku?.trim() || ''
      if (!sku) return

      const productId = productMap.get(sku)
      if (!productId) {
        productNotFound++
        return
      }

      const whCode = row.warehouse_code?.trim() || ''
      const warehouseId = warehouseMap.get(whCode)
      if (!warehouseId) {
        warehouseNotFound++
        if (warehouseNotFound <= 3) {
          errors.push({ row: idx + 2, message: `Bodega no encontrada: "${whCode}"` })
        }
        return
      }

      // Saneamiento de stock (reutiliza la lógica de productos)
      const stockResult = sanitizeStockValue(row.qty)
      if (stockResult.wasSanitized) {
        sanitized++
        return // no generamos movimiento si el valor era imposible
      }
      const qty = stockResult.value
      if (qty === 0) {
        skippedZero++
        return
      }
      if (qty < 0) {
        skippedNegative++
        return
      }

      movements.push({
        tenant_id: tenantId,
        product_id: productId,
        warehouse_id: warehouseId,
        type: 'IN',
        qty,
        cost: parseNumber(row.unit_cost),
        ref_doc_type: 'OPENING_BALANCE',
        occurred_at: nowIso,
      })
    })

    if (movements.length === 0) {
      if (productNotFound > 0) {
        errors.push({ row: 0, message: `${productNotFound} SKUs no encontrados (importa productos primero)` })
      }
      return { inserted: 0, errors }
    }

    // Insert en chunks para evitar límite de payload
    const chunkSize = 500
    let insertedCount = 0
    for (let i = 0; i < movements.length; i += chunkSize) {
      const chunk = movements.slice(i, i + chunkSize)
      const { error: insErr } = await supabase.from('inventory_movements').insert(chunk)
      if (insErr) {
        errors.push({ row: 0, message: `Error insertando movimientos (chunk ${i}-${i + chunk.length}): ${insErr.message}` })
      } else {
        insertedCount += chunk.length
      }
    }

    if (sanitized > 0) {
      errors.push({ row: 0, message: `INFO: ${sanitized} stocks corruptos (ej: 5e20) ignorados. Requieren conteo físico.` })
    }
    if (skippedZero > 0) {
      errors.push({ row: 0, message: `INFO: ${skippedZero} productos con stock 0 ignorados` })
    }
    if (skippedNegative > 0) {
      errors.push({ row: 0, message: `INFO: ${skippedNegative} productos con stock negativo ignorados (requieren ajuste)` })
    }
    if (productNotFound > 0) {
      errors.push({ row: 0, message: `INFO: ${productNotFound} SKUs del CSV no existen en productos` })
    }
    if (warehouseNotFound > 3) {
      errors.push({ row: 0, message: `INFO: ${warehouseNotFound} filas con bodega no encontrada en total` })
    }

    return { inserted: insertedCount, errors }
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e)
    return { inserted: 0, errors: [{ row: 0, message: `Excepción: ${msg}` }] }
  }
}

// ─── IMPORT: PRODUCT LOTS (Lotes/Series) ─────────────────────────────────────
// Headers Dolibarr 22.0.3 export "Existencias y ubicación con número de lote/serie":
//   - Nombre corto de la ubicación → warehouse_code (B01 BOGOTA)
//   - Ref. → sku
//   - Lote/Serie → lot_number
//   - Cant. → qty
//   - Fecha de consumo → expiry_date (eatby)
//   - Fecha de venta → sellby_date
function normalizeDolibarrLotRow(raw: Record<string, string>): DolibarrLotRow {
  const row = raw as Record<string, string | undefined>
  const get = (key: string) => (row[key] ?? '').trim()

  return {
    warehouse_code:
      get('Nombre corto de la ubicación') ||
      get('Nombre corto de la ubicacion') ||
      get('warehouse_code'),
    sku: get('Ref.') || get('Ref') || get('sku'),
    lot_number: get('Lote/Serie') || get('lot_number') || get('batch'),
    qty: get('Cant.') || get('Cant') || get('qty') || get('Cantidad'),
    expiry_date:
      get('Fecha de consumo') ||
      get('expiry_date') ||
      get('eatby'),
    sellby_date: get('Fecha de venta') || get('sellby_date') || get('sellby'),
  }
}

export async function importDolibarrLotsAction(
  rows: DolibarrLotRow[] | Record<string, string>[]
): Promise<ImportResult> {
  try {
    const supabase = await createClient()
    const { data: tenantId, error: tenantErr } = await supabase.rpc('get_my_tenant_id')
    if (tenantErr) {
      return { inserted: 0, errors: [{ row: 0, message: `Error tenant: ${tenantErr.message}` }] }
    }
    if (!tenantId) {
      return { inserted: 0, errors: [{ row: 0, message: 'No se pudo obtener tenant_id' }] }
    }

    const errors: ImportError[] = []

    const sample = (rows[0] ?? {}) as Record<string, string | undefined>
    const isSpanishExport =
      'Ref.' in sample ||
      'Lote/Serie' in sample ||
      'Fecha de consumo' in sample ||
      'Cant.' in sample

    // Paginated fetch of products — bypass 1000-row default
    const productMap = new Map<string, string>()
    {
      const pageSize = 1000
      let offset = 0
      while (true) {
        const { data, error } = await supabase
          .from('products')
          .select('id, sku')
          .eq('tenant_id', tenantId)
          .range(offset, offset + pageSize - 1)
        if (error) {
          return { inserted: 0, errors: [{ row: 0, message: `Error leyendo productos: ${error.message}` }] }
        }
        if (!data || data.length === 0) break
        data.forEach((p) => { if (p.sku) productMap.set(p.sku as string, p.id as string) })
        if (data.length < pageSize) break
        offset += pageSize
      }
    }

    const { data: warehousesList, error: whErr } = await supabase
      .from('warehouses')
      .select('id, code')
      .eq('tenant_id', tenantId)
    if (whErr) {
      return { inserted: 0, errors: [{ row: 0, message: `Error leyendo bodegas: ${whErr.message}` }] }
    }
    const warehouseMap = new Map<string, string>()
    warehousesList?.forEach((w) => warehouseMap.set(w.code as string, w.id as string))

    // Dedup por (product_id + warehouse_id + lot_number) — mantiene primero
    const lotMap = new Map<string, Record<string, unknown>>()
    let sanitized = 0
    let skippedZero = 0
    let skippedNegative = 0
    let skippedNoExpiry = 0
    let skippedNoLot = 0
    let productNotFound = 0
    let warehouseNotFound = 0
    let duplicates = 0
    let expiredCount = 0

    const today = new Date().toISOString().substring(0, 10)

    rows.forEach((raw) => {
      const row: DolibarrLotRow = isSpanishExport
        ? normalizeDolibarrLotRow(raw as Record<string, string>)
        : (raw as DolibarrLotRow)

      const sku = row.sku?.trim() || ''
      if (!sku) return

      const productId = productMap.get(sku)
      if (!productId) {
        productNotFound++
        return
      }

      const whCode = row.warehouse_code?.trim() || ''
      const warehouseId = warehouseMap.get(whCode)
      if (!warehouseId) {
        warehouseNotFound++
        return
      }

      const lotNumber = row.lot_number?.trim() || ''
      if (!lotNumber) {
        skippedNoLot++
        return
      }

      // Saneamiento de qty (reutiliza lógica de stock)
      const qtyResult = sanitizeStockValue(row.qty)
      if (qtyResult.wasSanitized) {
        sanitized++
        return
      }
      const qty = qtyResult.value
      if (qty === 0) {
        skippedZero++
        return
      }
      if (qty < 0) {
        skippedNegative++
        return
      }

      // expiration_date es NOT NULL en DB — skip si vacío
      const expiryDate = normalizeDate(row.expiry_date)
      if (!expiryDate) {
        skippedNoExpiry++
        return
      }

      const sellbyDate = normalizeDate(row.sellby_date)
      const status = expiryDate < today ? 'EXPIRED' : 'ACTIVE'
      if (status === 'EXPIRED') expiredCount++

      const key = `${productId}|${warehouseId}|${lotNumber}`
      if (lotMap.has(key)) {
        duplicates++
        return
      }

      lotMap.set(key, {
        tenant_id: tenantId,
        product_id: productId,
        warehouse_id: warehouseId,
        lot_number: lotNumber,
        qty,
        cost: 0,
        expiration_date: expiryDate,
        manufacture_date: sellbyDate, // Dolibarr "Fecha de venta" ≈ aprox manufactura/recomendación
        status,
      })
    })

    const lots = Array.from(lotMap.values())
    if (lots.length === 0) {
      if (productNotFound > 0) {
        errors.push({ row: 0, message: `${productNotFound} SKUs no encontrados (importa productos primero)` })
      }
      if (skippedNoExpiry > 0) {
        errors.push({ row: 0, message: `${skippedNoExpiry} lotes sin fecha de vencimiento (campo obligatorio)` })
      }
      return { inserted: 0, errors }
    }

    // Upsert en chunks (unique index por tenant_id,product_id,warehouse_id,lot_number)
    const chunkSize = 500
    let insertedCount = 0
    for (let i = 0; i < lots.length; i += chunkSize) {
      const chunk = lots.slice(i, i + chunkSize)
      const { error: insErr } = await supabase
        .from('product_lots')
        .upsert(chunk, { onConflict: 'tenant_id,product_id,warehouse_id,lot_number', ignoreDuplicates: false })
      if (insErr) {
        errors.push({ row: 0, message: `Error insertando lotes (chunk ${i}-${i + chunk.length}): ${insErr.message}` })
      } else {
        insertedCount += chunk.length
      }
    }

    if (sanitized > 0) {
      errors.push({ row: 0, message: `INFO: ${sanitized} lotes con cantidad corrupta (ej: 5e20) ignorados` })
    }
    if (skippedZero > 0) {
      errors.push({ row: 0, message: `INFO: ${skippedZero} lotes con cantidad 0 ignorados` })
    }
    if (skippedNegative > 0) {
      errors.push({ row: 0, message: `INFO: ${skippedNegative} lotes con cantidad negativa ignorados (requieren ajuste)` })
    }
    if (skippedNoExpiry > 0) {
      errors.push({ row: 0, message: `INFO: ${skippedNoExpiry} lotes sin fecha de vencimiento ignorados (obligatorio)` })
    }
    if (skippedNoLot > 0) {
      errors.push({ row: 0, message: `INFO: ${skippedNoLot} filas sin número de lote ignoradas` })
    }
    if (duplicates > 0) {
      errors.push({ row: 0, message: `INFO: ${duplicates} lotes duplicados consolidados` })
    }
    if (expiredCount > 0) {
      errors.push({ row: 0, message: `INFO: ${expiredCount} lotes ya vencidos importados con status EXPIRED` })
    }
    if (productNotFound > 0) {
      errors.push({ row: 0, message: `INFO: ${productNotFound} SKUs del CSV no existen en productos` })
    }
    if (warehouseNotFound > 0) {
      errors.push({ row: 0, message: `INFO: ${warehouseNotFound} filas con bodega no encontrada` })
    }

    return { inserted: insertedCount, errors }
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e)
    return { inserted: 0, errors: [{ row: 0, message: `Excepción: ${msg}` }] }
  }
}

// ─── IMPORT: CONTACTS (Opción A: consolidar correo en parties.email) ─────────
// Headers Dolibarr 22.0.3 export "Contactos/direcciones":
//   - Id contacto → dolibarr_id (del contacto)
//   - Id empresa → parent_dolibarr_id (match con party_external_ids)
//   - Razón social → parent_name (fallback)
//   - Nombre / Apellidos / Puesto de trabajo
//   - Correo / Teléfono / Mobile
//   - Estado (1=activo, 0=inactivo)
//
// Estrategia: solo actualiza parties.email/phone si la empresa NO tiene ya.
// Primera aparición de contacto activo con email gana.
function normalizeDolibarrContactRow(raw: Record<string, string>): DolibarrContactRow {
  const row = raw as Record<string, string | undefined>
  const get = (key: string) => (row[key] ?? '').trim()

  return {
    dolibarr_id: get('Id contacto') || get('dolibarr_id'),
    parent_dolibarr_id: get('Id empresa') || get('parent_dolibarr_id'),
    parent_name: get('Razón social') || get('parent_name'),
    first_name: get('Nombre') || get('first_name'),
    last_name: get('Apellidos') || get('last_name'),
    job_title: get('Puesto de trabajo') || get('job_title'),
    email: get('Correo') || get('email'),
    phone: get('Teléfono') || get('phone'),
    mobile: get('Mobile') || get('Móvil') || get('mobile'),
    is_active: get('Estado') || get('is_active'),
  }
}

export async function importDolibarrContactsAction(
  rows: DolibarrContactRow[] | Record<string, string>[]
): Promise<ImportResult> {
  try {
    const supabase = await createClient()
    const { data: tenantId, error: tenantErr } = await supabase.rpc('get_my_tenant_id')
    if (tenantErr) {
      return { inserted: 0, errors: [{ row: 0, message: `Error tenant: ${tenantErr.message}` }] }
    }
    if (!tenantId) {
      return { inserted: 0, errors: [{ row: 0, message: 'No se pudo obtener tenant_id' }] }
    }

    const errors: ImportError[] = []

    const sample = (rows[0] ?? {}) as Record<string, string | undefined>
    const isSpanishExport =
      'Id contacto' in sample ||
      'Razón social' in sample ||
      'Id empresa' in sample ||
      'Puesto de trabajo' in sample

    // Lookup dolibarr_societe_id → party_id (importado en terceros)
    const externalIdMap = new Map<string, string>()
    {
      const pageSize = 1000
      let offset = 0
      while (true) {
        const { data, error } = await supabase
          .from('party_external_ids')
          .select('party_id, source_id')
          .eq('tenant_id', tenantId)
          .eq('source_system', 'DOLIBARR')
          .eq('source_table', 'llx_societe')
          .range(offset, offset + pageSize - 1)
        if (error) {
          return { inserted: 0, errors: [{ row: 0, message: `Error leyendo party_external_ids: ${error.message}` }] }
        }
        if (!data || data.length === 0) break
        data.forEach((e) => externalIdMap.set(String(e.source_id), e.party_id as string))
        if (data.length < pageSize) break
        offset += pageSize
      }
    }

    // Cargar email/phone actuales de todas las parties (para saber cuáles NO tienen)
    const partyInfoMap = new Map<string, { email: string | null; phone: string | null }>()
    {
      const pageSize = 1000
      let offset = 0
      while (true) {
        const { data, error } = await supabase
          .from('parties')
          .select('id, email, phone')
          .eq('tenant_id', tenantId)
          .range(offset, offset + pageSize - 1)
        if (error) {
          return { inserted: 0, errors: [{ row: 0, message: `Error leyendo parties: ${error.message}` }] }
        }
        if (!data || data.length === 0) break
        data.forEach((p) =>
          partyInfoMap.set(p.id as string, {
            email: (p.email as string) || null,
            phone: (p.phone as string) || null,
          })
        )
        if (data.length < pageSize) break
        offset += pageSize
      }
    }

    // Agrupar: primer contacto activo con email gana por empresa
    const emailByParty = new Map<string, string>()
    const phoneByParty = new Map<string, string>()
    let skippedNoParentId = 0
    let skippedInactive = 0
    let skippedNoEmail = 0
    let skippedPartyNotFound = 0

    rows.forEach((raw) => {
      const row: DolibarrContactRow = isSpanishExport
        ? normalizeDolibarrContactRow(raw as Record<string, string>)
        : (raw as DolibarrContactRow)

      const parentId = row.parent_dolibarr_id?.trim() || ''
      if (!parentId) {
        skippedNoParentId++
        return
      }

      const stateRaw = (row.is_active || '').trim()
      if (stateRaw === '0' || stateRaw.toLowerCase() === 'false') {
        skippedInactive++
        return
      }

      const partyId = externalIdMap.get(parentId)
      if (!partyId) {
        skippedPartyNotFound++
        return
      }

      const email = row.email?.trim().toLowerCase() || ''
      const phone = normalizePhone(row.mobile) || normalizePhone(row.phone) || ''

      if (!email && !phone) {
        skippedNoEmail++
        return
      }

      if (email && !emailByParty.has(partyId)) {
        emailByParty.set(partyId, email)
      }
      if (phone && !phoneByParty.has(partyId)) {
        phoneByParty.set(partyId, phone)
      }
    })

    // Aplicar actualizaciones — SOLO si la party no tiene email/phone ya
    let emailsAdded = 0
    let phonesAdded = 0
    let alreadyHadEmail = 0
    let alreadyHadPhone = 0
    let updatedCount = 0

    const partyIdsToUpdate = new Set<string>([
      ...emailByParty.keys(),
      ...phoneByParty.keys(),
    ])

    for (const partyId of partyIdsToUpdate) {
      const info = partyInfoMap.get(partyId)
      if (!info) continue

      const payload: Record<string, unknown> = {}

      const email = emailByParty.get(partyId)
      if (email) {
        if (info.email) {
          alreadyHadEmail++
        } else {
          payload.email = email
          emailsAdded++
        }
      }

      const phone = phoneByParty.get(partyId)
      if (phone) {
        if (info.phone) {
          alreadyHadPhone++
        } else {
          payload.phone = phone
          phonesAdded++
        }
      }

      if (Object.keys(payload).length === 0) continue

      const { error: updErr } = await supabase
        .from('parties')
        .update(payload)
        .eq('id', partyId)
        .eq('tenant_id', tenantId)
      if (updErr) {
        if (errors.length < 5) {
          errors.push({ row: 0, message: `Error actualizando party ${partyId}: ${updErr.message}` })
        }
      } else {
        updatedCount++
      }
    }

    if (emailsAdded > 0) {
      errors.push({ row: 0, message: `INFO: ${emailsAdded} correos agregados a empresas sin contacto previo` })
    }
    if (phonesAdded > 0) {
      errors.push({ row: 0, message: `INFO: ${phonesAdded} teléfonos agregados a empresas sin contacto previo` })
    }
    if (alreadyHadEmail > 0) {
      errors.push({ row: 0, message: `INFO: ${alreadyHadEmail} empresas ya tenían correo — contactos ignorados` })
    }
    if (alreadyHadPhone > 0) {
      errors.push({ row: 0, message: `INFO: ${alreadyHadPhone} empresas ya tenían teléfono — contactos ignorados` })
    }
    if (skippedInactive > 0) {
      errors.push({ row: 0, message: `INFO: ${skippedInactive} contactos inactivos ignorados` })
    }
    if (skippedNoParentId > 0) {
      errors.push({ row: 0, message: `INFO: ${skippedNoParentId} contactos sin empresa padre ignorados` })
    }
    if (skippedNoEmail > 0) {
      errors.push({ row: 0, message: `INFO: ${skippedNoEmail} contactos sin correo ni teléfono ignorados` })
    }
    if (skippedPartyNotFound > 0) {
      errors.push({ row: 0, message: `INFO: ${skippedPartyNotFound} contactos con empresa no encontrada (¿importaste terceros primero?)` })
    }

    return { inserted: updatedCount, errors }
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e)
    return { inserted: 0, errors: [{ row: 0, message: `Excepción: ${msg}` }] }
  }
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

// ─── IMPORT: PRICES (selling_price per SKU) ──────────────────────────────────

// Normaliza headers del export de precios multi-nivel de Dolibarr 22.0.3.
// Los headers reales del dataset "Productos y precios para cada segmento de
// precios" son: Ref., Nivel de precios, PriceLevelUnitPriceHT,
// MinPriceLevelUnitPriceHT (HT = Hors Taxe = sin IVA, lo que usamos en Colombia).
// También acepta aliases en español y formatos manuales.
function normalizeDolibarrPriceRow(raw: Record<string, string>): DolibarrPriceRow {
  const row = raw as Record<string, string | undefined>
  const get = (key: string) => (row[key] ?? '').trim()

  return {
    sku: get('Ref.') || get('Ref') || get('SKU') || get('sku'),
    selling_price:
      // Nombres reales del export multi-nivel (HT = sin IVA)
      get('PriceLevelUnitPriceHT') ||
      get('PriceLevelUnitPrice') ||
      // Aliases en español / manuales
      get('Precio de venta') ||
      get('Precio venta') ||
      get('Precio') ||
      get('price') ||
      get('selling_price'),
    min_selling_price:
      get('MinPriceLevelUnitPriceHT') ||
      get('MinPriceLevelUnitPrice') ||
      get('Precio mínimo') ||
      get('Precio minimo') ||
      get('Min. precio de venta') ||
      get('min_selling_price'),
    price_level:
      get('Nivel de precios') || get('Nivel de precio') || get('price_level') || get('level'),
  }
}

export async function importDolibarrPricesAction(
  rows: DolibarrPriceRow[] | Record<string, string>[]
): Promise<ImportResult> {
  try {
    const supabase = await createClient()
    const { data: tenantId, error: tenantErr } = await supabase.rpc('get_my_tenant_id')
    if (tenantErr) {
      return { inserted: 0, errors: [{ row: 0, message: `Error tenant: ${tenantErr.message}` }] }
    }
    if (!tenantId) {
      return { inserted: 0, errors: [{ row: 0, message: 'No se pudo obtener tenant_id' }] }
    }

    const errors: ImportError[] = []
    const sample = (rows[0] ?? {}) as Record<string, string | undefined>
    const isSpanishExport =
      'Ref.' in sample ||
      'PriceLevelUnitPriceHT' in sample ||
      'Nivel de precios' in sample ||
      'Precio de venta' in sample ||
      'Precio venta' in sample ||
      'Precio' in sample

    // Normalizar y deduplicar por SKU (último precio gana)
    const priceMap = new Map<string, { price: number; minPrice: number }>()
    let skippedNoSku = 0
    let skippedZero = 0
    let skippedWrongLevel = 0

    rows.forEach((raw) => {
      const row: DolibarrPriceRow = isSpanishExport
        ? normalizeDolibarrPriceRow(raw as Record<string, string>)
        : (raw as DolibarrPriceRow)

      const sku = row.sku?.trim() || ''
      if (!sku) {
        skippedNoSku++
        return
      }

      // Si viene columna "Nivel de precios", solo procesamos nivel 1
      // (protege contra que Ana olvide filtrar y exporte los 5 niveles)
      const level = row.price_level?.trim() || ''
      if (level && level !== '1') {
        skippedWrongLevel++
        return
      }

      const price = parseNumber(row.selling_price)
      const minPrice = parseNumber(row.min_selling_price)

      // Ignora precios en 0 (producto sin precio configurado en este nivel)
      if (price <= 0) {
        skippedZero++
        return
      }

      priceMap.set(sku, { price, minPrice })
    })

    if (priceMap.size === 0) {
      return {
        inserted: 0,
        errors: [{ row: 0, message: 'No hay precios válidos para importar (todos en 0 o sin SKU)' }],
      }
    }

    // Cargar productos existentes (paginado — evita URL length limit)
    const existingMap = new Map<string, string>()
    const pageSize = 1000
    let page = 0
    while (true) {
      const { data, error: selErr } = await supabase
        .from('products')
        .select('id, sku')
        .eq('tenant_id', tenantId)
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (selErr) {
        return {
          inserted: 0,
          errors: [{ row: 0, message: `Error leyendo productos: ${selErr.message}` }],
        }
      }
      if (!data || data.length === 0) break
      data.forEach((p) => {
        if (p.sku) existingMap.set(p.sku as string, p.id as string)
      })
      if (data.length < pageSize) break
      page++
    }

    let updatedCount = 0
    let notFoundCount = 0

    for (const [sku, { price }] of priceMap) {
      const id = existingMap.get(sku)
      if (!id) {
        notFoundCount++
        continue
      }
      const { error: updErr } = await supabase
        .from('products')
        .update({ selling_price: price })
        .eq('id', id)

      if (updErr) {
        errors.push({ row: 0, message: `Error actualizando ${sku}: ${updErr.message}` })
      } else {
        updatedCount++
      }
    }

    if (skippedNoSku > 0) {
      errors.push({ row: 0, message: `INFO: ${skippedNoSku} filas sin SKU ignoradas` })
    }
    if (skippedZero > 0) {
      errors.push({ row: 0, message: `INFO: ${skippedZero} precios en 0 ignorados` })
    }
    if (skippedWrongLevel > 0) {
      errors.push({
        row: 0,
        message: `INFO: ${skippedWrongLevel} filas de niveles 2-5 ignoradas (solo procesamos nivel 1)`,
      })
    }
    if (notFoundCount > 0) {
      errors.push({
        row: 0,
        message: `INFO: ${notFoundCount} SKUs del CSV no existen en productos (importa productos primero)`,
      })
    }

    return { inserted: updatedCount, errors }
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e)
    return { inserted: 0, errors: [{ row: 0, message: `Excepción: ${msg}` }] }
  }
}

// ─── IMPORT: ÓRDENES DE VENTA (Dolibarr) ─────────────────────────────────────
// CSV exportado desde Herramientas → Export → Pedidos de clientes
// Columnas esperadas (export Dolibarr en español):
//   Razón social, ID profesional 1, Ref., Fecha de orden,
//   Total (sin imp.), Total, Estado, Nota (pública),
//   Descripción de la línea, ID de línea, Cantidad por línea,
//   Importe excl. impuesto por línea, Tasa de IVA de la línea,
//   Etiqueta del producto, Producto ref.

function mapSalesOrderStatus(raw: string | undefined): string {
  const v = (raw ?? '').trim()
  if (v === '-1') return 'VOIDED'
  if (v === '0')  return 'DRAFT'
  if (v === '1' || v === '2' || v === '3') return 'SENT'
  const u = v.toUpperCase()
  if (u.includes('CANCEL') || u.includes('ANULA') || u.includes('ANNUL')) return 'VOIDED'
  if (u.includes('VALID') || u.includes('PROCESO') || u.includes('ENTREGA') || u.includes('LIVR')) return 'SENT'
  return 'DRAFT'
}

export async function importDolibarrSalesOrdersAction(
  rawRows: Record<string, string>[]
): Promise<ImportResult> {
  const supabase = await createClient()
  const { data: tenantId } = await supabase.rpc('get_my_tenant_id')
  if (!tenantId) return { inserted: 0, errors: [{ row: 0, message: 'No se pudo obtener tenant_id' }] }

  const errors: ImportError[] = []

  // Limpia texto Dolibarr: quita \n literal, Pa?s y caracteres raros
  const cleanText = (v: string) =>
    v.replace(/\\n/g, ' ')          // \n literal → espacio
     .replace(/Pa\?s/g, 'País')     // encoding roto
     .replace(/\s+/g, ' ')
     .trim()

  const normalize = (raw: Record<string, string>) => ({
    razon_social:      cleanText(raw['Razón social']                        ?? ''),
    nit:               (raw['ID profesional 1']                             ?? '').trim(),
    ref:               (raw['Ref.']                                         ?? '').trim(),
    fecha_orden:       (raw['Fecha de orden']                               ?? '').trim(),
    subtotal:          (raw['Total (sin imp.)']                             ?? '').trim(),
    total:             (raw['Total']                                        ?? '').trim(),
    estado:            (raw['Estado']                                       ?? '').trim(),
    nota_publica:      cleanText(raw['Nota (pública)']                      ?? ''),
    descripcion_linea: cleanText(raw['Descripción de la línea']             ?? ''),
    cantidad:          (raw['Cantidad por línea']                           ?? '').trim(),
    importe_linea:     (raw['Importe excl. impuesto por línea']             ?? '').trim(),
    tasa_iva:          (raw['Tasa de IVA de la línea']                      ?? '').trim(),
    etiqueta_producto: cleanText(raw['Etiqueta del producto']               ?? ''),
  })

  const rows = rawRows.map(normalize)

  // Agrupar por Ref.
  const orderMap = new Map<string, ReturnType<typeof normalize>[]>()
  for (const row of rows) {
    if (!row.ref) continue
    if (!orderMap.has(row.ref)) orderMap.set(row.ref, [])
    orderMap.get(row.ref)!.push(row)
  }

  if (orderMap.size === 0) {
    return { inserted: 0, errors: [{ row: 0, message: 'No se encontraron referencias de orden (columna "Ref." vacía o faltante)' }] }
  }

  // Órdenes existentes (detectar duplicados)
  const { data: existingDocs } = await supabase
    .from('documents')
    .select('number')
    .eq('tenant_id', tenantId)
    .eq('doc_type', 'SALES_ORDER')

  const existingNumbers = new Set((existingDocs ?? []).map((d: Record<string, string>) => d.number))

  // Parties del tenant (cruzar por NIT o nombre)
  const { data: partiesData } = await supabase
    .from('parties')
    .select('id, legal_name, doc_number')
    .eq('tenant_id', tenantId)

  const parties = (partiesData ?? []) as { id: string; legal_name: string; doc_number: string | null }[]
  // Filtrar claves vacías: evita que parties sin dígitos capturen órdenes con NIT vacío
  const partyByNit = new Map(
    parties
      .filter(p => p.doc_number)
      .map(p => [p.doc_number!.replace(/[^0-9]/g, ''), p.id] as [string, string])
      .filter(([k]) => k !== '')
  )
  const partyByName = new Map(parties.map(p => [p.legal_name.toUpperCase().trim(), p.id]))

  // ── Auto-crear parties faltantes ─────────────────────────────────────────
  const toCreate = new Map<string, { nit: string; name: string }>()
  for (const [, lineRows] of orderMap) {
    const h = lineRows[0]
    if (!h.razon_social) continue
    const nameKey = h.razon_social.toUpperCase().trim()
    const nk = h.nit.replace(/[^0-9]/g, '')
    if (!partyByName.has(nameKey) && !(nk && partyByNit.has(nk))) {
      toCreate.set(nameKey, { nit: h.nit, name: h.razon_social })
    }
  }
  if (toCreate.size > 0) {
    const newParties = Array.from(toCreate.values()).map(p => {
      const isCompany = /S\.?A\.?S\.?|LTDA|S\.?A\.|CIA\b|CORP\b|S\.?EN\s*C|SAS\b/i.test(p.name)
      const docNum = p.nit || `DOL-${p.name.replace(/[^A-Z0-9]/gi, '-').toUpperCase().slice(0, 40)}`
      return {
        tenant_id: tenantId, legal_name: p.name, doc_number: docNum,
        doc_type: isCompany ? 'NIT' : 'CC',
        party_type: isCompany ? 'COMPANY' : 'PERSON',
        is_customer: true, is_vendor: false,
      }
    })
    for (let i = 0; i < newParties.length; i += 200) {
      const { data: created } = await supabase
        .from('parties')
        .upsert(newParties.slice(i, i + 200), { onConflict: 'tenant_id,doc_number', ignoreDuplicates: false })
        .select('id, legal_name')
      for (const p of (created ?? []) as { id: string; legal_name: string }[]) {
        partyByName.set(p.legal_name.toUpperCase().trim(), p.id)
      }
    }
    // Recuperar también las que ya existían y no fueron devueltas por upsert
    const stillMissing = Array.from(toCreate.values())
      .filter(p => !partyByName.has(p.name.toUpperCase().trim()))
      .map(p => p.name)
    if (stillMissing.length > 0) {
      for (let i = 0; i < stillMissing.length; i += 200) {
        const { data: existing } = await supabase
          .from('parties')
          .select('id, legal_name')
          .eq('tenant_id', tenantId)
          .in('legal_name', stillMissing.slice(i, i + 200))
        for (const p of (existing ?? []) as { id: string; legal_name: string }[]) {
          partyByName.set(p.legal_name.toUpperCase().trim(), p.id)
        }
      }
    }
  }

  // ── Construir lotes de documentos válidos ────────────────────────────────
  type DocPayload = {
    tenant_id: string; doc_type: string; number: string; party_id: string
    issue_date: string; subtotal: number; taxes: number; total: number
    balance: number; status: string; notes_public: string | null
    notes_internal: string; currency: string
  }
  type LinePayload = {
    description: string; qty: number; unit_price: number
    line_total: number; tax_config: unknown[]
    _ref: string
  }

  const docsToInsert: DocPayload[] = []
  const linesByRef = new Map<string, Omit<LinePayload, '_ref'>[]>()

  for (const [ref, lineRows] of orderMap) {
    if (existingNumbers.has(ref)) {
      errors.push({ row: 0, message: `INFO: Orden "${ref}" ya existe — omitida` })
      continue
    }

    const header = lineRows[0]
    const nitClean = (header.nit ?? '').replace(/[^0-9]/g, '')
    let partyId: string | null = (nitClean && partyByNit.get(nitClean)) || null
    if (!partyId && header.razon_social) {
      partyId = partyByName.get(header.razon_social.toUpperCase().trim()) ?? null
    }
    if (!partyId) {
      errors.push({ row: 0, message: `Orden "${ref}": sin cliente — omitida` })
      continue
    }

    const issueDate = normalizeDate(header.fecha_orden) ?? new Date().toISOString().substring(0, 10)
    const subtotalVal = parseNumber(header.subtotal)
    const totalVal    = parseNumber(header.total)

    docsToInsert.push({
      tenant_id:      tenantId,
      doc_type:       'SALES_ORDER',
      number:         ref,
      party_id:       partyId,
      issue_date:     issueDate,
      subtotal:       subtotalVal,
      taxes:          Math.max(0, totalVal - subtotalVal),
      total:          totalVal,
      balance:        totalVal,
      status:         mapSalesOrderStatus(header.estado),
      notes_public:   header.nota_publica || null,
      notes_internal: `Importado desde Dolibarr · Ref: ${ref}`,
      currency:       'COP',
    })

    const lines = lineRows
      .filter(lr => lr.descripcion_linea || lr.etiqueta_producto)
      .map(lr => {
        const qty       = parseNumber(lr.cantidad) || 1
        const lineTotal = parseNumber(lr.importe_linea)
        const taxRate   = parseNumber(lr.tasa_iva)
        return {
          description: lr.descripcion_linea || lr.etiqueta_producto || 'Producto',
          qty,
          unit_price:  qty > 0 ? lineTotal / qty : lineTotal,
          line_total:  lineTotal,
          tax_config:  [{ rate: taxRate, type: 'IVA', name: `IVA ${taxRate}%` }],
        }
      })
    if (lines.length > 0) linesByRef.set(ref, lines)
  }

  // ── INSERT masivo de documentos en chunks de 500 ─────────────────────────
  const CHUNK = 500
  let inserted = 0

  for (let i = 0; i < docsToInsert.length; i += CHUNK) {
    const chunk = docsToInsert.slice(i, i + CHUNK)
    const { data: insertedDocs, error: docsErr } = await supabase
      .from('documents')
      .insert(chunk)
      .select('id, number')

    if (docsErr || !insertedDocs) {
      errors.push({ row: 0, message: `Error insertando documentos (lote ${i}-${i + chunk.length}): ${docsErr?.message}` })
      continue
    }

    inserted += insertedDocs.length

    // ── INSERT masivo de líneas para este chunk ───────────────────────────
    const allLines: Record<string, unknown>[] = []
    for (const doc of insertedDocs as { id: string; number: string }[]) {
      const lines = linesByRef.get(doc.number) ?? []
      for (const ln of lines) {
        allLines.push({ ...ln, document_id: doc.id })
      }
    }

    if (allLines.length > 0) {
      for (let j = 0; j < allLines.length; j += CHUNK) {
        const { error: linesErr } = await supabase
          .from('document_lines')
          .insert(allLines.slice(j, j + CHUNK))
        if (linesErr) {
          errors.push({ row: 0, message: `Error insertando líneas (lote docs ${i}): ${linesErr.message}` })
        }
      }
    }
  }

  return { inserted, errors }
}
