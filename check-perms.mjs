import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
// Sin service role key disponible — usamos anon
const supabase = createClient(url, anonKey)

async function diagnose() {
    console.log('\n=== DIAGNÓSTICO SIMPLIFICADO (anon key) ===\n')

    // 1. Ver columnas de role_permissions (qué estructura tiene)
    console.log('--- 1. role_permissions (primeras 3 filas) ---')
    const { data: perms, error: permsErr } = await supabase
        .from('role_permissions')
        .select('*')
        .limit(3)
    if (permsErr) console.log('❌ No se puede leer role_permissions:', permsErr.message)
    else {
        console.log('✅ Columnas:', Object.keys(perms?.[0] || {}).join(', '))
        console.log('Filas:', perms?.length || 0)
        perms?.forEach(p => console.log('  ', JSON.stringify(p)))
    }

    // 2. Ver user_tenants
    console.log('\n--- 2. user_tenants (mis propias filas) ---')
    const { data: myTenant, error: tenantErr } = await supabase
        .from('user_tenants')
        .select('role, role_id, tenant_id')
        .limit(5)
    if (tenantErr) console.log('❌ Error:', tenantErr.message)
    else {
        console.log('Columnas:', Object.keys(myTenant?.[0] || {}).join(', '))
        myTenant?.forEach(t => console.log('  ', JSON.stringify(t)))
    }

    // 3. Ver app_roles
    console.log('\n--- 3. Roles disponibles ---')
    const { data: roles, error: rolesErr } = await supabase
        .from('app_roles')
        .select('id, name')
    if (rolesErr) console.log('❌ Error:', rolesErr.message)
    else roles?.forEach(r => console.log(`  [${r.id.substring(0, 8)}] ${r.name}`))

    console.log('\n=== FIN ===\n')
}

diagnose().catch(console.error)
