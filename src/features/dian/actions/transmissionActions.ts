'use server';

/**
 * DIAN Transmission Server Actions
 *
 * Provides server-side actions for transmitting signed electronic documents
 * to the DIAN web service and querying their processing status.
 *
 * Flow:
 *   1. emitDianAction (existing) → generates XML + CUFE, inserts electronic_documents row
 *   2. signDocumentAction        → signs XML with XAdES-BES certificate
 *   3. transmitDocumentAction    → sends signed XML to DIAN via SOAP, updates dian_status
 *   4. checkDianStatusAction     → polls DIAN GetStatus using CUFE as trackId
 */

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
    dianTransmissionService,
    type DianEnvironment,
} from '../services/dianTransmissionService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TransmitDocumentSuccess {
    success: true;
    message: string;
    statusCode: string;
}

export interface TransmitDocumentError {
    success: false;
    error: string;
    details?: string[];
}

export type TransmitDocumentResponse = TransmitDocumentSuccess | TransmitDocumentError;

export interface CheckStatusSuccess {
    success: true;
    status: string;
    message: string;
}

export interface CheckStatusError {
    success: false;
    error: string;
}

export type CheckStatusResponse = CheckStatusSuccess | CheckStatusError;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps the dian_config.environment DB value ('TEST' | 'PROD') to a
 * DianEnvironment value used by the transmission service.
 * Defaults to 'TEST' for any unrecognised value to ensure safe fallback.
 */
function resolveEnvironment(configEnv: string | null | undefined): DianEnvironment {
    return configEnv === 'PROD' ? 'PROD' : 'TEST';
}

/**
 * Derives the dian_status to store based on the transmission result.
 * Only marks as ACCEPTED when DIAN explicitly confirms it (isValid === true).
 * Falls back to 'PENDING' on connection errors so a retry is possible.
 */
function resolveNewStatus(
    isValid: boolean,
    statusCode: string,
): 'ACCEPTED' | 'REJECTED' | 'PENDING' {
    if (isValid) return 'ACCEPTED';
    if (statusCode === 'CONNECTION_ERROR') return 'PENDING';
    return 'REJECTED';
}

// ---------------------------------------------------------------------------
// transmitDocumentAction
// ---------------------------------------------------------------------------

/**
 * Transmits a previously signed electronic document to DIAN's web service.
 *
 * Prerequisites:
 *   - The electronic_documents row must exist (created by emitDianAction).
 *   - xml_content must be populated and signed (no SIGNATURE_PLACEHOLDER).
 *   - dian_status must not already be 'ACCEPTED'.
 *
 * On success, updates dian_status to 'ACCEPTED' and stores the DIAN response.
 * On rejection, updates dian_status to 'REJECTED' with rejection reasons in dian_response.
 * On connection error, leaves dian_status as 'PENDING' to allow retries.
 *
 * @param electronicDocId UUID of the electronic_documents row
 */
export async function transmitDocumentAction(
    electronicDocId: string,
): Promise<TransmitDocumentResponse> {
    const supabase = await createClient();

    // 1. Authentication check
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'No autenticado. Inicie sesión para continuar.' };
    }

    try {
        // 2. Fetch the electronic document with its parent document info
        const { data: eDoc, error: fetchErr } = await supabase
            .from('electronic_documents')
            .select('id, document_id, xml_content, cufe, dian_status, documents(number, doc_type)')
            .eq('id', electronicDocId)
            .single();

        if (fetchErr || !eDoc) {
            return {
                success: false,
                error: `Documento electrónico no encontrado: ${fetchErr?.message ?? 'ID inválido'}`,
            };
        }

        if (!eDoc.xml_content) {
            return {
                success: false,
                error: 'El documento no tiene XML generado. Emítalo primero usando el botón "Emitir DIAN".',
            };
        }

        if (eDoc.dian_status === 'ACCEPTED') {
            return {
                success: false,
                error: 'El documento ya fue aceptado por la DIAN. No es necesario enviarlo de nuevo.',
            };
        }

        // Verify the document has been signed (SIGNATURE_PLACEHOLDER must be absent)
        if (eDoc.xml_content.includes('<!-- SIGNATURE_PLACEHOLDER -->')) {
            return {
                success: false,
                error:
                    'El documento aún no ha sido firmado digitalmente. ' +
                    'Firme el documento antes de transmitirlo a la DIAN.',
            };
        }

        // 3. Fetch DIAN configuration to determine environment and file naming
        const { data: config } = await supabase
            .from('dian_config')
            .select('environment, test_set_id')
            .limit(1)
            .single();

        const environment = resolveEnvironment(config?.environment);

        // Build file name from the parent document number
        const parentDoc = Array.isArray(eDoc.documents)
            ? eDoc.documents[0]
            : (eDoc.documents as { number: string; doc_type: string } | null);
        const docNumber = parentDoc?.number ?? electronicDocId;
        const fileName = `${docNumber.replace(/\//g, '-')}.xml`;

        // 4. Transmit to DIAN
        console.info(
            `[transmitDocumentAction] Transmitting doc=${docNumber} env=${environment} file=${fileName}`,
        );

        const result = await dianTransmissionService.sendDocument(
            eDoc.xml_content,
            fileName,
            environment,
        );

        // 5. Persist the DIAN response back to the electronic_documents row
        const newStatus = resolveNewStatus(result.isValid, result.statusCode);

        const dianResponsePayload = {
            statusCode: result.statusCode,
            statusDescription: result.statusDescription,
            statusMessage: result.statusMessage,
            errorMessages: result.errorMessages,
            transmittedAt: new Date().toISOString(),
            environment,
        };

        const { error: updateErr } = await supabase
            .from('electronic_documents')
            .update({
                dian_status: newStatus,
                dian_response: dianResponsePayload,
                sent_at: new Date().toISOString(),
                ...(newStatus === 'ACCEPTED' && { accepted_at: new Date().toISOString() }),
                ...(newStatus === 'REJECTED' && { rejected_at: new Date().toISOString() }),
            })
            .eq('id', electronicDocId);

        if (updateErr) {
            console.error('[transmitDocumentAction] Failed to update electronic_documents:', updateErr);
            // Non-fatal: the transmission itself may have succeeded; log and continue
        }

        // 6. Revalidate relevant cached pages
        revalidatePath('/dian');
        revalidatePath('/sales/invoices');
        revalidatePath('/documents');

        if (result.isValid) {
            return {
                success: true,
                message: `Documento aceptado por la DIAN (${environment === 'PROD' ? 'Producción' : 'Habilitación'}). Código: ${result.statusCode}`,
                statusCode: result.statusCode,
            };
        }

        // Rejected by DIAN
        const rejectionDetail =
            result.errorMessages.length > 0
                ? result.errorMessages.join('; ')
                : result.statusDescription;

        return {
            success: false,
            error: `La DIAN rechazó el documento: ${rejectionDetail}`,
            details: result.errorMessages,
        };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error inesperado al transmitir';
        console.error('[transmitDocumentAction] Unhandled error:', msg);
        return { success: false, error: msg };
    }
}

// ---------------------------------------------------------------------------
// checkDianStatusAction
// ---------------------------------------------------------------------------

/**
 * Queries the current DIAN processing status of a transmitted document.
 *
 * Uses the CUFE stored in electronic_documents as the trackId for GetStatus.
 * Updates dian_status in the database with the latest DIAN response.
 *
 * Useful for documents sent asynchronously (SendTestSetAsync) or when
 * the initial transmission result was indeterminate.
 *
 * @param electronicDocId UUID of the electronic_documents row
 */
export async function checkDianStatusAction(
    electronicDocId: string,
): Promise<CheckStatusResponse> {
    const supabase = await createClient();

    // 1. Authentication check
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { success: false, error: 'No autenticado.' };
    }

    try {
        // 2. Fetch the electronic document — we need the CUFE to query DIAN
        const { data: eDoc, error: fetchErr } = await supabase
            .from('electronic_documents')
            .select('id, cufe, cude, cune')
            .eq('id', electronicDocId)
            .single();

        if (fetchErr || !eDoc) {
            return {
                success: false,
                error: `Documento no encontrado: ${fetchErr?.message ?? 'ID inválido'}`,
            };
        }

        // CUFE takes priority; fall back to CUDE (credit/debit notes) then CUNE (payroll)
        const trackId = eDoc.cufe ?? eDoc.cude ?? eDoc.cune;
        if (!trackId) {
            return {
                success: false,
                error: 'El documento no tiene CUFE/CUDE/CUNE. Emítalo primero antes de consultar su estado.',
            };
        }

        // 3. Resolve environment
        const { data: config } = await supabase
            .from('dian_config')
            .select('environment')
            .limit(1)
            .single();

        const environment = resolveEnvironment(config?.environment);

        // 4. Query DIAN
        console.info(
            `[checkDianStatusAction] GetStatus trackId=${trackId} env=${environment}`,
        );

        const result = await dianTransmissionService.getStatus(trackId, environment);

        const newStatus = resolveNewStatus(result.isValid, result.statusCode);

        // 5. Persist updated status
        const dianResponsePayload = {
            statusCode: result.statusCode,
            statusDescription: result.statusDescription,
            statusMessage: result.statusMessage,
            errorMessages: result.errorMessages,
            checkedAt: new Date().toISOString(),
            environment,
        };

        await supabase
            .from('electronic_documents')
            .update({
                dian_status: newStatus,
                dian_response: dianResponsePayload,
                ...(newStatus === 'ACCEPTED' && { accepted_at: new Date().toISOString() }),
                ...(newStatus === 'REJECTED' && { rejected_at: new Date().toISOString() }),
            })
            .eq('id', electronicDocId);

        revalidatePath('/dian');

        return {
            success: true,
            status: newStatus,
            message:
                result.statusDescription ||
                (newStatus === 'ACCEPTED'
                    ? 'Documento aceptado por DIAN'
                    : newStatus === 'REJECTED'
                      ? 'Documento rechazado por DIAN'
                      : 'Estado pendiente de confirmación'),
        };
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error al consultar estado en DIAN';
        console.error('[checkDianStatusAction] Unhandled error:', msg);
        return { success: false, error: msg };
    }
}
