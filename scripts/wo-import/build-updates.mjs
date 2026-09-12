// Genera los SQL de actualización de terceros por lotes (Fase 1).
//   node scripts/wo-import/build-updates.mjs <xlsx> <parties.json> <outDir>
//
// Criterio conservador:
//  - taxpayer_type y nombres separados: se escriben con el dato de WorldOffice.
//  - city / economic_activity / dv: SOLO si están vacíos en la base.
//  - legal_name, is_customer/is_vendor, contacto: NO se tocan.
import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'
import { TAXPAYER_MAP, normalizeDoc, cleanText, toBool, icaRate } from './map-terceros.mjs'

const [xlsxPath, partiesPath, outDir] = process.argv.slice(2)
const wb = XLSX.read(fs.readFileSync(xlsxPath), { type: 'buffer' })
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
const parties = JSON.parse(fs.readFileSync(partiesPath, 'utf8').replace(/^\uFEFF/, ''))

const byDoc = new Map()
for (const p of parties) byDoc.set(normalizeDoc(p.doc_number), p)

const q = (v) => v === null || v === undefined || v === '' ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`

const tuples = []
for (const r of rows) {
    const p = byDoc.get(normalizeDoc(r['Identificación']))
    if (!p) continue
    const prop = cleanText(r['Propiedad Retención'])
    const code = prop ? TAXPAYER_MAP[prop] : null
    if (!code) continue // sin dato fiable: no se toca el tercero

    tuples.push('(' + [
        q(p.id), q(code),
        q(cleanText(r['Primer Nombre'])), q(cleanText(r['Segundo Nombre'])),
        q(cleanText(r['Primer Apellido'])), q(cleanText(r['Segundo Apellido'])),
        toBool(r['Aplica ReteIca']) ? 'true' : 'false',
        icaRate(r['Tarifa Ica']) ?? 'NULL',
        q(cleanText(r['Ciudad'])), q(cleanText(r['Actividad Economica'])), q(cleanText(r['DV'])),
    ].join(',') + ')')
}

const SQL_HEAD = `update public.parties p set
    taxpayer_type     = v.taxpayer_type,
    first_name        = coalesce(nullif(v.first_name, ''), p.first_name),
    second_name       = coalesce(nullif(v.second_name, ''), p.second_name),
    first_surname     = coalesce(nullif(v.first_surname, ''), p.first_surname),
    second_surname    = coalesce(nullif(v.second_surname, ''), p.second_surname),
    applies_reteica   = v.applies_reteica::boolean,
    ica_rate          = v.ica_rate::numeric,
    city              = coalesce(nullif(p.city, ''), nullif(v.city, '')),
    economic_activity = coalesce(nullif(p.economic_activity, ''), nullif(v.economic_activity, '')),
    dv                = coalesce(nullif(p.dv, ''), nullif(v.dv, '')),
    updated_at        = now()
from (values\n`

const SQL_TAIL = `\n) as v(id, taxpayer_type, first_name, second_name, first_surname, second_surname, applies_reteica, ica_rate, city, economic_activity, dv)
where p.id = v.id::uuid;\n`

fs.mkdirSync(outDir, { recursive: true })
const SIZE = 400
let batch = 0
for (let i = 0; i < tuples.length; i += SIZE) {
    batch++
    const chunk = tuples.slice(i, i + SIZE).join(',\n')
    const file = path.join(outDir, `10-update-${String(batch).padStart(2, '0')}.sql`)
    fs.writeFileSync(file, SQL_HEAD + chunk + SQL_TAIL)
}
console.log(`Terceros a actualizar: ${tuples.length}`)
console.log(`Lotes generados: ${batch} (de ${SIZE} filas)`)
