
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

async function introspectDocuments() {
    console.log("🔍 Introspeccionando tabla 'documents'...");

    const { data: cols, error: colError } = await supabase.rpc('get_portal_invoice', { doc_id: '00000000-0000-0000-0000-000000000000' });

    if (colError) {
        console.log("❌ Error al llamar get_portal_invoice:", colError.message);
        console.log("Código de error:", colError.code);

        // Try individual columns
        const columns = ['id', 'number', 'total', 'due_date', 'status', 'party_id', 'tenant_id', 'balance'];
        for (const col of columns) {
            const { error } = await supabase.from('documents').select(col).limit(1);
            if (error) {
                console.log(`Column '${col}': MISSING - ${error.message}`);
            } else {
                console.log(`Column '${col}': EXISTS`);
            }
        }
    } else {
        console.log("✅ get_portal_invoice funciona (retornó vacío como esperado).");
    }
}

introspectDocuments()
