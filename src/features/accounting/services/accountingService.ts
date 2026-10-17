import { SupabaseClient } from '@supabase/supabase-js';
import { JournalEntry, Account, AccountFormData } from '../types';
import {
    buildSalesEntry,
    resolveLineIvaRate,
    isFreightLine,
    resolvePaymentForm,
    type AccountingRule,
    type DocKind,
    type TaxRates,
} from './salesAccountingEngine';

/** Asiento de venta ya calculado, ANTES de guardarlo (lo usa la simulación). */
export interface SalesEntryDraft {
    entry_date: string;
    description: string;
    document_id: string;
    taxpayer_code: string;
    payment_form: string;
    totals: { base: number; iva: number; retefuente: number; reteica: number; reteiva: number; autorrenta: number; cartera: number; debit: number; credit: number };
    lines: Array<{
        account_id: string;
        account_code: string;
        concept: string;
        iva_rate: number | null;
        party_id: string | null;
        debit: number;
        credit: number;
        description: string;
    }>;
}

export const accountingService = {

    async getAccounts(client: SupabaseClient) {
        // range() supera el límite default de 1000 de PostgREST.
        // 15000 cubre cualquier PUC colombiano (el estándar tiene ~3500 cuentas).
        const { data, error } = await client
            .from('chart_accounts')
            .select('*')
            .order('code', { ascending: true })
            .range(0, 14999);

        if (error) { console.error('[accounting] getAccounts:', error.message); return [] as Account[]; }
        return data as Account[];
    },

    async getAccountById(client: SupabaseClient, id: string) {
        const { data, error } = await client
            .from('chart_accounts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) { console.error('[accounting] getAccountById:', error.message); return null; }
        return data as Account;
    },

    async createAccount(client: SupabaseClient, data: AccountFormData) {
        const level = computeLevel(data.code);
        const type = data.type || inferTypeFromCode(data.code);

        const { data: created, error } = await client
            .from('chart_accounts')
            .insert({
                code: data.code.trim(),
                name: data.name.trim(),
                nature: data.nature,
                type,
                is_auxiliary: data.is_auxiliary,
                parent_id: data.parent_id || null,
                level,
                is_active: true,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return created as Account;
    },

    async updateAccount(client: SupabaseClient, id: string, data: AccountFormData) {
        const level = computeLevel(data.code);
        const type = data.type || inferTypeFromCode(data.code);

        const { data: updated, error } = await client
            .from('chart_accounts')
            .update({
                code: data.code.trim(),
                name: data.name.trim(),
                nature: data.nature,
                type,
                is_auxiliary: data.is_auxiliary,
                parent_id: data.parent_id || null,
                level,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return updated as Account;
    },

    async deleteAccount(client: SupabaseClient, id: string) {
        // Check if account has journal lines
        const { count } = await client
            .from('journal_lines')
            .select('id', { count: 'exact', head: true })
            .eq('account_id', id);

        if (count && count > 0) {
            throw new Error(`No se puede eliminar: esta cuenta tiene ${count} movimientos contables asociados`);
        }

        // Check if account has children
        const { count: childCount } = await client
            .from('chart_accounts')
            .select('id', { count: 'exact', head: true })
            .eq('parent_id', id);

        if (childCount && childCount > 0) {
            throw new Error(`No se puede eliminar: esta cuenta tiene ${childCount} subcuentas asociadas`);
        }

        const { error } = await client
            .from('chart_accounts')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
    },

    async toggleAccountActive(client: SupabaseClient, id: string, isActive: boolean) {
        const { error } = await client
            .from('chart_accounts')
            .update({ is_active: isActive, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw new Error(error.message);
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
        if (error) { console.error('[accounting] getEntries:', error.message); return []; }
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
        // maybeSingle (no single): si el código no existe o hay más de una fila
        // —p. ej. el mismo PUC cargado para varios tenants— `single()` devolvía
        // error y el llamador se salía en silencio. Se toma la primera del tenant.
        const { data, error } = await client
            .from('chart_accounts')
            .select('*')
            .eq('code', code)
            .limit(1)
            .maybeSingle();
        if (error || !data) return null;
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

    /**
     * Contabiliza una venta (factura o nota crédito) con las reglas del contador.
     *
     * Devuelve el asiento creado, o null si no se pudo (sin reglas para ese
     * cliente, sin cuentas, etc.) junto con los avisos, para que el llamador
     * decida si alerta al usuario en vez de fallar en silencio.
     */
    async previewSalesEntry(client: SupabaseClient, document: any): Promise<{ draft: SalesEntryDraft | null; warnings: string[] }> {
        const docKind: DocKind | null =
            document.doc_type === 'INVOICE' ? 'FV' :
            document.doc_type === 'CREDIT_NOTE' ? 'NC' : null;
        if (!docKind) return { draft: null, warnings: [] };

        const docLines = Array.isArray(document.lines) ? document.lines : [];
        if (docLines.length === 0) {
            return { draft: null, warnings: [`El documento ${document.number ?? ''} no tiene líneas: no se contabiliza.`] };
        }

        // ── Tercero: tipo de contribuyente y plazo de pago ─────────────────
        // `applies_reteica` va en el select: sin ella el indicador llegaba
        // undefined y ReteICA salía en $0 para TODOS los clientes de Bogotá,
        // aunque tuvieran la marca traída de WorldOffice.
        const { data: party } = await client
            .from('parties')
            .select('taxpayer_type, payment_term_days, city')
            .eq('id', document.party_id)
            .maybeSingle();

        const { data: types } = await client
            .from('taxpayer_types')
            .select('code, legacy_code');

        const legacy = (party?.taxpayer_type as string | null) ?? null;
        const match = (types ?? []).find((t: { code: string; legacy_code: string | null }) =>
            t.code === legacy || t.legacy_code === legacy);
        const taxpayerCode = match?.code ?? 'PJ';
        const warnings: string[] = [];
        if (!match) {
            warnings.push(
                `El tercero no tiene un tipo de contribuyente reconocido (${legacy ?? 'vacío'}); ` +
                `se contabilizó como Persona Jurídica. Corrige el tercero para que el asiento sea el correcto.`,
            );
        }

        const paymentForm = resolvePaymentForm(document.payment_form, party?.payment_term_days);

        // ── Reglas y tarifas ───────────────────────────────────────────────
        const { data: ruleRows } = await client
            .from('accounting_rules')
            .select('iva_rate, account_code, nature, concept')
            .eq('doc_kind', docKind)
            .eq('payment_form', paymentForm)
            .eq('taxpayer_code', taxpayerCode)
            .eq('is_active', true);

        const year = Number((document.issue_date ?? '').slice(0, 4)) || new Date().getFullYear();
        const { data: taxRows } = await client
            .from('tax_configurations')
            .select('tax_type, rate, min_base, city')
            .eq('year', year)
            .eq('is_active', true);

        // ReteICA en VENTAS se decide por el tipo de contribuyente del cliente
        // (reglas de la matriz: grandes contribuyentes, entidades del Estado) y
        // por su municipio. La marca `applies_reteica` de WorldOffice es para
        // PROVEEDORES (compras), no para clientes — Andrés, 2026-09-17. Usarla
        // aquí hacía que a personas jurídicas comunes se les practicara ICA.

        const taxes: TaxRates = {};
        for (const t of (taxRows ?? []) as Array<{ tax_type: string; rate: number; min_base: number; city: string | null }>) {
            // ReteICA depende del municipio: gana la tarifa de la ciudad del
            // tercero y, si no hay, la general (city NULL).
            if (t.tax_type === 'RETEICA' && t.city && t.city !== party?.city) continue;
            const key = t.tax_type as keyof TaxRates;
            if (taxes[key] && t.city == null) continue;
            taxes[key] = { rate: Number(t.rate) || 0, min_base: Number(t.min_base) || 0 };
        }

        // ── Motor ──────────────────────────────────────────────────────────
        const result = buildSalesEntry(
            {
                doc_kind: docKind,
                payment_form: paymentForm,
                taxpayer_code: taxpayerCode,
                lines: docLines.map((l: any) => ({
                    qty: Number(l.qty) || 0,
                    unit_price: Number(l.unit_price) || 0,
                    iva_rate: resolveLineIvaRate(l.tax_config, l.product?.tax_category),
                    is_freight: isFreightLine(l.product?.sku, l.description),
                })),
            },
            (ruleRows ?? []) as AccountingRule[],
            taxes,
        );
        warnings.push(...result.warnings);

        if (result.lines.length === 0 || result.totals.debit !== result.totals.credit) {
            return { draft: null, warnings };
        }

        // ── Traducción de códigos de cuenta a ids ──────────────────────────
        const codes = [...new Set(result.lines.map(l => l.account_code))];
        const { data: accounts } = await client
            .from('chart_accounts')
            .select('id, code')
            .in('code', codes);

        const idByCode = new Map((accounts ?? []).map((a: { id: string; code: string }) => [a.code, a.id]));
        const missing = codes.filter(c => !idByCode.has(c));
        if (missing.length > 0) {
            warnings.push(`Faltan cuentas en el PUC: ${missing.join(', ')}. No se contabilizó.`);
            return { draft: null, warnings };
        }

        const label = docKind === 'FV' ? 'Factura' : 'Nota crédito';
        return {
            draft: {
                entry_date: document.issue_date,
                description: `${label} ${document.number ?? ''} — ${paymentForm.toLowerCase()}`.trim(),
                document_id: document.id,
                taxpayer_code: taxpayerCode,
                payment_form: paymentForm,
                totals: result.totals,
                lines: result.lines.map(l => ({
                    account_id: idByCode.get(l.account_code)!,
                    account_code: l.account_code,
                    concept: l.concept,
                    iva_rate: l.iva_rate ?? null,
                    party_id: document.party_id,
                    debit: l.debit,
                    credit: l.credit,
                    description: `${l.concept}${l.iva_rate != null ? ` ${l.iva_rate}%` : ''} — ${label} ${document.number ?? ''}`,
                })),
            },
            warnings,
        };
    },

    /**
     * Contabiliza una venta: calcula el asiento con previewSalesEntry y lo guarda.
     * La simulación usa el MISMO cálculo, por eso el borrador está separado.
     */
    async createSalesEntry(client: SupabaseClient, document: any): Promise<{ entry: unknown | null; warnings: string[] }> {
        const { draft, warnings } = await this.previewSalesEntry(client, document);
        if (!draft) return { entry: null, warnings };
        const entry = await this.createEntry(client, {
            entry_date: draft.entry_date,
            description: draft.description,
            document_id: draft.document_id,
            lines: draft.lines.map(l => ({
                account_id: l.account_id,
                party_id: l.party_id,
                debit: l.debit,
                credit: l.credit,
                description: l.description,
            })),
        } as JournalEntry);
        return { entry, warnings };
    },

    /**
     * Contabiliza un PEDIDO FACTURADO (SALES_ORDER en ACCEPTED) como factura de
     * venta: es la operación real mientras la facturación sigue en WorldOffice y
     * es justo lo que validó el contador en la simulación. Idempotente: si el
     * pedido ya tiene asiento, no crea otro. GATED por tenants.auto_post_sales.
     */
    async postSalesOrderEntry(
        client: SupabaseClient,
        docId: string,
    ): Promise<{ entry: unknown | null; warnings: string[]; skipped?: boolean }> {
        // Idempotencia: no duplicar si ya hay asiento para este pedido.
        const { data: existing } = await client
            .from('journal_entries')
            .select('id')
            .eq('document_id', docId)
            .limit(1)
            .maybeSingle();
        if (existing) return { entry: null, warnings: [], skipped: true };

        const { data: doc } = await client
            .from('documents')
            .select('id, tenant_id, number, doc_type, status, issue_date, total, party_id, payment_form, lines:document_lines(qty, unit_price, tax_config, description, product:products(tax_category, sku))')
            .eq('id', docId)
            .single();
        if (!doc || doc.doc_type !== 'SALES_ORDER' || doc.status !== 'ACCEPTED') {
            return { entry: null, warnings: [] };
        }

        const { data: t } = await client
            .from('tenants')
            .select('auto_post_sales')
            .eq('id', doc.tenant_id)
            .maybeSingle();
        if (!t?.auto_post_sales) return { entry: null, warnings: [] };

        // Un pedido facturado se contabiliza con las reglas de factura de venta (FV).
        return await this.createSalesEntry(client, { ...doc, doc_type: 'INVOICE' });
    },

    /**
     * Revierte el asiento de un pedido (al desmarcar "facturado"). Borra el asiento
     * autogenerado del pedido; no toca asientos de otros documentos.
     */
    async unpostSalesOrderEntry(client: SupabaseClient, docId: string): Promise<{ removed: number }> {
        const { data: entries } = await client
            .from('journal_entries')
            .select('id')
            .eq('document_id', docId);
        if (!entries || entries.length === 0) return { removed: 0 };
        const ids = entries.map((e: { id: string }) => e.id);
        await client.from('journal_lines').delete().in('entry_id', ids);
        await client.from('journal_entries').delete().in('id', ids);
        return { removed: ids.length };
    },

    async createEntryFromDocument(client: SupabaseClient, document: any) {
        // Ventas (factura/NC): motor de reglas del contador, GATED por auto_post_sales.
        if (document.doc_type === 'INVOICE' || document.doc_type === 'CREDIT_NOTE') {
            const { data: t } = await client
                .from('tenants')
                .select('auto_post_sales')
                .eq('id', document.tenant_id)
                .maybeSingle();
            if (!t?.auto_post_sales) return;
            const { entry, warnings } = await this.createSalesEntry(client, document);
            if (warnings.length > 0) console.warn('[contabilización]', document.number, warnings.join(' | '));
            return entry;
        }

        // Compras: la compra remisionada (VENDOR_BILL → CREM) se contabiliza con el
        // motor de reglas del contador (purchase_accounting_rules). El inventario
        // físico lo mueve la recepción de la OC (la "remisión de proveedores" del
        // contador), no este documento: aquí solo va el asiento contable, por eso
        // no se duplica inventario.
        //
        // GATED por tenants.auto_post_purchases: mientras esté en false (default),
        // registrar una compra NO genera asiento —igual que hoy— hasta que el
        // contador dé el visto bueno y lo encienda, sin re-desplegar.
        if (document.doc_type === 'VENDOR_BILL' || document.doc_type === 'PURCHASE_RETURN') {
            // Compra remisionada (VENDOR_BILL → CREM) y devolución a proveedor
            // (PURCHASE_RETURN → DMP) van por el mismo motor y el mismo interruptor.
            // Leer el flag DEL TENANT DEL DOCUMENTO (no `limit(1)`): evita ambigüedad
            // si la consulta no está acotada por RLS a un único tenant.
            const { data: t } = await client
                .from('tenants')
                .select('auto_post_purchases')
                .eq('id', document.tenant_id)
                .maybeSingle();
            if (!t?.auto_post_purchases) return;

            const { purchaseAccountingService } = await import('./purchaseAccountingService');
            const { entry, warnings } = await purchaseAccountingService.createPurchaseEntry(client, document);
            if (warnings.length > 0) console.warn('[contabilización compra]', document.number, warnings.join(' | '));
            return entry;
        }

        // Los demás documentos (pedidos, cotizaciones, remisiones, notas débito,
        // recibos…) no generan asiento por este camino. La nómina se contabiliza
        // aparte con createEntryFromPayroll.
        return;
    },

    async getTrialBalance(client: SupabaseClient, startDate: string, endDate: string, dimensionValueId?: string) {
        type TrialBalanceRow = { code: string; name: string; debit: number; credit: number; balance: number };
        const aggregation: Record<string, TrialBalanceRow> = {};

        if (dimensionValueId) {
            // Query journal_lines directly so we can filter by dimension columns
            const { data, error } = await client
                .from('journal_lines')
                .select(`
                    account_id,
                    debit,
                    credit,
                    account:chart_accounts(code, name),
                    entry:journal_entries!inner(entry_date)
                `)
                .gte('journal_entries.entry_date', startDate)
                .lte('journal_entries.entry_date', endDate)
                .or(`dimension1_id.eq.${dimensionValueId},dimension2_id.eq.${dimensionValueId}`);

            if (error) {
                console.error("[accounting] getTrialBalance (dimension) error:", error.message);
                return [];
            }

            if (!data || data.length === 0) {
                console.warn(`[accounting] getTrialBalance: no lines found for dimension ${dimensionValueId} in ${startDate} to ${endDate}`);
                return [];
            }

            (data as Array<Record<string, unknown>>).forEach((line) => {
                const acc = line.account as { code: string; name: string } | null;
                if (!acc) return;

                if (!aggregation[acc.code]) {
                    aggregation[acc.code] = { code: acc.code, name: acc.name, debit: 0, credit: 0, balance: 0 };
                }
                aggregation[acc.code].debit += Number(line.debit) || 0;
                aggregation[acc.code].credit += Number(line.credit) || 0;
            });
        } else {
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
                console.error("[accounting] getTrialBalance error:", error.message);
                return [];
            }

            if (!data || data.length === 0) {
                console.warn(`[accounting] getTrialBalance: no entries found for ${startDate} to ${endDate}`);
                return [];
            }

            data.forEach((entry: Record<string, unknown>) => {
                const lines = entry.lines as Array<Record<string, unknown>> | null;
                if (!lines) return;
                lines.forEach((line) => {
                    const acc = line.account as { code: string; name: string } | null;
                    if (!acc) return;

                    if (!aggregation[acc.code]) {
                        aggregation[acc.code] = { code: acc.code, name: acc.name, debit: 0, credit: 0, balance: 0 };
                    }
                    aggregation[acc.code].debit += Number(line.debit) || 0;
                    aggregation[acc.code].credit += Number(line.credit) || 0;
                });
            });
        }

        // Calculate balances based on PUC class
        Object.values(aggregation).forEach((acc) => {
            const classCode = acc.code[0];
            if (['1', '5', '6', '7', '8'].includes(classCode)) {
                acc.balance = acc.debit - acc.credit;
            } else {
                acc.balance = acc.credit - acc.debit;
            }
        });

        const result = Object.values(aggregation).sort((a, b) => a.code.localeCompare(b.code));
        return result;
    },

    async getProfitAndLoss(client: SupabaseClient, startDate: string, endDate: string, dimensionValueId?: string) {
        const trialBalance = await this.getTrialBalance(client, startDate, endDate, dimensionValueId);

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

    async getBalanceSheet(client: SupabaseClient, startDate: string, endDate: string, dimensionValueId?: string) {
        const trialBalance = await this.getTrialBalance(client, startDate, endDate, dimensionValueId);
        const pnl = await this.getProfitAndLoss(client, startDate, endDate, dimensionValueId);

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
        if (error) { console.error('[accounting] getAuxiliaryLedger:', error.message); return []; }
        return data;
    }
};

// ── Helpers ────────────────────────────────────────────────

function computeLevel(code: string): number {
    const stripped = code.replace(/0+$/, '');
    if (stripped.length <= 1) return 1;
    if (stripped.length <= 2) return 2;
    if (stripped.length <= 4) return 3;
    if (stripped.length <= 6) return 4;
    return 5;
}

function inferTypeFromCode(code: string): string {
    const c = code[0];
    switch (c) {
        case '1': return 'ASSET';
        case '2': return 'LIABILITY';
        case '3': return 'EQUITY';
        case '4': return 'REVENUE';
        case '5': return 'EXPENSE';
        case '6': return 'COST';
        case '7': return 'COST';
        case '8': return 'ORDER';
        case '9': return 'ORDER';
        default: return 'ASSET';
    }
}
