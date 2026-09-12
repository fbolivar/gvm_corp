// Lee el Excel de contabilización corregido por el contador y lo normaliza al
// formato de la tabla `accounting_rules`.
//   node scripts/wo-import/parse-reglas.mjs <xlsx> [--json salida.json]
import fs from 'node:fs'
import XLSX from 'xlsx'
import { TAXPAYER_MAP, cleanText } from './map-terceros.mjs'

const HOJAS = {
    'EXCLUIDO 0%':  { doc_kind: 'FV', iva_rate: 0 },
    'DEV EXC 0%':   { doc_kind: 'NC', iva_rate: 0 },
    'IVA 5%':       { doc_kind: 'FV', iva_rate: 5 },
    'DEV IVA 5%':   { doc_kind: 'NC', iva_rate: 5 },
    'IVA 19%':      { doc_kind: 'FV', iva_rate: 19 },
    'DEV IVA 19%':  { doc_kind: 'NC', iva_rate: 19 },
}

/** Concepto contable a partir del código de cuenta del PUC. */
export function conceptOf(account, nature) {
    if (account.startsWith('130505')) return 'CARTERA'
    if (account.startsWith('4135') || account.startsWith('4175') || account.startsWith('417')) return 'INGRESO'
    if (account.startsWith('2408')) return 'IVA'
    if (account.startsWith('135515') && account !== '13551511') return 'RETEFUENTE'
    if (account.startsWith('135517')) return 'RETEIVA'
    if (account.startsWith('135518')) return 'RETEICA'
    if (account === '13551511') return 'AUTORRENTA_ANTICIPO'
    if (account.startsWith('2365')) return 'AUTORRENTA_PASIVO'
    return null
}

export function parseReglas(xlsxPath) {
    const wb = XLSX.read(fs.readFileSync(xlsxPath), { type: 'buffer' })
    const out = []
    const problemas = []
    const crem = []

    for (const [hoja, meta] of Object.entries(HOJAS)) {
        const ws = wb.Sheets[hoja]
        if (!ws) { problemas.push(`Falta la hoja "${hoja}"`); continue }
        for (const r of XLSX.utils.sheet_to_json(ws, { defval: '' })) {
            const raw = cleanText(r['IdCuentaContable'])
            if (!raw) continue
            // Filas de encabezado repetidas dentro de la hoja.
            if (raw === 'IdCuentaContable') continue
            // CREM = compras remisionadas: son reglas de COMPRA, no de venta.
            const docTipo = cleanText(r['IdCuentaContableDocumento'])
            if (docTipo === 'CREM') { crem.push(raw); continue }
            const account = raw.split(/\s+/)[0]
            const nature = cleanText(r['Manejo']).toLowerCase().startsWith('d') ? 'D' : 'C'
            const prop = cleanText(r['IdPropiedadRetencion'])
            const taxpayer = TAXPAYER_MAP[prop]
            const payment = cleanText(r['IdFormaDePago']).toLowerCase().startsWith('cont') ? 'CONTADO' : 'CREDITO'
            const concept = conceptOf(account, nature)

            if (!taxpayer) { problemas.push(`Tipo de contribuyente sin mapeo: "${prop}" (hoja ${hoja})`); continue }
            if (!concept) { problemas.push(`Cuenta sin concepto reconocido: ${raw} (hoja ${hoja})`); continue }

            out.push({
                doc_kind: meta.doc_kind,
                iva_rate: meta.iva_rate,
                taxpayer_code: taxpayer,
                payment_form: payment,
                account_code: account,
                nature,
                concept,
                _hoja: hoja,
                _cuenta: raw,
            })
        }
    }
    return { reglas: out, problemas: [...new Set(problemas)], crem: crem.length }
}

if (process.argv[1].endsWith('parse-reglas.mjs')) {
    const { reglas, problemas, crem } = parseReglas(process.argv[2])
    console.log('Reglas de VENTA leídas:', reglas.length)
    console.log('Reglas de COMPRA (CREM) omitidas:', crem)
    const porHoja = {}
    for (const r of reglas) porHoja[r._hoja] = (porHoja[r._hoja] || 0) + 1
    console.log('Por hoja:', porHoja)
    const porConcepto = {}
    for (const r of reglas) porConcepto[r.concept] = (porConcepto[r.concept] || 0) + 1
    console.log('Por concepto:', porConcepto)
    const formas = new Set(reglas.map(r => r.payment_form))
    console.log('Formas de pago presentes:', [...formas])
    if (problemas.length) console.log('\n⚠ PROBLEMAS:\n - ' + problemas.join('\n - '))
    const out = process.argv.indexOf('--json')
    if (out > 0) { fs.writeFileSync(process.argv[out + 1], JSON.stringify(reglas)); console.log('\nJSON:', process.argv[out + 1]) }
}
