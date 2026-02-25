
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

async function checkTables() {
    const tables = ['collection_agent_config', 'collection_actions', 'debtor_profiles', 'app_notifications'];
    for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            if (error.code === '42P01') {
                console.log(`Tabla ${table}: NO EXISTE`);
            } else {
                console.log(`Tabla ${table}: Error ${error.code} - ${error.message}`);
            }
        } else {
            console.log(`Tabla ${table}: EXISTE`);
        }
    }
}

checkTables()
