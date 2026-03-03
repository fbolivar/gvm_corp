/**
 * certificateService.ts
 *
 * Parses a PKCS#12 (.p12) certificate stored as base64 and extracts:
 *   - privateKey  (crypto.KeyObject)
 *   - certDer     (raw DER bytes of the end-entity X.509 certificate)
 *   - certPem     (PEM string — for embedding in ds:X509Certificate)
 *   - issuer      (distinguished name string)
 *   - serial      (hex serial number string)
 *   - subject     (distinguished name string)
 *
 * DIAN Colombia requires that the signing certificate be issued by a DIAN-
 * accredited CA and be valid at signing time.  Validity-window checks are
 * left to the caller / DIAN web service.
 *
 * SERVER-ONLY — uses Node.js `crypto` which is not available in the browser.
 */

import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ParsedCertificate {
    privateKey: crypto.KeyObject;
    /** DER bytes of the end-entity X.509 certificate. */
    certDer: Buffer;
    /** PEM-encoded certificate (for embedding in ds:X509Certificate). */
    certPem: string;
    /** Hex-encoded serial number. */
    serial: string;
    /** Issuer distinguished name (e.g. "CN=..., O=..., C=CO"). */
    issuer: string;
    /** Subject distinguished name. */
    subject: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a base64-encoded PKCS#12 archive and extracts the private key and
 * the first end-entity certificate found in the bag.
 *
 * @param p12Base64  Base64-encoded .p12 / .pfx file contents.
 * @param password   Password protecting the PKCS#12 file (UTF-8 string).
 * @returns          Parsed certificate data.
 * @throws           An error with a human-readable message if parsing fails.
 */
export function parseCertificate(p12Base64: string, password: string): ParsedCertificate {
    if (!p12Base64 || p12Base64.trim() === '') {
        throw new Error(
            'El certificado digital no está configurado. ' +
            'Configure el certificado .p12 en los ajustes de DIAN.',
        );
    }

    const p12Der = Buffer.from(p12Base64, 'base64');

    // -------------------------------------------------------------------------
    // Extract private key
    // -------------------------------------------------------------------------
    // Node.js crypto.createPrivateKey() accepts PKCS#12 via the 'pkcs12' format
    // string (undocumented but supported since Node 15; Node 18+ LTS is stable).
    // We try the pkcs12 path first, then fall back to raw DER/PEM attempts.
    const privateKey = extractPrivateKey(p12Der, password);

    // -------------------------------------------------------------------------
    // Extract X.509 certificate
    // -------------------------------------------------------------------------
    // Node does NOT expose a first-class PKCS#12 → certificate list API, so we
    // walk the DER blob to find any embedded X.509 certificate structure.
    let certDer: Buffer;
    let x509: crypto.X509Certificate;

    try {
        certDer = extractFirstCertFromP12(p12Der);
        x509 = new crypto.X509Certificate(certDer);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(
            `No se pudo extraer el certificado X.509 del archivo .p12: ${msg}. ` +
            'Verifique que el archivo sea un PKCS#12 válido y que la contraseña sea correcta.',
        );
    }

    const certPem = x509.toString(); // returns PEM representation
    const serial = x509.serialNumber; // already hex string
    const issuer = x509.issuer;
    const subject = x509.subject;

    return { privateKey, certDer, certPem, serial, issuer, subject };
}

// ---------------------------------------------------------------------------
// Internal: private key extraction
// ---------------------------------------------------------------------------

/**
 * Attempts to extract a private key from a PKCS#12 DER buffer.
 * Tries multiple Node.js crypto API variants for compatibility.
 */
function extractPrivateKey(p12Der: Buffer, password: string): crypto.KeyObject {
    const passphrase = Buffer.from(password, 'utf8');

    // Attempt 1 — pkcs12 format (Node 18+ fully stable, 15+ usable)
    try {
        return crypto.createPrivateKey({
            key: p12Der,
            // We cast via unknown because older @types/node versions may not
            // include the 'pkcs12' format string in their type definitions,
            // even though the Node runtime supports it.
            format: 'pkcs12' as unknown as 'der',
            passphrase,
        });
    } catch {
        // Fall through to next attempt
    }

    // Attempt 2 — raw PKCS#8 DER (if someone passes an unwrapped private key)
    try {
        return crypto.createPrivateKey({
            key: p12Der,
            format: 'der',
            type: 'pkcs8',
            passphrase,
        });
    } catch {
        // Fall through to next attempt
    }

    // Attempt 3 — PKCS#1 DER (RSA legacy format)
    try {
        return crypto.createPrivateKey({
            key: p12Der,
            format: 'der',
            type: 'pkcs1',
        });
    } catch {
        // All attempts exhausted
    }

    throw new Error(
        'No se pudo extraer la llave privada del certificado .p12. ' +
        'Verifique que el archivo sea válido y que la contraseña sea correcta.',
    );
}

// ---------------------------------------------------------------------------
// Internal: X.509 certificate extraction from PKCS#12 DER blob
// ---------------------------------------------------------------------------

/**
 * Walks the PKCS#12 DER structure to find the first X.509 certificate embedded
 * anywhere in the blob.
 *
 * Strategy: scan every offset for a valid DER SEQUENCE that `crypto.X509Certificate`
 * accepts.  This is O(n²) but PKCS#12 files are typically < 10 KB so it is fast.
 */
function extractFirstCertFromP12(p12Der: Buffer): Buffer {
    const len = p12Der.length;

    for (let i = 0; i < len - 4; i++) {
        // X.509 certificates are DER SEQUENCE (tag 0x30)
        if (p12Der[i] !== 0x30) continue;

        const { value: innerLen, bytesRead } = readDerLength(p12Der, i + 1);
        if (innerLen < 20) continue; // too short to be any certificate

        const end = i + 1 + bytesRead + innerLen;
        if (end > len) continue;

        const candidate = p12Der.subarray(i, end);

        // Validate by attempting to parse — this is the most reliable check
        try {
            new crypto.X509Certificate(candidate);
            return Buffer.from(candidate);
        } catch {
            // Not a certificate at this byte offset; continue scanning
        }
    }

    throw new Error(
        'No se encontró ningún certificado X.509 dentro del archivo PKCS#12. ' +
        'El archivo puede estar dañado o no ser un .p12 estándar.',
    );
}

// ---------------------------------------------------------------------------
// DER length decoding helper
// ---------------------------------------------------------------------------

/** Reads a DER-encoded length field starting at `offset` in `buf`. */
function readDerLength(buf: Buffer, offset: number): { value: number; bytesRead: number } {
    if (offset >= buf.length) return { value: 0, bytesRead: 1 };

    const first = buf[offset];

    if ((first & 0x80) === 0) {
        // Short form: length is in the lower 7 bits
        return { value: first, bytesRead: 1 };
    }

    // Long form: next `numOctets` bytes contain the length
    const numOctets = first & 0x7f;
    if (numOctets === 0 || offset + numOctets >= buf.length) {
        return { value: 0, bytesRead: 1 };
    }

    let value = 0;
    for (let i = 1; i <= numOctets; i++) {
        value = (value << 8) | buf[offset + i];
    }

    return { value, bytesRead: 1 + numOctets };
}
