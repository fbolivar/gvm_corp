/**
 * DIAN Web Service SOAP Envelope Builder
 *
 * WS Endpoints:
 *   Habilitacion: https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc
 *   Produccion:   https://vpfe.dian.gov.co/WcfDianCustomerServices.svc
 *
 * Protocol: SOAP 1.1 over HTTPS
 * Namespace: http://wcf.dian.colombia
 */

/**
 * Builds a SendBillSync SOAP envelope.
 * Used to synchronously send a single electronic document (invoice, credit note, etc.)
 * and receive an immediate DIAN response.
 *
 * @param fileName     Name of the file being sent (e.g. "FACT-001.xml" or "FACT-001.zip")
 * @param contentBase64 Base64-encoded content of the document or ZIP archive
 */
export function buildSendBillSyncEnvelope(fileName: string, contentBase64: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wcf="http://wcf.dian.colombia">
  <soap:Header/>
  <soap:Body>
    <wcf:SendBillSync>
      <wcf:fileName>${fileName}</wcf:fileName>
      <wcf:contentFile>${contentBase64}</wcf:contentFile>
    </wcf:SendBillSync>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Builds a SendTestSetAsync SOAP envelope.
 * Used during the habilitacion (testing) phase to send documents against a test set
 * provided by DIAN before going to production.
 *
 * @param fileName     Name of the file being sent
 * @param contentBase64 Base64-encoded content
 * @param testSetId    DIAN-assigned test set identifier (from dian_config.test_set_id)
 */
export function buildSendTestSetAsyncEnvelope(
    fileName: string,
    contentBase64: string,
    testSetId: string,
): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wcf="http://wcf.dian.colombia">
  <soap:Header/>
  <soap:Body>
    <wcf:SendTestSetAsync>
      <wcf:fileName>${fileName}</wcf:fileName>
      <wcf:contentFile>${contentBase64}</wcf:contentFile>
      <wcf:testSetId>${testSetId}</wcf:testSetId>
    </wcf:SendTestSetAsync>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Builds a GetStatus SOAP envelope.
 * Used to query the current processing status of a previously submitted document
 * using its CUFE/CUDE as the trackId.
 *
 * @param trackId CUFE, CUDE, or CUNE of the electronic document
 */
export function buildGetStatusEnvelope(trackId: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wcf="http://wcf.dian.colombia">
  <soap:Header/>
  <soap:Body>
    <wcf:GetStatus>
      <wcf:trackId>${trackId}</wcf:trackId>
    </wcf:GetStatus>
  </soap:Body>
</soap:Envelope>`;
}

/**
 * Builds a GetStatusZip SOAP envelope.
 * Used to retrieve the full application response XML (ApplicationResponse)
 * returned by DIAN as a ZIP archive identified by the document's trackId.
 *
 * @param trackId CUFE, CUDE, or CUNE of the electronic document
 */
export function buildGetStatusZipEnvelope(trackId: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wcf="http://wcf.dian.colombia">
  <soap:Header/>
  <soap:Body>
    <wcf:GetStatusZip>
      <wcf:trackId>${trackId}</wcf:trackId>
    </wcf:GetStatusZip>
  </soap:Body>
</soap:Envelope>`;
}

/** Parsed representation of a DIAN SOAP response */
export interface DianSoapParsedResponse {
    isValid: boolean;
    statusCode: string;
    statusDescription: string;
    statusMessage: string;
    errorMessages: string[];
    xmlBase64?: string;
}

/**
 * Parses a raw DIAN SOAP XML response string into a structured object.
 * Handles both successful responses and SOAP fault payloads.
 *
 * @param responseXml Raw XML string returned by the DIAN web service
 */
export function parseDianResponse(responseXml: string): DianSoapParsedResponse {
    // SOAP Fault short-circuit: return a clear error if the service returned a fault
    if (responseXml.includes('<soap:Fault>') || responseXml.includes('<s:Fault>')) {
        const faultStringMatch = responseXml.match(/<faultstring>([\s\S]*?)<\/faultstring>/);
        const faultMsg = faultStringMatch?.[1] ?? 'SOAP Fault sin detalle';
        return {
            isValid: false,
            statusCode: 'SOAP_FAULT',
            statusDescription: faultMsg,
            statusMessage: faultMsg,
            errorMessages: [faultMsg],
        };
    }

    // StatusCode (e.g. "00" = aceptado, "99" = rechazado)
    const statusCodeMatch = responseXml.match(/<b:StatusCode>(.*?)<\/b:StatusCode>/);
    const statusCode = statusCodeMatch?.[1]?.trim() ?? '';

    // StatusDescription
    const statusDescMatch = responseXml.match(/<b:StatusDescription>(.*?)<\/b:StatusDescription>/);
    const statusDescription = statusDescMatch?.[1]?.trim() ?? '';

    // StatusMessage (may span multiple lines)
    const statusMsgMatch = responseXml.match(/<b:StatusMessage>([\s\S]*?)<\/b:StatusMessage>/);
    const statusMessage = statusMsgMatch?.[1]?.trim() ?? '';

    // IsValid flag
    const isValidMatch = responseXml.match(/<b:IsValid>(.*?)<\/b:IsValid>/);
    const isValid = isValidMatch?.[1]?.trim().toLowerCase() === 'true';

    // Collect all error/notification strings from the ErrorMessage array
    const errorMessages: string[] = [];
    const errorRegex = /<b:string>([\s\S]*?)<\/b:string>/g;
    let match: RegExpExecArray | null;
    while ((match = errorRegex.exec(responseXml)) !== null) {
        const msg = match[1]?.trim();
        if (msg) errorMessages.push(msg);
    }

    // ApplicationResponse XML payload (base64-encoded, present on accepted documents)
    const xmlBase64Match = responseXml.match(/<b:XmlBase64Bytes>(.*?)<\/b:XmlBase64Bytes>/);
    const xmlBase64 = xmlBase64Match?.[1]?.trim() || undefined;

    return {
        isValid,
        statusCode,
        statusDescription,
        statusMessage,
        errorMessages,
        xmlBase64,
    };
}
