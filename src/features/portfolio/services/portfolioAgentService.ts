import { SupabaseClient } from '@supabase/supabase-js';
import { CollectionAgentConfig, CollectionAction, DebtorProfile } from '../types';
import { collectionTemplates, CollectionTone } from '../templates/collectionTemplates';
import { notificationService } from '../../notifications/services/notificationService';
import { differenceInDays } from 'date-fns';

export const portfolioAgentService = {
    /**
     * Helper para obtener el tenant_id del usuario actual
     */
    async getTenantId(supabase: SupabaseClient) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: userTenant } = await supabase
            .from('user_tenants')
            .select('tenant_id')
            .eq('user_id', user.id)
            .maybeSingle();

        return userTenant?.tenant_id || null;
    },

    /**
     * Obtiene la configuración del agente para el tenant actual
     */
    async getConfig(client: SupabaseClient): Promise<CollectionAgentConfig | null> {
        const { data, error } = await client
            .from('collection_agent_config')
            .select('*')
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    /**
     * Actualiza o crea la configuración del agente
     */
    async saveConfig(client: SupabaseClient, config: Partial<CollectionAgentConfig>): Promise<CollectionAgentConfig> {
        const tenant_id = await this.getTenantId(client);
        if (!tenant_id) throw new Error("Acceso denegado: No se pudo determinar el tenant");

        const { data, error } = await client
            .from('collection_agent_config')
            .upsert({
                ...config,
                tenant_id,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Obtiene facturas vencidas que requieren atención del agente
     */
    async getOverdueInvoices(client: SupabaseClient) {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await client
            .from('documents')
            .select(`
                *,
                party:parties(
                    id, 
                    legal_name, 
                    email
                )
            `)
            .eq('doc_type', 'INVOICE')
            .eq('status', 'ACCEPTED')
            .lt('due_date', today)
            .order('due_date', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Motor del Agente: Procesa facturas y decide acciones
     */
    async runAgentInference(client: SupabaseClient, tenantId: string) {
        // ... (existing logic for manual/fallback run) ...
        return { processed: 0, actions: [] }; // Placeholder for refactoring if needed
    },

    /**
     * Dispara el ciclo de ejecución en la Edge Function (Recomendado)
     */
    async triggerRemoteCycle(client: SupabaseClient) {
        const { data, error } = await client.functions.invoke('portfolio-agent-cycle', {
            method: 'POST'
        });
        if (error) throw error;
        return data;
    },

    async determineNextAction(client: SupabaseClient, invoice: any, delayDays: number, config: CollectionAgentConfig) {
        // Obtener última acción
        const { data: lastActions } = await client
            .from('collection_actions')
            .select('*')
            .eq('document_id', invoice.id)
            .order('executed_at', { ascending: false })
            .limit(1);

        const lastAction = lastActions?.[0];

        // Regla: No molestar si ya se hizo algo recientemente (según frecuencia)
        if (lastAction) {
            const daysSinceLastAction = differenceInDays(new Date(), new Date(lastAction.executed_at));
            if (daysSinceLastAction < config.reminder_frequency_days) return null;
        }

        // Decidir qué sigue (Fase 1: Basado en días de retraso)
        if (!lastAction) return 'REMINDER_1';
        if (lastAction.action_type === 'REMINDER_1') return 'REMINDER_2';
        if (lastAction.action_type === 'REMINDER_2' && delayDays > 15) return 'FINAL_NOTICE';

        // Escalado Crítico: Si la última acción fue FINAL_NOTICE y han pasado más días de la frecuencia
        if (lastAction.action_type === 'FINAL_NOTICE') {
            const daysSinceFinal = differenceInDays(new Date(), new Date(lastAction.executed_at));
            if (daysSinceFinal >= config.reminder_frequency_days) return 'ESCALATE';
        }

        return null;
    },

    async dispatchAction(client: SupabaseClient, invoice: any, actionType: any, customTemplates?: any, tenantNameOnRun?: string) {
        const tenantName = tenantNameOnRun || "Nuestra Empresa";

        // Obtener configuración para saber el tono
        const { data: config } = await client
            .from('collection_agent_config')
            .select('tone')
            .maybeSingle();

        const tone = (config?.tone || 'PROFESSIONAL') as CollectionTone;
        const template = customTemplates?.[actionType] || collectionTemplates[tone]?.[actionType];
        if (!template) return null;

        const partyObject = Array.isArray(invoice.party) ? invoice.party[0] : invoice.party;
        if (!partyObject?.email) return { status: 'FAILED', reason: 'No email', number: invoice.number };

        // Variables dinámicas
        const debtor_name = partyObject?.legal_name || "Cliente";
        const invoice_number = invoice.number;
        const invoice_total = Number(invoice.total).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
        const due_date = invoice.due_date;
        const days_late = differenceInDays(new Date(), new Date(invoice.due_date)).toString();

        const replace = (str: string) => str
            .replace(/{name}/g, debtor_name)
            .replace(/{number}/g, invoice_number)
            .replace(/{total}/g, invoice_total)
            .replace(/{due_date}/g, due_date)
            .replace(/{company}/g, tenantName)
            .replace(/{days}/g, days_late);

        const subject = replace(template.subject);
        const body = replace(template.body);

        // --- ESCALADO CRÍTICO: Si la acción es ESCALATE, notificamos a un humano ---
        if (actionType === 'ESCALATE') {
            await notificationService.createInAppNotification(client, {
                tenant_id: invoice.tenant_id,
                title: "🚨 ESCALADO DE COBRO REQUERIDO",
                body: `El agente agotó los recursos con ${debtor_name}. Factura ${invoice_number} por ${invoice_total} sigue en mora. Se requiere intervención humana.`,
                category: 'PORTFOLIO',
                link: `/portfolio/debtors/${partyObject.id}`
            });

            await this.logAction(client, {
                tenant_id: invoice.tenant_id,
                document_id: invoice.id,
                action_type: 'ESCALATE',
                channel: 'SYSTEM',
                status: 'SENT',
                metadata: {
                    error: 'Human intervention required',
                    automated: true
                }
            });

            return { type: 'ESCALATE', recipient: 'ADMIN', number: invoice_number };
        }

        // 1. Log en DB
        const action = await this.logAction(client, {
            tenant_id: invoice.tenant_id,
            document_id: invoice.id,
            action_type: actionType,
            channel: 'EMAIL',
            status: 'PENDING',
            metadata: { subject, recipient: partyObject.email }
        });

        // 2. Enviar Real
        try {
            await notificationService.sendEmail({
                to: partyObject.email,
                subject,
                body
            });

            // 3. Update status
            await client
                .from('collection_actions')
                .update({ status: 'SENT' })
                .eq('id', action.id);

            return { id: action.id, type: actionType, recipient: partyObject.email };
        } catch (e) {
            await client
                .from('collection_actions')
                .update({ status: 'FAILED' })
                .eq('id', action.id);
            return { error: 'Failed' };
        }
    },

    /**
     * Obtiene las acciones recientes del agente para el dashboard
     */
    async getRecentActions(client: SupabaseClient, limit: number = 10): Promise<CollectionAction[]> {
        const { data, error } = await client
            .from('collection_actions')
            .select(`
                *,
                document:documents(number, total, party:parties(legal_name))
            `)
            .order('executed_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data as any[];
    },

    /**
     * Calcula métricas de impacto del agente
     */
    async getAgentMetrics(client: SupabaseClient) {
        // 1. Obtener todas las acciones enviadas
        const { data: actions, error: actionsError } = await client
            .from('collection_actions')
            .select(`
                action_type,
                document_id,
                executed_at,
                document:documents(id, total)
            `)
            .eq('status', 'SENT');

        if (actionsError) throw actionsError;

        // 2. Agrupar por documento para saber cuándo fue el primer contacto
        const managedDocsMap: Record<string, { total: number, firstAction: string }> = {};
        const actionCounts: Record<string, number> = {};

        actions.forEach((act: any) => {
            actionCounts[act.action_type] = (actionCounts[act.action_type] || 0) + 1;

            if (!managedDocsMap[act.document_id]) {
                managedDocsMap[act.document_id] = {
                    total: Number(act.document?.total || 0),
                    firstAction: act.executed_at
                };
            } else {
                // Mantener la fecha de la primera acción
                if (new Date(act.executed_at) < new Date(managedDocsMap[act.document_id].firstAction)) {
                    managedDocsMap[act.document_id].firstAction = act.executed_at;
                }
            }
        });

        const managedDocIds = Object.keys(managedDocsMap);
        const totalManagedAmount = Object.values(managedDocsMap).reduce((acc, curr) => acc + curr.total, 0);

        if (managedDocIds.length === 0) {
            return {
                totalActions: 0,
                totalManagedAmount: 0,
                totalRecoveredAmount: 0,
                actionBreakdown: {},
                recoveryRate: 0
            };
        }

        // 3. Obtener pagos aplicados a estos documentos después de la primera acción
        const { data: payments, error: paymentsError } = await client
            .from('payment_allocations')
            .select('amount, document_id, created_at')
            .in('document_id', managedDocIds);

        if (paymentsError) throw paymentsError;

        const totalRecoveredAmount = payments.reduce((acc, pay) => {
            const docInfo = managedDocsMap[pay.document_id];
            // Solo sumamos el pago si ocurrió DESPUÉS de que el agente empezara a gestionar
            if (new Date(pay.created_at) >= new Date(docInfo.firstAction)) {
                return acc + Number(pay.amount);
            }
            return acc;
        }, 0);

        const recoveryRate = totalManagedAmount > 0
            ? Math.round((totalRecoveredAmount / totalManagedAmount) * 100 * 10) / 10
            : 0;

        // 4. Obtener perfiles de deudores para riesgos
        const { data: profiles } = await client
            .from('debtor_profiles')
            .select('risk_level, average_payment_days, party:parties(id, documents(total, status, doc_type))')
            .eq('excluded', false);

        const riskBreakdown = {
            CRITICAL: { count: 0, amount: 0, color: 'rose', preLegalCount: 0, preLegalAmount: 0 },
            HIGH: { count: 0, amount: 0, color: 'amber', preLegalCount: 0, preLegalAmount: 0 },
            MEDIUM: { count: 0, amount: 0, color: 'blue', preLegalCount: 0, preLegalAmount: 0 },
            LOW: { count: 0, amount: 0, color: 'emerald', preLegalCount: 0, preLegalAmount: 0 }
        };

        const { data: config } = await client.from('collection_agent_config').select('auto_escalate_days').maybeSingle();
        const autoEscalateDays = config?.auto_escalate_days || 90;

        profiles?.forEach((prof: any) => {
            const level = (prof.risk_level || 'LOW') as keyof typeof riskBreakdown;
            if (riskBreakdown[level]) {
                riskBreakdown[level].count++;
                // Sumar facturas pendientes del partido
                const pendingAmount = prof.party?.documents?.reduce((acc: number, doc: any) => {
                    if (doc.doc_type === 'INVOICE' && doc.status === 'ACCEPTED') {
                        return acc + Number(doc.total);
                    }
                    return acc;
                }, 0) || 0;
                riskBreakdown[level].amount += pendingAmount;

                // AI Forecasting: Pre-Legal Risk Calculation
                if (prof.average_payment_days && prof.average_payment_days >= autoEscalateDays) {
                    riskBreakdown[level].preLegalCount++;
                    riskBreakdown[level].preLegalAmount += pendingAmount;
                }
            }
        });

        const riskStats = Object.entries(riskBreakdown).map(([category, stats]) => ({
            category,
            ...stats
        }));

        // Calcular Promedio Global de Pago
        let totalAvgDays = 0;
        let countWithAvg = 0;
        profiles?.forEach((p: any) => {
            if (p.average_payment_days !== null && p.average_payment_days !== undefined) {
                totalAvgDays += p.average_payment_days;
                countWithAvg++;
            }
        });
        const globalAvgPaymentDays = countWithAvg > 0 ? Math.round(totalAvgDays / countWithAvg) : 0;

        return {
            totalActions: actions.length,
            totalManagedAmount,
            totalRecoveredAmount,
            actionBreakdown: actionCounts,
            recoveryRate,
            riskStats,
            avgPaymentDays: globalAvgPaymentDays
        };
    },

    /**
     * Envía un correo de prueba con datos mockeados
     */
    async sendTestEmail(client: SupabaseClient, templateId: string, customTemplates: any) {
        // 1. Obtener nombre del tenant
        const { data: tid } = await client.rpc('get_current_tenant_id');
        const { data: tenant } = await client.from('tenants').select('name, email').eq('id', tid).single();
        const { data: user } = await client.auth.getUser();

        const recipient = user?.user?.email || tenant?.email || "test@example.com";
        const tenantName = tenant?.name || "Nuestra Empresa";

        // 2. Mock Invoice Data
        const mockInvoice = {
            number: "FAC-TEST-001",
            total: 2500000,
            due_date: "2025-12-31",
            tenant_id: tid
        };

        const mockParty = {
            legal_name: user?.user?.user_metadata?.full_name || "Usuario de Prueba",
            email: recipient
        };

        // 3. Dispatch action (sin logear en DB, solo envío)
        const { data: config } = await client
            .from('collection_agent_config')
            .select('tone')
            .maybeSingle();

        const tone = (config?.tone || 'PROFESSIONAL') as CollectionTone;
        const template = customTemplates?.[templateId] || collectionTemplates[tone]?.[templateId];

        if (!template) throw new Error("Plantilla no encontrada");

        // Lógica de reemplazo local
        const replace = (str: string) => str
            .replace(/{name}/g, mockParty.legal_name)
            .replace(/{number}/g, mockInvoice.number)
            .replace(/{total}/g, mockInvoice.total.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }))
            .replace(/{due_date}/g, mockInvoice.due_date)
            .replace(/{company}/g, tenantName)
            .replace(/{days}/g, "15");

        const subject = replace(template.subject);
        const body = replace(template.body);

        return await notificationService.sendEmail({
            to: recipient,
            subject: `[PRUEBA] ${subject}`,
            body
        });
    },

    /**
     * Calcula el promedio de días de pago de un deudor
     */
    async calculateAveragePaymentDays(client: SupabaseClient, partyId: string): Promise<number | null> {
        const { data: invoices, error } = await client
            .from('documents')
            .select(`
                id, 
                due_date, 
                allocations:payment_allocations(amount, created_at)
            `)
            .eq('party_id', partyId)
            .eq('doc_type', 'INVOICE')
            .eq('status', 'ACCEPTED');

        if (error || !invoices) return null;

        let totalDays = 0;
        let paidCount = 0;

        invoices.forEach((inv: any) => {
            const totalPaid = inv.allocations?.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0) || 0;
            // Solo contamos facturas pagadas (o casi pagadas)
            if (totalPaid > 0) {
                const dueDate = new Date(inv.due_date);
                // Si hay múltiples pagos, tomamos el último
                const lastPayment = inv.allocations.sort((a: any, b: any) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0];

                const paymentDate = new Date(lastPayment.created_at);
                const diffTime = paymentDate.getTime() - dueDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                totalDays += diffDays;
                paidCount++;
            }
        });

        return paidCount > 0 ? Math.round(totalDays / paidCount) : null;
    },

    /**
     * Registra una acción tomada por el agente
     */
    async logAction(client: SupabaseClient, action: Omit<CollectionAction, 'id' | 'executed_at'>): Promise<CollectionAction> {
        const { data, error } = await client
            .from('collection_actions')
            .insert(action)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
