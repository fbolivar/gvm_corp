// Audita que toda función de base de datos que el código llama por RPC tenga
// permiso EXECUTE para el rol con el que se llama (authenticated / anon).
//
// Por qué existe (2026-09-17): al endurecer funciones SECURITY DEFINER se revocó
// EXECUTE a `next_delivery_note_number` y `consume_stock_for_document` porque el
// grep de llamadas no vio las que estaban partidas en dos líneas. Las remisiones
// quedaron bloqueadas en producción ("Error desconocido") hasta que un usuario
// avisó. Un REVOKE no lo detectan ni el typecheck ni los tests: solo este script.
//
//   npm run audit:rpc      (forma parte de npm run preflight)
//
// Cómo funciona:
//  1. Lee la lista de funciones públicas y sus permisos reales desde la base
//     (RPC `execute_sql_internal`, solo SELECT, con la service key de .env.local).
//  2. Busca en src/ cada nombre de función como cadena ('nombre' o "nombre"),
//     sin depender de cómo esté escrita la llamada `.rpc(`.
//  3. Falla si una función referenciada no tiene EXECUTE para `authenticated`,
//     o si la llama código público (login/middleware) y no lo tiene para `anon`.
//
// Sale con código 1 si hay hallazgos. Si no hay credenciales (CI sin .env.local)
// avisa y sale con 0 para no bloquear el typecheck; en la máquina de deploy
// SIEMPRE debe correr con credenciales.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'src')

// ─── 0. Credenciales ─────────────────────────────────────────────────────────
function loadEnv() {
    const env = { ...process.env }
    const p = path.join(ROOT, '.env.local')
    if (fs.existsSync(p)) {
        for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
            const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
            if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^"|"$/g, '')
        }
    }
    return env
}
const env = loadEnv()
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
    console.warn('audit:rpc — sin NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY; se omite (no hay base contra la cual comparar).')
    process.exit(0)
}

// ─── 1. Funciones y permisos reales ──────────────────────────────────────────
const SQL = `
  select p.proname,
         bool_or(has_function_privilege('authenticated', p.oid, 'EXECUTE')) as auth_ok,
         bool_or(has_function_privilege('anon', p.oid, 'EXECUTE')) as anon_ok,
         bool_or(p.prosecdef) as secdef
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
  group by p.proname`

const res = await fetch(`${URL}/rest/v1/rpc/execute_sql_internal`, {
    method: 'POST',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql_query: SQL }),
})
if (!res.ok) {
    console.error(`audit:rpc — no se pudo leer la base (${res.status}): ${await res.text()}`)
    process.exit(1)
}
const rows = await res.json()
const fns = new Map()
for (const r of rows ?? []) fns.set(r.proname, r)
if (fns.size === 0) { console.error('audit:rpc — la base no devolvió funciones'); process.exit(1) }
console.log(`Funciones en public: ${fns.size}\n`)

// ─── 2. Referencias en el código ─────────────────────────────────────────────
const files = []
;(function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name)
        if (e.isDirectory()) walk(p)
        else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) files.push(p)
    }
})(SRC)

// Código que corre SIN sesión (anon): login, middleware, páginas públicas por token.
const ANON_PATHS = [/[\\/]\(auth\)[\\/]/, /[\\/]middleware\.ts$/, /[\\/]\(public\)[\\/]/, /[\\/]pay[\\/]\[token\]/, /[\\/]terminal[\\/]\[token\]/]

const refs = new Map() // proname -> { files: Set, anon: boolean }
const findingsUnknown = []
for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    if (!text.includes('rpc(') && !text.includes('.rpc')) continue
    const isAnon = ANON_PATHS.some(re => re.test(file))
    // Primer literal después de `.rpc(`, aunque esté en otra línea — justo el
    // caso que el grep de una sola línea no vio.
    const re = /\.rpc\(\s*['"`]([a-z0-9_]+)['"`]/gs
    let m
    while ((m = re.exec(text)) !== null) {
        const name = m[1]
        if (!fns.has(name)) { findingsUnknown.push(`${name}: el código la llama pero NO existe en la base → ${path.relative(ROOT, file)}`); continue }
        if (!refs.has(name)) refs.set(name, { files: new Set(), anon: false })
        refs.get(name).files.add(path.relative(ROOT, file))
        if (isAnon) refs.get(name).anon = true
    }
}

// Funciones que el código llama SOLO con el admin client (service_role) y por
// tanto no necesitan EXECUTE para authenticated. Añadir aquí con justificación.
const SERVICE_ROLE_ONLY = new Set([
    'execute_sql_internal', // backups / auditoría interna, solo service_role por diseño
])

// ─── 3. Hallazgos ────────────────────────────────────────────────────────────
const findings = [...findingsUnknown]
for (const [name, ref] of [...refs.entries()].sort()) {
    const f = fns.get(name)
    if (SERVICE_ROLE_ONLY.has(name)) continue
    if (!f.auth_ok) findings.push(`${name}: la llama el código pero NO tiene EXECUTE para authenticated → ${[...ref.files].join(', ')}`)
    if (ref.anon && !f.anon_ok) findings.push(`${name}: la llama código sin sesión (anon) pero NO tiene EXECUTE para anon → ${[...ref.files].join(', ')}`)
}

console.log(`Funciones referenciadas por el código: ${refs.size}`)
if (findings.length === 0) {
    console.log('\nHALLAZGOS: 0 — todas las funciones que usa el código tienen permiso.')
    process.exit(0)
}
console.log(`\nHALLAZGOS: ${findings.length}\n`)
for (const f of findings) console.log(' ✗ ' + f)
console.log('\nUn REVOKE sobre una función que la app usa deja la funcionalidad muerta en producción sin que typecheck ni tests lo vean. Restaura el GRANT o justifica la función en SERVICE_ROLE_ONLY.')
process.exit(1)
