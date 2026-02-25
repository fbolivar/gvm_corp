import { SupabaseClient } from '@supabase/supabase-js';
import { JournalEntry, Account } from '../types';

export const accountingService = {

    async getAccounts(client: SupabaseClient) {
        const { data, error } = await client
            .from('chart_accounts')
            .select('*')
            .order('code', { ascending: true });

        if (error) throw error;
        return data as Account[];
    },

    async getEntries(client: SupabaseClient, filters?: { limit?: number }) {
        const query = client
            .from('journal_entries')
            .select(`
                *,
                lines:journal_lines(
                    *,
                    account:chart_accounts(code, name),
                    party:parties(legal_name)
                )
            `)
            .order('entry_date', { ascending: false })
            .order('created_at', { ascending: false });

        if (filters?.limit) {
            query.limit(filters.limit);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    async createEntry(client: SupabaseClient, entry: JournalEntry) {
        // 1. Validate Balance
        const totalDebit = entry.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
        const totalCredit = entry.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new Error(`Asiento desbalanceado: Débito ${totalDebit} vs Crédito ${totalCredit}`);
        }

        // 2. Create Header
        const { data: newEntry, error: entryError } = await client
            .from('journal_entries')
            .insert({
                entry_date: entry.entry_date,
                description: entry.description,
                period: entry.entry_date.substring(0, 7), // YYYY-MM
                document_id: entry.document_id
            })
            .select()
            .single();

        if (entryError) throw entryError;

        // 3. Create Lines
        const linesWithid = entry.lines.map(line => ({
            ...line,
            entry_id: newEntry.id,
            tenant_id: newEntry.tenant_id // Inherit tenant? Trigger usually handles this but ok explicity
        }));

        const { error: linesError } = await client
            .from('journal_lines')
            .insert(linesWithid);

        if (linesError) {
            // Rollback header if possible? RPC is better for transaction. 
            // For now, throw error.
            throw linesError;
        }

        return newEntry;
    },

    async getAccountByCode(client: SupabaseClient, code: string) {
        const { data, error } = await client
            .from('chart_accounts')
            .select('*')
            .eq('code', code)
            .single();
        if (error) return null; // Or throw, depends on strictness. For now return null to avoid blocking if config missing
        return data as Account;
    },

    async createEntryFromPayroll(client: SupabaseClient, doc: any, settlement: any) {
        // 1. Get Accounts
        const expenseAccount = await this.getAccountByCode(client, '5105'); // Gastos de Personal - Sueldos
        const payableAccount = await this.getAccountByCode(client, '2505'); // Salarios por Pagar
        const deductionAccount = await this.getAccountByCode(client, '2370'); // Retenciones y aportes
        const provisionsAccount = await this.getAccountByCode(client, '2610'); // Provisiones

        if (!expenseAccount || !payableAccount) {
            console.warn("Accounting Integration Skipped: Missing essential payroll accounts (5105 or 2505)");
            return;
        }

        const lines: any[] = [];
        const description = `Contabilización Nómina ${doc.number} - ${doc.party?.legal_name}`;

        // 2. Debits: Total Earnings (Devengados)
        lines.push({
            account_id: expenseAccount.id,
            party_id: doc.party_id,
            debit: settlement.total_earnings,
            credit: 0,
            description: `Devengados: ${description}`
        });

        // 3. Debits: Employer Social Security & Parafiscales (Costs)
        if (settlement.social_security) {
            const ss = settlement.social_security;
            const totalEmployerCost = ss.employer.total + ss.parafiscales.total;

            if (totalEmployerCost > 0) {
                lines.push({
                    account_id: expenseAccount.id, // Usually 51057x but for MVP 5105
                    party_id: doc.party_id,
                    debit: totalEmployerCost,
                    credit: 0,
                    description: `Cargas Legales: ${description}`
                });
            }
        }

        // 4. Debits: Provisions (Cost)
        if (settlement.provisions) {
            lines.push({
                account_id: expenseAccount.id, // Usually 51056x but for MVP 5105
                party_id: doc.party_id,
                debit: settlement.provisions.total,
                credit: 0,
                description: `Provisiones Sociales: ${description}`
            });
        }

        // 5. Credits: Deductions (Liability to pay to entities)
        if (settlement.total_deductions > 0 && deductionAccount) {
            lines.push({
                account_id: deductionAccount.id,
                party_id: doc.party_id,
                debit: 0,
                credit: settlement.total_deductions,
                description: `Deducciones Empleado: ${description}`
            });
        }

        // 6. Credits: Social Security Payable (Liability for employer part)
        if (settlement.social_security && deductionAccount) {
            const totalPayableSS = settlement.social_security.employer.total + settlement.social_security.parafiscales.total;
            if (totalPayableSS > 0) {
                lines.push({
                    account_id: deductionAccount.id,
                    party_id: doc.party_id,
                    debit: 0,
                    credit: totalPayableSS,
                    description: `Seguros y Aportes por Pagar: ${description}`
                });
            }
        }

        // 7. Credits: Provisions Payable
        if (settlement.provisions && provisionsAccount) {
            lines.push({
                account_id: provisionsAccount.id,
                party_id: doc.party_id,
                debit: 0,
                credit: settlement.provisions.total,
                description: `Provisiones por Pagar: ${description}`
            });
        }

        // 8. Credits: Net Salary Payable (What goes to the employee bank/cash)
        lines.push({
            account_id: payableAccount.id,
            party_id: doc.party_id,
            debit: 0,
            credit: settlement.net_pay,
            description: `Sueldo Neto por Pagar: ${description}`
        });

        // 9. Create Entry
        const entry: JournalEntry = {
            entry_date: doc.issue_date,
            description: `Nómina: ${description}`,
            document_id: doc.id,
            lines: lines
        };

        return await this.createEntry(client, entry);
    },

    async createEntryFromDocument(client: SupabaseClient, document: any) {
        let lines: any[] = [];
        let description = `Contabilización ${document.doc_type} ${document.number || document.id?.substring(0, 8)}`;

        // Aggregate Taxes from Lines if available
        let ivaAmount = 0;
        let reteFuenteAmount = 0;
        let reteIcaAmount = 0;
        let cxAmount = 0; // Total to CXC / CXP

        if (document.lines && Array.isArray(document.lines) && document.lines.length > 0) {
            document.lines.forEach((line: any) => {
                const lineTotal = Number(line.qty) * Number(line.unit_price);

                // Flexible parsing of tax_config. It can be an array of objects or a single object.
                const configs = Array.isArray(line.tax_config) ? line.tax_config : (line.tax_config ? [line.tax_config] : []);

                configs.forEach((tax: any) => {
                    const rate = Number(tax.rate) || 0;
                    const taxVal = lineTotal * (rate / 100);

                    const tType = (tax.type || tax.name || 'IVA').toUpperCase();

                    if (tType.includes('IVA')) {
                        ivaAmount += taxVal;
                    } else if (tType.includes('RETEFUENTE') || tType.includes('FUENTE') || tType.includes('RF')) {
                        reteFuenteAmount += taxVal;
                    } else if (tType.includes('ICA')) {
                        reteIcaAmount += taxVal;
                    } else {
                        // Fallback assumes additive tax
                        ivaAmount += taxVal;
                    }
                });
            });
            // Recompute total based on standard structure: subtotal + IVA - Retenciones
            cxAmount = Number(document.subtotal) + ivaAmount - reteFuenteAmount - reteIcaAmount;
        } else {
            // Fallback for docs without lines (legacy or quick created)
            ivaAmount = Number(document.taxes) || 0;
            cxAmount = Number(document.total) || 0;
        }

        if (document.doc_type === 'INVOICE') {
            const receivableAccount = await this.getAccountByCode(client, '1305'); // Clientes
            const incomeAccount = await this.getAccountByCode(client, '4135'); // Comercio
            const ivaAccount = await this.getAccountByCode(client, '2408'); // IVA Generado
            const reteFuenteAccount = await this.getAccountByCode(client, '135515'); // Anticipo Retefuente (Activo)
            const reteIcaAccount = await this.getAccountByCode(client, '135518'); // Anticipo ReteICA (Activo)

            if (!receivableAccount || !incomeAccount) return;

            // Debits (Receivable / CXC) -> Total
            lines.push({ account_id: receivableAccount.id, party_id: document.party_id, debit: cxAmount, credit: 0, description });

            // Debits (Anticipos Retenciones)
            if (reteFuenteAmount > 0 && reteFuenteAccount) {
                lines.push({ account_id: reteFuenteAccount.id, party_id: document.party_id, debit: reteFuenteAmount, credit: 0, description: `Anticipo Retefuente Fac ${document.number}` });
            }
            if (reteIcaAmount > 0 && reteIcaAccount) {
                lines.push({ account_id: reteIcaAccount.id, party_id: document.party_id, debit: reteIcaAmount, credit: 0, description: `Anticipo ReteICA Fac ${document.number}` });
            }

            // Credits (Income) -> Subtotal
            lines.push({ account_id: incomeAccount.id, party_id: document.party_id, debit: 0, credit: document.subtotal, description: `Ingreso Fac ${document.number}` });

            // Credits (IVA Generado)
            if (ivaAmount > 0 && ivaAccount) {
                lines.push({ account_id: ivaAccount.id, party_id: document.party_id, debit: 0, credit: ivaAmount, description: `IVA Generado Fac ${document.number}` });
            }
        }
        else if (document.doc_type === 'VENDOR_BILL') {
            const payableAccount = await this.getAccountByCode(client, '2205'); // Proveedores
            const expenseAccount = await this.getAccountByCode(client, '6135'); // Costo de Ventas
            const ivaAccount = await this.getAccountByCode(client, '2408'); // IVA Descontable
            const reteFuenteAccount = await this.getAccountByCode(client, '2365'); // Retefuente por Pagar (Pasivo)
            const reteIcaAccount = await this.getAccountByCode(client, '2368'); // ReteICA por Pagar (Pasivo)

            if (!payableAccount || !expenseAccount) return;

            // Debits (Expense / Cost) -> Subtotal
            lines.push({ account_id: expenseAccount.id, party_id: document.party_id, debit: document.subtotal, credit: 0, description: `Costo/Gasto ${document.number}` });

            // Debits (IVA Descontable)
            if (ivaAmount > 0 && ivaAccount) {
                lines.push({ account_id: ivaAccount.id, party_id: document.party_id, debit: ivaAmount, credit: 0, description: `IVA Descontable ${document.number}` });
            }

            // Credits (Retenciones por pgar)
            if (reteFuenteAmount > 0 && reteFuenteAccount) {
                lines.push({ account_id: reteFuenteAccount.id, party_id: document.party_id, debit: 0, credit: reteFuenteAmount, description: `Retefuente por Pagar Fr ${document.number}` });
            }
            if (reteIcaAmount > 0 && reteIcaAccount) {
                lines.push({ account_id: reteIcaAccount.id, party_id: document.party_id, debit: 0, credit: reteIcaAmount, description: `ReteICA por Pagar Fr ${document.number}` });
            }

            // Credits (Payable / CXP) -> Total a pagar
            lines.push({ account_id: payableAccount.id, party_id: document.party_id, debit: 0, credit: cxAmount, description: `CXP Prov ${document.number}` });
        }
        else if (document.doc_type === 'CREDIT_NOTE') {
            const receivableAccount = await this.getAccountByCode(client, '1305'); // Clientes
            const returnAccount = await this.getAccountByCode(client, '4175'); // Devoluciones Ventas
            const ivaAccount = await this.getAccountByCode(client, '2408'); // IVA Descontable/Generado Reversado
            const reteFuenteAccount = await this.getAccountByCode(client, '135515'); // Reversa
            const reteIcaAccount = await this.getAccountByCode(client, '135518'); // Reversa

            if (!receivableAccount || !returnAccount) return;

            // Debits (Income Reversal / Returns) -> Subtotal
            lines.push({ account_id: returnAccount.id, party_id: document.party_id, debit: document.subtotal, credit: 0, description: `Devolución Venta ${document.number}` });

            // Debits (IVA Reversal)
            if (ivaAmount > 0 && ivaAccount) {
                lines.push({ account_id: ivaAccount.id, party_id: document.party_id, debit: ivaAmount, credit: 0, description: `Ajuste IVA NC ${document.number}` });
            }

            // Credits (Reversa Anticipos)
            if (reteFuenteAmount > 0 && reteFuenteAccount) {
                lines.push({ account_id: reteFuenteAccount.id, party_id: document.party_id, debit: 0, credit: reteFuenteAmount, description: `Reversa Retefuente NC ${document.number}` });
            }
            if (reteIcaAmount > 0 && reteIcaAccount) {
                lines.push({ account_id: reteIcaAccount.id, party_id: document.party_id, debit: 0, credit: reteIcaAmount, description: `Reversa ReteICA NC ${document.number}` });
            }

            // Credits (Receivable Reversal) -> Total
            lines.push({ account_id: receivableAccount.id, party_id: document.party_id, debit: 0, credit: cxAmount, description: `Ajuste CXC NC ${document.number}` });
        }
        // Orders and Quotes do not generate accounting entries.
        else if (['PURCHASE_ORDER', 'SALES_ORDER', 'QUOTATION'].includes(document.doc_type)) {
            return;
        }

        if (lines.length === 0) return;

        return await this.createEntry(client, {
            entry_date: document.issue_date,
            description,
            document_id: document.id,
            lines
        });
    },

    async getTrialBalance(client: SupabaseClient, startDate: string, endDate: string) {
        const { data, error } = await client
            .from('journal_entries')
            .select(`
                id,
                entry_date,
                lines:journal_lines(
                    account_id,
                    debit,
                    credit,
                    account:chart_accounts(code, name)
                )
            `)
            .gte('entry_date', startDate)
            .lte('entry_date', endDate);

        if (error) {
            console.error("Trial Balance Query Error:", error.message, error.details);
            throw error;
        }

        // Aggregate by account
        const aggregation: Record<string, any> = {};

        data?.forEach((entry: any) => {
            entry.lines?.forEach((line: any) => {
                const acc = line.account;
                if (!acc) return;

                if (!aggregation[acc.code]) {
                    aggregation[acc.code] = {
                        code: acc.code,
                        name: acc.name,
                        debit: 0,
                        credit: 0,
                        balance: 0
                    };
                }
                aggregation[acc.code].debit += Number(line.debit) || 0;
                aggregation[acc.code].credit += Number(line.credit) || 0;
            });
        });

        // Calculate balances based on class
        Object.values(aggregation).forEach((acc: any) => {
            const classCode = acc.code[0];
            if (['1', '5', '6', '7', '8'].includes(classCode)) {
                acc.balance = acc.debit - acc.credit;
            } else {
                acc.balance = acc.credit - acc.debit;
            }
        });

        return Object.values(aggregation).sort((a: any, b: any) => a.code.localeCompare(b.code));
    },

    async getProfitAndLoss(client: SupabaseClient, startDate: string, endDate: string) {
        const trialBalance = await this.getTrialBalance(client, startDate, endDate);

        const income = trialBalance.filter(acc => acc.code.startsWith('4'));
        const expenses = trialBalance.filter(acc =>
            acc.code.startsWith('5') || acc.code.startsWith('6') || acc.code.startsWith('7')
        );

        const totalIncome = income.reduce((sum, acc) => sum + acc.balance, 0);
        const totalExpenses = expenses.reduce((sum, acc) => sum + acc.balance, 0);

        return {
            income,
            expenses,
            totalIncome,
            totalExpenses,
            netProfit: totalIncome - totalExpenses
        };
    },

    async getBalanceSheet(client: SupabaseClient, startDate: string, endDate: string) {
        const trialBalance = await this.getTrialBalance(client, startDate, endDate);
        const pnl = await this.getProfitAndLoss(client, startDate, endDate);

        const assets = trialBalance.filter(acc => acc.code.startsWith('1'));
        const liabilities = trialBalance.filter(acc => acc.code.startsWith('2'));
        const equity = trialBalance.filter(acc => acc.code.startsWith('3'));

        const totalAssets = assets.reduce((sum, acc) => sum + acc.balance, 0);
        const totalLiabilities = liabilities.reduce((sum, acc) => sum + acc.balance, 0);
        const totalEquity = equity.reduce((sum, acc) => sum + acc.balance, 0);

        return {
            assets,
            liabilities,
            equity,
            totalAssets,
            totalLiabilities,
            totalEquity,
            netIncome: pnl.netProfit,
            totalEquityAndLiabilities: totalLiabilities + totalEquity + pnl.netProfit
        };
    },

    async getAuxiliaryLedger(client: SupabaseClient, startDate: string, endDate: string, accountId?: string) {
        let query = client
            .from('journal_lines')
            .select(`
                *,
                chart_accounts(code, name),
                journal_entries!inner(entry_date, description, number),
                parties(legal_name)
            `)
            .gte('journal_entries.entry_date', startDate)
            .lte('journal_entries.entry_date', endDate)
            .order('entry_date', { foreignTable: 'journal_entries', ascending: true });

        if (accountId) {
            query = query.eq('account_id', accountId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }
};
