
import { createClient } from '@/lib/supabase/server';
import { treasuryService } from '../services/treasuryService';

export async function simulateReconciliationFlow() {
    const supabase = await createClient();

    console.log('🚀 Iniciando Protocolo de Simulación de Conciliación...');

    // 1. Obtener primera cuenta bancaria
    const accounts = await treasuryService.getAccounts(supabase);
    const bankAccount = accounts.find(acc => acc.type === 'BANK');

    if (!bankAccount) {
        throw new Error('No se encontró una cuenta bancaria para la prueba.');
    }
    console.log(`🏦 Nodo Seleccionado: ${bankAccount.name}`);

    // 2. Crear una transacción manual de prueba (Egreso)
    const testAmount = 525000;
    const testDate = new Date().toISOString().split('T')[0];

    console.log(`📝 Registrando Movimiento de Prueba: -$${testAmount}...`);
    const transaction = await treasuryService.createTransaction(supabase, {
        account_id: bankAccount.id,
        amount: -testAmount,
        date: testDate,
        transaction_type: 'PAYMENT',
        description: 'PAGO PROVEEDOR SIMULADO (INTEGRATION TEST)',
        reference_number: `SIM-${Date.now().toString().slice(-6)}`
    });
    console.log(`✅ Movimiento Creado ID: ${transaction.id}`);

    // 3. Simular Carga de Extracto Bancario
    console.log('📂 Inyectando Extracto Bancario Simulado...');
    const statement = await treasuryService.createBankStatement(supabase, {
        account_id: bankAccount.id,
        start_date: testDate,
        end_date: testDate,
        opening_balance: Number(bankAccount.balance),
        closing_balance: Number(bankAccount.balance) - testAmount,
        status: 'IMPORTING'
    }, [
        {
            date: testDate,
            description: 'TRF BCO SIMULADA PAGO PROV',
            amount: -testAmount
        }
    ]);
    console.log(`✅ Extracto Inyectado ID: ${statement.id}`);

    // 4. Obtener líneas del extracto
    const lines = await treasuryService.getStatementLines(supabase, statement.id);
    const targetLine = lines[0];

    // 5. Fase de Matching Automático
    console.log('🔎 Ejecutando Protocolo de Matching...');
    const suggestions = await treasuryService.suggestMatches(supabase, targetLine.amount, targetLine.date);

    const exactMatch = suggestions.find(s => s.id === transaction.id);

    if (exactMatch) {
        console.log(`🎯 Match Detectado! ID Sugerido: ${exactMatch.id} (${exactMatch.reference_number})`);

        // 6. Ejecutar Conciliación Manual
        console.log('🔗 Ejecutando Protocolo de Cruce (Binding)...');
        await treasuryService.matchTransaction(supabase, targetLine.id!, transaction.id!);
        console.log('🏛️ PROTOCOLO FINALIZADO: Movimiento Conciliado y Auditado.');
    } else {
        console.log('❌ Falló la detección automática del match.');
    }

    return {
        transactionId: transaction.id!,
        statementId: statement.id!,
        matched: !!exactMatch
    };
}
