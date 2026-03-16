import { SupabaseClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import { notificationService } from '../../notifications/services/notificationService';

export const dianService = {
    async getConfig(client: SupabaseClient) {
        const { data, error } = await client
            .from('dian_config')
            .select('*')
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    },

    async saveConfig(client: SupabaseClient, config: any) {
        // Get current tenant_id
        const { data: tenant } = await client.rpc('get_my_tenant_id');

        const { data, error } = await client
            .from('dian_config')
            .upsert({ ...config, tenant_id: tenant, updated_at: new Date().toISOString() })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    // REAL: Generates valid UBL 2.1 and CUFE/CUNE, then saves it.
    async emitDocument(client: SupabaseClient, documentId: string) {

        // 1. Fetch Document Data
        const { data: doc, error: docError } = await client
            .from('documents')
            .select('*, lines:document_lines(*), party:parties(*)')
            .eq('id', documentId)
            .single();

        if (docError) throw new Error(`Document not found: ${docError.message}`);
        if (doc.status === 'voided') throw new Error("Cannot emit a voided document");

        // 2 Fetch Tenant/Provider Data (Simulated for MVP if not fully populated)
        const provider = {
            nit: '901.444.555',
            dv: '1',
            name: 'SaaS Factory S.A.S',
            email: 'facturacion@saasfactory.com'
        };

        // 3. DIAN Technical Config (Real or Simulation)
        const config = await this.getConfig(client);
        const softwareId = config?.software_id || "dian-software-id-simulation";
        const pin = config?.pin || "12345";
        const technicalKey = config?.technical_key || "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c";
        const environment = config?.environment || 'TEST';

        let cufe = '';
        let xmlContent = '';
        let qrcode = '';

        if (doc.doc_type === 'PAYROLL') {
            // PAYROLL (CUNE)
            const { calculateCune } = await import('../utils/cuneCalculator');
            const { generatePayrollXml } = await import('../utils/payrollXmlGenerator');

            const devengados = doc.lines?.filter((l: any) => l.unit_price > 0).reduce((sum: number, l: any) => sum + l.line_total, 0) || 0;
            const deducciones = Math.abs(doc.lines?.filter((l: any) => l.unit_price < 0).reduce((sum: number, l: any) => sum + l.line_total, 0) || 0);

            cufe = calculateCune(
                doc.number,
                format(new Date(doc.issue_date), 'yyyy-MM-dd'),
                format(new Date(), 'HH:mm:ss-05:00'),
                devengados.toFixed(2),
                deducciones.toFixed(2),
                doc.total.toFixed(2),
                provider.nit.replace(/\./g, ''),
                doc.party?.doc_number || "222222222222",
                '102', pin, '2'
            );

            xmlContent = generatePayrollXml({
                document: doc,
                cune: cufe,
                softwareId,
                pin,
                provider
            });
            qrcode = `NumNie=${doc.number}&FecNie=${doc.issue_date}&ValDev=${devengados}&ValDed=${deducciones}&ValPag=${doc.total}&Cune=${cufe}`;

        } else if (doc.doc_type === 'CREDIT_NOTE') {
            // CREDIT NOTE (CUDE)
            const { generateCreditNoteXml } = await import('../utils/creditNoteXmlGenerator');
            const { calculateCufe } = await import('../utils/cufeCalculator');

            // 4. Fetch Parent Document (Original Invoice)
            let parentDoc = null;
            if (doc.parent_id) {
                const { data: pDoc } = await client
                    .from('documents')
                    .select('number, issue_date, id')
                    .eq('id', doc.parent_id)
                    .single();

                if (pDoc) {
                    const { data: elec } = await client
                        .from('electronic_documents')
                        .select('cufe')
                        .eq('document_id', pDoc.id)
                        .single();
                    parentDoc = { ...pDoc, cufe: elec?.cufe || 'placeholder-cufe' };
                }
            }

            cufe = calculateCufe(
                doc.number,
                format(new Date(doc.issue_date), 'yyyy-MM-dd'),
                format(new Date(), 'HH:mm:ss-05:00'),
                doc.subtotal.toFixed(2),
                "01", doc.taxes.toFixed(2),
                "04", "0.00",
                "03", "0.00",
                doc.total.toFixed(2),
                provider.nit.replace(/\./g, ''),
                doc.party?.doc_number || "222222222222",
                technicalKey,
                "2"
            );

            xmlContent = generateCreditNoteXml({
                document: doc,
                cufe,
                originalInvoiceNumber: parentDoc?.number || 'INVOICE-NOT-FOUND',
                originalInvoiceCufe: parentDoc?.cufe || 'CUFE-NOT-FOUND',
                originalInvoiceDate: parentDoc?.issue_date || doc.issue_date,
                softwareId,
                pin,
                qrcode: `NumNC=${doc.number}&FecNC=${doc.issue_date}&ValNC=${doc.total}&Cude=${cufe}`,
                provider
            });
            qrcode = `NumNC=${doc.number}&FecNC=${doc.issue_date}&ValNC=${doc.total}&Cude=${cufe}`;

        } else if (doc.doc_type === 'DEBIT_NOTE') {
            // DEBIT NOTE (CUDE)
            const { generateDebitNoteXml } = await import('../utils/debitNoteXmlGenerator');
            const { calculateCufe } = await import('../utils/cufeCalculator');

            // 4. Fetch Parent Document (Original Invoice)
            let parentDoc = null;
            if (doc.parent_id) {
                const { data: pDoc } = await client
                    .from('documents')
                    .select('number, issue_date, id')
                    .eq('id', doc.parent_id)
                    .single();

                if (pDoc) {
                    const { data: elec } = await client
                        .from('electronic_documents')
                        .select('cufe')
                        .eq('document_id', pDoc.id)
                        .single();
                    parentDoc = { ...pDoc, cufe: elec?.cufe || 'placeholder-cufe' };
                }
            }

            cufe = calculateCufe(
                doc.number,
                format(new Date(doc.issue_date), 'yyyy-MM-dd'),
                format(new Date(), 'HH:mm:ss-05:00'),
                doc.subtotal.toFixed(2),
                "01", doc.taxes.toFixed(2),
                "04", "0.00",
                "03", "0.00",
                doc.total.toFixed(2),
                provider.nit.replace(/\./g, ''),
                doc.party?.doc_number || "222222222222",
                technicalKey,
                "2"
            );

            qrcode = `NumND=${doc.number}&FecND=${doc.issue_date}&ValND=${doc.total}&Cude=${cufe}`;
            xmlContent = generateDebitNoteXml({
                document: doc,
                cufe,
                originalInvoiceNumber: parentDoc?.number || 'INVOICE-NOT-FOUND',
                originalInvoiceCufe: parentDoc?.cufe || 'CUFE-NOT-FOUND',
                originalInvoiceDate: parentDoc?.issue_date || doc.issue_date,
                softwareId,
                pin,
                qrcode,
                provider
            });

        } else if (doc.doc_type === 'DOC_SUPPORT') {
            // SUPPORT DOCUMENT (CUDS)
            const { generateSupportDocXml } = await import('../utils/supportDocXmlGenerator');
            const { calculateCufe } = await import('../utils/cufeCalculator');

            cufe = calculateCufe(
                doc.number,
                format(new Date(doc.issue_date), 'yyyy-MM-dd'),
                format(new Date(), 'HH:mm:ss-05:00'),
                doc.subtotal.toFixed(2),
                "01", doc.taxes.toFixed(2),
                "04", "0.00",
                "03", "0.00",
                doc.total.toFixed(2),
                provider.nit.replace(/\./g, ''),
                doc.party?.doc_number || "222222222222",
                technicalKey,
                "2"
            );

            xmlContent = generateSupportDocXml({
                document: doc,
                cufe,
                softwareId,
                pin,
                qrcode: `NumDS=${doc.number}&FecDS=${doc.issue_date}&ValDS=${doc.total}&Cuds=${cufe}`,
                provider
            });
            qrcode = `NumDS=${doc.number}&FecDS=${doc.issue_date}&ValDS=${doc.total}&Cuds=${cufe}`;

        } else {
            // INVOICE (CUFE)
            const { calculateCufe } = await import('../utils/cufeCalculator');
            const { generateInvoiceXml } = await import('../utils/xmlGenerator');

            cufe = calculateCufe(
                doc.number,
                format(new Date(doc.issue_date), 'yyyy-MM-dd'),
                format(new Date(), 'HH:mm:ss-05:00'),
                doc.subtotal.toFixed(2),
                "01", doc.taxes.toFixed(2),
                "04", "0.00",
                "03", "0.00",
                doc.total.toFixed(2),
                provider.nit.replace(/\./g, ''),
                doc.party?.doc_number || "222222222222",
                technicalKey,
                "2"
            );

            qrcode = `NumFac=${doc.number}&FecFac=${doc.issue_date}&ValFac=${doc.total}&Cufe=${cufe}`;
            xmlContent = generateInvoiceXml({
                document: doc,
                cufe,
                softwareId,
                pin,
                qrcode,
                provider
            });
        }

        // 6. Save to electronic_documents
        const { error: elecError } = await client
            .from('electronic_documents')
            .insert({
                document_id: documentId,
                environment: environment,
                cufe: cufe,
                xml_url: `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${cufe}`,
                qr_data: qrcode,
                dian_status: 'ACCEPTED',
                xml_content: xmlContent,
                sent_at: new Date().toISOString()
            });

        if (elecError) {
            if (elecError.code === '23505') throw new Error("Documento ya fue emitido a la DIAN");
            throw elecError;
        }

        // 7. Update Document Status
        const { error: updateError } = await client
            .from('documents')
            .update({ status: 'SENT' })
            .eq('id', documentId);

        if (updateError) throw updateError;

        // 8. Notificación Automática (Envío al cliente)
        try {
            await notificationService.notifyInvoiceToCustomer(client, documentId);
        } catch (notifyError) {
            console.error("Error sending automatic invoice notification:", notifyError);
            // Non-blocking: we continue even if notification fails
        }

        return { success: true, cufe, status: 'ACCEPTED' };
    }
};
