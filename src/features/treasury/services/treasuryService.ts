import { SupabaseClient } from '@supabase/supabase-js';
import { TreasuryAccount, TreasuryTransaction, PaymentAllocation, TaxWithholding, TransactionWithholding } from '../types';

export const treasuryService = {
    // Helper to get tenant with MULTIPLE FALLBACKS
    async getTenantId(client: SupabaseClient) {
        const { data: rpcData, error: rpcError } = await client.rpc('get_current_tenant_id');
        if (!rpcError && rpcData) return rpcData;

        const { data: tenantData } = await client
            .from('tenants')
            .select('id')
            .limit(1)
            .maybeSingle();

        return tenantData?.id || '134320f0-20ef-4a56-8087-050d517c8282'; // Known valid fallback
    },

    async getAccounts(client: SupabaseClient) {
        const { data, error } = await client
            .from('treasury_accounts')
            .select('id,name,type,bank_name,account_number,balance,chart_account_id')
            .order('name');
        if (error) throw error;
        return data as TreasuryAccount[];
    },

    async createAccount(client: SupabaseClient, account: Partial<TreasuryAccount>) {
        const tenant_id = await this.getTenantId(client);
        const { data, error } = await client
            .from('treasury_accounts')
            .insert({ ...account, tenant_id })
            .select()
            .single();
        if (error) throw error;
        return data as TreasuryAccount;
    },

    async getTransactions(client: SupabaseClient, filters?: { account_id?: string; limit?: number }) {
        let query = client
            .from('treasury_transactions')
            .select(`
                *,
                party:parties(legal_name),
                account:treasury_accounts(name, type),
                withholdings:transaction_withholdings(
                    *,
                    tax_withholding:tax_withholdings(name)
                )
            `)
            .order('date', { ascending: false });

        if (filters?.account_id) {
            query = query.eq('account_id', filters.account_id);
        }

        if (filters?.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    /**
     * Fetches documents that are potentially unpaid for a party
     */
    async getPendingDocuments(client: SupabaseClient, partyId: string, type: 'RECEIPT' | 'PAYMENT') {
        const docType = type === 'RECEIPT' ? 'INVOICE' : 'BILL'; // Simplified assumption

        const { data, error } = await client
            .from('documents')
            .select('id,number,doc_type,issue_date,due_date,total,status')
            .eq('party_id', partyId)
            // .eq('doc_type', docType) // In this app we have varied doc_types, let's just use party
            .neq('status', 'SENT') // SENT means finalized/paid in our simulation
            .order('issue_date', { ascending: true });

        if (error) throw error;
        return data;
    },

    async getTaxWithholdings(client: SupabaseClient) {
        const { data, error } = await client
            .from('tax_withholdings')
            .select('*')
            .eq('is_active', true)
            .order('name');
        if (error) throw error;
        return data as TaxWithholding[];
    },

    /**
     * Records a transaction, applies withholdings, and integrates with accounting
     */
    async createTransaction(
        client: SupabaseClient,
        transaction: Partial<TreasuryTransaction>,
        options?: {
            allocations?: Array<{ document_id: string, amount: number }>,
            withholdings?: Array<{ withholding_id: string, base_amount: number, applied_amount: number }>,
            contraAccountId?: string
        }
    ) {
        const tenant_id = await this.getTenantId(client);

        // 1. Create the transaction
        const { data: newTx, error: txError } = await client
            .from('treasury_transactions')
            .insert({ ...transaction, tenant_id })
            .select('*, account:treasury_accounts(*)')
            .single();

        if (txError) throw txError;

        // 2. Clear allocations if provided
        if (options?.allocations && options.allocations.length > 0) {
            const allocationData = options.allocations.map(a => ({
                transaction_id: newTx.id,
                document_id: a.document_id,
                amount: a.amount,
                tenant_id
            }));

            await client.from('payment_allocations').insert(allocationData);

            // Update document status (Basic simplified logic for MVP)
            for (const alloc of options.allocations) {
                await client
                    .from('documents')
                    .update({ status: 'SENT' }) // Mark as fully paid/finalized
                    .eq('id', alloc.document_id);
            }
        }

        // 3. Save Withholdings if any
        if (options?.withholdings && options.withholdings.length > 0) {
            const withholdingData = options.withholdings.map(w => ({
                transaction_id: newTx.id,
                ...w
            }));
            await client.from('transaction_withholdings').insert(withholdingData);
        }

        // 4. AUTOMATIC ACCOUNTING INTEGRATION
        try {
            const { accountingService } = await import('../../accounting/services/accountingService');

            // Validate: Account must be linked to Chart of Accounts
            const chartAccountId = (newTx as any).account?.chart_account_id;
            if (!chartAccountId) {
                console.warn(`[Treasury] Integration skipped: Treasury Account not linked to Chart Account.`);
                return newTx as TreasuryTransaction;
            }

            // Build Journal Entry Lines
            const lines: any[] = [];
            const isReceipt = transaction.transaction_type === 'RECEIPT';
            const absoluteAmount = Math.abs(newTx.amount);

            // 1. Bank/Cash Side (Debit on Receipt, Credit on Payment)
            lines.push({
                account_id: chartAccountId,
                debit: isReceipt ? absoluteAmount : 0,
                credit: isReceipt ? 0 : absoluteAmount,
                description: `${transaction.description || 'Movimiento Tesorería'} - ${newTx.reference_number || ''}`
            });

            // 2. Contra Side (Allocations / Direct)
            if (options?.allocations && options.allocations.length > 0) {
                // Determine Contra Account (CxC 1305 / CxP 2205)
                // TODO: Make this configurable or dynamic based on Document Type
                const contraAccountCode = isReceipt ? '1305' : '2205';
                const contraAccount = await accountingService.getAccountByCode(client, contraAccountCode);

                if (contraAccount) {
                    // Calculate Gross Amount (Net + Withholdings) to clear the full debt
                    const totalWithholdings = options.withholdings?.reduce((sum, w) => sum + Math.abs(w.applied_amount), 0) || 0;
                    const grossAmount = absoluteAmount + totalWithholdings;

                    lines.push({
                        account_id: contraAccount.id,
                        party_id: transaction.party_id,
                        debit: isReceipt ? 0 : grossAmount, // Payment: Debit Liability (Decrease)
                        credit: isReceipt ? grossAmount : 0, // Receipt: Credit Asset (Decrease)
                        description: `Cruce Documentos`
                    });

                    // 3. Withholdings (If any)
                    if (options.withholdings) {
                        for (const w of options.withholdings) {
                            // Try fetching from tax_configurations first (New Engine)
                            const { data: config } = await client.from('tax_configurations').select('account_code, tax_name, rate').eq('id', w.withholding_id).single();

                            let accountCode = config?.account_code;
                            let withholdingName = config?.tax_name;
                            let withholdingRate = config?.rate || 0;

                            // Fallback to legacy tax_withholdings if not found
                            if (!config) {
                                const { data: legacy } = await client.from('tax_withholdings').select('account_code, name, rate').eq('id', w.withholding_id).single();
                                accountCode = legacy?.account_code;
                                withholdingName = legacy?.name;
                                withholdingRate = legacy?.rate || 0;
                            }

                            if (accountCode && withholdingName) {
                                const wAcc = await accountingService.getAccountByCode(client, accountCode);
                                if (wAcc) {
                                    lines.push({
                                        account_id: wAcc.id,
                                        party_id: transaction.party_id,
                                        debit: isReceipt ? Math.abs(w.applied_amount) : 0, // Receipt: Asset (1355) -> Debit
                                        credit: isReceipt ? 0 : Math.abs(w.applied_amount), // Payment: Liability (2365) -> Credit
                                        description: `Ret: ${withholdingName}`,
                                        base_amount: w.base_amount,
                                        tax_rate: withholdingRate
                                    });
                                }
                            }
                        }
                    }
                } else {
                    console.warn(`[Treasury] Integration incomplete: Contra account ${contraAccountCode} not found.`);
                }
            } else if (options?.contraAccountId) {
                // Direct integration with provided contra account (e.g. Payroll)
                lines.push({
                    account_id: options.contraAccountId,
                    party_id: transaction.party_id,
                    debit: isReceipt ? 0 : absoluteAmount,
                    credit: isReceipt ? absoluteAmount : 0,
                    description: `Contrapartida Directa: ${transaction.description || ''}`
                });
            } else {
                console.warn(`[Treasury] Integration skipped: No allocations or contra account provided.`);
                // Future: Handle direct expenses/incomes here
            }

            // Create the Entry if we have at least 2 lines (balanced check is done by service)
            if (lines.length >= 2) {
                const entry = await accountingService.createEntry(client, {
                    entry_date: transaction.date || new Date().toISOString(),
                    description: `Integración Tesorería: ${transaction.description}`,
                    lines
                });

                // Link back
                await client
                    .from('treasury_transactions')
                    .update({ accounting_entry_id: entry.id })
                    .eq('id', newTx.id);
            }
        } catch (e) {
            console.error("Accounting Integration Error:", e);
            // We don't throw here to avoid failing the treasury transaction if accounting fails (optional choice)
        }

        return newTx as TreasuryTransaction;
    },

    async getBankStatements(client: SupabaseClient, accountId?: string) {
        let query = client.from('bank_statements').select('*').order('created_at', { ascending: false });
        if (accountId) query = query.eq('account_id', accountId);

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async createBankStatement(client: SupabaseClient, statement: any, lines: any[]) {
        const tenant_id = await this.getTenantId(client);

        // 1. Create statement
        const { data: stmt, error: stmtError } = await client
            .from('bank_statements')
            .insert({ ...statement, tenant_id })
            .select()
            .single();

        if (stmtError) throw stmtError;

        // 2. Create lines
        const lineData = lines.map(l => ({ ...l, statement_id: stmt.id, tenant_id }));
        const { error: linesError } = await client
            .from('bank_statement_lines')
            .insert(lineData);

        if (linesError) throw linesError;

        return stmt;
    },

    async getStatementLines(client: SupabaseClient, statementId: string) {
        const { data, error } = await client
            .from('bank_statement_lines')
            .select('*')
            .eq('statement_id', statementId)
            .order('date', { ascending: true });

        if (error) throw error;
        return data;
    },

    async matchTransaction(client: SupabaseClient, lineId: string, transactionId: string) {
        const { error: lineError } = await client
            .from('bank_statement_lines')
            .update({ transaction_id: transactionId, status: 'MATCHED' })
            .eq('id', lineId);

        if (lineError) throw lineError;

        const { error: txError } = await client
            .from('treasury_transactions')
            .update({ is_reconciled: true, reconciled_at: new Date().toISOString() })
            .eq('id', transactionId);

        if (txError) throw txError;

        return true;
    },

    async suggestMatches(client: SupabaseClient, amount: number, date: string) {
        // Suggest matches based on exact amount and +/- 3 days
        const startDate = new Date(date);
        startDate.setDate(startDate.getDate() - 3);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 3);

        const { data, error } = await client
            .from('treasury_transactions')
            .select('*, party:parties(legal_name)')
            .eq('amount', amount)
            .eq('is_reconciled', false)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0]);

        if (error) throw error;
        return data;
    },

    async voidTransaction(client: SupabaseClient, transactionId: string) {
        // 1. Get transaction to check if it's already reconciled or has accounting
        const { data: tx, error: fetchError } = await client
            .from('treasury_transactions')
            .select('*, account:treasury_accounts(*)')
            .eq('id', transactionId)
            .single();

        if (fetchError) throw fetchError;
        if (tx.is_reconciled) throw new Error("No se puede anular un movimiento ya conciliado. Desvincule el extracto primero.");

        // 2. Clear distributions (allocations)
        await client.from('payment_allocations').delete().eq('transaction_id', transactionId);

        // 3. Mark transaction as voided (or just delete if it's a hard delete policy, but better to mark)
        const { error: deleteError } = await client
            .from('treasury_transactions')
            .delete()
            .eq('id', transactionId);

        if (deleteError) throw deleteError;

        // 4. Reverse Accounting if integrated
        if (tx.accounting_entry_id) {
            const { accountingService } = await import('../../accounting/services/accountingService');
            await client.from('accounting_entries').delete().eq('id', tx.accounting_entry_id);
        }

        return true;
    },

    /**
     * BRIDGING: Create a treasury payment specifically from a payroll settlement
     */
    async createPayrollPayment(client: SupabaseClient, settlement: any, employee: any, accountId: string) {
        const { accountingService } = await import('../../accounting/services/accountingService');

        // 1. Get the "Salarios por Pagar" (2505) account for accounting integration
        const payableAccount = await accountingService.getAccountByCode(client, '2505');

        // 2. Create the transaction
        const transaction = await this.createTransaction(client, {
            account_id: accountId,
            amount: -settlement.net_pay,
            date: new Date().toISOString().split('T')[0],
            transaction_type: 'PAYMENT',
            party_id: employee.party_id,
            description: `PAGO NÓMINA - ${employee.party?.legal_name} - FEB 2026`,
            reference_number: `NOM-${employee.party?.doc_number}-${Date.now().toString().slice(-4)}`
        }, {
            contraAccountId: payableAccount?.id
        });

        return transaction;
    }
};
