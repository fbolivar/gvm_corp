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

async function checks() {
    const role_id = '3a711f28-a8b3-401c-b760-77e81ac92b9a';
    const { data: perms } = await supabase.from('role_permissions').select('*').eq('role_id', role_id);
    fs.writeFileSync('bodega-perms.json', JSON.stringify(perms, null, 2))
}

checks().catch(console.error)
