import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase URL or Key in .env.local");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedAccounts() {
    console.log("Seeding Chart of Accounts...");

    const accounts = [
        { code: '1105', name: 'Caja General', type: 'ASSET' },
        { code: '1110', name: 'Bancos', type: 'ASSET' },
        { code: '1305', name: 'Clientes Nacionales', type: 'ASSET' },
        { code: '2305', name: 'Cuentas por Pagar Proveedores', type: 'LIABILITY' },
        { code: '2365', name: 'Retención en la Fuente (Pasivo)', type: 'LIABILITY' },
        { code: '1355', name: 'Anticipo de Impuestos (Activo)', type: 'ASSET' }, // Para cuando nos retienen
        { code: '4135', name: 'Comercio al por mayor y menor', type: 'INCOME' },
        { code: '5105', name: 'Gastos de Personal', type: 'EXPENSE' },
        { code: '2408', name: 'Impuesto sobre las Ventas por Pagar', type: 'LIABILITY' },
    ];

    // Get Tenant
    const { data: tenant } = await supabase.from('tenants').select('id').limit(1).single();
    if (!tenant) throw new Error("No tenant found");

    // Map types to nature (DEBIT/CREDIT assumption)
    const getNature = (type: string) => {
        if (['ASSET', 'EXPENSE', 'COST'].includes(type)) return 'DEBIT';
        return 'CREDIT';
    };

    for (const acc of accounts) {
        const { error } = await supabase
            .from('chart_accounts')
            .upsert({
                tenant_id: tenant.id,
                code: acc.code,
                name: acc.name,
                nature: getNature(acc.type),
                // is_active: true // Column does not exist
            }, { onConflict: 'tenant_id, code' });

        if (error) console.error(`Error upserting ${acc.code}:`, error.message);
        else console.log(`Upserted ${acc.code}`);
    }

    // Update Tax Withholdings to point to valid accounts
    // ReteFuente Servicios (4%) -> 2365 (If we are withholding) OR 1355 (If we are being withheld)
    // For simplicity in MVP, let's map them to a generic one or specific active ones
    console.log("Updating Withholding Accounts...");
}

seedAccounts();
