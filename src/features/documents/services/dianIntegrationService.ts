import { SupabaseClient } from '@supabase/supabase-js';
import { Document, ElectronicDocument } from '../types';

export const dianIntegrationService = {
    /**
     * Mocks the submission of an invoice to the DIAN via a Technological Provider.
     * In a real-world scenario, this would construct a complex JSON payload (UBL 2.1),
     * send it to an API (e.g., Alegra, Siigo, Dataico), and parse the response.
     */
    async emitDocumentToDian(client: SupabaseClient, documentId: string): Promise<ElectronicDocument> {
        // 1. Fetch the full document with lines and party to "build" the payload
        const { data: document, error: fetchError } = await client
            .from('documents')
            .select(`
                *,
                lines:document_lines(*),
                party:parties(*)
            `)
            .eq('id', documentId)
            .single();

        if (fetchError || !document) {
            throw new Error(`Error fetching document for DIAN emission: ${fetchError?.message}`);
        }

        // 2. Validate Document Readiness (Mock)
        if (!document.party.doc_number || !document.party.legal_name) {
            throw new Error("El cliente no tiene NIT o Razón Social válida para emisión electrónica.");
        }

        // 3. Simulate API Call delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 4. Generate Mock Responses
        const isProduction = process.env.NODE_ENV === 'production';
        const environment = isProduction ? 'PROD' : 'TEST';

        // Generate a fake CUFE (Código Único de Facturación Electrónica) - 96 hex chars approx
        const fakeCufe = Array.from({ length: 96 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        const qrData = `NumFac=${document.number}&FecFac=${document.issue_date}&NitFac=901000000&DocAdq=${document.party.doc_number}&ValFac=${document.subtotal}&ValIva=${document.taxes}&ValOtroIm=0.00&ValFacIm=${document.total}&CUFE=${fakeCufe}`;

        const electronicRecord: ElectronicDocument = {
            document_id: document.id,
            environment: environment,
            cufe: fakeCufe,
            xml_url: `https://mock-dian-provider.com/xml/${fakeCufe}.xml`,
            qr_data: qrData,
            dian_status: 'ACCEPTED',
            sent_at: new Date().toISOString(),
        };

        // 5. Upsert Electronic Document Record
        // We use an upsert just in case it was rejected before and we are retrying
        const { data: edData, error: edError } = await client
            .from('electronic_documents')
            .upsert({
                ...electronicRecord,
                tenant_id: document.tenant_id // Optional depending on schema, but good practice
            }, { onConflict: 'document_id' })
            .select()
            .single();

        if (edError) {
            throw new Error(`Error saving electronic document record: ${edError.message}`);
        }

        // 6. Update main document status to SENT or ACCEPTED
        const { error: updateError } = await client
            .from('documents')
            .update({ status: 'SENT' })
            .eq('id', document.id);

        if (updateError) {
            console.error("Warning: Could not update document status to SENT", updateError);
        }

        return edData as ElectronicDocument;
    }
};
