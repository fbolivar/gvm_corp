// Audita la coherencia de las reglas contables: escenarios incompletos,
// duplicados exactos y cuentas que no corresponden al tipo de documento.
//   node scripts/wo-import/audit-reglas.mjs <reglas.json>
import fs from 'node:fs'

const rules = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, ''))
const scen = (r) => `${r.doc_kind}|IVA${r.iva_rate}|${r.taxpayer_code}|${r.payment_form}`

const byScenario = new Map()
for (const r of rules) {
    if (!byScenario.has(scen(r))) byScenario.set(scen(r), [])
    byScenario.get(scen(r)).push(r)
}

const dupExactos = [], sinAutorrenta = [], sinCartera = [], sinIngreso = [], sinIva = []
const cuentaMalDoc = [], autorrentaCoja = []

for (const [k, rows] of byScenario) {
    const [docKind, ivaTag] = k.split('|')
    const ivaRate = Number(ivaTag.replace('IVA', ''))

    // Duplicados exactos (misma cuenta repetida en el mismo escenario)
    const vistos = new Map()
    for (const r of rows) {
        const v = `${r.concept}:${r.account_code}:${r.nature}`
        vistos.set(v, (vistos.get(v) ?? 0) + 1)
    }
    for (const [v, n] of vistos) if (n > 1) dupExactos.push(`${k} → ${v} x${n}`)

    const conceptos = new Set(rows.map(r => r.concept))
    if (!conceptos.has('CARTERA')) sinCartera.push(k)
    if (!conceptos.has('INGRESO')) sinIngreso.push(k)
    if (ivaRate > 0 && !conceptos.has('IVA')) sinIva.push(k)
    if (!conceptos.has('AUTORRENTA_ANTICIPO') && !conceptos.has('AUTORRENTA_PASIVO')) sinAutorrenta.push(k)
    else if (conceptos.has('AUTORRENTA_ANTICIPO') !== conceptos.has('AUTORRENTA_PASIVO')) {
        autorrentaCoja.push(`${k} → solo ${conceptos.has('AUTORRENTA_ANTICIPO') ? 'ANTICIPO (13551511)' : 'PASIVO (2365)'}`)
    }

    // Ingresos: factura usa 4135; nota crédito debe usar 417x (devoluciones)
    for (const r of rows.filter(x => x.concept === 'INGRESO')) {
        if (docKind === 'FV' && !r.account_code.startsWith('4135')) cuentaMalDoc.push(`${k} FV con cuenta ${r.account_code}`)
        if (docKind === 'NC' && !r.account_code.startsWith('417')) cuentaMalDoc.push(`${k} NC con cuenta ${r.account_code}`)
    }
}

const bloque = (titulo, arr, limite = 20) => {
    console.log(`\n${titulo}: ${arr.length}`)
    arr.slice(0, limite).forEach(x => console.log('   ', x))
    if (arr.length > limite) console.log(`    ... y ${arr.length - limite} más`)
}

console.log('\n════ AUDITORÍA DE REGLAS CONTABLES ════')
console.log('Escenarios (documento × tarifa × contribuyente × forma de pago):', byScenario.size)
bloque('Cuentas DUPLICADAS en un mismo escenario', dupExactos)
bloque('Escenarios SIN cuenta de cartera', sinCartera)
bloque('Escenarios SIN cuenta de ingreso', sinIngreso)
bloque('Escenarios con IVA pero SIN cuenta de IVA', sinIva)
bloque('Escenarios SIN autorretención (debe ir en todos)', sinAutorrenta)
bloque('Autorretención incompleta (falta una de las dos cuentas)', autorrentaCoja)
bloque('Cuenta de ingreso que no corresponde al documento', cuentaMalDoc)
