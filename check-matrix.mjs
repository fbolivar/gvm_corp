import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(url, serviceKey)

async function checkMatrix() {
    const { data: roles } = await supabase.from('app_roles').select('id, name')
    const { data: perms } = await supabase.from('role_permissions').select('role_id, module_key, can_view').eq('can_view', true)

    let report = {}
    roles?.forEach(r => {
        const myPerms = perms?.filter(p => p.role_id === r.id) || []
        report[r.name] = myPerms.map(p => p.module_key)
    })

    fs.writeFileSync('matrix-report.json', JSON.stringify(report, null, 2))
    console.log("DONE")
}

checkMatrix().catch(console.error)
