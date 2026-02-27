
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function check() {
    console.log("TEST PARTIES ID");
    const { error: e1 } = await supabase.from('parties').select('id').limit(1);
    console.log("e1:", e1 ? e1.message : "OK");

    console.log("TEST PARTIES LEGAL_NAME");
    const { error: e2 } = await supabase.from('parties').select('legal_name').limit(1);
    console.log("e2:", e2 ? e2.message : "OK");
}

check()
