'use server'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import sql from 'mssql'

// ─── Auth guard ──────────────────────────────────────────────────────────────

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  return { supabase, user }
}

// ─── SQL Server config builder ───────────────────────────────────────────────

function buildConfig(body: {
  server: string
  database: string
  user: string
  password: string
  instance?: string
  port?: number
}): sql.config {
  return {
    server: body.server,
    database: body.database,
    user: body.user,
    password: body.password,
    port: body.port || 1433,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      instanceName: body.instance || undefined,
      connectTimeout: 15000,
      requestTimeout: 30000,
    },
  }
}

// ─── Known WorldOffice table mappings ────────────────────────────────────────

const WO_TABLE_QUERIES: Record<string, string> = {
  terceros: `
    SELECT TOP 5000
      t.Nombre AS nombre,
      t.TipoDocumento AS tipo_documento,
      t.NumeroDocumento AS numero_documento,
      t.Email AS email,
      t.Telefono AS telefono,
      t.Direccion AS direccion,
      t.Ciudad AS ciudad,
      CASE
        WHEN t.EsCliente = 1 AND t.EsProveedor = 1 THEN 'BOTH'
        WHEN t.EsProveedor = 1 THEN 'SUPPLIER'
        ELSE 'CUSTOMER'
      END AS tipo_tercero
    FROM Terceros t
    WHERE t.Estado = 1 OR t.Activo = 1
  `,
  terceros_alt: `
    SELECT TOP 5000
      NombreRazonSocial AS nombre,
      TipoIdentificacion AS tipo_documento,
      NumeroIdentificacion AS numero_documento,
      CorreoElectronico AS email,
      Telefono1 AS telefono,
      Direccion1 AS direccion,
      Ciudad AS ciudad
    FROM tblTerceros
  `,
  productos: `
    SELECT TOP 5000
      p.Nombre AS nombre,
      p.Codigo AS sku,
      p.Descripcion AS descripcion,
      p.PrecioVenta AS precio_venta,
      p.Costo AS costo,
      p.Existencia AS stock,
      p.Grupo AS categoria,
      p.UnidadMedida AS unidad_medida,
      CASE
        WHEN p.TarifaIVA = 19 THEN 'IVA_19'
        WHEN p.TarifaIVA = 5 THEN 'IVA_5'
        ELSE 'IVA_0'
      END AS tipo_iva
    FROM Inventarios p
  `,
  productos_alt: `
    SELECT TOP 5000
      Descripcion AS nombre,
      Referencia AS sku,
      PrecioVenta1 AS precio_venta,
      CostoPromedio AS costo,
      SaldoUnidades AS stock,
      GrupoInventario AS categoria
    FROM tblInventarios
  `,
  empleados: `
    SELECT TOP 5000
      e.Nombre AS nombre,
      e.TipoDocumento AS tipo_documento,
      e.NumeroDocumento AS numero_documento,
      e.Email AS email,
      e.Cargo AS cargo,
      e.Departamento AS departamento,
      e.SalarioBase AS salario_base,
      CONVERT(varchar, e.FechaIngreso, 23) AS fecha_ingreso
    FROM Empleados e
    WHERE e.Estado = 1 OR e.Activo = 1
  `,
  plan_cuentas: `
    SELECT TOP 5000
      c.Codigo AS cuenta_puc,
      c.Nombre AS descripcion,
      c.SaldoDebito AS debito,
      c.SaldoCredito AS credito
    FROM PlanCuentas c
    WHERE c.SaldoDebito <> 0 OR c.SaldoCredito <> 0
  `,
}

// ─── POST handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await requireAuth()
    const body = await req.json()
    const { action } = body

    if (action === 'test') {
      return handleTestConnection(body)
    }
    if (action === 'discover') {
      return handleDiscover(body)
    }
    if (action === 'extract') {
      return handleExtract(body)
    }
    if (action === 'custom_query') {
      return handleCustomQuery(body)
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── Test connection ─────────────────────────────────────────────────────────

async function handleTestConnection(body: Record<string, unknown>) {
  const config = buildConfig(body as Parameters<typeof buildConfig>[0])
  let pool: sql.ConnectionPool | null = null

  try {
    pool = await sql.connect(config)
    const result = await pool.request().query('SELECT DB_NAME() AS db, @@VERSION AS version')
    const row = result.recordset[0]

    return NextResponse.json({
      success: true,
      database: row.db,
      version: String(row.version).split('\n')[0],
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error de conexión'
    return NextResponse.json({ success: false, error: msg }, { status: 200 })
  } finally {
    if (pool) await pool.close()
  }
}

// ─── Discover tables ─────────────────────────────────────────────────────────

async function handleDiscover(body: Record<string, unknown>) {
  const config = buildConfig(body as Parameters<typeof buildConfig>[0])
  let pool: sql.ConnectionPool | null = null

  try {
    pool = await sql.connect(config)

    // Get all user tables with row counts
    const result = await pool.request().query(`
      SELECT
        t.TABLE_NAME AS name,
        p.rows AS row_count
      FROM INFORMATION_SCHEMA.TABLES t
      LEFT JOIN sys.partitions p ON p.object_id = OBJECT_ID(t.TABLE_SCHEMA + '.' + t.TABLE_NAME) AND p.index_id IN (0, 1)
      WHERE t.TABLE_TYPE = 'BASE TABLE'
      ORDER BY p.rows DESC
    `)

    // Try to detect known WorldOffice tables
    const tableNames = result.recordset.map((r: Record<string, unknown>) => String(r.name).toLowerCase())
    const detected: string[] = []

    if (tableNames.some((n: string) => n.includes('tercero'))) detected.push('terceros')
    if (tableNames.some((n: string) => n.includes('inventario') || n.includes('producto'))) detected.push('productos')
    if (tableNames.some((n: string) => n.includes('empleado') || n.includes('nomina'))) detected.push('empleados')
    if (tableNames.some((n: string) => n.includes('plancuenta') || n.includes('plan_cuenta') || n.includes('cuentas'))) detected.push('plan_cuentas')

    return NextResponse.json({
      tables: result.recordset,
      detected,
      total: result.recordset.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    if (pool) await pool.close()
  }
}

// ─── Extract data using known queries ────────────────────────────────────────

async function handleExtract(body: Record<string, unknown>) {
  const config = buildConfig(body as Parameters<typeof buildConfig>[0])
  const tableKey = String(body.table_key || '')
  let pool: sql.ConnectionPool | null = null

  try {
    pool = await sql.connect(config)

    // Try primary query first, then alternative
    const primaryQuery = WO_TABLE_QUERIES[tableKey]
    const altQuery = WO_TABLE_QUERIES[`${tableKey}_alt`]

    let rows: Record<string, unknown>[] = []
    let queryUsed = ''

    if (primaryQuery) {
      try {
        const result = await pool.request().query(primaryQuery)
        rows = result.recordset
        queryUsed = 'primary'
      } catch {
        // Primary failed, try alt
        if (altQuery) {
          const result = await pool.request().query(altQuery)
          rows = result.recordset
          queryUsed = 'alternative'
        }
      }
    }

    if (rows.length === 0 && altQuery && queryUsed !== 'alternative') {
      try {
        const result = await pool.request().query(altQuery)
        rows = result.recordset
        queryUsed = 'alternative'
      } catch {
        // Both failed
      }
    }

    return NextResponse.json({
      rows,
      count: rows.length,
      query_used: queryUsed,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    if (pool) await pool.close()
  }
}

// ─── Custom query (for discovering table structure) ──────────────────────────

async function handleCustomQuery(body: Record<string, unknown>) {
  const config = buildConfig(body as Parameters<typeof buildConfig>[0])
  const tableName = String(body.table_name || '')
  let pool: sql.ConnectionPool | null = null

  // Sanitize table name — only allow alphanumeric + underscore
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    return NextResponse.json({ error: 'Nombre de tabla inválido' }, { status: 400 })
  }

  try {
    pool = await sql.connect(config)

    // Get columns
    const colResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = '${tableName}'
      ORDER BY ORDINAL_POSITION
    `)

    // Get sample data (first 5 rows)
    const sampleResult = await pool.request().query(`SELECT TOP 5 * FROM [${tableName}]`)

    return NextResponse.json({
      columns: colResult.recordset,
      sample: sampleResult.recordset,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 500 })
  } finally {
    if (pool) await pool.close()
  }
}
