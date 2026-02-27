
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

async function checkCols() {
    console.log("Checking columns in 'documents'...");
    const cols = ['id', 'number', 'doc_type', 'total', 'due_date', 'status', 'issue_date'];
    for (const col of cols) {
        const { error } = await supabase.from('documents').select(col).limit(1);
        if (error) {
            console.log(`${col}: ❌ ${error.message}`);
        } else {
            console.log(`${col}: ✅ EXISTS`);
        }
    }
}

checkCols()
