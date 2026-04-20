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
// SALDOS INICIALES — Balance de Prueba WO (por tercero y cuenta auxiliar)
// ============================================================

interface BalanceRow {
  account_code: string
  account_name: string | null
  party_doc_number: string
  party_name: string
  party_doc_type: string | null
  saldo_inicial: number
  debitos: number
  creditos: number
  saldo_final: number
}

interface BalanceMeta {
  cutoff_date: string | null       // ISO YYYY-MM-DD (fin del periodo)
  period_start: string | null
  period_end: string | null
  company_name: string | null
}

/**
 * Convierte formato WO a number:
 *  · "3.496.000,00"  → 3496000
 *  · "(234.000,00)"  → -234000
 *  · "-" o "- "      → 0
 *  · vacío           → 0
 */
function parseWoMoney(raw: string | undefined): number {
  if (!raw) return 0
  const t = raw.trim()
  if (!t || t === '-' || t === '—') return 0

  const isNegative = t.startsWith('(') && t.endsWith(')')
  let clean = t.replace(/[()\s]/g, '')
  // Formato CO: puntos miles, coma decimal
  clean = clean.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(clean)
  if (isNaN(n)) return 0
  return isNegative ? -n : n
}

/**
 * Parser del Balance de Prueba WO.
 * Detecta el contexto de la cuenta actual y asigna cada movimiento al
 * código auxiliar más reciente (típicamente 8+ dígitos).
 */
function parseWorldOfficeBalanceCsv(csv: string): {
  meta: BalanceMeta
  rows: BalanceRow[]
  diagnostics: { skipped_no_context: number; skipped_bad_format: number; samples: string[] }
} {
  const lines = csv.split(/\r?\n/)
  if (lines.length < 6) {
    throw new Error('Archivo muy corto. ¿Es un Balance de Prueba de WO?')
  }

  // Extraer metadata de las primeras líneas
  const meta: BalanceMeta = {
    cutoff_date: null,
    period_start: null,
    period_end: null,
    company_name: null,
  }

  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const l = lines[i].replace(/;/g, ' ').trim()
    if (!l) continue
    // "GVM CORPORATION GLOBAL VETERINARY..." (línea 1)
    if (i === 0) meta.company_name = l
    // "Balance de Prueba entre el 01/01/2026 y el 31/03/2026"
    const m = l.match(/(\d{2})\/(\d{2})\/(\d{4})\s*y\s*el\s*(\d{2})\/(\d{2})\/(\d{4})/i)
    if (m) {
      meta.period_start = `${m[3]}-${m[2]}-${m[1]}`
      meta.period_end = `${m[6]}-${m[5]}-${m[4]}`
      meta.cutoff_date = meta.period_end
    }
  }

  // Buscar línea de cabecera con "Saldo Inicial"
  let headerIdx = -1
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const low = lines[i].toLowerCase()
    if (low.includes('saldo inicial') && low.includes('débitos')) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) {
    throw new Error('No se encontró la cabecera "Saldo Inicial;Débitos;Créditos;Saldo Final"')
  }

  const rows: BalanceRow[] = []
  let currentAccountCode: string | null = null
  let currentAccountName: string | null = null
  let skippedNoContext = 0
  let skippedBadFormat = 0
  const samples: string[] = []
  const pushSample = (s: string) => { if (samples.length < 20) samples.push(s.slice(0, 200)) }

  // Regex para detectar header de cuenta contable: "CODE NOMBRE;;;;" (sin valores)
  // CODE es 1-10 dígitos, seguido de espacio y nombre
  const accountHeaderRegex = /^(\d{1,10})\s+(.+?);;;;$/
  // Regex para cuenta LEAF sin tercero (valores directos en la línea):
  // "CODE NOMBRE;saldo_ini;debitos;creditos;saldo_final"
  // Solo aplica a cuentas de 4+ dígitos (cuenta/subcuenta/auxiliar).
  const accountLeafWithValuesRegex = /^(\d{4,10})\s+(.+?);([^;]*);([^;]*);([^;]*);([^;]*)$/
  // Regex para total: "Total CODE NOMBRE;val;val;val;val"
  const totalRegex = /^Total\s+(\d+)\s+/i

  // Regex para identificar TERCERO al inicio de la línea:
  // patrón: "NOMBRE TIPODOC  NUMERO; ..."
  // tipos: NIT, CC, CE, TI, PP, o frases como "Documento de identificación extranjero"
  const partyRegex = /^(.+?)\s+(NIT|CC|CE|TI|PP|Documento de identificación extranjero|Documento de Identificación extranjero Persona Jurídica|Cédula de extranjería|Permiso especial de permanencia)\s+(\S[\S\s]*?)$/

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const raw = lines[i]
    if (!raw || raw.trim() === '') continue

    const trimmed = raw.trim()

    // Saltar totales (no son movimientos reales)
    if (totalRegex.test(trimmed)) continue

    // Detectar header de cuenta (nivel jerárquico) — valores vacíos
    const accountMatch = trimmed.match(accountHeaderRegex)
    if (accountMatch) {
      const code = accountMatch[1]
      const name = accountMatch[2].trim()
      // Aceptamos como contexto cualquier código de 4+ dígitos.
      // GVM usa tanto subcuentas de 6 dígitos (p.ej. 110510) como auxiliares de 8 (11050501)
      // como nivel "leaf" con parties. Si después viene un header más profundo,
      // éste lo sobrescribe; si viene una fila de tercero, se asocia al último código.
      if (code.length >= 4) {
        currentAccountCode = code
        currentAccountName = name
      } else {
        // Clase (1) o grupo (2) — no deberían tener parties directamente bajo
        currentAccountCode = null
        currentAccountName = null
      }
      continue
    }

    // Detectar cuenta LEAF con valores directos (sin breakdown de terceros)
    // Ej: "24040505 IVA DESCONTABLE;0; 10.000.000,00 ; 20.000.000,00 ; (10.000.000,00)"
    // Estas son cuentas marcadas requires_party=false o con saldo técnico.
    const leafMatch = trimmed.match(accountLeafWithValuesRegex)
    if (leafMatch) {
      const code = leafMatch[1]
      const name = leafMatch[2].trim()
      const si = parseWoMoney(leafMatch[3])
      const db = parseWoMoney(leafMatch[4])
      const cr = parseWoMoney(leafMatch[5])
      const sf = parseWoMoney(leafMatch[6])

      // Solo registrar si tiene algún valor no cero
      if (si !== 0 || db !== 0 || cr !== 0 || sf !== 0) {
        rows.push({
          account_code: code,
          account_name: name,
          party_doc_number: '',          // sin tercero — se consolida en el "tercero por defecto"
          party_name: 'SIN TERCERO',
          party_doc_type: null,
          saldo_inicial: si,
          debitos: db,
          creditos: cr,
          saldo_final: sf,
        })
      }

      // Actualizar contexto (por si WO mezcla cuentas con/sin terceros)
      currentAccountCode = code
      currentAccountName = name
      continue
    }

    // Línea con valores — debe ser movimiento de tercero
    if (!currentAccountCode) {
      skippedNoContext++
      pushSample(`[NO_CTX] ${trimmed}`)
      continue
    }

    // Dividir por ';'
    const fields = splitCsvLine(raw)
    if (fields.length < 5) {
      skippedBadFormat++
      pushSample(`[FEW_FIELDS=${fields.length}] ${trimmed}`)
      continue
    }

    const namePart = (fields[0] || '').trim()
    if (!namePart) {
      skippedBadFormat++
      pushSample(`[NO_NAME] ${trimmed}`)
      continue
    }

    // Parser del nombre+doc+número
    const partyMatch = namePart.match(partyRegex)
    if (!partyMatch) {
      skippedBadFormat++
      pushSample(`[NO_PARTY_MATCH ctx=${currentAccountCode}] ${trimmed}`)
      continue
    }

    let partyName = partyMatch[1].trim()
    const docTypeRaw = partyMatch[2].trim()
    let docNumber = partyMatch[3].trim()

    // Normalizar doc_type
    let docType: string
    const dtLow = docTypeRaw.toLowerCase()
    if (docTypeRaw === 'NIT') docType = 'NIT'
    else if (docTypeRaw === 'CC') docType = 'CC'
    else if (docTypeRaw === 'CE') docType = 'CE'
    else if (docTypeRaw === 'TI') docType = 'TI'
    else if (docTypeRaw === 'PP') docType = 'PP'
    else if (dtLow.includes('persona jurídica') || dtLow.includes('persona juridica')) docType = 'NIT'
    else if (dtLow.includes('cédula de extranjería') || dtLow.includes('cedula de extranjeria')) docType = 'CE'
    else if (dtLow.includes('permiso especial')) docType = 'PEP'
    else if (dtLow.includes('documento de identificación') || dtLow.includes('documento de identificacion')) docType = 'PP'
    else docType = 'CC'

    // Limpiar doc_number: el primer token suele ser el número; descartar DV si existe (último token de 1 dígito para NIT)
    const tokens = docNumber.split(/\s+/).filter(Boolean)
    if (tokens.length === 0) continue
    docNumber = tokens.join('')
    if (docType === 'NIT' && tokens.length >= 2) {
      const last = tokens[tokens.length - 1]
      if (/^\d{1}$/.test(last)) {
        docNumber = tokens.slice(0, -1).join('')
      }
    }
    if (['NIT', 'CC', 'TI'].includes(docType)) {
      docNumber = docNumber.replace(/\D/g, '')
    }
    if (!docNumber) continue

    // Limpiar nombre (quita espacios dobles)
    partyName = partyName.replace(/\s{2,}/g, ' ').trim()

    const saldoInicial = parseWoMoney(fields[1])
    const debitos = parseWoMoney(fields[2])
    const creditos = parseWoMoney(fields[3])
    const saldoFinal = parseWoMoney(fields[4])

    rows.push({
      account_code: currentAccountCode,
      account_name: currentAccountName,
      party_doc_number: docNumber,
      party_name: partyName,
      party_doc_type: docType,
      saldo_inicial: saldoInicial,
      debitos,
      creditos,
      saldo_final: saldoFinal,
    })
  }

  return {
    meta,
    rows,
    diagnostics: {
      skipped_no_context: skippedNoContext,
      skipped_bad_format: skippedBadFormat,
      samples,
    },
  }
}

export async function previewWorldOfficeBalanceAction(
  csv: string,
  limit = 30,
): Promise<
  | {
      success: true
      meta: BalanceMeta
      total: number
      sample: BalanceRow[]
      accounts_count: number
      parties_count: number
      total_debits: number
      total_credits: number
      parties_matched: number
      accounts_matched: number
      diagnostics: { skipped_no_context: number; skipped_bad_format: number; samples: string[] }
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

    const { meta, rows, diagnostics } = parseWorldOfficeBalanceCsv(csv)
    if (rows.length === 0) return { success: false, error: 'No se detectaron movimientos. Verifica que exportaste con "Detallar Terceros" y "Mostrar Nits".' }

    // Stats
    const uniqueAccounts = new Set(rows.map(r => r.account_code))
    const uniqueParties = new Set(rows.map(r => r.party_doc_number).filter(Boolean))
    const totalDebits = rows.reduce((s, r) => s + r.debitos, 0)
    const totalCredits = rows.reduce((s, r) => s + r.creditos, 0)

    // Cruce con DB: cuentas y terceros ya existentes
    const accCodes = Array.from(uniqueAccounts)
    const { data: existingAccounts } = await supabase
      .from('chart_accounts')
      .select('code')
      .eq('tenant_id', ut.tenant_id)
      .in('code', accCodes)

    const docs = Array.from(uniqueParties)
    // Chunk por 500 y usar .range() para bypass del límite 1000 de PostgREST
    const matchedDocs = new Set<string>()
    const PARTY_CHUNK = 500
    for (let i = 0; i < docs.length; i += PARTY_CHUNK) {
      const chunk = docs.slice(i, i + PARTY_CHUNK)
      if (chunk.length === 0) continue
      const { data } = await supabase
        .from('parties')
        .select('doc_number')
        .eq('tenant_id', ut.tenant_id)
        .in('doc_number', chunk)
        .range(0, 9999)
      ;(data || []).forEach((p: { doc_number: string }) => matchedDocs.add(p.doc_number))
    }

    return {
      success: true,
      meta,
      total: rows.length,
      sample: rows.slice(0, limit),
      accounts_count: uniqueAccounts.size,
      parties_count: uniqueParties.size,
      total_debits: totalDebits,
      total_credits: totalCredits,
      accounts_matched: (existingAccounts || []).length,
      parties_matched: matchedDocs.size,
      diagnostics,
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error procesando CSV' }
  }
}

export async function importWorldOfficeBalanceAction(
  csv: string,
  cutoffDate: string,  // YYYY-MM-DD (el usuario puede sobrescribir el del archivo)
): Promise<
  | {
      success: true
      total: number
      processed: number
      skipped: number
      total_debits: number
      total_credits: number
      difference: number
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

    const { meta, rows } = parseWorldOfficeBalanceCsv(csv)  // diagnostics no se usa en import
    if (rows.length === 0) return { success: false, error: 'CSV sin movimientos' }

    const finalCutoff = cutoffDate || meta.cutoff_date
    const finalPeriodStart = meta.period_start || finalCutoff
    const finalPeriodEnd = meta.period_end || finalCutoff
    if (!finalCutoff) return { success: false, error: 'No se pudo determinar la fecha de corte' }

    // 16k filas / 500 = 34 chunks. Cada uno ~1-2s en Supabase. Total: 30-60s
    const CHUNK = 500
    let processed = 0
    let skipped = 0
    let debits = 0
    let credits = 0
    const t0 = Date.now()
    console.log(`[wo-balance-import] start: ${rows.length} rows, ${Math.ceil(rows.length / CHUNK)} chunks`)

    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      const chunkN = Math.floor(i / CHUNK) + 1
      const tChunk = Date.now()
      try {
        const { data, error } = await supabase.rpc('import_opening_balances_wo', {
          p_tenant_id: ut.tenant_id,
          p_cutoff_date: finalCutoff,
          p_period_start: finalPeriodStart,
          p_period_end: finalPeriodEnd,
          p_rows: chunk,
        })
        if (error) {
          console.error(`[wo-balance-import] chunk ${chunkN} error:`, error.message, error.code, error.details)
          return { success: false, error: `Error lote ${chunkN}: ${error.message}` }
        }
        const r = data as { processed?: number; skipped?: number; total_debits?: number; total_credits?: number }
        processed += r?.processed ?? 0
        skipped += r?.skipped ?? 0
        debits += r?.total_debits ?? 0
        credits += r?.total_credits ?? 0
        console.log(`[wo-balance-import] chunk ${chunkN}/${Math.ceil(rows.length / CHUNK)} ok in ${Date.now() - tChunk}ms (acc processed=${processed})`)
      } catch (e) {
        console.error(`[wo-balance-import] chunk ${chunkN} threw:`, e instanceof Error ? e.message : String(e))
        return { success: false, error: `Excepción lote ${chunkN}: ${e instanceof Error ? e.message : 'desconocida'}` }
      }
    }
    console.log(`[wo-balance-import] done in ${Date.now() - t0}ms. processed=${processed} skipped=${skipped}`)

    // No revalidamos /accounting aquí — el snapshot vive en su propia tabla
    // y revalidar puede triggerear render de páginas que aún no existen.

    return {
      success: true,
      total: rows.length,
      processed,
      skipped,
      total_debits: debits,
      total_credits: credits,
      difference: debits - credits,
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error' }
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
