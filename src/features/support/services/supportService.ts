import { SupabaseClient } from '@supabase/supabase-js';
import { Ticket, TicketInteraction, TicketAuditLog } from '../types';

export const supportService = {
    async getTickets(client: SupabaseClient) {
        const { data, error } = await client
            .from('support_tickets')
            .select(`
                *,
                party:parties(legal_name, doc_number),
                assigned_user:profiles(full_name)
            `)
            .order('created_at', { ascending: false });

        if (error) { console.error('[support] getTickets:', error.message); return []; }
        return data;
    },

    async getTicketById(client: SupabaseClient, id: string) {
        const { data, error } = await client
            .from('support_tickets')
            .select(`
                *,
                party:parties(*),
                assigned_user:profiles(full_name),
                interactions:support_interactions(*, author:profiles(full_name, avatar_url)),
                audit_logs:support_audit_log(*, actor:profiles(full_name)),
                document:documents(number, total, status, issue_date, subtotal, taxes, currency),
                product:products(name, sku)
            `)
            .eq('id', id)
            .single();

        if (error) { console.error('[support] getTicketById:', error.message); return null; }
        return data;
    },

    async createTicket(client: SupabaseClient, ticket: Partial<Ticket>) {
        const { data: { user } } = await client.auth.getUser();
        if (!user) throw new Error("No autenticado");

        // Obtenemos el ID del tenant del usuario
        const { data: userTenant } = await client
            .from('user_tenants')
            .select('tenant_id')
            .eq('user_id', user.id)
            .single();

        if (!userTenant) throw new Error("Usuario sin tenant asociado");

        // El número es secuencial por tenant, generado por un trigger de BD
        // (set_support_ticket_number). No lo generamos aquí para evitar colisiones.
        const { number: _ignored, ...rest } = ticket as Partial<Ticket>;

        const { data, error } = await client
            .from('support_tickets')
            .insert({
                ...rest,
                tenant_id: userTenant.tenant_id,
                status: ticket.status || 'OPEN'
            })
            .select()
            .single();

        if (error) throw error;

        // Registrar en Auditoría
        await this.logAction(client, data.id, 'CREATE', null, data);

        return data;
    },

    async addInteraction(client: SupabaseClient, interaction: Partial<TicketInteraction>) {
        const { data: { user } } = await client.auth.getUser();
        if (!user) throw new Error("No autenticado");

        const { data, error } = await client
            .from('support_interactions')
            .insert({
                ...interaction,
                author_id: user.id
            })
            .select(`
                *,
                author:profiles(full_name, avatar_url),
                ticket:support_tickets(number, subject, tenant_id)
            `)
            .single();

        if (error) throw error;

        // Procesar menciones @ — nunca debe romper el envío del mensaje
        try {
            await this.parseAndNotifyMentions(client, data, (data as any).ticket);
        } catch (e) {
            console.error('[support] parseAndNotifyMentions:', e);
        }

        return data;
    },

    /**
     * PROCESADOR DE MENCIONES @
     * Busca menciones de usuarios o roles y crea notificaciones.
     */
    async parseAndNotifyMentions(client: SupabaseClient, interaction: TicketInteraction, ticketInfo: any) {
        if (!ticketInfo) return;
        const tenantId = ticketInfo.tenant_id as string | undefined;
        const content = interaction.content || '';
        const matches = [...content.matchAll(/@(\w+)/g)];
        if (matches.length === 0) return;

        const notified = new Set<string>();
        for (const match of matches) {
            const tag = match[1];
            // Buscar usuarios por nombre (mención individual)
            const { data: profiles } = await client
                .from('profiles')
                .select('id')
                .ilike('full_name', `%${tag}%`)
                .limit(5);

            for (const p of profiles || []) {
                if (p.id === interaction.author_id || notified.has(p.id)) continue;
                notified.add(p.id);
                await this.createNotification(client, p.id, tenantId, {
                    title: `Mención en el ticket ${ticketInfo.number}`,
                    body: `Te mencionaron: ${content.substring(0, 60)}${content.length > 60 ? '…' : ''}`,
                    link: `/support/tickets/${interaction.ticket_id}`
                });
            }
        }
    },

    async createNotification(
        client: SupabaseClient,
        userId: string,
        tenantId: string | undefined,
        data: { title: string; body: string; link: string }
    ) {
        // app_notifications tiene RLS con with_check tenant_id = get_my_tenant_id():
        // el tenant_id es OBLIGATORIO o el insert falla silenciosamente por RLS.
        const { error } = await client.from('app_notifications').insert({
            user_id: userId,
            tenant_id: tenantId ?? null,
            category: 'GENERAL',
            priority: 'MEDIUM',
            ...data
        });
        if (error) console.error('[support] createNotification:', error.message);
    },

    async updateTicketStatus(client: SupabaseClient, id: string, status: string, prevState: any) {
        const { data, error } = await client
            .from('support_tickets')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        await this.logAction(client, id, 'UPDATE_STATUS', { status: prevState?.status ?? null }, { status });
        return data;
    },

    async assignTicket(client: SupabaseClient, id: string, assignedTo: string | null, prevAssignedTo: string | null) {
        const { data, error } = await client
            .from('support_tickets')
            .update({ assigned_to: assignedTo, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        await this.logAction(client, id, 'ASSIGN', { assigned_to: prevAssignedTo ?? null }, { assigned_to: assignedTo });
        return data;
    },

    async logAction(client: SupabaseClient, ticketId: string, action: string, prevState: any, newState: any) {
        const { data: { user } } = await client.auth.getUser();
        if (!user) return;

        await client.from('support_audit_log').insert({
            ticket_id: ticketId,
            actor_id: user.id,
            action,
            prev_state: prevState,
            new_state: newState
        });
    },

    /**
     * VISTA 360 DEL CLIENTE
     * Obtiene métricas clave del cliente para el panel de soporte
     */
    async getCustomer360(client: SupabaseClient, partyId: string) {
        // 1. Obtener LTV (Total facturado aceptado)
        const { data: invoices } = await client
            .from('documents')
            .select('total, status')
            .eq('party_id', partyId)
            .eq('doc_type', 'INVOICE');

        const ltv = invoices?.filter(i => i.status === 'ACCEPTED').reduce((acc, curr) => acc + Number(curr.total), 0) || 0;

        // 2. Facturas pendientes (DRAFT o SENT que no estén aceptadas ni anuladas)
        // En este modelo simplificado, sumaremos lo que no sea ACCEPTED ni VOIDED
        const pendingValue = invoices?.filter(i => i.status !== 'ACCEPTED' && i.status !== 'VOIDED').reduce((acc, curr) => acc + Number(curr.total), 0) || 0;

        // 3. Nivel VIP (ej: LTV > $5.000.000 COP)
        const isVIP = ltv > 5000000;

        return {
            ltv,
            pendingValue,
            isVIP,
            invoiceCount: invoices?.length || 0
        };
    },

    /**
     * AUTOMATIZACIÓN RMA
     * Crea un movimiento de inventario de entrada basado en un ticket
     */
    async generateRMA(client: SupabaseClient, ticketId: string) {
        const ticket = await this.getTicketById(client, ticketId);
        if (!ticket.ref_product_id) throw new Error("El ticket no tiene un producto vinculado");

        const { inventoryService } = await import('@/features/inventory/services/inventoryService');
        const warehouses = await inventoryService.getWarehouses(client);
        const defaultWarehouseId = warehouses.length > 0 ? warehouses[0].id : null;

        if (!defaultWarehouseId) throw new Error("No se encontró un almacén para recibir el RMA");

        const movement = await inventoryService.createMovement(client, {
            warehouse_id: defaultWarehouseId,
            product_id: ticket.ref_product_id,
            type: 'IN',
            qty: 1, // Por defecto 1 para RMA, ajustable
            cost: 0, // Costo 0 para devoluciones usualmente
            ref_doc_type: 'SUPPORT_TICKET',
            ref_doc_id: ticket.id,
            occurred_at: new Date().toISOString()
        });

        await this.logAction(client, ticketId, 'GENERATE_RMA', null, { movement_id: movement.id });

        return movement;
    },

    /**
     * AUTOMATIZACIÓN NOTA DE CRÉDITO
     * Crea un borrador de Nota de Crédito vinculada a la factura del ticket
     */
    async generateCreditNoteDraft(client: SupabaseClient, ticketId: string) {
        const ticket = await this.getTicketById(client, ticketId);
        if (!ticket.ref_doc_id) throw new Error("El ticket no tiene una factura vinculada");

        const { documentService } = await import('@/features/documents/services/documentService');

        // Creamos un borrador basado en la factura original
        const draft = await documentService.createDocument(client, {
            doc_type: 'CREDIT_NOTE',
            status: 'DRAFT',
            party_id: ticket.party_id,
            parent_id: ticket.ref_doc_id,
            number: `CN-DRAFT-${ticket.number}`,
            issue_date: new Date().toISOString(),
            subtotal: ticket.document?.subtotal || 0,
            taxes: ticket.document?.taxes || 0,
            total: ticket.document?.total || 0,
            currency: ticket.document?.currency || 'COP',
            tenant_id: ticket.tenant_id,
            lines: []
        });

        await this.logAction(client, ticketId, 'GENERATE_CREDIT_NOTE', null, { document_id: draft.id });

        return draft;
    }
};
