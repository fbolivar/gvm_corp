import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import sql from 'mssql'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// ─── Constants ────────────────────────────────────────────────────────────────

const TENANT_ID = 'f188e4a2-1918-4102-8ebd-c82fc16d4ba9'
const BATCH_SIZE = 50

const DEFAULT_SERVER = '192.168.0.50'
const DEFAULT_PORT = 49992
const DEFAULT_INSTANCE = 'WORLDOFFICE'
const DEFAULT_DATABASE = 'GVM CORPORATION GLOBAL'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConnectionParams {
  server?: string
  port?: number
  database?: string
  instance?: string
  user?: string
  password?: string
}

interface ImportTableResult {
  table: string
  imported: number
  updated: number
  errors: number
  total: number
  error_details: string[]
}

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAuth(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
}

// ─── SQL Server config builder ────────────────────────────────────────────────

function buildMssqlConfig(params: ConnectionParams): sql.config {
  const base: sql.config = {
    server: params.server || DEFAULT_SERVER,
    port: params.port || DEFAULT_PORT,
    database: params.database || DEFAULT_DATABASE,
    options: {
      instanceName: params.instance || DEFAULT_INSTANCE,
      trustServerCertificate: true,
      encrypt: false,
      connectTimeout: 20000,
      requestTimeout: 60000,
    },
  }

  if (params.user) {
    base.user = params.user
    base.password = params.password ?? ''
  }

  return base
}

// ─── WorldOffice column discovery ─────────────────────────────────────────────
// Returns actual column names from INFORMATION_SCHEMA to handle encoding issues

async function getColumns(
  pool: sql.ConnectionPool,
  tableName: string,
): Promise<string[]> {
  const result = await pool.request().query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = '${tableName.replace(/'/g, "''")}'
    ORDER BY ORDINAL_POSITION
  `)
  return result.recordset.map((r: Record<string, unknown>) => String(r.COLUMN_NAME))
}

// Find column by exact match first, then prefix fallback (handles encoding like C¾digo → Código)
function findCol(columns: string[], ...candidates: string[]): string | null {
  // 1. Exact match (case-insensitive)
  for (const candidate of candidates) {
    const found = columns.find(
      (c) => c.toLowerCase() === candidate.toLowerCase(),
    )
    if (found) return found
  }
  // 2. Contains match — candidate is substring of column or vice versa
  for (const candidate of candidates) {
    const cl = candidate.toLowerCase()
    const found = columns.find(
      (c) => c.toLowerCase().includes(cl) || cl.includes(c.toLowerCase()),
    )
    if (found) return found
  }
  // 3. Prefix match (first 6 chars to avoid false positives like Telefono1 vs Telefono2)
  for (const candidate of candidates) {
    const prefix = candidate.substring(0, Math.min(6, candidate.length)).toLowerCase()
    const found = columns.find((c) => c.toLowerCase().startsWith(prefix))
    if (found) return found
  }
  return null
}

// ─── Data mappers ──────────────────────────────────────────────────────────────

function mapDocType(idTipoIdentificacion: unknown): string {
  const id = Number(idTipoIdentificacion)
  switch (id) {
    case 1: return 'CC'
    case 2: return 'NIT'
    case 3: return 'CE'
    case 4: return 'TI'
    case 5: return 'PA'
    case 6: return 'RC'
    case 7: return 'DE'
    default: return 'NIT'
  }
}

function mapPartyType(propiedades: unknown): string {
  const p = String(propiedades ?? '').toLowerCase()
  const isCustomer = p.includes('cliente')
  const isSupplier = p.includes('proveedor')
  if (isCustomer && isSupplier) return 'BOTH'
  if (isSupplier) return 'SUPPLIER'
  return 'CUSTOMER'
}

function mapTaxCategory(tipoIva: unknown): string {
  const v = Number(tipoIva)
  if (v === 19) return 'IVA_19'
  if (v === 5) return 'IVA_5'
  return 'IVA_0'
}

function safeString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s === '' ? null : s
}

function safeNumber(value: unknown): number {
  const n = parseFloat(String(value ?? '').replace(/,/g, '.').trim())
  return isNaN(n) ? 0 : n
}

function safeDate(value: unknown): string | null {
  if (!value) return null
  try {
    const d = new Date(String(value))
    if (isNaN(d.getTime())) return null
    return d.toISOString().split('T')[0]
  } catch {
    return null
  }
}

// ─── Batch upsert helper ───────────────────────────────────────────────────────

async function batchUpsert(
  supabase: ReturnType<typeof createAdminClient>,
  table: string,
  rows: Record<string, unknown>[],
  conflictColumns: string,
): Promise<{ imported: number; updated: number; errors: number; error_details: string[] }> {
  let imported = 0
  let updated = 0
  let errors = 0
  const error_details: string[] = []

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflictColumns, ignoreDuplicates: false })

    if (error) {
      errors += batch.length
      error_details.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
    } else {
      imported += batch.length
    }
  }

  return { imported, updated, errors, error_details }
}

// ─── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await requireAuth()
    const body = await req.json()
    const { action } = body

    if (action === 'test') return handleTest(body)
    if (action === 'preview') return handlePreview(body)
    if (action === 'import') return handleImport(body)

    return NextResponse.json({ error: 'Acción no válida. Use: test | preview | import' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    console.error('[worldoffice] Error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── action: test ─────────────────────────────────────────────────────────────

async function handleTest(body: Record<string, unknown>) {
  const conn = (body.connection ?? body) as ConnectionParams
  const config = buildMssqlConfig(conn)
  let pool: sql.ConnectionPool | null = null

  try {
    pool = await sql.connect(config)

    const [versionResult, dbResult] = await Promise.all([
      pool.request().query('SELECT @@VERSION AS version, DB_NAME() AS current_db'),
      pool.request().query(`
        SELECT name FROM sys.databases
        WHERE state_desc = 'ONLINE'
        ORDER BY name
      `),
    ])

    const info = versionResult.recordset[0]
    const databases = dbResult.recordset.map((r: Record<string, unknown>) => String(r.name))

    return NextResponse.json({
      success: true,
      server: config.server,
      current_database: info.current_db,
      sql_server_version: String(info.version).split('\n')[0].trim(),
      databases,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error de conexión'
    return NextResponse.json({ success: false, error: msg }, { status: 200 })
  } finally {
    if (pool) await pool.close().catch(() => null)
  }
}

// ─── action: preview ──────────────────────────────────────────────────────────

const PREVIEW_TABLE_MAP: Record<
  string,
  { worldoffice_table: string; label: string }
> = {
  terceros: { worldoffice_table: 'Terceros', label: 'Terceros (Clientes/Proveedores)' },
  inventarios: { worldoffice_table: 'Inventarios', label: 'Inventarios (Productos)' },
  productos: { worldoffice_table: 'Inventarios', label: 'Inventarios (Productos)' },
  puc: { worldoffice_table: 'CuentasContables', label: 'Plan Único de Cuentas' },
  plan_cuentas: { worldoffice_table: 'CuentasContables', label: 'Plan Único de Cuentas' },
  empleados: { worldoffice_table: 'Terceros', label: 'Empleados (desde Terceros)' },
  direcciones: { worldoffice_table: 'Terceros - Direcciones', label: 'Direcciones de Terceros' },
}

async function handlePreview(body: Record<string, unknown>) {
  const table = String(body.table_key || body.table || '')
  const meta = PREVIEW_TABLE_MAP[table]

  if (!meta) {
    return NextResponse.json(
      {
        error: `Tabla no reconocida: "${table}". Opciones: ${Object.keys(PREVIEW_TABLE_MAP).join(', ')}`,
      },
      { status: 400 },
    )
  }

  const config = buildMssqlConfig((body.connection ?? body) as ConnectionParams)
  let pool: sql.ConnectionPool | null = null

  try {
    pool = await sql.connect(config)

    // Discover actual column names to handle encoding issues
    const columns = await getColumns(pool, meta.worldoffice_table)

    // Count total rows
    const countResult = await pool
      .request()
      .query(`SELECT COUNT(*) AS total FROM [${meta.worldoffice_table}]`)
    const total = Number(countResult.recordset[0].total)

    // Preview first 10 rows
    const sampleResult = await pool
      .request()
      .query(`SELECT TOP 10 * FROM [${meta.worldoffice_table}]`)

    return NextResponse.json({
      table,
      label: meta.label,
      worldoffice_table: meta.worldoffice_table,
      total,
      columns,
      rows: sampleResult.recordset,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    if (pool) await pool.close().catch(() => null)
  }
}

// ─── action: import ───────────────────────────────────────────────────────────

async function handleImport(body: Record<string, unknown>) {
  const tables: string[] = body.table_key
    ? [String(body.table_key)]
    : Array.isArray(body.tables)
      ? body.tables.map(String)
      : ['terceros', 'inventarios']

  const config = buildMssqlConfig((body.connection ?? body) as ConnectionParams)
  const supabase = createAdminClient()

  const results: ImportTableResult[] = []
  let pool: sql.ConnectionPool | null = null

  try {
    pool = await sql.connect(config)
    console.info('[worldoffice] Connected to SQL Server. Starting import for tables:', tables)

    for (const table of tables) {
      try {
        let result: ImportTableResult

        switch (table) {
          case 'terceros':
            result = await importTerceros(pool, supabase)
            break
          case 'inventarios':
          case 'productos':
            result = await importInventarios(pool, supabase)
            break
          case 'puc':
          case 'cuentas':
          case 'plan_cuentas':
            result = await importCuentasContables(pool, supabase)
            break
          case 'empleados':
            result = await importEmpleados(pool, supabase)
            break
          default:
            result = {
              table,
              imported: 0,
              updated: 0,
              errors: 0,
              total: 0,
              error_details: [`Tabla "${table}" no soportada en importación directa`],
            }
        }

        results.push(result)
        console.info(`[worldoffice] ${table}: imported=${result.imported} errors=${result.errors}`)
      } catch (tableErr) {
        const msg = tableErr instanceof Error ? tableErr.message : 'Error desconocido'
        console.error(`[worldoffice] Error importing ${table}:`, tableErr)
        results.push({
          table,
          imported: 0,
          updated: 0,
          errors: 1,
          total: 0,
          error_details: [msg],
        })
      }
    }
  } finally {
    if (pool) await pool.close().catch(() => null)
  }

  const totalImported = results.reduce((sum, r) => sum + r.imported, 0)
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0)

  return NextResponse.json({
    success: totalErrors === 0 || totalImported > 0,
    total_imported: totalImported,
    total_errors: totalErrors,
    results,
  })
}

// ─── Terceros → parties ───────────────────────────────────────────────────────

async function importTerceros(
  pool: sql.ConnectionPool,
  supabase: ReturnType<typeof createAdminClient>,
): Promise<ImportTableResult> {
  // Discover column names to handle encoding issues
  const tCols = await getColumns(pool, 'Terceros')
  const dCols = await getColumns(pool, 'Terceros - Direcciones')

  // Map column names robustly
  const colId = findCol(tCols, 'IdTercero', 'Id', 'ID') ?? 'IdTercero'
  const colIdent = findCol(tCols, 'Identificacion', 'NumeroDocumento', 'Nit') ?? 'Identificacion'
  const colTipoIdent = findCol(tCols, 'IdTipoIdentificacion', 'TipoDocumento', 'TipoIdentificacion') ?? 'IdTipoIdentificacion'
  const colNombre = findCol(tCols, 'Nombre', 'NombreRazonSocial', 'RazonSocial') ?? 'Nombre'
  const colApellidos = findCol(tCols, 'Apellidos', 'PrimerApellido')
  const colPropiedades = findCol(tCols, 'Propiedades', 'TipoTercero', 'Tipo')
  const colPlazo = findCol(tCols, 'Plazo', 'PlazoPago', 'DiasCredito')
  const colCupo = findCol(tCols, 'CupoCredito', 'LimiteCredito', 'Cupo')
  const colActivo = findCol(tCols, 'Activo', 'Estado', 'Active')

  // Direction table columns
  const dColCodigo = findCol(dCols, 'Código', 'Codigo', 'IdTercero', 'Cod') ?? 'Código'
  const dColTipo = findCol(dCols, 'Tipo de Dirección', 'TipoDireccion', 'Tipo') ?? 'Tipo de Dirección'
  const dColDir = findCol(dCols, 'Direccion', 'Dirección', 'Address') ?? 'Direccion'
  const dColTel = findCol(dCols, 'Telefono1', 'Telefono', 'Phone') ?? 'Telefono1'
  const dColEmail = findCol(dCols, 'Email', 'Correo', 'eMail') ?? 'Email'
  const dColCiudad = findCol(dCols, 'Ciudad', 'City', 'Municipio', 'IdCiudad')

  // Build SELECT using discovered column names
  const apellidosPart = colApellidos
    ? `RTRIM(ISNULL(t.[${colNombre}],'') + ' ' + ISNULL(t.[${colApellidos}],''))`
    : `t.[${colNombre}]`
  const nombreExpr = colApellidos
    ? `CASE WHEN t.[${colApellidos}] IS NOT NULL AND LTRIM(RTRIM(t.[${colApellidos}])) != '' THEN ${apellidosPart} ELSE t.[${colNombre}] END`
    : `t.[${colNombre}]`
  const propiedadesExpr = colPropiedades
    ? `t.[${colPropiedades}]`
    : `NULL`
  const plazoExpr = colPlazo ? `t.[${colPlazo}]` : `0`
  const cupoExpr = colCupo ? `t.[${colCupo}]` : `0`
  const activoFilter = colActivo
    ? `WHERE t.[${colActivo}] = 1 OR t.[${colActivo}] IS NULL`
    : ``

  const query = `
    SELECT
      t.[${colId}]          AS wo_id,
      t.[${colIdent}]       AS doc_number,
      t.[${colTipoIdent}]   AS tipo_identificacion,
      ${nombreExpr}         AS legal_name,
      ${propiedadesExpr}    AS propiedades,
      ${plazoExpr}          AS payment_term_days,
      ${cupoExpr}           AS credit_limit,
      d.[${dColDir}]        AS address,
      d.[${dColTel}]        AS phone,
      d.[${dColEmail}]      AS email,
      ${dColCiudad ? `d.[${dColCiudad}]` : `NULL`} AS city
    FROM Terceros t
    LEFT JOIN [Terceros - Direcciones] d
      ON t.[${colId}] = d.[${dColCodigo}]
      AND d.[${dColTipo}] = 1
    ${activoFilter}
  `

  const result = await pool.request().query(query)
  const rows: Record<string, unknown>[] = result.recordset
  const total = rows.length

  if (total === 0) {
    return { table: 'terceros', imported: 0, updated: 0, errors: 0, total: 0, error_details: [] }
  }

  const mapped: Record<string, unknown>[] = rows
    .filter((row) => {
      const docNum = safeString(row.doc_number)
      const legalName = safeString(row.legal_name)
      return docNum !== null && legalName !== null
    })
    .map((row) => ({
      tenant_id: TENANT_ID,
      legal_name: safeString(row.legal_name),
      doc_type: mapDocType(row.tipo_identificacion),
      doc_number: safeString(row.doc_number),
      email: safeString(row.email),
      phone: safeString(row.phone),
      address: safeString(row.address),
      city: safeString(row.city),
      party_type: mapPartyType(row.propiedades),
      payment_term_days: safeNumber(row.payment_term_days),
      credit_limit: safeNumber(row.credit_limit),
    }))

  const { imported, updated, errors, error_details } = await batchUpsert(
    supabase,
    'parties',
    mapped,
    'tenant_id,doc_number',
  )

  return { table: 'terceros', imported, updated, errors, total, error_details }
}

// ─── Inventarios → products ───────────────────────────────────────────────────

async function importInventarios(
  pool: sql.ConnectionPool,
  supabase: ReturnType<typeof createAdminClient>,
): Promise<ImportTableResult> {
  // Discover columns — handle encoding issues (C¾digo, Descripci¾n, etc.)
  const iCols = await getColumns(pool, 'Inventarios')

  // Map column names — try exact first, then prefix fallback via findCol
  const colSkuCandidates = ['CódigoInventario', 'CodigoInventario', 'Código', 'Codigo', 'Referencia', 'Ref']
  const colNameCandidates = ['Descripción', 'Descripcion', 'Nombre', 'Name']
  const colPriceCandidates = ['Precio1', 'PrecioVenta', 'PrecioVenta1', 'Precio']
  const colUnitCandidates = ['UnidadDeMedida', 'UnidadMedida', 'Unidad', 'UOM']
  const colIvaCandidates = ['Iva', 'IVA', 'TarifaIva']
  const colTipoIvaCandidates = ['TipoIVA', 'TipoIva', 'ClaseIVA']
  const colDescCandidates = ['Observaciones', 'Descripcion2', 'Notas', 'Detalle']
  const colActivoCandidates = ['Activo', 'Estado', 'Active']

  const colSku = findCol(iCols, ...colSkuCandidates)
  const colName = findCol(iCols, ...colNameCandidates)
  const colPrice = findCol(iCols, ...colPriceCandidates)
  const colUnit = findCol(iCols, ...colUnitCandidates)
  const colIva = findCol(iCols, ...colIvaCandidates)
  const colTipoIva = findCol(iCols, ...colTipoIvaCandidates)
  const colDesc = findCol(iCols, ...colDescCandidates)
  const colActivo = findCol(iCols, ...colActivoCandidates)
  const colIdInventario = findCol(iCols, 'IdInventario', 'Id') ?? 'IdInventario'

  if (!colName) {
    throw new Error(
      `No se encontró columna de nombre/descripción en Inventarios. Columnas disponibles: ${iCols.join(', ')}`,
    )
  }

  // Check if per-warehouse table exists for stock data
  const bodegaCols = await getColumns(pool, 'Inventarios - Por Bodega').catch(() => [])
  const hasBodesaTable = bodegaCols.length > 0
  const bColIdInv = hasBodesaTable ? findCol(bodegaCols, 'IdInventario', 'Id') : null
  const bColExist = hasBodesaTable ? findCol(bodegaCols, 'Existencia', 'Stock', 'Saldo') : null
  const bColCosto = hasBodesaTable ? findCol(bodegaCols, 'CostoPromedio', 'Costo', 'Cost') : null

  // Build select expression for each column
  const skuExpr = colSku ? `i.[${colSku}]` : `CAST(i.[${colIdInventario}] AS VARCHAR)`
  const priceExpr = colPrice ? `ISNULL(i.[${colPrice}], 0)` : `0`
  const unitExpr = colUnit ? `i.[${colUnit}]` : `NULL`
  const ivaExpr = colIva ? `i.[${colIva}]` : `0`
  const tipoIvaExpr = colTipoIva ? `i.[${colTipoIva}]` : `i.[${colIva ?? 'Iva'}]`
  const descExpr = colDesc ? `i.[${colDesc}]` : `NULL`
  const activoFilter = colActivo ? `WHERE i.[${colActivo}] = 1 OR i.[${colActivo}] IS NULL` : ``

  let query: string

  if (hasBodesaTable && bColIdInv && bColExist) {
    const costoExpr = bColCosto ? `ISNULL(ib.[${bColCosto}], 0)` : `0`
    query = `
      SELECT
        i.[${colIdInventario}]    AS wo_id,
        ${skuExpr}                AS sku,
        i.[${colName}]            AS name,
        ${priceExpr}              AS unit_price,
        ${unitExpr}               AS unit,
        ${ivaExpr}                AS iva,
        ${tipoIvaExpr}            AS tipo_iva,
        ${descExpr}               AS description,
        ISNULL(SUM(ib.[${bColExist}]), 0) AS stock_quantity,
        ${costoExpr.replace('ib.', 'MAX(ib.')}      AS unit_cost
      FROM Inventarios i
      LEFT JOIN [Inventarios - Por Bodega] ib ON i.[${colIdInventario}] = ib.[${bColIdInv}]
      ${activoFilter}
      GROUP BY
        i.[${colIdInventario}],
        ${skuExpr.startsWith('i.') ? skuExpr : `i.[${colIdInventario}]`},
        i.[${colName}],
        ${priceExpr},
        ${unitExpr !== 'NULL' ? unitExpr : 'NULL'},
        ${ivaExpr},
        ${tipoIvaExpr},
        ${descExpr !== 'NULL' ? descExpr : 'NULL'}
    `
  } else {
    query = `
      SELECT
        i.[${colIdInventario}]    AS wo_id,
        ${skuExpr}                AS sku,
        i.[${colName}]            AS name,
        ${priceExpr}              AS unit_price,
        ${unitExpr}               AS unit,
        ${ivaExpr}                AS iva,
        ${tipoIvaExpr}            AS tipo_iva,
        ${descExpr}               AS description,
        0                         AS stock_quantity,
        0                         AS unit_cost
      FROM Inventarios i
      ${activoFilter}
    `
  }

  const result = await pool.request().query(query)
  const rows: Record<string, unknown>[] = result.recordset
  const total = rows.length

  if (total === 0) {
    return { table: 'inventarios', imported: 0, updated: 0, errors: 0, total: 0, error_details: [] }
  }

  const mapped: Record<string, unknown>[] = rows
    .filter((row) => safeString(row.name) !== null)
    .map((row) => ({
      tenant_id: TENANT_ID,
      name: safeString(row.name),
      sku: safeString(row.sku),
      description: safeString(row.description),
      unit_price: safeNumber(row.unit_price),
      unit_cost: safeNumber(row.unit_cost),
      stock_quantity: safeNumber(row.stock_quantity),
      tax_category: mapTaxCategory(row.tipo_iva ?? row.iva),
      unit: safeString(row.unit),
    }))

  // Products: upsert on (tenant_id, sku) — only when sku exists
  const withSku = mapped.filter((r) => r.sku !== null)
  const withoutSku = mapped.filter((r) => r.sku === null)

  let imported = 0
  let errors = 0
  const error_details: string[] = []

  if (withSku.length > 0) {
    const res = await batchUpsert(supabase, 'products', withSku, 'tenant_id,sku')
    imported += res.imported
    errors += res.errors
    error_details.push(...res.error_details)
  }

  if (withoutSku.length > 0) {
    // Products without SKU: just insert (no upsert key available)
    for (let i = 0; i < withoutSku.length; i += BATCH_SIZE) {
      const batch = withoutSku.slice(i, i + BATCH_SIZE)
      const { error } = await supabase.from('products').insert(batch)
      if (error) {
        errors += batch.length
        error_details.push(`Insert batch ${Math.floor(i / BATCH_SIZE) + 1} (no-sku): ${error.message}`)
      } else {
        imported += batch.length
      }
    }
  }

  return { table: 'inventarios', imported, updated: 0, errors, total, error_details }
}

// ─── CuentasContables → chart_accounts ───────────────────────────────────────

async function importCuentasContables(
  pool: sql.ConnectionPool,
  supabase: ReturnType<typeof createAdminClient>,
): Promise<ImportTableResult> {
  const cols = await getColumns(pool, 'CuentasContables')

  const colCodigo = findCol(cols, 'CódigoCuentaContable', 'CodigoCuentaContable', 'Código', 'Codigo', 'Code') ?? 'Código'
  const colNombre = findCol(cols, 'CuentaContable', 'Nombre', 'Descripcion', 'Name') ?? 'CuentaContable'
  const colTipo = findCol(cols, 'IdCuentasContablesTipos', 'Tipo', 'Type', 'IdTipo')
  const colInactivo = findCol(cols, 'Inactivo', 'Inactiva', 'Activo', 'Estado')

  const tipoExpr = colTipo ? `c.[${colTipo}]` : `NULL`
  const activoFilter = colInactivo
    ? `WHERE c.[${colInactivo}] = 0 OR c.[${colInactivo}] IS NULL`
    : ``

  const query = `
    SELECT TOP 10000
      c.[${colCodigo}]  AS code,
      c.[${colNombre}]  AS name,
      ${tipoExpr}       AS type_id
    FROM CuentasContables c
    ${activoFilter}
    ORDER BY c.[${colCodigo}]
  `

  const result = await pool.request().query(query)
  const rows: Record<string, unknown>[] = result.recordset
  const total = rows.length

  if (total === 0) {
    return { table: 'puc', imported: 0, updated: 0, errors: 0, total: 0, error_details: [] }
  }

  // Check if chart_accounts table exists in Supabase
  const { error: checkError } = await supabase
    .from('chart_accounts')
    .select('id')
    .limit(1)

  if (checkError) {
    return {
      table: 'puc',
      imported: 0,
      updated: 0,
      errors: 1,
      total,
      error_details: [`Tabla chart_accounts no encontrada: ${checkError.message}`],
    }
  }

  // Map WorldOffice IdCuentasContablesTipos to GVM type string
  function mapAccountType(tipoId: unknown): string {
    const id = Number(tipoId)
    switch (id) {
      case 1: return 'ASSET'       // Activo
      case 2: return 'LIABILITY'   // Pasivo
      case 3: return 'EQUITY'      // Patrimonio
      case 4: return 'REVENUE'     // Ingreso
      case 5: return 'EXPENSE'     // Gasto
      case 6: return 'COST'        // Costo
      case 7: return 'CONTINGENT'  // Cuentas de orden
      default: return 'ASSET'
    }
  }

  const mapped: Record<string, unknown>[] = rows
    .filter((row) => safeString(row.code) !== null)
    .map((row) => {
      const code = safeString(row.code) ?? ''
      const level = code.replace(/[^0-9]/g, '').length <= 1 ? 1
        : code.replace(/[^0-9]/g, '').length <= 2 ? 2
        : code.replace(/[^0-9]/g, '').length <= 4 ? 3
        : code.replace(/[^0-9]/g, '').length <= 6 ? 4 : 5
      return {
        tenant_id: TENANT_ID,
        code,
        name: safeString(row.name) ?? '',
        type: mapAccountType(row.type_id),
        level,
        is_active: true,
      }
    })

  const { imported, updated, errors, error_details } = await batchUpsert(
    supabase,
    'chart_accounts',
    mapped,
    'tenant_id,code',
  )

  return { table: 'puc', imported, updated, errors, total, error_details }
}

// ─── Empleados (from Terceros + Contratos) → employees ───────────────────────

async function importEmpleados(
  pool: sql.ConnectionPool,
  supabase: ReturnType<typeof createAdminClient>,
): Promise<ImportTableResult> {
  // Check if contratos table exists
  const contratosCols = await getColumns(pool, 'Terceros - Contratos').catch(() => [])
  const tCols = await getColumns(pool, 'Terceros')
  const dCols = await getColumns(pool, 'Terceros - Direcciones').catch(() => [])

  // Map terceros columns
  const colId = findCol(tCols, 'IdTercero', 'Id') ?? 'IdTercero'
  const colIdent = findCol(tCols, 'Identificacion', 'NumeroDocumento') ?? 'Identificacion'
  const colTipoIdent = findCol(tCols, 'IdTipoIdentificacion', 'TipoDocumento') ?? 'IdTipoIdentificacion'
  const colPNombre = findCol(tCols, 'Primer_Nombre', 'PrimerNombre', 'Nombre') ?? 'Nombre'
  const colSNombre = findCol(tCols, 'Segundo_Nombre', 'SegundoNombre')
  const colPApellido = findCol(tCols, 'Primer_Apellido', 'PrimerApellido', 'Apellidos')
  const colSApellido = findCol(tCols, 'Segundo_Apellido', 'SegundoApellido')
  const colCargo = findCol(tCols, 'Cargo', 'Puesto', 'Position')

  // Map direction columns
  const dColCodigo = dCols.length > 0 ? (findCol(dCols, 'Código', 'Codigo', 'IdTercero') ?? 'Código') : null
  const dColEmail = dCols.length > 0 ? findCol(dCols, 'Email', 'Correo') : null
  const dColTel = dCols.length > 0 ? findCol(dCols, 'Telefono1', 'Telefono') : null
  const dColTipo = dCols.length > 0 ? findCol(dCols, 'Tipo de Dirección', 'TipoDireccion', 'Tipo') : null

  // Map contratos columns (required to identify employees)
  const hasContratos = contratosCols.length > 0
  const cColCodigo = hasContratos ? (findCol(contratosCols, 'Código', 'Codigo', 'IdTercero') ?? 'Código') : null
  const cColTipoContrato = hasContratos ? findCol(contratosCols, 'Tipo Contrato', 'TipoContrato', 'Tipo') : null
  const cColFechaIngreso = hasContratos ? findCol(contratosCols, 'Fecha Ingreso', 'FechaIngreso', 'FechaInicio') : null
  const cColSueldo = hasContratos ? findCol(contratosCols, 'Sueldo', 'Salario', 'SalarioBase') : null

  let query: string

  const sNombreExpr = colSNombre ? `t.[${colSNombre}]` : `NULL`
  const pApellidoExpr = colPApellido ? `t.[${colPApellido}]` : `NULL`
  const sApellidoExpr = colSApellido ? `t.[${colSApellido}]` : `NULL`
  const cargoExpr = colCargo ? `t.[${colCargo}]` : `NULL`
  const emailExpr = dColEmail && dColCodigo ? `d.[${dColEmail}]` : `NULL`
  const telExpr = dColTel && dColCodigo ? `d.[${dColTel}]` : `NULL`

  if (hasContratos && cColCodigo && cColTipoContrato) {
    const tipoContratoExpr = `c.[${cColTipoContrato}]`
    const fechaExpr = cColFechaIngreso ? `CONVERT(varchar, c.[${cColFechaIngreso}], 23)` : `NULL`
    const sueldoExpr = cColSueldo ? `c.[${cColSueldo}]` : `0`

    const joinDirecciones =
      dColCodigo && dColTipo
        ? `LEFT JOIN [Terceros - Direcciones] d ON t.[${colId}] = d.[${dColCodigo}] AND d.[${dColTipo}] = 1`
        : ``

    query = `
      SELECT DISTINCT
        t.[${colIdent}]     AS doc_number,
        t.[${colTipoIdent}] AS tipo_identificacion,
        t.[${colPNombre}]   AS first_name,
        ${sNombreExpr}      AS middle_name,
        ${pApellidoExpr}    AS last_name,
        ${sApellidoExpr}    AS second_last_name,
        ${cargoExpr}        AS position,
        ${tipoContratoExpr} AS contract_type,
        ${fechaExpr}        AS start_date,
        ${sueldoExpr}       AS salary,
        ${emailExpr}        AS email,
        ${telExpr}          AS phone
      FROM Terceros t
      INNER JOIN [Terceros - Contratos] c ON t.[${colId}] = c.[${cColCodigo}]
      ${joinDirecciones}
      WHERE ${tipoContratoExpr} IS NOT NULL
    `
  } else {
    // Fallback: use Propiedades column to find employees
    const colPropiedades = findCol(tCols, 'Propiedades', 'TipoTercero')
    const propFilter = colPropiedades
      ? `WHERE t.[${colPropiedades}] LIKE '%Empleado%'`
      : `WHERE 1=0 -- No se puede identificar empleados sin tabla de contratos`

    const joinDirecciones =
      dColCodigo && dColTipo
        ? `LEFT JOIN [Terceros - Direcciones] d ON t.[${colId}] = d.[${dColCodigo}] AND d.[${dColTipo}] = 1`
        : ``

    query = `
      SELECT
        t.[${colIdent}]     AS doc_number,
        t.[${colTipoIdent}] AS tipo_identificacion,
        t.[${colPNombre}]   AS first_name,
        ${sNombreExpr}      AS middle_name,
        ${pApellidoExpr}    AS last_name,
        ${sApellidoExpr}    AS second_last_name,
        ${cargoExpr}        AS position,
        NULL                AS contract_type,
        NULL                AS start_date,
        0                   AS salary,
        ${emailExpr}        AS email,
        ${telExpr}          AS phone
      FROM Terceros t
      ${joinDirecciones}
      ${propFilter}
    `
  }

  const result = await pool.request().query(query)
  const rows: Record<string, unknown>[] = result.recordset
  const total = rows.length

  if (total === 0) {
    return {
      table: 'empleados',
      imported: 0,
      updated: 0,
      errors: 0,
      total: 0,
      error_details: ['No se encontraron empleados. Verifica la tabla Terceros - Contratos.'],
    }
  }

  // Check if employees table exists
  const { error: checkError } = await supabase
    .from('employees')
    .select('id')
    .limit(1)

  if (checkError) {
    return {
      table: 'empleados',
      imported: 0,
      updated: 0,
      errors: 1,
      total,
      error_details: [`Tabla employees no encontrada: ${checkError.message}`],
    }
  }

  const mapped: Record<string, unknown>[] = rows
    .filter((row) => safeString(row.doc_number) !== null)
    .map((row) => {
      const firstName = safeString(row.first_name) ?? ''
      const lastName = safeString(row.last_name) ?? ''
      const middleName = safeString(row.middle_name)
      const secondLast = safeString(row.second_last_name)

      const fullName = [firstName, middleName, lastName, secondLast]
        .filter(Boolean)
        .join(' ')
        .trim()

      return {
        tenant_id: TENANT_ID,
        doc_type: mapDocType(row.tipo_identificacion),
        doc_number: safeString(row.doc_number),
        first_name: firstName || null,
        last_name: lastName || null,
        full_name: fullName || null,
        position: safeString(row.position),
        contract_type: safeString(row.contract_type),
        start_date: safeDate(row.start_date),
        base_salary: safeNumber(row.salary),
        email: safeString(row.email),
        phone: safeString(row.phone),
        status: 'ACTIVE',
      }
    })

  const { imported, updated, errors, error_details } = await batchUpsert(
    supabase,
    'employees',
    mapped,
    'tenant_id,doc_number',
  )

  return { table: 'empleados', imported, updated, errors, total, error_details }
}
