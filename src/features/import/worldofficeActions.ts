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

// ============================================================
// TERCEROS WO — Listado de Terceros con Direcciones
// ============================================================

interface PartyRow {
  legal_name: string
  doc_type: 'NIT' | 'CC' | 'CE' | 'PP' | 'TI' | 'PEP'
  doc_number: string
  dv: string | null
  address: string | null
  phone: string | null
  city: string | null
  raw_identificacion: string
}

/**
 * Parser de la columna "Identificacion" de WO.
 * Ejemplos de formatos:
 *  · "NIT 901049056 2"
 *  · "CC 52698088"
 *  · "Cédula de extranjería 700182029"
 *  · "Documento de identificación extranjero 77096897"
 *  · "Permiso especial de permanencia 5396223"
 *  · "Documento de Identificación extranjero Persona Jurídica 217662720013"
 */
function parseIdentificacion(raw: string): { doc_type: PartyRow['doc_type']; doc_number: string; dv: string | null } {
  const clean = (raw || '').trim()
  if (!clean) return { doc_type: 'CC', doc_number: '', dv: null }

  // Detectar tipo por prefijo
  let docType: PartyRow['doc_type'] = 'CC'
  let rest = clean

  const low = clean.toLowerCase()
  if (low.startsWith('nit ')) {
    docType = 'NIT'
    rest = clean.slice(4)
  } else if (low.startsWith('cc ')) {
    docType = 'CC'
    rest = clean.slice(3)
  } else if (low.startsWith('ce ')) {
    docType = 'CE'
    rest = clean.slice(3)
  } else if (low.startsWith('ti ')) {
    docType = 'TI'
    rest = clean.slice(3)
  } else if (low.startsWith('pp ')) {
    docType = 'PP'
    rest = clean.slice(3)
  } else if (low.includes('cédula de extranjería') || low.includes('cedula de extranjeria')) {
    docType = 'CE'
    rest = clean.replace(/c[eé]dula de extranjer[ií]a/i, '').trim()
  } else if (low.includes('permiso especial de permanencia')) {
    docType = 'PEP'
    rest = clean.replace(/permiso especial de permanencia/i, '').trim()
  } else if (low.includes('persona jurídica') || low.includes('persona juridica')) {
    // "Documento de Identificación extranjero Persona Jurídica 217662720013"
    docType = 'NIT'
    rest = clean.replace(/documento de identificaci[oó]n extranjero persona jur[ií]dica/i, '').trim()
  } else if (low.includes('documento de identificación') || low.includes('documento de identificacion')) {
    docType = 'PP'
    rest = clean.replace(/documento de identificaci[oó]n extranjero/i, '').trim()
  } else if (low.startsWith('cédula de ciudadanía') || low.startsWith('cedula de ciudadania')) {
    docType = 'CC'
    rest = clean.replace(/c[eé]dula de ciudadan[ií]a/i, '').trim()
  }

  // Separar número y DV. Ejemplos después del prefijo:
  //  · "901049056 2" → numero=901049056, dv=2
  //  · "52698088" → numero=52698088, dv=null
  //  · "  8860062053 3" → numero=8860062053, dv=3
  const tokens = rest.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return { doc_type: docType, doc_number: '', dv: null }

  // Para NIT el último dígito es DV si hay 2+ tokens Y el último token es 1 dígito
  let docNumber = tokens.join('')
  let dv: string | null = null
  if (docType === 'NIT' && tokens.length >= 2) {
    const last = tokens[tokens.length - 1]
    if (/^\d{1}$/.test(last)) {
      dv = last
      docNumber = tokens.slice(0, -1).join('')
    }
  }

  // Limpiar doc_number: solo dígitos (preservar letras si es pasaporte extranjero)
  if (docType === 'NIT' || docType === 'CC' || docType === 'TI') {
    docNumber = docNumber.replace(/\D/g, '')
  }

  return { doc_type: docType, doc_number: docNumber, dv }
}

/** Parser CSV específico para "Listado de Terceros con Direcciones" */
function parseWorldOfficePartiesCsv(csv: string): PartyRow[] {
  const lines = csv.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length < 3) return []

  // Buscar línea de cabecera (tiene "Nombre" e "Identificacion")
  let headerIdx = -1
  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const low = lines[i].toLowerCase()
    if (low.includes('nombre') && (low.includes('identificacion') || low.includes('identificación'))) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) {
    throw new Error('No se encontró la cabecera "Nombre;Identificacion..." en el CSV.')
  }

  const headers = splitCsvLine(lines[headerIdx]).map(h => h.trim().toLowerCase())
  const colIdx = (needle: string) => {
    const n = needle.toLowerCase()
    return headers.findIndex(h => h === n || h.includes(n))
  }

  const iName = colIdx('nombre')
  const iId = colIdx('identificacion') >= 0 ? colIdx('identificacion') : colIdx('identificación')
  const iAddr = colIdx('dirección') >= 0 ? colIdx('dirección') : colIdx('direccion')
  const iPhone = colIdx('teléfonos') >= 0 ? colIdx('teléfonos') : colIdx('telefonos')
  const iCity = colIdx('ciudad')

  if (iName === -1 || iId === -1) {
    throw new Error('CSV sin columnas Nombre e Identificacion. Verifica el formato WO.')
  }

  const rows: PartyRow[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const fields = splitCsvLine(lines[i])
    if (fields.length < 3) continue

    const name = (fields[iName] || '').trim()
    const rawId = (fields[iId] || '').trim()
    if (!name || !rawId) continue

    const { doc_type, doc_number, dv } = parseIdentificacion(rawId)
    if (!doc_number) continue

    const phoneRaw = iPhone >= 0 ? (fields[iPhone] || '').trim() : ''
    const phone = (phoneRaw && phoneRaw !== '0') ? phoneRaw : null
    const addressRaw = iAddr >= 0 ? (fields[iAddr] || '').trim() : ''
    const address = (addressRaw && addressRaw.toLowerCase() !== 'no informada') ? addressRaw : null
    const cityRaw = iCity >= 0 ? (fields[iCity] || '').trim() : ''
    const city = cityRaw || null

    rows.push({
      legal_name: name,
      doc_type,
      doc_number,
      dv,
      address,
      phone,
      city,
      raw_identificacion: rawId,
    })
  }

  return rows
}

export async function previewWorldOfficePartiesAction(
  csv: string,
  limit = 30,
): Promise<
  | {
      success: true
      total: number
      sample: PartyRow[]
      summary: Record<string, number>
      already_exist: number
      new_ones: number
    }
  | { success: false; error: string }
> {
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

    const rows = parseWorldOfficePartiesCsv(csv)
    if (rows.length === 0) return { success: false, error: 'No se detectaron terceros en el archivo.' }

    // Resumen por tipo documento
    const summary: Record<string, number> = {}
    for (const r of rows) {
      summary[r.doc_type] = (summary[r.doc_type] || 0) + 1
    }

    // Cruzar con DB: cuántos ya existen por doc_number
    const docNumbers = rows.map(r => r.doc_number)
    const { data: existing } = await supabase
      .from('parties')
      .select('doc_number')
      .eq('tenant_id', ut.tenant_id)
      .in('doc_number', docNumbers)

    const existingSet = new Set((existing || []).map((e: { doc_number: string }) => e.doc_number))
    const already_exist = rows.filter(r => existingSet.has(r.doc_number)).length
    const new_ones = rows.length - already_exist

    return {
      success: true,
      total: rows.length,
      sample: rows.slice(0, limit),
      summary,
      already_exist,
      new_ones,
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error procesando CSV' }
  }
}

export async function importWorldOfficePartiesAction(
  csv: string,
): Promise<
  | { success: true; total: number; inserted: number; updated: number; skipped: number }
  | { success: false; error: string }
> {
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

    const rows = parseWorldOfficePartiesCsv(csv)
    if (rows.length === 0) return { success: false, error: 'CSV sin filas válidas' }

    const CHUNK = 300
    let totalInserted = 0
    let totalUpdated = 0
    let totalSkipped = 0

    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      const { data, error } = await supabase.rpc('import_parties_wo', {
        p_tenant_id: ut.tenant_id,
        p_rows: chunk,
      })

      if (error) {
        return { success: false, error: `Error en lote ${Math.floor(i / CHUNK) + 1}: ${error.message}` }
      }

      const r = data as { inserted?: number; updated?: number; skipped?: number }
      totalInserted += r?.inserted ?? 0
      totalUpdated += r?.updated ?? 0
      totalSkipped += r?.skipped ?? 0
    }

    revalidatePath('/parties')

    return {
      success: true,
      total: rows.length,
      inserted: totalInserted,
      updated: totalUpdated,
      skipped: totalSkipped,
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}

// ============================================================
// PUC — Plan de Cuentas WO (ya existente)
// ============================================================

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
