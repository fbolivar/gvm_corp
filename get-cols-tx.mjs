
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
    const { data, error } = await supabase.from('treasury_transactions').select('*').limit(1);
    if (error) {
        console.log("Error:", error.message);
    } else if (data && data.length > 0) {
        const cols = Object.keys(data[0]).sort();
        console.log("TX_COLUMNS_LIST_START");
        cols.forEach(c => console.log(c));
        console.log("TX_COLUMNS_LIST_END");
    } else {
        // If no data, try to get columns via a failing query or just assume it's fine for now.
        // But better to know.
        console.log("No data in treasury_transactions");
    }
}

check()
