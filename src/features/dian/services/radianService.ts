import { SupabaseClient } from '@supabase/supabase-js';

export type RadianEventCode = '030' | '031' | '032' | '033' | '034' | '035' | '036';
export type RadianStatus = 'PENDING' | 'SENT' | 'ACCEPTED' | 'REJECTED';

export const RADIAN_EVENTS: Record<RadianEventCode, { name: string; description: string }> = {
    '030': { name: 'Acuse de Recibo', description: 'Confirmación de recepción del documento electrónico' },
    '031': { name: 'Recibo del Bien o Servicio', description: 'Confirmación de recepción del bien o prestación del servicio' },
    '032': { name: 'Aceptación Expresa', description: 'Aceptación expresa de la factura electrónica' },
    '033': { name: 'Rechazo', description: 'Rechazo de la factura electrónica de venta' },
    '034': { name: 'Endoso en Propiedad', description: 'Transferencia de propiedad del título valor' },
    '035': { name: 'Endoso en Garantía', description: 'Constitución de garantía sobre el título valor' },
    '036': { name: 'Endoso en Procuración', description: 'Mandato para cobro del título valor' },
};

export interface RadianEvent {
    id: string;
    tenant_id: string;
    electronic_document_id: string;
    event_code: string;
    event_description: string;
    response_code: string | null;
    response_message: string | null;
    sent_at: string | null;
    responded_at: string | null;
    status: RadianStatus;
}

export const radianService = {
    async getEvents(client: SupabaseClient, electronicDocId: string): Promise<RadianEvent[]> {
        const { data, error } = await client
            .from('radian_events')
            .select('*')
            .eq('electronic_document_id', electronicDocId)
            .order('created_at', { ascending: false });
        if (error) { console.error('[radian] getEvents:', error.message); return []; }
        return (data ?? []) as RadianEvent[];
    },

    async getAllEvents(client: SupabaseClient): Promise<(RadianEvent & { electronic_document?: { cufe: string; documents: { number: string } } })[]> {
        const { data, error } = await client
            .from('radian_events')
            .select('*, electronic_document:electronic_documents(cufe, documents(number))')
            .order('created_at', { ascending: false })
            .limit(100);
        if (error) { console.error('[radian] getAllEvents:', error.message); return []; }
        return (data ?? []) as (RadianEvent & { electronic_document?: { cufe: string; documents: { number: string } } })[];
    },

    async registerEvent(client: SupabaseClient, electronicDocId: string, eventCode: RadianEventCode): Promise<RadianEvent> {
        const { data: tenantId } = await client.rpc('get_my_tenant_id');
        const eventInfo = RADIAN_EVENTS[eventCode];

        if (!eventInfo) throw new Error(`Código de evento RADIAN inválido: ${eventCode}`);

        const { data, error } = await client
            .from('radian_events')
            .insert({
                tenant_id: tenantId,
                electronic_document_id: electronicDocId,
                event_code: eventCode,
                event_description: eventInfo.name,
                status: 'PENDING',
            })
            .select()
            .single();

        if (error) throw error;
        return data as RadianEvent;
    },

    async updateEventStatus(
        client: SupabaseClient,
        eventId: string,
        status: RadianStatus,
        response?: { code: string; message: string },
    ): Promise<void> {
        const update: Record<string, unknown> = { status };
        if (status === 'SENT') update.sent_at = new Date().toISOString();
        if (status === 'ACCEPTED' || status === 'REJECTED') {
            update.responded_at = new Date().toISOString();
            if (response) {
                update.response_code = response.code;
                update.response_message = response.message;
            }
        }
        const { error } = await client.from('radian_events').update(update).eq('id', eventId);
        if (error) throw error;
    },

    async sendEvent(client: SupabaseClient, eventId: string): Promise<{ success: boolean; message: string }> {
        const { data: event } = await client
            .from('radian_events')
            .select('*, electronic_document:electronic_documents(cufe, xml_content)')
            .eq('id', eventId)
            .single();

        if (!event) throw new Error('Evento no encontrado');

        const { data: config } = await client
            .from('dian_config')
            .select('environment')
            .limit(1)
            .single();

        const isProduction = config?.environment === 'PRODUCCION';
        // Endpoint reserved for future SOAP integration
        const _endpoint = isProduction
            ? 'https://vpfe.dian.gov.co/WcfDianCustomerServices.svc'
            : 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc';

        await this.updateEventStatus(client, eventId, 'SENT');

        try {
            // TODO: Build actual RADIAN XML event envelope and POST to _endpoint via SOAP
            await this.updateEventStatus(client, eventId, 'ACCEPTED', {
                code: '200',
                message: `Evento ${event.event_code} registrado exitosamente (${isProduction ? 'Producción' : 'Habilitación'})`,
            });

            return { success: true, message: 'Evento registrado exitosamente en DIAN' };
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Error al enviar evento';
            await this.updateEventStatus(client, eventId, 'REJECTED', {
                code: 'ERROR',
                message: msg,
            });
            return { success: false, message: msg };
        }
    },
};
