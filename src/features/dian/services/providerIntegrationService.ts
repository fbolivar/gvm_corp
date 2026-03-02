import { SupabaseClient } from '@supabase/supabase-js';
import { Document } from '@/features/documents/types';

/**
 * Servicio que simula la integración con un Proveedor Tecnológico (Ej. Alegra, Siigo, Dataico).
 * En lugar de firmar XMLs en local (como hace el dianService clásico), este servicio construye
 * un Payload JSON estandarizado que las APIs modernas esperan para emitir a la DIAN.
 */
export const providerIntegrationService = {

    /**
     * Prepara el Payload JSON para enviar a un Proveedor Tecnológico
     * @param document El documento completo con sus lineas y cliente
     * @param providerConfig Configuración del proveedor (token, endpoint, etc)
     */
    buildProviderPayload(document: Document, providerConfig: any = {}) {
        // 1. Mapeo del Cliente (Adquiriente)
        const customer = {
            identification: document.party?.doc_number || "222222222222",
            dv: document.party?.dv || "0",
            name: document.party?.legal_name || "Consumidor Final",
            email: document.party?.email || "cliente@example.com",
            phone: {
                number: document.party?.phone || "0000000"
            },
            address: {
                address: "Dirección Genérica (Defecto DIAN)",
                city: "11001", // Bogotá (Homologación de códigos DANE)
                department: "11" // Cundinamarca
            },
            type: document.party?.party_type === 'PERSON' ? 'Person' : 'Company',
            regime: "48", // Responsable de IVA (o 49 No Responsable) según Party
            obligations: ["O-47"]
        };

        // 2. Mapeo de las Líneas (Items)
        const items = (document.lines || []).map(line => {
            // Mapeamos los impuestos de la línea (tax_config)
            const taxes = [];
            let totalTaxes = 0;

            const configs = Array.isArray(line.tax_config) ? line.tax_config : (line.tax_config ? [line.tax_config] : []);

            configs.forEach((t: any) => {
                const isIva = (t.type || t.name || '').toUpperCase().includes('IVA');
                const rate = Number(t.rate) || 0;

                if (isIva) {
                    taxes.push({
                        type: "IVA",
                        percentage: rate
                    });
                    totalTaxes += (Number(line.qty) * Number(line.unit_price)) * (rate / 100);
                }
            });

            // Si no hay configuración estricta, pero hay taxes a nivel documento, aplicamos 19% por defecto para la simulación
            if (taxes.length === 0 && document.taxes > 0) {
                taxes.push({
                    type: "IVA",
                    percentage: 19
                });
            }

            return {
                id: line.product_id || "GENERIC",
                name: line.description,
                price: Number(line.unit_price),
                quantity: Number(line.qty),
                taxes: taxes
            };
        });

        // 3. Mapeo de Pagos
        const payments = [
            {
                paymentMethod: "10", // Efectivo/Estándar
                paymentType: "1", // Contado
                amount: document.total
            }
        ];

        // 4. Construcción del Payload Final (Inspirado en estructuras tipo Alegra API)
        const payload = {
            number: document.number,
            date: document.issue_date,
            dueDate: document.due_date || document.issue_date,
            operationType: "10", // Estándar
            documentType: "01", // Factura Venta
            customer: customer,
            items: items,
            payments: payments,
            currency: document.currency || 'COP',
            observations: document.notes_public || "Facturado por SaaS Factory V3"
        };

        return payload;
    },

    /**
     * Simula el envío asíncrono del Payload JSON al Proveedor y devuelve la respuesta simulada
     */
    async sendToProvider(client: SupabaseClient, documentId: string): Promise<any> {
        // 1. Obtener documento completo
        const { data: doc, error } = await client
            .from('documents')
            .select('*, lines:document_lines(*), party:parties(*)')
            .eq('id', documentId)
            .single();

        if (error || !doc) throw new Error("Documento no encontrado");

        // 2. Construir Payload
        const apiPayload = this.buildProviderPayload(doc);
        console.log("🚀 Payload JSON preparado para Proveedor Tecnológico:", JSON.stringify(apiPayload, null, 2));

        // 3. Simular latencia de red (1.5s)
        await new Promise(res => setTimeout(res, 1500));

        // 4. Generar Respuesta Mock del Proveedor Tecnológico
        // El proveedor nos devuelve usualmente un UUID interno, el UUID legal (CUFE), el XML y el PDF
        const cufePattern = Array.from({ length: 96 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

        const providerResponse = {
            id: `prv_${Math.random().toString(36).substring(7)}`,
            status: "ACCEPTED", // "ACCEPTED", "REJECTED"
            legalStatus: "Generado y Aceptado por DIAN",
            cufe: cufePattern,
            xml: `https://api.proveedor-tecnologico.com/v1/facturas/${doc.number}/xml`,
            pdf: `https://api.proveedor-tecnologico.com/v1/facturas/${doc.number}/pdf`,
            qrCode: `NumFac=${doc.number}&FecFac=${doc.issue_date}&NitFac=900000000&DocAdq=${doc.party?.doc_number}&ValFac=${doc.total}&CUFE=${cufePattern}`
        };

        // 5. Mapear respuesta a nuestra DB (electronic_documents)
        // Insertamos o actualizamos en la base de datos de auditoría
        await client.from('electronic_documents').upsert({
            document_id: doc.id,
            environment: 'PRODUCTION', // En un entorno real se sacaría de settings
            cufe: providerResponse.cufe,
            xml_url: providerResponse.xml,
            qr_data: providerResponse.qrCode,
            dian_status: providerResponse.status,
            xml_content: JSON.stringify(apiPayload), // Guardamos el payload enviado en lugar del UBL crudo para trazabilidad
            sent_at: new Date().toISOString()
        }, { onConflict: 'document_id' });

        // 6. Actualizar status maestro según respuesta del proveedor
        const newDocStatus = providerResponse.status === 'ACCEPTED' ? 'ACCEPTED' : 'SENT';
        await client.from('documents').update({ status: newDocStatus }).eq('id', doc.id);

        return {
            success: true,
            providerResponse
        };
    }
};
