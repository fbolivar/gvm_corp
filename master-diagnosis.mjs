
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

async function runDiagnosis() {
    console.log("--- INICIANDO DIAGNÓSTICO MAESTRO ---");

    // 1. Verificar Tabla 'documents' y sus columnas
    console.log("\n1. Verificando tabla 'documents'...");
    const { data: cols, error: colsErr } = await supabase.from('documents').select('*').limit(1);
    if (colsErr) {
        console.log("❌ Error leyendo 'documents':", colsErr.message);
    } else {
        console.log("✅ 'documents' es accesible. Columnas encontradas:", Object.keys(cols[0] || {}).join(', '));
        if (cols.length > 0) {
            console.log("📝 Sample Doc ID:", cols[0].id);

            // 2. Probar RPC con ID real
            console.log(`\n2. Probando RPC 'get_portal_invoice' con ID: ${cols[0].id}...`);
            const { data: rpcData, error: rpcErr } = await supabase.rpc('get_portal_invoice', { doc_id: cols[0].id });
            if (rpcErr) {
                console.log("❌ RPC Falló:", rpcErr.message, rpcErr.hint || "");
            } else {
                console.log("✅ RPC Funcionando! Resultado:", JSON.stringify(rpcData));
            }
        } else {
            console.log("⚠️ No hay documentos en la tabla para probar.");
        }
    }

    // 3. Verificar 'payment_reports'
    console.log("\n3. Verificando tabla 'payment_reports'...");
    const { error: prErr } = await supabase.from('payment_reports').select('id').limit(1);
    if (prErr) {
        console.log("❌ 'payment_reports' NO existe o no es accesible:", prErr.message);
    } else {
        console.log("✅ 'payment_reports' existe y es accesible.");
    }

    // 4. Verificar Joins (Tenants and Parties)
    console.log("\n4. Verificando integridad de relaciones...");
    const { count: tCount, error: tErr } = await supabase.from('tenants').select('*', { count: 'exact', head: true });
    console.log(tErr ? `❌ Tenants error: ${tErr.message}` : `✅ Tenants: ${tCount} registros`);

    const { count: pCount, error: pErr } = await supabase.from('parties').select('*', { count: 'exact', head: true });
    console.log(pErr ? `❌ Parties error: ${pErr.message}` : `✅ Parties: ${pCount} registros`);
}

runDiagnosis();
