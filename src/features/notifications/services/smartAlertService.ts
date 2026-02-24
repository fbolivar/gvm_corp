
import { SupabaseClient } from '@supabase/supabase-js';
import { analyticsService } from '../../analytics/services/analyticsService';
import { notificationService } from './notificationService';
import { AppNotification } from '../types';

export const smartAlertService = {
    /**
     * Evalúa las métricas de BI y dispara alertas proactivas si se detectan anomalías o riesgos.
     */
    async evaluateAndTriggerAlerts(client: SupabaseClient) {
        try {
            const summary = await analyticsService.getExecutiveSummary(client);

            // 1. Alerta de Supervivencia (Liquidez Crítica)
            const survivalDays = summary.liquidity_metrics?.survival_days || 0;
            if (survivalDays < 15) {
                await this.triggerCriticalAlert(client, {
                    title: 'Riesgo de Liquidez Detectado',
                    body: `Días de supervivencia proyectados: ${survivalDays} días. El nivel está por debajo del umbral de seguridad (15 días).`,
                    category: 'LIQUIDITY',
                    link: '/analytics/financial'
                });
            }

            // 2. Alerta de Logística (Pico de Órdenes Pendientes)
            const pendingDispatch = summary.logistics_metrics?.pending_dispatch || 0;
            if (pendingDispatch > 20) {
                await this.triggerHighPriorityAlert(client, {
                    title: 'Pico en Logística Detectado',
                    body: `Hay ${pendingDispatch} órdenes pendientes de despacho. Se recomienda reforzar la operación de salida.`,
                    category: 'LOGISTICS',
                    link: '/logistics/shipments'
                });
            }

            // 3. Alerta de Cartera (Pico de Deuda Vencida > 60 días)
            // Se puede agregar más lógica aquí
            const overdue90 = summary.ar_aging['90+'];
            if (overdue90 > 5000000) { // Ejemplo: 5M COP
                await this.triggerHighPriorityAlert(client, {
                    title: 'Cartera Crítica Detectada',
                    body: `Existen más de $${overdue90.toLocaleString('es-CO')} en cartera vencida de más de 90 días. Se recomienda ejecutar acciones de cobro.`,
                    category: 'BILLING',
                    link: '/portfolio/agent'
                });
            }

        } catch (error) {
            console.error("Error evaluating smart alerts:", error);
        }
    },

    async triggerCriticalAlert(client: SupabaseClient, data: { title: string, body: string, category: any, link: string }) {
        // Verificar si ya existe una alerta activa similar para evitar spam
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
            priority: 'CRITICAL',
            link: data.link
        });
    },

    async triggerHighPriorityAlert(client: SupabaseClient, data: { title: string, body: string, category: any, link: string }) {
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
            priority: 'HIGH',
            link: data.link
        });
    }
};
