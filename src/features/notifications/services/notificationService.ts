
import { SupabaseClient } from '@supabase/supabase-js';
import { AppNotification } from '../types';
import { getServerDictionary } from '../../../shared/locales/serverDictionary';

export const notificationService = {
    /**
     * Crea una notificación interna en la aplicación para un usuario específico o tenant.
     */
    async createInAppNotification(client: SupabaseClient, data: {
        user_id?: string;
        tenant_id?: string;
        title: string;
        body: string;
        link?: string;
        category?: string;
        priority?: string;
    }) {
        let finalTenantId = data.tenant_id;
        if (!finalTenantId) {
            const { data: tid } = await client.rpc('get_my_tenant_id');
            finalTenantId = tid;
        }

        const { error } = await client
            .from('app_notifications')
            .insert({
                user_id: data.user_id || null,
                tenant_id: finalTenantId,
                title: data.title,
                body: data.body,
                link: data.link,
                category: data.category || 'GENERAL',
                priority: data.priority || 'MEDIUM',
                is_read: false
            });

        if (error) {
            console.error("Error creating in-app notification:", error);
        }
    },

    /**
     * Simula el envío de un correo electrónico.
     */
    async sendEmail(data: {
        to: string;
        subject: string;
        body: string;
        attachments?: { name: string, url: string }[];
    }) {
        console.log(`[EMAIL SIMULATOR] Sending email to ${data.to}...`);
        console.log(`Subject: ${data.subject}`);
        console.log(`Body: ${data.body}`);
        if (data.attachments) {
            console.log(`Attachments: ${data.attachments.map(a => a.name).join(', ')}`);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        return { success: true };
    },

    /**
     * Alerta de stock bajo.
     */
    async checkAndNotifyLowStock(client: SupabaseClient, productId: string) {
        // 1. Obtener producto
        const { data: product } = await client
            .from('products')
            .select('name, sku, min_stock')
            .eq('id', productId)
            .single();

        if (!product || product.min_stock === null) return;

        // 2. Obtener stock total
        const { data: stockData } = await client
            .from('product_stock')
            .select('qty')
            .eq('product_id', productId);

        const currentStock = stockData?.reduce((acc, curr) => acc + Number(curr.qty), 0) || 0;

        // 3. Evaluar
        if (currentStock <= product.min_stock) {
            const { data: tid } = await client.rpc('get_my_tenant_id');
            // Mock: get language (default es)
            const dict = getServerDictionary('es');

            const title = dict.notifications.low_stock_title;
            const body = dict.notifications.low_stock_body
                .replace('{sku}', product.sku)
                .replace('{qty}', currentStock.toString())
                .replace('{min}', product.min_stock.toString());

            // 4. Notificar internamente
            await this.createInAppNotification(client, {
                tenant_id: tid,
                title,
                body,
                category: 'INVENTORY',
                link: `/inventory/products?id=${productId}`
            });

            // 5. Enviar email a los responsables (usando profiles, accesible vía PostgREST)
            if (tid) {
                const { data: managers } = await client
                    .from('user_tenants')
                    .select('user_id, role, profiles(email)')
                    .eq('tenant_id', tid)
                    .in('role', ['owner', 'admin', 'ADMINISTRADOR', 'SUPER ADMINISTRADOR']);

                if (managers) {
                    for (const m of (managers as any[])) {
                        const email = m.profiles?.email;
                        if (email) {
                            await this.sendEmail({
                                to: email,
                                subject: title,
                                body
                            });
                        }
                    }
                }
            }
        }
    },

    /**
     * Notifica el envío de una factura aceptada por la DIAN.
     */
    async notifyInvoiceToCustomer(client: SupabaseClient, documentId: string) {
        const { data: doc } = await client
            .from('documents')
            .select(`
                number,
                total,
                tenant_id,
                party:parties(email, legal_name),
                elec:electronic_documents(cufe, pdf_url, xml_url)
            `)
            .eq('id', documentId)
            .single();

        if (!doc) return;

        const party = Array.isArray(doc.party) ? doc.party[0] : doc.party as any;
        const elec = Array.isArray(doc.elec) ? doc.elec[0] : doc.elec as any;

        if (!party?.email) return;

        const dict = getServerDictionary('es');

        // 1. Enviar email al cliente
        await this.sendEmail({
            to: party.email,
            subject: dict.notifications.customer_email_subject.replace('{number}', doc.number),
            body: dict.notifications.customer_email_body
                .replace('{name}', party.legal_name)
                .replace('{total}', doc.total.toLocaleString())
                .replace('{cufe}', elec?.cufe || 'N/A'),
            attachments: [
                { name: `Factura_${doc.number}.pdf`, url: elec?.pdf_url || '' },
                { name: `Factura_${doc.number}.xml`, url: elec?.xml_url || '' }
            ]
        });

        // 2. Notificar internamente
        await this.createInAppNotification(client, {
            tenant_id: doc.tenant_id,
            title: dict.notifications.invoice_sent_title,
            body: dict.notifications.invoice_sent_body
                .replace('{number}', doc.number)
                .replace('{email}', party.email),
            category: 'BILLING',
            link: `/sales/invoices/${documentId}`
        });
    },

    async getNotifications(client: SupabaseClient) {
        const { data, error } = await client
            .from('app_notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        return data as AppNotification[];
    },

    async markAllAsRead(client: SupabaseClient) {
        const { error } = await client
            .from('app_notifications')
            .update({ is_read: true })
            .eq('is_read', false);

        if (error) throw error;
    }
};
