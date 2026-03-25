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
    if (action === 'discover') return handleDiscover(body)
    if (action === 'preview' || action === 'extract') return handlePreview(body)
    if (action === 'import') return handleImport(body)

    return NextResponse.json({ error: 'Acción no válida. Use: test | discover | preview | extract | import' }, { status: 400 })
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
      database: info.current_db,
      version: String(info.version).split('\n')[0].trim(),
      server: config.server,
      databases,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error de conexión'
    return NextResponse.json({ success: false, error: msg }, { status: 200 })
  } finally {
    if (pool) await pool.close().catch(() => null)
  }
}

// ─── action: discover ─────────────────────────────────────────────────────────

async function handleDiscover(body: Record<string, unknown>) {
  const config = buildMssqlConfig((body.connection ?? body) as ConnectionParams)
  let pool: sql.ConnectionPool | null = null

  try {
    pool = await sql.connect(config)

    const tablesResult = await pool.request().query(`
      SELECT t.name, SUM(p.rows) AS row_count
      FROM sys.tables t
      JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0,1)
      GROUP BY t.name
      ORDER BY t.name
    `)

    const tables: { name: string; row_count: number }[] = tablesResult.recordset.map(
      (r: Record<string, unknown>) => ({
        name: String(r.name),
        row_count: Number(r.row_count),
      }),
    )

    const tableNames = new Set(tables.map((t) => t.name))
    const detected: string[] = []
    if (tableNames.has('Terceros')) detected.push('terceros')
    if (tableNames.has('Inventarios')) detected.push('productos')
    if (tableNames.has('Terceros')) detected.push('empleados')
    if (tableNames.has('CuentasContables')) detected.push('plan_cuentas')

    return NextResponse.json({ tables, detected })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
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
  const tCols = await getColumns(pool, 'Terceros')

  const colId          = findCol(tCols, 'IdTercero', 'Id', 'ID') ?? 'IdTercero'
  const colIdent       = findCol(tCols, 'Identificacion', 'NumeroDocumento', 'Nit') ?? 'Identificacion'
  const colTipoIdent   = findCol(tCols, 'IdTipoIdentificacion', 'TipoDocumento') ?? 'IdTipoIdentificacion'
  const colNombre      = findCol(tCols, 'Nombre', 'NombreRazonSocial', 'RazonSocial') ?? 'Nombre'
  const colApellidos   = findCol(tCols, 'Apellidos', 'Primer_Apellido', 'PrimerApellido')
  const colPropiedades = findCol(tCols, 'Propiedades', 'TipoTercero')
  const colPlazo       = findCol(tCols, 'Plazo', 'PlazoPago', 'DiasCredito')
  const colCupo        = findCol(tCols, 'CupoCredito', 'LimiteCredito', 'Cupo')
  const colActivo      = findCol(tCols, 'Activo', 'Estado')

  // Build full legal_name: "Nombre Apellidos" when both columns exist
  const nombreExpr = colApellidos
    ? `LTRIM(RTRIM(ISNULL(t.[${colNombre}],'') + ' ' + ISNULL(t.[${colApellidos}],'')))`
    : `t.[${colNombre}]`
  const propiedadesExpr = colPropiedades ? `t.[${colPropiedades}]` : `NULL`
  const plazoExpr       = colPlazo ? `t.[${colPlazo}]` : `0`
  const cupoExpr        = colCupo ? `t.[${colCupo}]` : `0`
  const activoFilter    = colActivo ? `WHERE t.[${colActivo}] <> 0 OR t.[${colActivo}] IS NULL` : ``

  // Query WITHOUT joins — avoids type mismatch with direcciones table
  const query = `
    SELECT
      t.[${colId}]        AS wo_id,
      t.[${colIdent}]     AS doc_number,
      t.[${colTipoIdent}] AS tipo_identificacion,
      ${nombreExpr}       AS legal_name,
      ${propiedadesExpr}  AS propiedades,
      ${plazoExpr}        AS payment_term_days,
      ${cupoExpr}         AS credit_limit
    FROM Terceros t
    ${activoFilter}
  `

  const result = await pool.request().query(query)
  const rows: Record<string, unknown>[] = result.recordset
  const total = rows.length

  if (total === 0) {
    return { table: 'terceros', imported: 0, updated: 0, errors: 0, total: 0, error_details: [] }
  }

  // Load direcciones separately, keyed by wo_id string (avoids JOIN type mismatch)
  const dirMap = new Map<string, { address?: string; phone?: string; email?: string }>()
  try {
    const dCols = await getColumns(pool, 'Terceros - Direcciones')
    const dColCodigo = findCol(dCols, 'IdTercero', 'Código', 'Codigo', 'Tercero') ?? 'IdTercero'
    const dColDir    = findCol(dCols, 'Direccion', 'Dirección', 'Direccion1')
    const dColTel    = findCol(dCols, 'Telefono1', 'Telefono', 'Tel')
    const dColEmail  = findCol(dCols, 'Email', 'Correo', 'CorreoElectronico')

    const selParts = [`[${dColCodigo}] AS cod`]
    if (dColDir)   selParts.push(`[${dColDir}] AS dir`)
    if (dColTel)   selParts.push(`[${dColTel}] AS tel`)
    if (dColEmail) selParts.push(`[${dColEmail}] AS email`)

    const dirResult = await pool.request().query(
      `SELECT ${selParts.join(', ')} FROM [Terceros - Direcciones]`
    )
    for (const d of dirResult.recordset) {
      const key = String(d.cod)
      if (!dirMap.has(key)) {
        dirMap.set(key, {
          address: dColDir   ? safeString(d.dir)   ?? undefined : undefined,
          phone:   dColTel   ? safeString(d.tel)   ?? undefined : undefined,
          email:   dColEmail ? safeString(d.email) ?? undefined : undefined,
        })
      }
    }
  } catch {
    // Direcciones table unavailable — proceed without contact details
  }

  const mapped: Record<string, unknown>[] = rows
    .filter((row) => safeString(row.doc_number) !== null && safeString(row.legal_name) !== null)
    .map((row) => {
      const dir        = dirMap.get(String(row.wo_id)) ?? {}
      const propiedades = row.propiedades
      const partyType  = mapPartyType(propiedades)
      return {
        tenant_id:          TENANT_ID,
        legal_name:         safeString(row.legal_name),
        doc_type:           mapDocType(row.tipo_identificacion),
        doc_number:         safeString(row.doc_number),
        party_type:         partyType,
        is_customer:        partyType === 'CUSTOMER' || partyType === 'BOTH',
        is_vendor:          partyType === 'SUPPLIER' || partyType === 'BOTH',
        email:              dir.email ?? null,
        phone:              dir.phone ?? null,
        address:            dir.address ?? null,
        payment_term_days:  safeNumber(row.payment_term_days),
        credit_limit:       safeNumber(row.credit_limit),
      }
    })

  if (mapped.length === 0) {
    return { table: 'terceros', imported: 0, updated: 0, errors: 0, total, error_details: [] }
  }

  const { imported, updated, errors, error_details } = await batchUpsert(
    supabase, 'parties', mapped, 'tenant_id,doc_type,doc_number',
  )

  return { table: 'terceros', imported, updated, errors, total, error_details }
}

// ─── Inventarios → products ───────────────────────────────────────────────────

async function importInventarios(
  pool: sql.ConnectionPool,
  supabase: ReturnType<typeof createAdminClient>,
): Promise<ImportTableResult> {
  // Discover columns — handles encoding issues (C¾digo, Descripci¾n, etc.)
  const iCols = await getColumns(pool, 'Inventarios')

  const colIdInventario = findCol(iCols, 'IdInventario', 'Id') ?? 'IdInventario'
  const colSku    = findCol(iCols, 'CódigoInventario', 'CodigoInventario', 'Código', 'Codigo', 'Referencia', 'Ref')
  const colName   = findCol(iCols, 'Descripción', 'Descripcion', 'Nombre', 'Name')
  const colPrice  = findCol(iCols, 'Precio1', 'PrecioVenta', 'PrecioVenta1', 'Precio')
  const colUnit   = findCol(iCols, 'UnidadDeMedida', 'UnidadMedida', 'Unidad', 'UOM')
  const colIva    = findCol(iCols, 'Iva', 'IVA', 'TarifaIva')
  const colTipoIva = findCol(iCols, 'TipoIVA', 'TipoIva', 'ClaseIVA')
  const colDesc   = findCol(iCols, 'Observaciones', 'Descripcion2', 'Notas', 'Detalle')
  const colActivo = findCol(iCols, 'Activo', 'Estado', 'Active')
  const colBarcode = findCol(iCols, 'CodigoBarras', 'CodigoBarra', 'Barcode', 'EAN')

  if (!colName) {
    throw new Error(
      `No se encontró columna de nombre/descripción en Inventarios. Columnas: ${iCols.join(', ')}`,
    )
  }

  // Build select expressions
  // SKU: use column if present, otherwise generate from IdInventario (NOT NULL constraint)
  const skuExpr     = colSku
    ? `ISNULL(NULLIF(LTRIM(RTRIM(i.[${colSku}])),'' ), 'INV-' + CAST(i.[${colIdInventario}] AS VARCHAR))`
    : `'INV-' + CAST(i.[${colIdInventario}] AS VARCHAR)`
  const priceExpr   = colPrice   ? `ISNULL(i.[${colPrice}], 0)`   : `0`
  const unitExpr    = colUnit    ? `i.[${colUnit}]`                : `NULL`
  const ivaExpr     = colIva     ? `i.[${colIva}]`                 : `0`
  const tipoIvaExpr = colTipoIva ? `i.[${colTipoIva}]`             : (colIva ? `i.[${colIva}]` : `0`)
  const descExpr    = colDesc    ? `i.[${colDesc}]`                : `NULL`
  const barcodeExpr = colBarcode ? `i.[${colBarcode}]`             : `NULL`
  const activoFilter = colActivo ? `WHERE i.[${colActivo}] <> 0 OR i.[${colActivo}] IS NULL` : ``

  // Load cost/stock from per-warehouse table separately (no JOIN — avoids type mismatches)
  const stockMap = new Map<number, number>()
  try {
    const bodegaCols = await getColumns(pool, 'Inventarios - Por Bodega')
    const bColIdInv  = findCol(bodegaCols, 'IdInventario', 'Id')
    const bColCosto  = findCol(bodegaCols, 'CostoPromedio', 'Costo', 'Cost')
    if (bColIdInv && bColCosto) {
      const stockResult = await pool.request().query(
        `SELECT [${bColIdInv}] AS inv_id, SUM(ISNULL([${bColCosto}], 0)) AS cost FROM [Inventarios - Por Bodega] GROUP BY [${bColIdInv}]`
      )
      for (const s of stockResult.recordset) {
        stockMap.set(Number(s.inv_id), Number(s.cost) || 0)
      }
    }
  } catch {
    // Per-bodega table unavailable — proceed without cost data
  }

  const query = `
    SELECT
      i.[${colIdInventario}] AS wo_id,
      ${skuExpr}             AS sku,
      i.[${colName}]         AS name,
      ${priceExpr}           AS unit_price,
      ${unitExpr}            AS unit,
      ${ivaExpr}             AS iva,
      ${tipoIvaExpr}         AS tipo_iva,
      ${descExpr}            AS description,
      ${barcodeExpr}         AS barcode
    FROM Inventarios i
    ${activoFilter}
  `

  const result = await pool.request().query(query)
  const rows: Record<string, unknown>[] = result.recordset
  const total = rows.length

  if (total === 0) {
    return { table: 'inventarios', imported: 0, updated: 0, errors: 0, total: 0, error_details: [] }
  }

  const mapped: Record<string, unknown>[] = rows
    .filter((row) => safeString(row.name) !== null && safeString(row.sku) !== null)
    .map((row) => ({
      tenant_id:     TENANT_ID,
      sku:           safeString(row.sku),                      // NOT NULL
      name:          safeString(row.name),                     // NOT NULL
      type:          'PRODUCT' as const,                       // NOT NULL enum default
      selling_price: safeNumber(row.unit_price),
      cost:          stockMap.get(Number(row.wo_id)) ?? 0,
      tax_category:  mapTaxCategory(row.tipo_iva ?? row.iva),
      uom:           safeString(row.unit) ?? 'UND',
      description:   safeString(row.description),
      barcode:       safeString(row.barcode),
    }))

  if (mapped.length === 0) {
    return { table: 'inventarios', imported: 0, updated: 0, errors: 0, total, error_details: [] }
  }

  const { imported, updated, errors, error_details } = await batchUpsert(
    supabase, 'products', mapped, 'tenant_id,sku',
  )

  return { table: 'inventarios', imported, updated, errors, total, error_details }
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
  const tCols = await getColumns(pool, 'Terceros')

  const colId        = findCol(tCols, 'IdTercero', 'Id') ?? 'IdTercero'
  const colIdent     = findCol(tCols, 'Identificacion', 'NumeroDocumento', 'Nit') ?? 'Identificacion'
  const colTipoIdent = findCol(tCols, 'IdTipoIdentificacion', 'TipoDocumento') ?? 'IdTipoIdentificacion'
  const colPNombre   = findCol(tCols, 'Primer_Nombre', 'PrimerNombre', 'Nombre') ?? 'Nombre'
  const colSNombre   = findCol(tCols, 'Segundo_Nombre', 'SegundoNombre')
  const colPApellido = findCol(tCols, 'Primer_Apellido', 'PrimerApellido', 'Apellidos')
  const colSApellido = findCol(tCols, 'Segundo_Apellido', 'SegundoApellido')
  const colSueldo    = findCol(tCols, 'Sueldo', 'Salario')
  const colPropiedades = findCol(tCols, 'Propiedades', 'TipoTercero')
  const colActivo    = findCol(tCols, 'Activo', 'Estado')

  const sNombreExpr  = colSNombre   ? `t.[${colSNombre}]`   : `NULL`
  const pApellidoExpr = colPApellido ? `t.[${colPApellido}]` : `NULL`
  const sApellidoExpr = colSApellido ? `t.[${colSApellido}]` : `NULL`
  const sueldoExpr   = colSueldo    ? `ISNULL(t.[${colSueldo}], 0)` : `0`

  // Filter by Propiedades containing 'Empleado', or fallback to all active terceros
  let activoFilter = ``
  if (colPropiedades) {
    activoFilter = `WHERE t.[${colPropiedades}] LIKE '%Empleado%'`
    if (colActivo) activoFilter += ` AND (t.[${colActivo}] <> 0 OR t.[${colActivo}] IS NULL)`
  } else if (colActivo) {
    activoFilter = `WHERE t.[${colActivo}] <> 0 OR t.[${colActivo}] IS NULL`
  }

  // Step 1: Load Terceros (employees) WITHOUT any JOIN — no type mismatch risk
  const terceroQuery = `
    SELECT
      t.[${colId}]        AS wo_id,
      t.[${colIdent}]     AS doc_number,
      t.[${colTipoIdent}] AS tipo_identificacion,
      t.[${colPNombre}]   AS first_name,
      ${sNombreExpr}      AS middle_name,
      ${pApellidoExpr}    AS last_name,
      ${sApellidoExpr}    AS second_last_name,
      ${sueldoExpr}       AS salary_tercero
    FROM Terceros t
    ${activoFilter}
  `

  const terceroResult = await pool.request().query(terceroQuery)
  const terceroRows: Record<string, unknown>[] = terceroResult.recordset
  const total = terceroRows.length

  if (total === 0) {
    return { table: 'empleados', imported: 0, updated: 0, errors: 0, total: 0, error_details: [] }
  }

  // Step 2: Load Terceros - Contratos SEPARATELY into a map keyed by wo_id string
  const contratoMap = new Map<string, { contract_type: string; start_date: string | null; salary: number }>()
  try {
    const cCols = await getColumns(pool, 'Terceros - Contratos')
    const cColCodigo   = findCol(cCols, 'Código', 'Codigo', 'IdTercero', 'Tercero') ?? 'Código'
    const cColTipo     = findCol(cCols, 'Tipo Contrato', 'TipoContrato', 'Tipo')
    const cColFecha    = findCol(cCols, 'Fecha Ingreso', 'FechaIngreso', 'FechaInicio')
    const cColSueldo   = findCol(cCols, 'Sueldo', 'Salario', 'SalarioBase')

    const selParts = [`CAST([${cColCodigo}] AS VARCHAR) AS cod`]
    if (cColTipo)   selParts.push(`[${cColTipo}] AS tipo_contrato`)
    if (cColFecha)  selParts.push(`CONVERT(varchar, [${cColFecha}], 23) AS fecha_ingreso`)
    if (cColSueldo) selParts.push(`ISNULL([${cColSueldo}], 0) AS sueldo`)

    const contratosResult = await pool.request().query(
      `SELECT ${selParts.join(', ')} FROM [Terceros - Contratos]`
    )

    for (const c of contratosResult.recordset) {
      const key = String(c.cod)
      if (!contratoMap.has(key)) {
        contratoMap.set(key, {
          contract_type: safeString(c.tipo_contrato) ?? 'INDEFINIDO',
          start_date:    safeDate(c.fecha_ingreso),
          salary:        safeNumber(c.sueldo),
        })
      }
    }
  } catch {
    // Contratos table unavailable — will use salary from Terceros and defaults
  }

  // Step 3: Upsert parties with party_type = 'EMPLOYEE'
  const validRows = terceroRows.filter((row) => safeString(row.doc_number) !== null)
  const partyRecords = validRows.map((row) => {
    const parts = [
      safeString(row.first_name),
      safeString(row.middle_name),
      safeString(row.last_name),
      safeString(row.second_last_name),
    ].filter(Boolean)
    const fullName = parts.join(' ').trim() || (safeString(row.first_name) ?? 'SIN NOMBRE')
    return {
      tenant_id:   TENANT_ID,
      legal_name:  fullName,
      doc_type:    mapDocType(row.tipo_identificacion),
      doc_number:  safeString(row.doc_number),
      party_type:  'EMPLOYEE' as const,
      is_customer: false,
      is_vendor:   false,
    }
  })

  await batchUpsert(supabase, 'parties', partyRecords, 'tenant_id,doc_type,doc_number')

  // Step 4: Fetch party IDs keyed by doc_number
  const { data: allParties } = await supabase
    .from('parties')
    .select('id,doc_number')
    .eq('tenant_id', TENANT_ID)
    .eq('party_type', 'EMPLOYEE')
  const partyMap = new Map(
    (allParties ?? []).map((p: { id: string; doc_number: string }) => [p.doc_number, p.id])
  )

  // Step 5: Build employee records — merge contrato data by wo_id
  const employeeRecords = validRows
    .filter((row) => partyMap.has(safeString(row.doc_number) ?? ''))
    .map((row) => {
      const contrato = contratoMap.get(String(row.wo_id))
      const salary = contrato?.salary && contrato.salary > 0
        ? contrato.salary
        : safeNumber(row.salary_tercero)
      return {
        tenant_id:     TENANT_ID,
        party_id:      partyMap.get(safeString(row.doc_number) ?? ''),
        contract_type: contrato?.contract_type ?? 'INDEFINIDO',
        start_date:    contrato?.start_date ?? new Date().toISOString().split('T')[0],
        salary:        salary > 0 ? salary : 1300000,   // Colombian minimum wage fallback
        status:        'ACTIVE',
      }
    })

  const { imported, updated, errors, error_details } = await batchUpsert(
    supabase, 'employees', employeeRecords, 'tenant_id,party_id',
  )

  return { table: 'empleados', imported, updated, errors, total, error_details }
}
