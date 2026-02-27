
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

async function checkRelations() {
    console.log("Checking relation columns...");

    console.log("\nParties:");
    const pCols = ['id', 'legal_name'];
    for (const col of pCols) {
        const { error } = await supabase.from('parties').select(col).limit(1);
        if (error) console.log(`parties.${col}: ❌ ${error.message}`);
        else console.log(`parties.${col}: ✅ EXISTS`);
    }

    console.log("\nTenants:");
    const tCols = ['id', 'name'];
    for (const col of tCols) {
        const { error } = await supabase.from('tenants').select(col).limit(1);
        if (error) console.log(`tenants.${col}: ❌ ${error.message}`);
        else console.log(`tenants.${col}: ✅ EXISTS`);
    }
}

checkRelations()
