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

async function checkUsers() {
    const { data: users, error } = await supabase.auth.admin.listUsers()

    // ver todos los tenants
    const { data: tenants } = await supabase.from('user_tenants').select('user_id, role, role_id')

    let report = users.users.map(u => {
        const t = tenants?.find(x => x.user_id === u.id)
        return { email: u.email, role: t?.role, role_id: t?.role_id }
    })

    fs.writeFileSync('users.json', JSON.stringify(report, null, 2))
}

checkUsers().catch(console.error)
