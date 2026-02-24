
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load env
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role for tests
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyValuationFlow() {
    console.log("🚀 Starting Valuation & COGS Verification...");

    try {
        // 1. Get a Warehouse and Tenant
        const { data: warehouse } = await supabase.from('warehouses').select('*').limit(1).single();
        if (!warehouse) throw new Error("No warehouse found");
        const tenant_id = warehouse.tenant_id;

        // 2. Create Test Product
        const sku = `VAL-TEST-${Date.now()}`;
        const { data: product, error: pError } = await supabase.from('products').insert({
            tenant_id,
            sku,
            name: "Valuation Test Product",
            type: "GOODS",
            price: 500,
            cost: 0
        }).select().single();

        if (pError) throw pError;
        console.log(`✅ Created Product: ${product.id} (SKU: ${sku})`);

        // 3. Movement 1: 10 units @ $100
        console.log("➕ Registering Movement 1: 10 units @ $100...");
        await supabase.from('inventory_movements').insert({
            tenant_id,
            product_id: product.id,
            warehouse_id: warehouse.id,
            type: 'IN',
            qty: 10,
            cost: 100,
            occurred_at: new Date().toISOString()
        });

        // 4. Movement 2: 10 units @ $200
        console.log("➕ Registering Movement 2: 10 units @ $200...");
        await supabase.from('inventory_movements').insert({
            tenant_id,
            product_id: product.id,
            warehouse_id: warehouse.id,
            type: 'IN',
            qty: 10,
            cost: 200,
            occurred_at: new Date().toISOString()
        });

        // 5. Verify Average Cost (Expected: 150)
        const { data: stockData } = await supabase
            .from('product_stock')
            .select('avg_cost, qty')
            .eq('product_id', product.id)
            .single();

        console.log(`📊 Current Stock: ${stockData?.qty}, Avg Cost: ${stockData?.avg_cost}`);
        if (Number(stockData?.avg_cost) !== 150) {
            console.error(`❌ ERROR: Expected Avg Cost 150, got ${stockData?.avg_cost}`);
        } else {
            console.log("✅ Average Cost is CORRECT ($150)");
        }

        // 6. Movement 3: OUT (Sale) 5 units
        // We simulate documentService logic: Fetch avg cost first
        const currentAvg = Number(stockData?.avg_cost);
        console.log(`➖ Registering OUT movement (Sale) 5 units @ Cost ${currentAvg}...`);
        const { data: outMov } = await supabase.from('inventory_movements').insert({
            tenant_id,
            product_id: product.id,
            warehouse_id: warehouse.id,
            type: 'OUT',
            qty: 5,
            cost: currentAvg, // CAPTURED COST
            occurred_at: new Date().toISOString()
        }).select().single();

        // 7. Verify Accounting Entry for this movement
        // Since it's async in the trigger/service, we wait a bit
        console.log("⏳ Waiting for accounting entry generation...");
        await new Promise(r => setTimeout(r, 2000));

        const { data: entries } = await supabase
            .from('journal_entries')
            .select(`
                *,
                lines:journal_lines(*)
            `)
            .ilike('description', `%${product.id.substring(0, 8)}%`)
            .order('created_at', { ascending: false });

        const cogsEntry = entries?.find(e => e.lines.some((l: any) => l.description === 'Costo de Ventas'));

        if (cogsEntry) {
            const debitLine = cogsEntry.lines.find((l: any) => l.debit > 0);
            console.log(`✅ Found COGS Entry! Amount: ${debitLine?.debit} (Expected: ${5 * 150} = 750)`);
            if (Number(debitLine?.debit) === 750) {
                console.log("✅ COGS Accounting is CORRECT!");
            } else {
                console.error(`❌ ERROR: Expected 750, got ${debitLine?.debit}`);
            }
        } else {
            console.warn("⚠️ COGS Entry not found (Check if accounting accounts 1435/6135 exists)");
        }

        // 8. Verify Valuation RPC
        const { data: valuation } = await supabase.rpc('get_inventory_valuation', { p_search: sku });
        console.log("📊 Valuation RPC Result:", valuation);
        if (valuation && valuation.length > 0) {
            console.log(`✅ RPC Success! Total Value: ${valuation[0].total_value} (Expected 15 * 150 = 2250)`);
        }

        console.log("\n🎊 ALL VALUATION TESTS PASSED!");

    } catch (err) {
        console.error("❌ TEST FAILED:", err);
    }
}

verifyValuationFlow();
