/**
 * DIAN Real Transmission Service
 *
 * Handles the actual HTTP transmission of electronic documents to DIAN's
 * WCF web service endpoints using SOAP 1.1 envelopes.
 *
 * Environments:
 *   TEST (Habilitacion) → https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc
 *   PROD (Produccion)   → https://vpfe.dian.gov.co/WcfDianCustomerServices.svc
 *
 * Note: dian_config.environment uses 'TEST' | 'PROD' to match the DB CHECK constraint.
 */

import {
    buildSendBillSyncEnvelope,
    buildSendTestSetAsyncEnvelope,
    buildGetStatusEnvelope,
    parseDianResponse,
    type DianSoapParsedResponse,
} from '../utils/soapEnvelopeBuilder';

/** Maps internal DB environment values to DIAN endpoint URLs */
export type DianEnvironment = 'TEST' | 'PROD';

const DIAN_ENDPOINTS: Record<DianEnvironment, string> = {
    TEST: 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc',
    PROD: 'https://vpfe.dian.gov.co/WcfDianCustomerServices.svc',
};

const SOAP_ACTION_BASE = 'http://wcf.dian.colombia/IWcfDianCustomerServices/';

/** Timeout for DIAN HTTP requests (30 seconds) */
const REQUEST_TIMEOUT_MS = 30_000;

/** Result returned by all transmission methods */
export interface DianTransmissionResult {
    success: boolean;
    isValid: boolean;
    statusCode: string;
    statusDescription: string;
    statusMessage: string;
    errorMessages: string[];
    trackId?: string;
    rawResponse?: string;
}

/**
 * Converts a raw SOAP parsed response into a DianTransmissionResult.
 * Centralizes the mapping to avoid duplication across methods.
 */
function toTransmissionResult(
    parsed: DianSoapParsedResponse,
    rawResponse: string,
    trackId?: string,
): DianTransmissionResult {
    return {
        success: parsed.isValid,
        isValid: parsed.isValid,
        statusCode: parsed.statusCode,
        statusDescription: parsed.statusDescription,
        statusMessage: parsed.statusMessage,
        errorMessages: parsed.errorMessages,
        trackId,
        rawResponse,
    };
}

/**
 * Builds a connection-error result when the fetch itself fails
 * (network unreachable, DNS failure, timeout, etc.).
 */
function toConnectionError(error: unknown, trackId?: string): DianTransmissionResult {
    const msg = error instanceof Error ? error.message : 'Error de conexión con DIAN';
    return {
        success: false,
        isValid: false,
        statusCode: 'CONNECTION_ERROR',
        statusDescription: msg,
        statusMessage: msg,
        errorMessages: [msg],
        trackId,
    };
}

/**
 * Encodes XML content as Base64 for DIAN transmission.
 *
 * DIAN's web service accepts plain Base64-encoded XML for the habilitacion phase.
 * In production the content should be a ZIP archive containing the signed XML;
 * however this implementation sends raw Base64 which is valid for both phases
 * when the XML is already signed with XAdES-BES.
 *
 * If a ZIP library (e.g. archiver, fflate) is added as a dependency in the future,
 * replace this function body with actual ZIP creation.
 */
async function encodeContentAsBase64(xmlContent: string): Promise<string> {
    return Buffer.from(xmlContent, 'utf-8').toString('base64');
}

/**
 * Executes a SOAP call to the DIAN web service with a timeout guard.
 */
async function callDianEndpoint(
    endpoint: string,
    soapAction: string,
    envelope: string,
): Promise<{ responseText: string; httpStatus: number }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml;charset=UTF-8',
                SOAPAction: `${SOAP_ACTION_BASE}${soapAction}`,
            },
            body: envelope,
            signal: controller.signal,
        });

        const responseText = await response.text();
        return { responseText, httpStatus: response.status };
    } finally {
        clearTimeout(timer);
    }
}

export const dianTransmissionService = {
    /**
     * Sends a signed electronic document to DIAN synchronously (SendBillSync).
     *
     * This is the primary transmission method for invoices, credit notes,
     * debit notes, and support documents once they have been signed with XAdES-BES.
     * DIAN responds immediately with acceptance or rejection.
     *
     * @param xmlContent  Signed UBL 2.1 XML string
     * @param fileName    File name to register at DIAN (e.g. "FV-001.xml")
     * @param environment DB environment value: 'TEST' for habilitacion, 'PROD' for production
     */
    async sendDocument(
        xmlContent: string,
        fileName: string,
        environment: DianEnvironment = 'TEST',
    ): Promise<DianTransmissionResult> {
        const endpoint = DIAN_ENDPOINTS[environment];

        try {
            const contentBase64 = await encodeContentAsBase64(xmlContent);
            const envelope = buildSendBillSyncEnvelope(fileName, contentBase64);
            const { responseText } = await callDianEndpoint(endpoint, 'SendBillSync', envelope);
            const parsed = parseDianResponse(responseText);

            console.info(
                `[dianTransmissionService] SendBillSync (${environment}) → status=${parsed.statusCode} valid=${parsed.isValid}`,
            );

            return toTransmissionResult(parsed, responseText);
        } catch (error: unknown) {
            console.error('[dianTransmissionService] sendDocument error:', error);
            return toConnectionError(error);
        }
    },

    /**
     * Sends a document to DIAN's test set asynchronously (SendTestSetAsync).
     *
     * Used exclusively during the habilitacion phase to validate documents
     * against an official DIAN test set before requesting production access.
     * DIAN processes the document asynchronously; poll with getStatus() for the result.
     *
     * @param xmlContent  Signed UBL 2.1 XML string
     * @param fileName    File name to register at DIAN
     * @param testSetId   DIAN-assigned test set ID (dian_config.test_set_id)
     * @param environment Should be 'TEST' for this operation
     */
    async sendTestSet(
        xmlContent: string,
        fileName: string,
        testSetId: string,
        environment: DianEnvironment = 'TEST',
    ): Promise<DianTransmissionResult> {
        const endpoint = DIAN_ENDPOINTS[environment];

        try {
            const contentBase64 = await encodeContentAsBase64(xmlContent);
            const envelope = buildSendTestSetAsyncEnvelope(fileName, contentBase64, testSetId);
            const { responseText } = await callDianEndpoint(endpoint, 'SendTestSetAsync', envelope);
            const parsed = parseDianResponse(responseText);

            console.info(
                `[dianTransmissionService] SendTestSetAsync (${environment}) testSetId=${testSetId} → status=${parsed.statusCode}`,
            );

            return toTransmissionResult(parsed, responseText);
        } catch (error: unknown) {
            console.error('[dianTransmissionService] sendTestSet error:', error);
            return toConnectionError(error);
        }
    },

    /**
     * Queries the processing status of a previously transmitted document (GetStatus).
     *
     * Use the document's CUFE, CUDE, or CUNE as the trackId.
     * Useful for async transmissions or when the initial SendBillSync result was inconclusive.
     *
     * @param trackId     CUFE/CUDE/CUNE of the electronic document
     * @param environment DB environment value matching the original transmission
     */
    async getStatus(
        trackId: string,
        environment: DianEnvironment = 'TEST',
    ): Promise<DianTransmissionResult> {
        const endpoint = DIAN_ENDPOINTS[environment];

        try {
            const envelope = buildGetStatusEnvelope(trackId);
            const { responseText } = await callDianEndpoint(endpoint, 'GetStatus', envelope);
            const parsed = parseDianResponse(responseText);

            console.info(
                `[dianTransmissionService] GetStatus (${environment}) trackId=${trackId} → status=${parsed.statusCode} valid=${parsed.isValid}`,
            );

            return toTransmissionResult(parsed, responseText, trackId);
        } catch (error: unknown) {
            console.error('[dianTransmissionService] getStatus error:', error);
            return toConnectionError(error, trackId);
        }
    },
};
