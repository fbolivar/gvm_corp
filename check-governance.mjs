import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔑 URL:', supabaseUrl)
console.log('🔑 Service Role Key disponible:', !!serviceRoleKey)

// Use service role key if available, else anon key
const key = serviceRoleKey || supabaseAnonKey
console.log('🔑 Usando:', serviceRoleKey ? 'SERVICE ROLE KEY' : 'ANON KEY (puede fallar en escritura)')

const supabase = createClient(supabaseUrl, key)

async function diagnose() {
    console.log('\n=== DIAGNÓSTICO DE GOBERNANZA ===\n')

    // 1. Contar roles
    const { data: roles, error: rolesErr } = await supabase.from('app_roles').select('id, name')
    if (rolesErr) {
        console.log('❌ ERROR leyendo app_roles:', rolesErr.message)
        console.log('   Código:', rolesErr.code)
    } else {
        console.log(`✅ app_roles: ${roles.length} roles encontrados`)
        roles.slice(0, 5).forEach(r => console.log(`   - ${r.name} (${r.id.substring(0, 8)})`))
        if (roles.length > 5) console.log(`   ... y ${roles.length - 5} más`)
    }

    // 2. Contar módulos
    const { data: modules, error: modsErr } = await supabase.from('app_modules').select('id, key, name')
    if (modsErr) {
        console.log('❌ ERROR leyendo app_modules:', modsErr.message)
    } else {
        console.log(`\n✅ app_modules: ${modules.length} módulos encontrados`)
        modules.forEach(m => console.log(`   - ${m.key} → ${m.name}`))
    }

    // 3. Contar permisos existentes
    const { data: perms, error: permsErr } = await supabase.from('role_permissions').select('*')
    if (permsErr) {
        console.log('\n❌ ERROR leyendo role_permissions:', permsErr.message)
        console.log('   Código:', permsErr.code, '← Esto indica problema RLS de LECTURA')
    } else {
        console.log(`\n✅ role_permissions: ${perms.length} filas encontradas`)
        const active = perms.filter(p => p.can_view).length
        console.log(`   - ${active} permisos activos (can_view=true)`)
        console.log(`   - ${perms.length - active} permisos inactivos`)
    }

    // 4. Probar escritura en role_permissions (el toggle real)
    console.log('\n--- PRUEBA DE ESCRITURA (toggle) ---')
    if (roles && roles.length > 0 && modules && modules.length > 0) {
        const testRole = roles.find(r => !r.name.includes('ADMINISTRADOR')) || roles[0]
        const testModule = modules[0]
        console.log(`   Probando toggle: rol="${testRole.name}" módulo="${testModule.key}"`)

        const { error: writeErr } = await supabase
            .from('role_permissions')
            .upsert({
                role_id: testRole.id,
                module_key: testModule.key,
                can_view: false,
                can_edit: false
            }, { onConflict: 'role_id,module_key' })

        if (writeErr) {
            console.log('❌ ERROR EN ESCRITURA:', writeErr.message)
            console.log('   Código:', writeErr.code)
            console.log('   ← ESTE ES EL PROBLEMA PRINCIPAL')
            console.log('\n🔧 SOLUCIÓN REQUERIDA:')
            console.log('   1. Necesitas agregar la política RLS de escritura en role_permissions')
            console.log('   2. Ve al Dashboard de Supabase → Authentication → Policies')
            console.log('   3. Para la tabla role_permissions, añade una política INSERT/UPDATE')
            console.log('   4. O proporciona SUPABASE_SERVICE_ROLE_KEY en .env.local')
        } else {
            console.log('✅ ESCRITURA EXITOSA - el toggle funciona correctamente')
        }
    }

    // 5. Verificar si hay tenant_id en role_permissions
    const { data: rpCols, error: colErr } = await supabase
        .from('role_permissions')
        .select('*')
        .limit(1)

    if (!colErr && rpCols && rpCols.length > 0) {
        const cols = Object.keys(rpCols[0])
        console.log('\n📋 Columnas en role_permissions:', cols.join(', '))
    }

    console.log('\n=== FIN DEL DIAGNÓSTICO ===')
}

diagnose().catch(console.error)
