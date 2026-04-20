'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Fila normalizada del PUC para enviar a la RPC
interface PucRow {
  code: string
  name: string
  parent_code: string | null
  inac: boolean
  hidden: boolean
  requires_party: boolean
  group_label: string | null
  type: string | null
  external_ref: string | null
}

interface ImportPucResult {
  success: boolean
  total_rows?: number
  processed?: number
  linked_parents?: number
  error?: string
}

/**
 * Parser CSV robusto para export WorldOffice.
 * Maneja: separador ';', cabecera en línea 3, campos entre comillas, saltos de línea.
 */
function parseWorldOfficePucCsv(csv: string): PucRow[] {
  const lines = csv.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length < 3) return []

  // Línea 0 = "Cuentas Contables;;;;..."
  // Línea 1 = vacía o separadores
  // Línea 2 = cabecera "Codigo;Nombre;SubCta;Inac;Oculto_;Terceros;Grupo;Tipo;AXI;Contabilizacion"
  // Líneas 3+ = datos

  // Buscar línea que tenga "Codigo" y "Nombre"
  let headerIdx = -1
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const low = lines[i].toLowerCase()
    if (low.includes('codigo') && low.includes('nombre') && low.includes('subcta')) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) throw new Error('No se encontró la cabecera en el CSV. ¿Es un export de WorldOffice?')

  const headers = splitCsvLine(lines[headerIdx])
  const colIndex = (name: string) => headers.findIndex(h => h.trim().toLowerCase() === name.toLowerCase())

  const iCode = colIndex('Codigo')
  const iName = colIndex('Nombre')
  const iSub = colIndex('SubCta')
  const iInac = colIndex('Inac')
  const iHidden = colIndex('Oculto_')
  const iTerceros = colIndex('Terceros')
  const iGrupo = colIndex('Grupo')
  const iTipo = colIndex('Tipo')
  const iContab = colIndex('Contabilizacion')

  if (iCode === -1 || iName === -1) {
    throw new Error('El CSV no tiene columnas Codigo y Nombre. Verifica el formato.')
  }

  const rows: PucRow[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i])
    if (fields.length < 3) continue
    const code = (fields[iCode] || '').trim()
    if (!code) continue

    const name = (fields[iName] || '').trim()
    const parentCode = iSub >= 0 ? (fields[iSub] || '').trim() : ''

    rows.push({
      code,
      name,
      parent_code: parentCode || null,
      inac: siNo(fields[iInac]),
      hidden: siNo(fields[iHidden]),
      requires_party: siNo(fields[iTerceros]),
      group_label: iGrupo >= 0 ? (fields[iGrupo] || '').trim() || null : null,
      type: iTipo >= 0 ? (fields[iTipo] || '').trim() || null : null,
      external_ref: iContab >= 0 ? (fields[iContab] || '').trim() || null : null,
    })
  }

  return rows
}

/** Divide una línea CSV por ';' respetando comillas dobles. */
function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (c === ';' && !inQuotes) {
      result.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  result.push(cur)
  return result
}

function siNo(value: string | undefined): boolean {
  return (value || '').trim().toUpperCase() === 'SI'
}

/** Preview de las primeras N filas sin importar. */
export async function previewWorldOfficePucAction(
  csv: string,
  limit = 30,
): Promise<{ success: true; total: number; sample: PucRow[]; summary: Record<string, number> } | { success: false; error: string }> {
  try {
    const rows = parseWorldOfficePucCsv(csv)
    if (rows.length === 0) return { success: false, error: 'No se detectaron filas de cuentas en el archivo.' }

    // Resumen por clase (primer dígito)
    const summary: Record<string, number> = {}
    for (const r of rows) {
      const cls = r.code.charAt(0)
      summary[cls] = (summary[cls] || 0) + 1
    }

    return { success: true, total: rows.length, sample: rows.slice(0, limit), summary }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error al procesar CSV' }
  }
}

/** Import masivo del PUC a chart_accounts. */
export async function importWorldOfficePucAction(csv: string): Promise<ImportPucResult> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const { data: ut } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!ut?.tenant_id) return { success: false, error: 'Usuario sin tenant' }

    const rows = parseWorldOfficePucCsv(csv)
    if (rows.length === 0) return { success: false, error: 'CSV sin filas válidas' }

    // Llamar a la RPC en bloques de 500 para no exceder límites de JSONB
    const CHUNK = 500
    let totalProcessed = 0
    let totalLinked = 0

    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      const { data, error } = await supabase.rpc('import_chart_accounts_wo', {
        p_tenant_id: ut.tenant_id,
        p_rows: chunk,
      })

      if (error) {
        return {
          success: false,
          error: `Error en lote ${i / CHUNK + 1}: ${error.message}`,
        }
      }

      const result = data as { processed?: number; linked_parents?: number }
      totalProcessed += result?.processed ?? chunk.length
      totalLinked += result?.linked_parents ?? 0
    }

    revalidatePath('/accounting/accounts')

    return {
      success: true,
      total_rows: rows.length,
      processed: totalProcessed,
      linked_parents: totalLinked,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}
