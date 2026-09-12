// INFORME PREVIO (no escribe nada): cruza el Excel de WorldOffice contra los
// terceros de la base y reporta qué cambiaría la importación.
//   node scripts/wo-import/analyze-terceros.mjs <ruta.xlsx> <parties.json>
import fs from 'node:fs'
import XLSX from 'xlsx'
import { TAXPAYER_MAP, normalizeDoc, cleanText, toBool, icaRate } from './map-terceros.mjs'

const [xlsxPath, partiesPath] = process.argv.slice(2)
// xlsx en modo ESM no puede leer del disco por sí solo: se le pasa el buffer.
const wb = XLSX.read(fs.readFileSync(xlsxPath), { type: 'buffer' })
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
// PowerShell escribe el JSON con BOM: hay que quitarlo antes de parsear.
const parties = JSON.parse(fs.readFileSync(partiesPath, 'utf8').replace(/^﻿/, ''))

const byDoc = new Map()
for (const p of parties) byDoc.set(normalizeDoc(p.doc_number), p)

const stats = {
    excel: rows.length, encontrados: 0, sin_match: 0,
    cambia_taxpayer: 0, ya_correcto: 0, sin_propiedad: 0,
    agrega_nombres: 0, con_reteica: 0, con_tarifa_ica: 0,
    rellena_ciudad: 0, rellena_actividad: 0,
}
const porTipo = {}, sinMapeo = new Set(), sinMatch = []

for (const r of rows) {
    const doc = normalizeDoc(r['Identificación'])
    const p = byDoc.get(doc)
    if (!p) { stats.sin_match++; if (sinMatch.length < 5) sinMatch.push(`${doc} · ${cleanText(r['Primer Nombre'])}`); continue }
    stats.encontrados++

    const prop = cleanText(r['Propiedad Retención'])
    if (!prop) stats.sin_propiedad++
    else {
        const code = TAXPAYER_MAP[prop]
        if (!code) sinMapeo.add(prop)
        else {
            porTipo[code] = (porTipo[code] || 0) + 1
            if (p.taxpayer_type === code) stats.ya_correcto++; else stats.cambia_taxpayer++
        }
    }

    const fn = cleanText(r['Primer Nombre'])
    if (fn && !p.first_name) stats.agrega_nombres++
    if (toBool(r['Aplica ReteIca'])) stats.con_reteica++
    if (icaRate(r['Tarifa Ica'])) stats.con_tarifa_ica++
    if (cleanText(r['Ciudad']) && !p.city) stats.rellena_ciudad++
    if (cleanText(r['Actividad Economica']) && !p.economic_activity) stats.rellena_actividad++
}

console.log('\n════ INFORME PREVIO — IMPORTACIÓN DE TERCEROS ════\n')
console.log('Filas en el Excel de WorldOffice :', stats.excel)
console.log('Terceros en la base              :', parties.length)
console.log('Cruzan por documento             :', stats.encontrados)
console.log('Sin equivalente en la base       :', stats.sin_match, sinMatch.length ? `(ej: ${sinMatch.join(' | ')})` : '')
console.log('\n── Tipo de contribuyente ──')
console.log('Se corrige                       :', stats.cambia_taxpayer)
console.log('Ya estaba correcto               :', stats.ya_correcto)
console.log('Sin dato en WorldOffice          :', stats.sin_propiedad)
console.log('\n── Otros campos ──')
console.log('Se agregan nombres separados     :', stats.agrega_nombres)
console.log('Terceros que aplican ReteICA     :', stats.con_reteica)
console.log('Terceros con tarifa ICA          :', stats.con_tarifa_ica)
console.log('Ciudad a rellenar (estaba vacía) :', stats.rellena_ciudad)
console.log('Actividad económica a rellenar   :', stats.rellena_actividad)
console.log('\n── Distribución final por tipo ──')
for (const [k, v] of Object.entries(porTipo).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(20)} ${v}`)
if (sinMapeo.size) console.log('\n⚠ SIN MAPEO (requieren decisión):', [...sinMapeo])
