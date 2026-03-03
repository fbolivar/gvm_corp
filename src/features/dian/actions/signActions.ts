'use server';

/**
 * signActions.ts
 *
 * Server Action — signs a previously-generated DIAN XML document stored in
 * the `electronic_documents` table using the tenant's configured PKCS#12
 * certificate.
 *
 * Flow:
 *   1. Authenticate the calling user.
 *   2. Fetch the electronic_document record (which contains xml_content).
 *   3. Fetch the tenant's dian_config (certificate_b64 + certificate_password).
 *   4. Call signXml() to replace <!-- SIGNATURE_PLACEHOLDER --> with a real
 *      XAdES-BES ds:Signature block.
 *   5. Persist the signed XML back to electronic_documents.xml_content.
 *   6. Revalidate relevant cache paths.
 */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { signXml } from '../services/signatureService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SignDocumentResult {
    success: true;
    message: string;
    documentId: string;
}

export interface SignDocumentError {
    error: string;
}

export type SignDocumentResponse = SignDocumentResult | SignDocumentError;

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

/**
 * Signs the XML of an already-emitted electronic document.
 *
 * @param documentId  UUID of the row in the `electronic_documents` table.
 *                    (Note: this is the electronic_documents.id, NOT documents.id)
 */
export async function signDocumentAction(documentId: string): Promise<SignDocumentResponse> {
    const supabase = await createClient();

    // 1. Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { error: 'No autenticado. Inicie sesión para continuar.' };
    }

    // 2. Fetch the electronic document
    const { data: elecDoc, error: elecError } = await supabase
        .from('electronic_documents')
        .select('id, xml_content, dian_status, document_id')
        .eq('id', documentId)
        .single();

    if (elecError || !elecDoc) {
        return { error: `Documento electrónico no encontrado: ${elecError?.message ?? 'ID inválido'}` };
    }

    if (!elecDoc.xml_content) {
        return { error: 'El documento no contiene XML generado. Emita el documento primero.' };
    }

    // Check if already signed (placeholder no longer present)
    const PLACEHOLDER = '<!-- SIGNATURE_PLACEHOLDER -->';
    if (!elecDoc.xml_content.includes(PLACEHOLDER)) {
        return { error: 'El documento ya contiene una firma digital o no tiene un marcador de firma pendiente.' };
    }

    // 3. Fetch tenant DIAN configuration
    const { data: dianConfig, error: configError } = await supabase
        .from('dian_config')
        .select('certificate_b64, certificate_password')
        .single();

    if (configError || !dianConfig) {
        return {
            error: 'Configuración DIAN no encontrada. Configure el certificado digital en los ajustes de DIAN.',
        };
    }

    if (!dianConfig.certificate_b64) {
        return {
            error:
                'No se ha configurado un certificado digital (.p12). ' +
                'Suba su certificado DIAN en Configuración > DIAN > Certificado.',
        };
    }

    // 4. Sign the XML
    let signedXml: string;
    try {
        signedXml = await signXml(
            elecDoc.xml_content,
            dianConfig.certificate_b64,
            dianConfig.certificate_password ?? '',
        );
    } catch (signError: unknown) {
        const message = signError instanceof Error ? signError.message : String(signError);
        console.error('[signDocumentAction] Error firmando XML:', message);
        return {
            error: `Error al firmar el documento: ${message}`,
        };
    }

    // 5. Persist signed XML
    const { error: updateError } = await supabase
        .from('electronic_documents')
        .update({
            xml_content: signedXml,
            signed_at: new Date().toISOString(),
            dian_status: 'PENDING', // Reset to PENDING so it can be re-submitted with the real signature
        })
        .eq('id', documentId);

    if (updateError) {
        console.error('[signDocumentAction] Error actualizando electronic_documents:', updateError);
        return { error: `Error guardando el XML firmado: ${updateError.message}` };
    }

    // 6. Revalidate relevant paths
    revalidatePath('/dian');
    revalidatePath('/sales/invoices');
    revalidatePath('/documents');

    return {
        success: true,
        message: 'Documento firmado digitalmente con XAdES-BES. Listo para enviar a la DIAN.',
        documentId,
    };
}

// ---------------------------------------------------------------------------
// Batch signing action
// ---------------------------------------------------------------------------

/**
 * Signs multiple electronic documents in a single call.
 * Useful for bulk operations from the DIAN dashboard.
 *
 * @param documentIds  Array of electronic_documents.id UUIDs to sign.
 * @returns            Array of per-document results in the same order.
 */
export async function signDocumentsBatchAction(
    documentIds: string[],
): Promise<SignDocumentResponse[]> {
    if (!documentIds.length) {
        return [];
    }

    // Sign sequentially to avoid hammering the DB with concurrent writes.
    // For large batches this could be parallelised with Promise.allSettled.
    const results: SignDocumentResponse[] = [];
    for (const id of documentIds) {
        const result = await signDocumentAction(id);
        results.push(result);
    }
    return results;
}

// ---------------------------------------------------------------------------
// Helper: get signature status for display
// ---------------------------------------------------------------------------

export interface SignatureStatus {
    documentId: string;
    isSigned: boolean;
    hasCertificateConfigured: boolean;
}

/**
 * Returns the signing status of an electronic document.
 * Used by UI components to show "Sign" or "Already Signed" state.
 */
export async function getSignatureStatusAction(
    electronicDocumentId: string,
): Promise<SignatureStatus | { error: string }> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'No autenticado' };

    const [{ data: elecDoc }, { data: dianConfig }] = await Promise.all([
        supabase
            .from('electronic_documents')
            .select('id, xml_content')
            .eq('id', electronicDocumentId)
            .single(),
        supabase
            .from('dian_config')
            .select('certificate_b64')
            .single(),
    ]);

    const isSigned =
        !!elecDoc?.xml_content &&
        !elecDoc.xml_content.includes('<!-- SIGNATURE_PLACEHOLDER -->') &&
        elecDoc.xml_content.includes('<ds:Signature');

    return {
        documentId: electronicDocumentId,
        isSigned,
        hasCertificateConfigured: !!dianConfig?.certificate_b64,
    };
}
