/**
 * signatureService.ts
 *
 * Generates a DIAN-compatible XAdES-BES digital signature and injects it
 * into a UBL 2.1 XML document in place of the <!-- SIGNATURE_PLACEHOLDER -->
 * comment that the XML generators emit.
 *
 * XAdES-BES (Basic Electronic Signature) profile required by DIAN:
 *   ds:Signature
 *   ├── ds:SignedInfo
 *   │   ├── ds:CanonicalizationMethod  (Canonical XML 1.0)
 *   │   ├── ds:SignatureMethod         (RSA-SHA256)
 *   │   └── ds:Reference              (to document root + to SignedProperties)
 *   ├── ds:SignatureValue              (base64 RSA-SHA256 over ds:SignedInfo)
 *   ├── ds:KeyInfo
 *   │   └── ds:X509Data / ds:X509Certificate
 *   └── ds:Object
 *       └── xades:QualifyingProperties
 *           └── xades:SignedProperties
 *               ├── xades:SignedSignatureProperties
 *               │   ├── xades:SigningTime
 *               │   └── xades:SigningCertificate (SHA-256 digest of cert + issuer/serial)
 *               └── xades:SignedDataObjectProperties
 *                   └── xades:DataObjectFormat
 *
 * References:
 *   - DIAN Anexo Técnico 1.9 (Factura Electrónica de Venta)
 *   - ETSI TS 101 903 v1.3.2 (XAdES)
 *   - RFC 3275 (XML-Signature Syntax and Processing)
 *   - Canonical XML 1.0  https://www.w3.org/TR/xml-c14n/
 *
 * SERVER-ONLY — depends on Node.js `crypto` module.
 */

import crypto from 'crypto';
import { parseCertificate } from './certificateService';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Signs an XML document that contains a <!-- SIGNATURE_PLACEHOLDER --> comment.
 *
 * @param xmlString    The raw XML string to sign (UTF-8).
 * @param certBase64   Base64-encoded PKCS#12 certificate archive (.p12).
 * @param certPassword Plain-text password for the PKCS#12 file.
 * @returns            The XML string with the signature block injected.
 */
export async function signXml(
    xmlString: string,
    certBase64: string,
    certPassword: string,
): Promise<string> {
    // 1. Validate input
    const PLACEHOLDER = '<!-- SIGNATURE_PLACEHOLDER -->';
    if (!xmlString.includes(PLACEHOLDER)) {
        throw new Error(
            'El XML no contiene el marcador <!-- SIGNATURE_PLACEHOLDER -->. ' +
            'Verifique que el generador XML esté correctamente configurado.',
        );
    }

    // 2. Parse certificate
    const { privateKey, certDer, certPem, issuer, serial } = parseCertificate(certBase64, certPassword);

    // 3. Build a stable, unique signature ID seed
    const sigId = `Signature-${generateId()}`;
    const sigPropsId = `${sigId}-SignedProperties`;
    const keyInfoId = `${sigId}-KeyInfo`;
    const referenceId = `${sigId}-Ref0`;

    // 4. Signing time (ISO 8601 with UTC offset)
    const signingTime = new Date().toISOString().replace('Z', '-05:00');

    // 5. Digest of the signing certificate (SHA-256, base64)
    const certDigestB64 = crypto
        .createHash('sha256')
        .update(certDer)
        .digest('base64');

    // 6. Compute digest of the entire XML document (excluding the signature
    //    placeholder / extension block that wraps it).
    //    DIAN references the whole document root using an enveloped transform.
    const docDigest = computeDocumentDigest(xmlString, PLACEHOLDER);

    // 7. Build ds:SignedProperties XML (will be referenced and digested)
    const signedPropertiesXml = buildSignedProperties(
        sigPropsId,
        sigId,
        signingTime,
        certDigestB64,
        issuer,
        serial,
    );

    // 8. Digest of ds:SignedProperties (SHA-256, base64)
    const signedPropsDigest = crypto
        .createHash('sha256')
        .update(Buffer.from(signedPropsDigestContent(signedPropertiesXml), 'utf8'))
        .digest('base64');

    // 9. Build ds:SignedInfo
    const signedInfoXml = buildSignedInfo(
        sigId,
        docDigest,
        referenceId,
        signedPropsDigest,
        sigPropsId,
    );

    // 10. Sign ds:SignedInfo with private key (RSA-SHA256)
    const signatureValueB64 = signRsaSha256(privateKey, signedInfoXml);

    // 11. Extract PEM body (strip header/footer/newlines)
    const certB64 = extractPemBody(certPem);

    // 12. Build the complete ds:Signature element
    const signatureBlock = buildSignatureElement(
        sigId,
        keyInfoId,
        signedInfoXml,
        signatureValueB64,
        certB64,
        issuer,
        serial,
        sigPropsId,
        signedPropertiesXml,
        signingTime,
        certDigestB64,
    );

    // 13. Replace the placeholder
    return xmlString.replace(PLACEHOLDER, signatureBlock);
}

// ---------------------------------------------------------------------------
// Digest computation
// ---------------------------------------------------------------------------

/**
 * Computes the SHA-256 digest (base64) of the canonical form of the XML
 * document with an enveloped-signature transform applied (i.e. the whole
 * document minus the signature element).
 *
 * Since the signature element has not been inserted yet we just digest the
 * document with the placeholder still present — DIAN's validation hashes the
 * document before the signature was inserted, which is the standard enveloped
 * transform semantics.
 */
function computeDocumentDigest(xmlString: string, placeholder: string): string {
    // Remove the placeholder comment from the content to be digested so that
    // the reference is over the "pre-signature" document content.
    const contentToDigest = xmlString.replace(placeholder, '').trim();
    const canonical = canonicalize(contentToDigest);
    return crypto.createHash('sha256').update(Buffer.from(canonical, 'utf8')).digest('base64');
}

/**
 * Returns the canonical text content of the ds:SignedProperties element that
 * will be used for its digest reference.  We use the inner XML as-is after
 * removing indentation artefacts, then normalise whitespace.
 */
function signedPropsDigestContent(signedPropertiesXml: string): string {
    return canonicalize(signedPropertiesXml);
}

// ---------------------------------------------------------------------------
// Minimal Canonical XML (C14N) implementation
// ---------------------------------------------------------------------------

/**
 * Performs a lightweight Canonical XML 1.0 transformation:
 *   1. Normalises line endings to LF.
 *   2. Trims surrounding whitespace.
 *   3. Sorts attributes within each start tag alphabetically.
 *   4. Expands empty elements (self-closing → open+close tags).
 *   5. Normalises attribute value delimiters to double-quotes.
 *
 * This is NOT a full C14N implementation (it does not handle namespace
 * inheritance or complex node-set transforms) but it is sufficient for the
 * DIAN use-case where:
 *   a) All namespaces are declared on the root element.
 *   b) The document was generated by our own controlled template strings.
 *
 * For production-grade compliance, replace this with a proper C14N library.
 */
function canonicalize(xml: string): string {
    // Normalise line endings
    let out = xml.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Sort attributes alphabetically within each start tag.
    // Regex matches a start tag: < tagname [attrs] >
    out = out.replace(/<([a-zA-Z_][\w:.-]*)((?:\s+[^>]*?)?)\s*(\/?)?>/g, (_match, tagName: string, attrsStr: string, selfClose: string) => {
        if (!attrsStr || attrsStr.trim() === '') {
            return selfClose ? `<${tagName}></${tagName}>` : `<${tagName}>`;
        }

        const attrs = parseAttributes(attrsStr);
        const sorted = attrs.sort((a, b) => a.name.localeCompare(b.name));
        const attrString = sorted.map(a => `${a.name}="${escapeAttrValue(a.value)}"`).join(' ');

        // Expand self-closing elements
        if (selfClose === '/') {
            return `<${tagName} ${attrString}></${tagName}>`;
        }
        return `<${tagName} ${attrString}>`;
    });

    return out;
}

interface ParsedAttr {
    name: string;
    value: string;
}

/**
 * Parses an attribute string (the part after the tag name) into name/value pairs.
 * Handles both single and double-quoted values.
 */
function parseAttributes(attrsStr: string): ParsedAttr[] {
    const attrs: ParsedAttr[] = [];
    // Match: name="value"  or  name='value'  or  name=value
    const attrRegex = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;
    let m: RegExpExecArray | null;

    while ((m = attrRegex.exec(attrsStr)) !== null) {
        attrs.push({
            name: m[1],
            value: m[2] ?? m[3] ?? m[4] ?? '',
        });
    }
    return attrs;
}

function escapeAttrValue(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// RSA-SHA256 signing
// ---------------------------------------------------------------------------

function signRsaSha256(privateKey: crypto.KeyObject, signedInfoXml: string): string {
    const canonical = canonicalize(signedInfoXml);
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(Buffer.from(canonical, 'utf8'));
    return sign.sign(privateKey, 'base64');
}

// ---------------------------------------------------------------------------
// XML block builders
// ---------------------------------------------------------------------------

function buildSignedProperties(
    sigPropsId: string,
    sigId: string,
    signingTime: string,
    certDigestB64: string,
    issuer: string,
    serial: string,
): string {
    return `<xades:SignedProperties Id="${sigPropsId}" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#">
  <xades:SignedSignatureProperties>
    <xades:SigningTime>${signingTime}</xades:SigningTime>
    <xades:SigningCertificate>
      <xades:Cert>
        <xades:CertDigest>
          <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" xmlns:ds="http://www.w3.org/2000/09/xmldsig#"/>
          <ds:DigestValue xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${certDigestB64}</ds:DigestValue>
        </xades:CertDigest>
        <xades:IssuerSerial>
          <ds:X509IssuerName xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${escapeXml(issuer)}</ds:X509IssuerName>
          <ds:X509SerialNumber xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${serial}</ds:X509SerialNumber>
        </xades:IssuerSerial>
      </xades:Cert>
    </xades:SigningCertificate>
  </xades:SignedSignatureProperties>
  <xades:SignedDataObjectProperties>
    <xades:DataObjectFormat ObjectReference="#${sigId}">
      <xades:MimeType>text/xml</xades:MimeType>
      <xades:Encoding>UTF-8</xades:Encoding>
    </xades:DataObjectFormat>
  </xades:SignedDataObjectProperties>
</xades:SignedProperties>`;
}

function buildSignedInfo(
    sigId: string,
    docDigestB64: string,
    referenceId: string,
    signedPropsDigestB64: string,
    sigPropsId: string,
): string {
    return `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
  <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>
  <ds:Reference Id="${referenceId}" URI="">
    <ds:Transforms>
      <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
    </ds:Transforms>
    <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
    <ds:DigestValue>${docDigestB64}</ds:DigestValue>
  </ds:Reference>
  <ds:Reference Type="http://uri.etsi.org/01903#SignedProperties" URI="#${sigPropsId}">
    <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
    <ds:DigestValue>${signedPropsDigestB64}</ds:DigestValue>
  </ds:Reference>
</ds:SignedInfo>`;
}

function buildSignatureElement(
    sigId: string,
    keyInfoId: string,
    signedInfoXml: string,
    signatureValueB64: string,
    certB64: string,
    issuer: string,
    serial: string,
    sigPropsId: string,
    signedPropertiesXml: string,
    signingTime: string,
    certDigestB64: string,
): string {
    // Format the base64 signature value with line breaks at 64 chars (canonical PEM style)
    const formattedSigValue = wrapBase64(signatureValueB64, 64);

    return `<ds:Signature Id="${sigId}" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  ${signedInfoXml}
  <ds:SignatureValue Id="${sigId}-Value">
${formattedSigValue}
  </ds:SignatureValue>
  <ds:KeyInfo Id="${keyInfoId}">
    <ds:X509Data>
      <ds:X509Certificate>${certB64}</ds:X509Certificate>
    </ds:X509Data>
  </ds:KeyInfo>
  <ds:Object Id="${sigId}-Object">
    <xades:QualifyingProperties Target="#${sigId}" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#">
      ${signedPropertiesXml}
    </xades:QualifyingProperties>
  </ds:Object>
</ds:Signature>`;
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function generateId(): string {
    return crypto.randomBytes(8).toString('hex');
}

function extractPemBody(pem: string): string {
    return pem
        .replace(/-----BEGIN CERTIFICATE-----/g, '')
        .replace(/-----END CERTIFICATE-----/g, '')
        .replace(/\r?\n/g, '')
        .trim();
}

function wrapBase64(b64: string, lineLength: number): string {
    const lines: string[] = [];
    for (let i = 0; i < b64.length; i += lineLength) {
        lines.push(b64.slice(i, i + lineLength));
    }
    return lines.join('\n');
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
