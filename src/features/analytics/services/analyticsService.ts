
import { SupabaseClient } from '@supabase/supabase-js';
import { ProductProfitability, CashFlowPoint, ExecutiveSummary, AgingBuckets } from '../types';
import { addDays, format, differenceInDays, startOfDay, subDays } from 'date-fns';
import { portfolioAgentService } from '../../portfolio/services/portfolioAgentService';

export const analyticsService = {
    /**
     * Calcula la rentabilidad por producto
     * Cruza Ventas (document_lines) con Costo (products.cost o inventory_movements)
     */
    async getProductProfitability(client: SupabaseClient): Promise<ProductProfitability[]> {
        // Obtenemos todas las líneas de facturas de venta
        const { data: salesData, error: salesError } = await client
            .from('document_lines')
            .select(`
                product_id,
                qty,
                line_total,
                products!inner (name, sku, cost),
                documents!inner (doc_type, status)
            `)
            .eq('documents.doc_type', 'INVOICE')
            .eq('documents.status', 'ACCEPTED');

        if (salesError) throw salesError;

        const summary = new Map<string, ProductProfitability>();

        salesData?.forEach((line: any) => {
            const p = line.products;
            const existing = summary.get(line.product_id) || {
                product_id: line.product_id,
                product_name: p.name,
                sku: p.sku,
                revenue: 0,
                cost: 0,
                profit: 0,
                margin: 0,
                units_sold: 0
            };

            existing.revenue += Number(line.line_total);
            existing.units_sold += Number(line.qty);
            existing.cost += Number(line.qty) * Number(p.cost || 0);

            summary.set(line.product_id, existing);
        });

        return Array.from(summary.values()).map(item => ({
            ...item,
            profit: item.revenue - item.cost,
            margin: item.revenue > 0 ? ((item.revenue - item.cost) / item.revenue) * 100 : 0
        })).sort((a, b) => b.profit - a.profit);
    },

    /**
     * Proyección de Flujo de Caja
     * Basado en vencimientos de facturas (AR/AP)
     */
    async getCashFlowProjection(client: SupabaseClient, days: number = 30): Promise<CashFlowPoint[]> {
        const today = startOfDay(new Date());
        const endDate = addDays(today, days);

        // 1. Obtener saldo actual en tesorería
        const { data: accounts } = await client
            .from('treasury_accounts')
            .select('balance');

        let currentBalance = accounts?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;

        // 2. Obtener documentos pendientes (AR y AP)
        // Nota: Si due_date no existe (Error 42703), usamos issue_date como fallback en la lógica local
        // pero evitamos el filtro directo en SQL si no estamos seguros.
        // Para este parche, seleccionamos sin filtrar por due_date en SQL si dudamos,
        // o seleccionamos issue_date.
        let query = client
            .from('documents')
            .select('balance, total, doc_type, status, issue_date, due_date')
            .in('doc_type', ['INVOICE', 'VENDOR_BILL'])
            .in('status', ['ACCEPTED', 'SIGNED']);

        const { data: docs, error: docsError } = await query;

        if (docsError) {
            console.error("Cash flow docs error:", docsError.message);
            return [];
        }

        const dailyDelta = new Map<string, { inflow: number; outflow: number }>();

        docs?.forEach(doc => {
            const rawDueDate = (doc as any).due_date || (doc as any).issue_date;
            if (!rawDueDate) return;

            const dateStr = typeof rawDueDate === 'string' ? rawDueDate.split('T')[0] : format(new Date(rawDueDate), 'yyyy-MM-dd');

            const delta = dailyDelta.get(dateStr) || { inflow: 0, outflow: 0 };

            if (doc.doc_type === 'INVOICE') {
                delta.inflow += Number(doc.total);
            } else if (doc.doc_type === 'VENDOR_BILL') {
                delta.outflow += Number(doc.total);
            }
            dailyDelta.set(dateStr, delta);
        });

        const projection: CashFlowPoint[] = [];
        let runningBalance = currentBalance;

        for (let i = 0; i <= days; i++) {
            const d = addDays(today, i);
            const dStr = format(d, 'yyyy-MM-dd');
            const delta = dailyDelta.get(dStr) || { inflow: 0, outflow: 0 };

            runningBalance += (delta.inflow - delta.outflow);

            projection.push({
                date: dStr,
                inflow: delta.inflow,
                outflow: delta.outflow,
                net: delta.inflow - delta.outflow,
                balance: runningBalance
            });
        }

        return projection;
    },

    /**
     * Resumen Ejecutivo General
     */
    async getExecutiveSummary(client: SupabaseClient): Promise<ExecutiveSummary> {
        const today = new Date();

        const { data: docs } = await client
            .from('documents')
            .select('id, number, doc_type, status, total, issue_date, due_date, party_id, tenant_id') // Avoid select(*) which fails on missing columns
            .in('doc_type', ['INVOICE', 'VENDOR_BILL', 'PAYROLL'])
            .in('status', ['ACCEPTED', 'SIGNED']);

        const summary: ExecutiveSummary = {
            total_ar: 0,
            total_ap: 0,
            net_cash_flow: 0,
            ar_aging: { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
            ap_aging: { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
            top_profitable_products: []
        };

        docs?.forEach(doc => {
            const amount = Number(doc.total);
            const rawDueDate = (doc as any).due_date || (doc as any).issue_date;
            const dueDate = new Date(rawDueDate);
            const diff = differenceInDays(today, dueDate);
            const aging = summary[doc.doc_type === 'INVOICE' ? 'ar_aging' : 'ap_aging'];

            if (doc.doc_type === 'INVOICE') summary.total_ar += amount;
            else if (doc.doc_type === 'VENDOR_BILL') summary.total_ap += amount;

            if (diff <= 0) aging.current += amount;
            else if (diff <= 30) aging["1-30"] += amount;
            else if (diff <= 60) aging["31-60"] += amount;
            else if (diff <= 90) aging["61-90"] += amount;
            else aging["90+"] += amount;
        });

        summary.net_cash_flow = summary.total_ar - summary.total_ap;
        try {
            summary.top_profitable_products = (await this.getProductProfitability(client)).slice(0, 5);
        } catch (e) {
            console.error("Error loading product profitability:", e);
            summary.top_profitable_products = [];
        }

        // Integrar métricas del Agente AI
        try {
            const [agentCfg, agentMet] = await Promise.all([
                portfolioAgentService.getConfig(client),
                portfolioAgentService.getAgentMetrics(client)
            ]);

            summary.agent_metrics = {
                totalActions: agentMet.totalActions,
                totalRecoveredAmount: agentMet.totalRecoveredAmount,
                recoveryRate: agentMet.recoveryRate,
                isActive: !!agentCfg?.is_active
            };
        } catch (e) {
            console.error("Error integrating Agent metrics in BI:", e);
        }

        // 3. Integrar Métricas de Liquidez y Supervivencia
        try {
            const [accRes, transRes, payrollRes] = await Promise.all([
                client.from('treasury_accounts').select('balance'),
                client.from('treasury_transactions')
                    .select('amount')
                    .eq('transaction_type', 'PAYMENT')
                    .gte('date', format(subDays(today, 30), 'yyyy-MM-dd')),
                client.from('documents')
                    .select('total')
                    .eq('doc_type', 'PAYROLL')
                    .in('status', ['ACCEPTED', 'SIGNED'])
            ]);

            const immediate_liquidity = accRes.data?.reduce((sum, acc) => sum + Number(acc.balance), 0) || 0;
            const pending_payroll = payrollRes.data?.reduce((sum, doc) => sum + Number(doc.total), 0) || 0;
            const short_term_liabilities = summary.total_ap + pending_payroll;

            // Calculamos Burn Rate (promedio diario de egresos últimos 30 días)
            const thirtyDayOutflow = transRes.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
            const burn_rate = thirtyDayOutflow / 30 || 1; // Evitar división por cero

            summary.liquidity_metrics = {
                immediate_liquidity,
                short_term_liabilities,
                pending_payroll,
                burn_rate,
                survival_days: Math.floor(immediate_liquidity / burn_rate)
            };
        } catch (e) {
            console.error("Error integrating Liquidity metrics in BI:", e);
        }

        // 4. Integrar Métricas de Logística (Última Milla)
        try {
            const { data: shipments } = await client
                .from('logistics_shipments')
                .select('status, shipped_at, delivered_at');

            if (shipments) {
                const pending = shipments.filter(s => ['PENDING', 'PACKED'].includes(s.status)).length;
                const transit = shipments.filter(s => s.status === 'SHIPPED').length;
                const deliveredToday = shipments.filter(s =>
                    s.status === 'DELIVERED' &&
                    s.delivered_at &&
                    startOfDay(new Date(s.delivered_at)).getTime() === startOfDay(today).getTime()
                ).length;

                // Calcular promedio de días de entrega
                const deliveredItems = shipments.filter(s => s.status === 'DELIVERED' && s.shipped_at && s.delivered_at);
                const totalDays = deliveredItems.reduce((sum, s) => {
                    return sum + differenceInDays(new Date(s.delivered_at), new Date(s.shipped_at));
                }, 0);
                const avgDays = deliveredItems.length > 0 ? totalDays / deliveredItems.length : 0;

                summary.logistics_metrics = {
                    pending_dispatch: pending,
                    in_transit: transit,
                    delivered_today: deliveredToday,
                    avg_delivery_days: Number(avgDays.toFixed(1))
                };
            }
        } catch (e) {
            console.error("Error integrating Logistics metrics in BI:", e);
        }

        return summary;
    }
};
