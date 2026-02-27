
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

async function listCols() {
    // Try to get one row and see the keys
    const { data, error } = await supabase.from('documents').select('*').limit(1);
    if (error) {
        console.log("Error selecting *:", error.message);
    } else {
        if (data && data.length > 0) {
            console.log("Columns found:", Object.keys(data[0]).join(', '));
        } else {
            console.log("No data found in 'documents', trying to select specific columns to find table structure...");
        }
    }
}

listCols()
