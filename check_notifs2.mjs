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
    const { data, error } = await supabase
        .from('app_notifications')
        .select('*')
        .eq('is_read', false)
        .in('priority', ['HIGH', 'CRITICAL'])
        .order('created_at', { ascending: false })
        .limit(3);

    console.log("data:", data, "error:", error);
}

checks().catch(console.error)
