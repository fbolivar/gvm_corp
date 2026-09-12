// Simulación de contabilización de ventas contra datos REALES, sin escribir nada.
// Usa el MISMO motor que la aplicación (salesAccountingEngine).
//
//   node scripts/wo-import/simular-contabilizacion.mjs <desde> <hasta>
//
// Requiere red: ejecutar desde PowerShell, no desde el sandbox.
import fs from 'node:fs'
import { buildSalesEntry, resolveLineIvaRate, resolvePaymentForm } from '../../src/features/accounting/services/salesAccountingEngine.ts'

const [from = '2026-01-01', to = '2026-12-31'] = process.argv.slice(2)

const env = Object.fromEntries(
    fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)
        .filter(l => l.includes('=') && !l.trim().startsWith('#'))
        .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] })
)
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY

async function rest(path) {
    const r = await fetch(`${URL_}/rest/v1/${path}`, {
        headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    })
    if (!r.ok) throw new Error(`${path} → ${r.status} ${await r.text()}`)
    return r.json()
}

const money = (n) => '$' + Math.round(n).toLocaleString('es-CO')

const docs = await rest(
    `documents?doc_type=in.(INVOICE,CREDIT_NOTE)&issue_date=gte.${from}&issue_date=lte.${to}` +
    `&select=id,number,doc_type,issue_date,total,payment_form,party_id,` +
    `party:parties(legal_name,doc_number,taxpayer_type,city,applies_reteica,payment_term_days),` +
    `lines:document_lines(qty,unit_price,tax_config,product:products(tax_category))&order=issue_date.asc`
)
const rules = await rest('accounting_rules?select=doc_kind,iva_rate,taxpayer_code,payment_form,account_code,nature,concept&is_active=eq.true')
const taxRows = await rest('tax_configurations?select=tax_type,rate,min_base,city,year&is_active=eq.true')
const types = await rest('taxpayer_types?select=code,legacy_code')

console.log(`\n════ SIMULACIÓN DE CONTABILIZACIÓN (${from} → ${to}) ════`)
console.log(`Documentos: ${docs.length}   ·   Reglas activas: ${rules.length}\n`)

const totales = { base: 0, iva: 0, retefuente: 0, reteica: 0, reteiva: 0, autorrenta: 0, cartera: 0 }
let ok = 0, conAviso = 0, sinAsiento = 0
const avisos = new Map()

for (const d of docs) {
    const docKind = d.doc_type === 'INVOICE' ? 'FV' : 'NC'
    const party = Array.isArray(d.party) ? d.party[0] : d.party
    const legacy = party?.taxpayer_type ?? null
    const match = types.find(t => t.code === legacy || t.legacy_code === legacy)
    const taxpayerCode = match?.code ?? 'PJ'
    const paymentForm = resolvePaymentForm(d.payment_form, party?.payment_term_days)

    const year = Number(String(d.issue_date).slice(0, 4))
    const appliesReteica = party?.applies_reteica === true
    const taxes = {}
    for (const t of taxRows.filter(x => x.year === year)) {
        if (t.tax_type === 'RETEICA' && !appliesReteica) continue
        if (t.tax_type === 'RETEICA' && t.city && t.city !== party?.city) continue
        if (taxes[t.tax_type] && t.city == null) continue
        taxes[t.tax_type] = { rate: Number(t.rate) || 0, min_base: Number(t.min_base) || 0 }
    }

    const applicable = rules.filter(r =>
        r.doc_kind === docKind && r.payment_form === paymentForm && r.taxpayer_code === taxpayerCode)

    const res = buildSalesEntry(
        {
            doc_kind: docKind,
            payment_form: paymentForm,
            taxpayer_code: taxpayerCode,
            lines: (d.lines ?? []).map(l => ({
                qty: Number(l.qty) || 0,
                unit_price: Number(l.unit_price) || 0,
                iva_rate: resolveLineIvaRate(l.tax_config, (Array.isArray(l.product) ? l.product[0] : l.product)?.tax_category),
            })),
        },
        applicable,
        taxes,
    )

    const cuadra = Math.abs(res.totals.debit - res.totals.credit) < 0.01
    const hayAsiento = res.lines.length > 0
    if (!hayAsiento) sinAsiento++
    else if (res.warnings.length) conAviso++
    else if (cuadra) ok++

    for (const w of res.warnings) avisos.set(w, (avisos.get(w) ?? 0) + 1)
    if (hayAsiento) for (const k of Object.keys(totales)) totales[k] += res.totals[k] ?? 0

    const dif = Math.round(res.totals.cartera - Number(d.total))
    console.log(
        `${(d.number ?? '—').padEnd(12)} ${d.doc_type === 'INVOICE' ? 'FV' : 'NC'} ${d.issue_date}  ` +
        `${(party?.legal_name ?? '').slice(0, 26).padEnd(26)} ${taxpayerCode.padEnd(19)}${paymentForm.padEnd(9)}` +
        `base ${money(res.totals.base).padStart(12)}  iva ${money(res.totals.iva).padStart(10)}  ` +
        `ret ${money(res.totals.retefuente + res.totals.reteica + res.totals.reteiva).padStart(9)}  ` +
        `cartera ${money(res.totals.cartera).padStart(12)}  ` +
        `${!hayAsiento ? 'SIN ASIENTO' : cuadra ? 'cuadra' : 'DESCUADRE'}` +
        `${hayAsiento && dif !== 0 ? `  · dif. vs total doc: ${money(dif)}` : ''}`
    )
}

console.log('\n──────── TOTALES DEL PERÍODO ────────')
for (const [k, v] of Object.entries(totales)) console.log(`  ${k.padEnd(12)} ${money(v).padStart(16)}`)
console.log('\n──────── ESTADO ────────')
console.log(`  Contabilizan sin novedad : ${ok}`)
console.log(`  Con advertencia          : ${conAviso}`)
console.log(`  Sin asiento              : ${sinAsiento}`)
if (avisos.size) {
    console.log('\n──────── ADVERTENCIAS ────────')
    for (const [w, n] of [...avisos].sort((a, b) => b[1] - a[1])) console.log(`  (${n}x) ${w}`)
}
