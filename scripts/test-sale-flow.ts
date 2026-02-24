import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runTestSale() {
    console.log("🚀 Iniciando Flujo de Venta de Prueba...");

    // 1. Obtener Tenant
    const { data: tenant } = await supabase.from('tenants').select('id').limit(1).single();
    if (!tenant) throw new Error("No tenant found");
    const tenantId = tenant.id;

    // 2. Crear Cliente
    console.log("👥 Creando Cliente...");
    const partyId = uuidv4();
    const { error: pError } = await supabase.from('parties').upsert({
        id: partyId,
        tenant_id: tenantId,
        party_type: 'COMPANY',
        legal_name: 'CLIENTE PRUEBA FACTORY SAS',
        doc_type: 'NIT',
        doc_number: '900123456',
        dv: '1',
        is_customer: true,
        email: 'ventas@clienteprueba.com'
    });
    if (pError) throw pError;

    // 3. Crear Producto
    console.log("📦 Creando Producto...");
    const productId = uuidv4();
    const { error: prodError } = await supabase.from('products').upsert({
        id: productId,
        tenant_id: tenantId,
        sku: 'TEST-001',
        name: 'PRODUCTO PREMIUM V3',
        type: 'GOOD',
        price: 1000000, // 1M
        tax_rate: 19,
        uom: 'UNIT'
    });
    if (prodError) throw prodError;

    // 4. Generar Factura (Document)
    console.log("📄 Generando Factura de Venta...");
    const docId = uuidv4();
    const subtotal = 1000000;
    const taxes = 190000;
    const total = 1190000;

    const { error: dError } = await supabase.from('documents').insert({
        id: docId,
        tenant_id: tenantId,
        doc_type: 'INVOICE',
        number: 'FV-TEST-001',
        party_id: partyId,
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        currency: 'COP',
        subtotal,
        taxes,
        total,
        status: 'SENT'
    });
    if (dError) throw dError;

    // 4.1 Líneas de Factura
    await supabase.from('document_lines').insert({
        tenant_id: tenantId,
        document_id: docId,
        product_id: productId,
        description: 'Venta de prueba sistema GVM',
        qty: 1,
        unit_price: 1000000,
        line_total: 1000000
    });

    // 5. Simular entrada en Contabilidad (Cuentas por cobrar vs Ventas)
    // Esto lo haría el trigger o el servicio, pero aquí lo forzamos para el test
    console.log("⚖️ Generando Asiento Contable de Venta...");
    const entryId = uuidv4();
    await supabase.from('journal_entries').insert({
        id: entryId,
        tenant_id: tenantId,
        entry_date: new Date().toISOString().split('T')[0],
        description: 'Venta de Prueba FV-TEST-001',
        document_id: docId,
        status: 'POSTED'
    });

    // Cuentas (sacadas del seed anterior)
    const { data: accounts } = await supabase.from('chart_accounts').select('id, code');
    const getAccId = (code: string) => accounts?.find(a => a.code === code)?.id;

    await supabase.from('journal_lines').insert([
        { tenant_id: tenantId, entry_id: entryId, account_id: getAccId('1305'), party_id: partyId, debit: 1190000, credit: 0, description: 'CXC Cliente' },
        { tenant_id: tenantId, entry_id: entryId, account_id: getAccId('4135'), party_id: partyId, debit: 0, credit: 1000000, description: 'Ingresos por venta' },
        { tenant_id: tenantId, entry_id: entryId, account_id: getAccId('2408'), party_id: partyId, debit: 0, credit: 190000, description: 'IVA Generado' }
    ]);

    // 6. Registrar Pago (Tesorería)
    console.log("💰 Registrando Pago en Tesorería...");
    // Primero necesitamos una cuenta de tesorería (Caja)
    let { data: tAcc } = await supabase.from('treasury_accounts').select('id').limit(1).single();
    if (!tAcc) {
        const tAccId = uuidv4();
        await supabase.from('treasury_accounts').insert({
            id: tAccId,
            tenant_id: tenantId,
            name: 'CAJA GENERAL TEST',
            type: 'CASH',
            chart_account_id: getAccId('1105'),
            balance: 0
        });
        tAcc = { id: tAccId };
    }

    const { error: transError } = await supabase.from('treasury_transactions').insert({
        tenant_id: tenantId,
        account_id: tAcc.id,
        party_id: partyId,
        amount: 1190000,
        transaction_type: 'RECEIPT',
        date: new Date().toISOString().split('T')[0],
        description: 'Pago de factura FV-TEST-001'
    });
    if (transError) throw transError;

    console.log("✅ Flujo de Venta completado con éxito!");
    console.log("Resumen:");
    console.log("- Cliente creado: CLIENTE PRUEBA FACTORY SAS");
    console.log("- Factura generada: FV-TEST-001 por $1.190.000");
    console.log("- Asiento contable: Generado y Balanceado.");
    console.log("- Tesorería: Dinero ingresado a Caja General.");
}

runTestSale().catch(err => {
    console.error("❌ Fallo en el test:", err.message);
    process.exit(1);
});
