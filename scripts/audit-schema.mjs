// Audita que el código no lea/escriba columnas que no existen en la base.
//
// Por qué existe: varios módulos (devoluciones de compra, API keys, asistencia,
// portales, resoluciones DIAN, escáner) insertaban o pedían columnas inexistentes.
// PostgREST devuelve error y la funcionalidad queda muerta — a veces en silencio,
// porque el código no comprueba `error`. TypeScript no detecta nada de esto.
//
//   npm run audit:schema
//
// El esquema se compara contra scripts/schema-snapshot.json. REGENERA ese snapshot
// después de cada migración con:
//   select jsonb_object_agg(table_name, cols) from (
//     select table_name, jsonb_agg(column_name order by column_name) cols
//     from information_schema.columns where table_schema='public' group by table_name) t;
//
// Sale con código 1 si encuentra hallazgos (apto para pre-deploy / CI).
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.argv[2] || path.join(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'src')

// ─── 1. Esquema real (volcado de information_schema.columns) ─────────────────
const raw = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'schema-snapshot.json'), 'utf8'))
const schema = {}
for (const [t, cols] of Object.entries(raw)) schema[t] = new Set(cols)
if (Object.keys(schema).length === 0) { console.error('Esquema vacío'); process.exit(1) }
console.log(`Esquema: ${Object.keys(schema).length} tablas\n`)

// ─── 2. Recorrer el código ───────────────────────────────────────────────────
const files = []
;(function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) walk(p)
        else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) files.push(p)
    }
})(SRC)

/** Extrae las claves de primer nivel de un objeto literal a partir de `{`. */
function topLevelKeys(src, start) {
    let depth = 0, i = start, keys = [], hasSpread = false
    let buf = '', inStr = null, expectKey = true
    for (; i < src.length; i++) {
        const ch = src[i]
        if (inStr) { if (ch === inStr && src[i - 1] !== '\\') inStr = null; continue }
        if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue }
        if (ch === '{' || ch === '[' || ch === '(') { depth++; if (depth === 1) { expectKey = true; buf = '' } continue }
        if (ch === '}' || ch === ']' || ch === ')') {
            depth--
            if (depth === 0) { if (expectKey && buf.trim()) keys.push(buf.trim()); break }
            continue
        }
        if (depth !== 1) continue
        if (ch === ',') { if (expectKey && buf.trim()) keys.push(buf.trim()); buf = ''; expectKey = true; continue }
        if (ch === ':') { if (buf.trim()) keys.push(buf.trim()); buf = ''; expectKey = false; continue }
        if (expectKey) {
            if (src.startsWith('...', i)) { hasSpread = true; expectKey = false; buf = ''; i += 2; continue }
            buf += ch
        }
    }
    return { keys: keys.map(k => k.replace(/['"`]/g, '').trim()).filter(k => /^[a-z_][a-z0-9_]*$/i.test(k)), hasSpread }
}

const findings = []
// Buckets de Storage y tablas conocidas fuera de information_schema.columns.
const IGNORE_TABLES = new Set(['backups', 'tenant-assets', 'chat-files'])

for (const file of files) {
    const src = fs.readFileSync(file, 'utf8')
    const rel = path.relative(ROOT, file)
    const fromRe = /\.from\(\s*['"`]([a-z_0-9]+)['"`]\s*\)/g
    let m
    while ((m = fromRe.exec(src))) {
        const table = m[1]
        // Ignorar buckets de Storage (`storage.from('x')`) y líneas comentadas.
        const before = src.slice(Math.max(0, m.index - 20), m.index)
        if (/storage\s*$/.test(before)) continue
        const lineStart = src.lastIndexOf('\n', m.index) + 1
        if (/^\s*(\/\/|\*)/.test(src.slice(lineStart, m.index))) continue
        const cols = schema[table]
        const after = src.slice(m.index, m.index + 3000)
        const stop = after.indexOf('.from(', 5)
        const chunk = stop > 0 ? after.slice(0, stop) : after

        if (!cols) { if (!IGNORE_TABLES.has(table)) findings.push({ kind: 'tabla', file: rel, table, col: '(tabla no existe)', line: src.slice(0, m.index).split('\n').length }); continue }

        // writes: insert / update / upsert con objeto literal
        for (const op of ['insert', 'update', 'upsert']) {
            const opRe = new RegExp(`\\.${op}\\(\\s*\\{`, 'g')
            let om
            while ((om = opRe.exec(chunk))) {
                const abs = m.index + om.index + om[0].length - 1
                const { keys } = topLevelKeys(src, abs)
                for (const k of keys) {
                    if (!cols.has(k)) {
                        findings.push({ kind: op, file: rel, table, col: k, line: src.slice(0, abs).split('\n').length })
                    }
                }
            }
        }

        // reads: select('a, b, c') sin joins ni alias
        const selRe = /\.select\(\s*['"`]([^'"`]+)['"`]/g
        let sm
        while ((sm = selRe.exec(chunk))) {
            const spec = sm[1]
            if (spec.includes('(') || spec.includes(':') || spec.trim() === '*') continue
            for (const raw of spec.split(',')) {
                const k = raw.trim()
                if (!k || k === '*' || !/^[a-z_][a-z0-9_]*$/i.test(k)) continue
                if (!cols.has(k)) {
                    findings.push({ kind: 'select', file: rel, table, col: k, line: src.slice(0, m.index + sm.index).split('\n').length })
                }
            }
        }
    }
}

// ─── 3. Reporte ──────────────────────────────────────────────────────────────
const byTable = {}
for (const f of findings) (byTable[`${f.table}.${f.col}`] ??= []).push(f)
console.log(`HALLAZGOS: ${findings.length} (${Object.keys(byTable).length} únicos)\n`)
for (const [key, list] of Object.entries(byTable).sort()) {
    console.log(`✗ ${key}  [${[...new Set(list.map(l => l.kind))].join(',')}]`)
    for (const l of list.slice(0, 6)) console.log(`    ${l.file}:${l.line}`)
    if (list.length > 6) console.log(`    ... +${list.length - 6}`)
}

if (findings.length > 0) {
    console.log('\nSi el hallazgo es por una migración reciente, regenera scripts/schema-snapshot.json (ver cabecera).')
    process.exit(1)
}
console.log('Sin discrepancias entre el código y el esquema.')
