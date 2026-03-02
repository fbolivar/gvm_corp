
import { SupabaseClient } from '@supabase/supabase-js';
import { analyticsService } from '../../analytics/services/analyticsService';
import { notificationService } from './notificationService';

interface AlertData {
    title: string;
    body: string;
    category: string;
    link: string;
}

export const smartAlertService = {
    /**
     * Evalúa las métricas de BI y dispara alertas proactivas si se detectan anomalías o riesgos.
     */
    async evaluateAndTriggerAlerts(client: SupabaseClient) {
        // Run all evaluations in parallel for performance
        await Promise.allSettled([
            this.checkLiquidityAlert(client),
            this.checkLogisticsAlert(client),
            this.checkArAgingAlert(client),
            this.checkCriticalStockAlert(client),
            this.checkOverdueInvoicesAlert(client),
            this.checkUpcomingPaymentsAlert(client),
        ]);
    },

    // ─── Liquidity ────────────────────────────────────────────────────────────

    async checkLiquidityAlert(client: SupabaseClient) {
        try {
            const summary = await analyticsService.getExecutiveSummary(client);
            const survivalDays = summary.liquidity_metrics?.survival_days || 0;
            if (survivalDays > 0 && survivalDays < 15) {
                await this.triggerAlert(client, {
                    title: 'Riesgo de Liquidez Detectado',
                    body: `Días de supervivencia proyectados: ${survivalDays} días. El nivel está por debajo del umbral de seguridad (15 días).`,
                    category: 'LIQUIDITY',
                    link: '/analytics/financial'
                }, 'CRITICAL');
            }
        } catch (e) {
            console.error('[smartAlerts] liquidity:', e);
        }
    },

    // ─── Logistics ────────────────────────────────────────────────────────────

    async checkLogisticsAlert(client: SupabaseClient) {
        try {
            const summary = await analyticsService.getExecutiveSummary(client);
            const pendingDispatch = summary.logistics_metrics?.pending_dispatch || 0;
            if (pendingDispatch > 20) {
                await this.triggerAlert(client, {
                    title: 'Pico en Logística Detectado',
                    body: `Hay ${pendingDispatch} órdenes pendientes de despacho. Se recomienda reforzar la operación de salida.`,
                    category: 'LOGISTICS',
                    link: '/logistics/shipments'
                }, 'HIGH');
            }
        } catch (e) {
            console.error('[smartAlerts] logistics:', e);
        }
    },

    // ─── AR Aging ─────────────────────────────────────────────────────────────

    async checkArAgingAlert(client: SupabaseClient) {
        try {
            const summary = await analyticsService.getExecutiveSummary(client);
            const overdue90 = summary.ar_aging['90+'];
            if (overdue90 > 5_000_000) {
                await this.triggerAlert(client, {
                    title: 'Cartera Crítica Detectada',
                    body: `Existen más de $${overdue90.toLocaleString('es-CO')} COP en cartera vencida de más de 90 días. Se recomienda ejecutar acciones de cobro.`,
                    category: 'BILLING',
                    link: '/portfolio/agent'
                }, 'HIGH');
            }
        } catch (e) {
            console.error('[smartAlerts] ar_aging:', e);
        }
    },

    // ─── Critical Stock ───────────────────────────────────────────────────────

    async checkCriticalStockAlert(client: SupabaseClient) {
        try {
            // Products where current stock ≤ min_stock
            const { data: lowStockProducts } = await client
                .from('products')
                .select('id, name, sku, min_stock')
                .eq('status', 'ACTIVE')
                .not('min_stock', 'is', null)
                .gt('min_stock', 0);

            if (!lowStockProducts || lowStockProducts.length === 0) return;

            // Get stock totals
            const { data: stockRows } = await client
                .from('product_stock')
                .select('product_id, qty');

            const stockMap = new Map<string, number>();
            stockRows?.forEach(row => {
                const prev = stockMap.get(row.product_id) ?? 0;
                stockMap.set(row.product_id, prev + Number(row.qty));
            });

            const critical = lowStockProducts.filter(p => {
                const current = stockMap.get(p.id) ?? 0;
                return current <= p.min_stock;
            });

            if (critical.length === 0) return;

            const count = critical.length;
            const sample = critical.slice(0, 3).map(p => p.sku).join(', ');
            const suffix = count > 3 ? ` y ${count - 3} más` : '';

            await this.triggerAlert(client, {
                title: `Stock Crítico: ${count} Producto${count > 1 ? 's' : ''}`,
                body: `Los siguientes productos están por debajo del stock mínimo: ${sample}${suffix}. Revisa y reabastece.`,
                category: 'INVENTORY',
                link: '/inventory'
            }, 'HIGH');
        } catch (e) {
            console.error('[smartAlerts] critical_stock:', e);
        }
    },

    // ─── Overdue Invoices ─────────────────────────────────────────────────────

    async checkOverdueInvoicesAlert(client: SupabaseClient) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data: overdue } = await client
                .from('documents')
                .select('id, number, total, due_date')
                .eq('doc_type', 'INVOICE')
                .in('status', ['ACCEPTED', 'SIGNED'])
                .lt('due_date', today);

            if (!overdue || overdue.length === 0) return;

            const totalOverdue = overdue.reduce((sum, d) => sum + Number(d.total), 0);
            const count = overdue.length;

            await this.triggerAlert(client, {
                title: `${count} Factura${count > 1 ? 's' : ''} Vencida${count > 1 ? 's' : ''}`,
                body: `Tienes ${count} factura${count > 1 ? 's' : ''} por cobrar con fecha de vencimiento pasada. Total: $${totalOverdue.toLocaleString('es-CO')} COP.`,
                category: 'BILLING',
                link: '/documents'
            }, 'HIGH');
        } catch (e) {
            console.error('[smartAlerts] overdue_invoices:', e);
        }
    },

    // ─── Upcoming Payments ────────────────────────────────────────────────────

    async checkUpcomingPaymentsAlert(client: SupabaseClient) {
        try {
            const today = new Date();
            const in7Days = new Date(today);
            in7Days.setDate(today.getDate() + 7);

            const todayStr = today.toISOString().split('T')[0];
            const in7DaysStr = in7Days.toISOString().split('T')[0];

            const { data: upcoming } = await client
                .from('documents')
                .select('id, number, total, due_date')
                .eq('doc_type', 'VENDOR_BILL')
                .in('status', ['ACCEPTED', 'SIGNED'])
                .gte('due_date', todayStr)
                .lte('due_date', in7DaysStr);

            if (!upcoming || upcoming.length === 0) return;

            const totalDue = upcoming.reduce((sum, d) => sum + Number(d.total), 0);
            const count = upcoming.length;

            await this.triggerAlert(client, {
                title: `${count} Pago${count > 1 ? 's' : ''} por Vencer esta Semana`,
                body: `Tienes ${count} factura${count > 1 ? 's' : ''} de proveedor por pagar en los próximos 7 días. Total: $${totalDue.toLocaleString('es-CO')} COP.`,
                category: 'BILLING',
                link: '/documents'
            }, 'MEDIUM');
        } catch (e) {
            console.error('[smartAlerts] upcoming_payments:', e);
        }
    },

    // ─── Shared helpers ───────────────────────────────────────────────────────

    async triggerAlert(
        client: SupabaseClient,
        data: AlertData,
        priority: 'CRITICAL' | 'HIGH' | 'MEDIUM'
    ) {
        // Deduplicate: skip if there's already an unread alert with the same title
        const { data: existing } = await client
            .from('app_notifications')
            .select('id')
            .eq('title', data.title)
            .eq('is_read', false)
            .limit(1);

        if (existing && existing.length > 0) return;

        await notificationService.createInAppNotification(client, {
            title: data.title,
            body: data.body,
            category: data.category,
            priority,
            link: data.link,
        });
    },

    // Legacy helpers kept for backward compatibility
    async triggerCriticalAlert(client: SupabaseClient, data: AlertData) {
        return this.triggerAlert(client, data, 'CRITICAL');
    },

    async triggerHighPriorityAlert(client: SupabaseClient, data: AlertData) {
        return this.triggerAlert(client, data, 'HIGH');
    },
};
