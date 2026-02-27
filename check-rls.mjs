import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(url, serviceKey)

async function checks() {
    const { data, error } = await supabase.from('role_permissions').select('*').limit(1);
    console.log("Error:", error);

    // Check if RLS is failing by using anon key!
    const anonSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data: { user }, error: authErr } = await anonSupabase.auth.signInWithPassword({
        email: 'fbolivarb@outlook.com',
        password: 'Password123!' // Assuming generic local password or something... 
    })
    console.log("auth test via anon:", !!user, authErr?.message);
}

checks().catch(console.error)
