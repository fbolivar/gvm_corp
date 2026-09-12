// Compara las reglas contables de la base contra el Excel corregido del contador.
//   node scripts/wo-import/diff-reglas.mjs <reglas_excel.json> <reglas_bd.json>
import fs from 'node:fs'

const [excelPath, bdPath] = process.argv.slice(2)
const load = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''))
const excel = load(excelPath)
const bd = load(bdPath)

// Clave de negocio: un mismo escenario (documento, tarifa, contribuyente, forma
// de pago, concepto) debe resolverse en UNA cuenta.
const key = (r) => `${r.doc_kind}|${r.iva_rate}|${r.taxpayer_code}|${r.payment_form}|${r.concept}`
const val = (r) => `${r.account_code}:${r.nature}`

const idx = (arr) => {
    const m = new Map()
    for (const r of arr) {
        const k = key(r)
        if (!m.has(k)) m.set(k, [])
        m.get(k).push(r)
    }
    return m
}
const mExcel = idx(excel), mBd = idx(bd)

const faltan = [], sobran = [], cambian = [], duplicadasBd = [], duplicadasExcel = []

for (const [k, rows] of mExcel) {
    if (rows.length > 1 && new Set(rows.map(val)).size > 1) duplicadasExcel.push({ k, cuentas: rows.map(val) })
    const enBd = mBd.get(k)
    if (!enBd) { faltan.push({ k, cuenta: val(rows[0]) }); continue }
    const a = new Set(rows.map(val)), b = new Set(enBd.map(val))
    for (const v of a) if (!b.has(v)) cambian.push({ k, excel: v, bd: [...b].join(',') })
}
for (const [k, rows] of mBd) {
    if (rows.length > 1 && new Set(rows.map(val)).size > 1) duplicadasBd.push({ k, cuentas: rows.map(val) })
    if (!mExcel.has(k)) sobran.push({ k, cuenta: val(rows[0]) })
}

console.log('\n════ COMPARATIVO DE REGLAS CONTABLES ════\n')
console.log('Reglas en el Excel del contador :', excel.length)
console.log('Reglas en el sistema            :', bd.length)
console.log('\nEscenarios solo en el Excel (faltan en el sistema):', faltan.length)
faltan.slice(0, 25).forEach(f => console.log('  +', f.k, '→', f.cuenta))
if (faltan.length > 25) console.log(`  ... y ${faltan.length - 25} más`)

console.log('\nEscenarios solo en el sistema (ya no están en el Excel):', sobran.length)
sobran.slice(0, 25).forEach(f => console.log('  -', f.k, '→', f.cuenta))
if (sobran.length > 25) console.log(`  ... y ${sobran.length - 25} más`)

console.log('\nEscenarios con CUENTA DISTINTA:', cambian.length)
cambian.slice(0, 30).forEach(c => console.log(`  ≠ ${c.k}\n      excel: ${c.excel}   sistema: ${c.bd}`))
if (cambian.length > 30) console.log(`  ... y ${cambian.length - 30} más`)

console.log('\nEscenarios DUPLICADOS en el sistema:', duplicadasBd.length)
duplicadasBd.slice(0, 20).forEach(d => console.log('  !', d.k, '→', d.cuentas.join(' + ')))
console.log('Escenarios DUPLICADOS en el Excel:', duplicadasExcel.length)
duplicadasExcel.slice(0, 20).forEach(d => console.log('  !', d.k, '→', d.cuentas.join(' + ')))
