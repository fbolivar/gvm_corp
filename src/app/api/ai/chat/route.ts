import { anthropic } from '@ai-sdk/anthropic';
import { streamText, tool, stepCountIs, zodSchema, convertToModelMessages } from 'ai';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const maxDuration = 30;

const SYSTEM_PROMPT = `Eres el Asistente Financiero IA de GVM Corp, un ERP empresarial colombiano.
Tu nombre es "GVM AI" y tu especialidad es análisis financiero, nómina y gestión empresarial bajo normativa colombiana.

Cuando el usuario te haga preguntas sobre su negocio, usa las herramientas disponibles para consultar datos reales en tiempo real.
Responde siempre en español, de forma concisa y profesional. Usa emojis financieros cuando sea apropiado (📊 💰 📈 📉 ✅ ⚠️).
Formatea los montos en pesos colombianos: $1.200.000 COP.
Para fechas usa formato colombiano: 15 de marzo de 2026.

Si no tienes suficiente información, usa las herramientas para obtenerla antes de responder.`;

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { messages } = await req.json();

    const result = streamText({
        model: anthropic('claude-sonnet-4-5'),
        system: SYSTEM_PROMPT,
        messages: await convertToModelMessages(messages),
        stopWhen: stepCountIs(5),
        tools: {
            getFinancialSummary: tool({
                description: 'Obtiene resumen financiero (ingresos, gastos, utilidad) para un periodo.',
                inputSchema: zodSchema(z.object({
                    period: z.enum(['today', 'this_month', 'last_month', 'this_year', 'last_year']).describe('Periodo a consultar'),
                })),
                execute: async ({ period }) => {
                    const now = new Date();
                    let startDate: string, endDate: string;

                    if (period === 'today') {
                        startDate = endDate = now.toISOString().split('T')[0];
                    } else if (period === 'this_month') {
                        startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
                        endDate = now.toISOString().split('T')[0];
                    } else if (period === 'last_month') {
                        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        startDate = `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, '0')}-01`;
                        const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
                        endDate = lastDay.toISOString().split('T')[0];
                    } else if (period === 'this_year') {
                        startDate = `${now.getFullYear()}-01-01`;
                        endDate = now.toISOString().split('T')[0];
                    } else {
                        startDate = `${now.getFullYear() - 1}-01-01`;
                        endDate = `${now.getFullYear() - 1}-12-31`;
                    }

                    const [{ data: invoices }, { data: bills }] = await Promise.all([
                        supabase.from('documents').select('total, subtotal, taxes')
                            .eq('doc_type', 'INVOICE').not('status', 'eq', 'VOIDED')
                            .gte('issue_date', startDate).lte('issue_date', endDate),
                        supabase.from('documents').select('total, subtotal')
                            .eq('doc_type', 'VENDOR_BILL')
                            .gte('issue_date', startDate).lte('issue_date', endDate),
                    ]);

                    const totalIncome = (invoices ?? []).reduce((s, d) => s + Number(d.total), 0);
                    const totalExpenses = (bills ?? []).reduce((s, d) => s + Number(d.total), 0);
                    const netProfit = totalIncome - totalExpenses;
                    const margin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0';

                    return {
                        period: `${startDate} al ${endDate}`,
                        invoiceCount: invoices?.length ?? 0,
                        totalIncome,
                        totalExpenses,
                        netProfit,
                        marginPct: margin,
                    };
                },
            }),

            getInvoiceStatus: tool({
                description: 'Consulta estado de facturas: pendientes, vencidas, pagadas.',
                inputSchema: zodSchema(z.object({
                    status: z.enum(['all', 'pending', 'overdue', 'paid']).optional(),
                    limit: z.number().optional(),
                })),
                execute: async ({ status = 'all', limit = 10 }) => {
                    let query = supabase.from('documents')
                        .select('number, issue_date, due_date, total, balance, status')
                        .eq('doc_type', 'INVOICE')
                        .order('issue_date', { ascending: false })
                        .limit(limit);

                    if (status === 'pending') query = query.gt('balance', 0).not('status', 'eq', 'VOIDED');
                    else if (status === 'overdue') {
                        const today = new Date().toISOString().split('T')[0];
                        query = query.lt('due_date', today).gt('balance', 0);
                    } else if (status === 'paid') query = query.eq('status', 'PAID');

                    const { data } = await query;
                    const totalBalance = (data ?? []).reduce((s, d) => s + Number(d.balance ?? 0), 0);
                    return { count: data?.length ?? 0, totalBalance, invoices: data ?? [] };
                },
            }),

            getPayrollSummary: tool({
                description: 'Consulta resumen de nómina: empleados activos, masa salarial, costos patronales.',
                inputSchema: zodSchema(z.object({})),
                execute: async () => {
                    const { data: employees } = await supabase.from('employees')
                        .select('base_salary, contract_type, status')
                        .eq('status', 'ACTIVE');
                    const count = employees?.length ?? 0;
                    const masaSalarial = (employees ?? []).reduce((s, e) => s + Number(e.base_salary), 0);
                    const costPatronal = masaSalarial * 0.219;
                    return { activeEmployees: count, masaSalarial, costPatronal, totalLaboral: masaSalarial + costPatronal };
                },
            }),

            getBudgetStatus: tool({
                description: 'Consulta presupuesto vs ejecutado del año actual.',
                inputSchema: zodSchema(z.object({})),
                execute: async () => {
                    const year = new Date().getFullYear();
                    const { data: budget } = await supabase.from('budgets')
                        .select('name, total_income, total_expense, status')
                        .eq('year', year).eq('status', 'APPROVED').single();

                    if (!budget) return { message: 'No hay presupuesto aprobado para el año actual.' };

                    const [{ data: invoices }, { data: bills }] = await Promise.all([
                        supabase.from('documents').select('total').eq('doc_type', 'INVOICE')
                            .not('status', 'eq', 'VOIDED')
                            .gte('issue_date', `${year}-01-01`).lte('issue_date', `${year}-12-31`),
                        supabase.from('documents').select('total').eq('doc_type', 'VENDOR_BILL')
                            .gte('issue_date', `${year}-01-01`).lte('issue_date', `${year}-12-31`),
                    ]);

                    const actualIncome = (invoices ?? []).reduce((s, d) => s + Number(d.total), 0);
                    const actualExpense = (bills ?? []).reduce((s, d) => s + Number(d.total), 0);

                    return {
                        budgetName: budget.name,
                        budgetedIncome: budget.total_income,
                        budgetedExpense: budget.total_expense,
                        actualIncome,
                        actualExpense,
                        incomeExecPct: budget.total_income > 0 ? ((actualIncome / budget.total_income) * 100).toFixed(1) : '0',
                        expenseExecPct: budget.total_expense > 0 ? ((actualExpense / budget.total_expense) * 100).toFixed(1) : '0',
                    };
                },
            }),

            getInventoryAlert: tool({
                description: 'Consulta productos con stock bajo o agotado.',
                inputSchema: zodSchema(z.object({
                    threshold: z.number().optional(),
                })),
                execute: async ({ threshold = 10 }) => {
                    const { data } = await supabase.from('products')
                        .select('name, sku, stock_quantity, unit_cost')
                        .lte('stock_quantity', threshold)
                        .order('stock_quantity', { ascending: true })
                        .limit(20);
                    return { lowStockCount: data?.length ?? 0, products: data ?? [] };
                },
            }),

            getCashFlow: tool({
                description: 'Consulta flujo de caja: entradas y salidas de tesorería.',
                inputSchema: zodSchema(z.object({
                    days: z.number().optional(),
                })),
                execute: async ({ days = 30 }) => {
                    const since = new Date();
                    since.setDate(since.getDate() - days);
                    const sinceStr = since.toISOString().split('T')[0];

                    const { data: txs } = await supabase.from('treasury_transactions')
                        .select('amount, transaction_type, date, description')
                        .gte('date', sinceStr)
                        .order('date', { ascending: false });

                    const receipts = (txs ?? []).filter(t => t.transaction_type === 'RECEIPT').reduce((s, t) => s + Number(t.amount), 0);
                    const payments = (txs ?? []).filter(t => t.transaction_type === 'PAYMENT').reduce((s, t) => s + Number(t.amount), 0);

                    return {
                        periodDays: days,
                        totalReceipts: receipts,
                        totalPayments: payments,
                        netCashFlow: receipts - payments,
                        transactionCount: txs?.length ?? 0,
                    };
                },
            }),
        },
    });

    return result.toTextStreamResponse();
}
