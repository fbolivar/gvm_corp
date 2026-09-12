import {
    randomBytes,
    scryptSync,
    createCipheriv,
    createDecipheriv,
} from 'crypto';
import { gzipSync, gunzipSync } from 'zlib';

/**
 * Formato propietario .gvm — copia de seguridad cifrada de GVM Corp.
 *
 * Contenedor binario:
 *   [ magic "GVM1" (4) | version (1) | flags (1) | salt (16) | iv (12) | tag (16) | ciphertext (…) ]
 *
 * Cifrado: AES-256-GCM (autenticado, grado militar) sobre el JSON comprimido con gzip.
 * Llave: derivada con scrypt desde el secreto del servidor GVM_BACKUP_KEY + salt aleatorio por archivo.
 */

const MAGIC = Buffer.from('GVM1', 'ascii');
const VERSION = 1;
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

function masterSecret(): string {
    const secret = process.env.GVM_BACKUP_KEY;
    if (!secret || secret.length < 16) {
        throw new Error(
            'GVM_BACKUP_KEY no está configurada en el servidor. No se puede cifrar/descifrar el backup.'
        );
    }
    return secret;
}

function deriveKey(salt: Buffer): Buffer {
    return scryptSync(masterSecret(), salt, KEY_LEN);
}

/** ¿El buffer es un contenedor .gvm cifrado? (por los magic bytes) */
export function isGvm(buf: Buffer): boolean {
    return buf.length > MAGIC.length && buf.subarray(0, MAGIC.length).equals(MAGIC);
}

/** Cifra un JSON (string) → contenedor .gvm (Buffer). */
export function encryptGvm(plaintext: string): Buffer {
    const salt = randomBytes(SALT_LEN);
    const iv = randomBytes(IV_LEN);
    const key = deriveKey(salt);

    const compressed = gzipSync(Buffer.from(plaintext, 'utf8'));

    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
    const tag = cipher.getAuthTag();

    const header = Buffer.concat([
        MAGIC,
        Buffer.from([VERSION, 0]), // version, flags (0 = solo llave de servidor)
        salt,
        iv,
        tag,
    ]);
    return Buffer.concat([header, ciphertext]);
}

/** Descifra un contenedor .gvm (Buffer) → JSON (string). */
export function decryptGvm(buf: Buffer): string {
    if (!isGvm(buf)) {
        throw new Error('El archivo no es un backup .gvm válido (cabecera incorrecta).');
    }

    let offset = MAGIC.length;
    const version = buf[offset];
    offset += 1;
    offset += 1; // flags (reservado)

    if (version !== VERSION) {
        throw new Error(`Versión de backup .gvm no soportada: ${version}`);
    }

    const salt = buf.subarray(offset, offset + SALT_LEN);
    offset += SALT_LEN;
    const iv = buf.subarray(offset, offset + IV_LEN);
    offset += IV_LEN;
    const tag = buf.subarray(offset, offset + TAG_LEN);
    offset += TAG_LEN;
    const ciphertext = buf.subarray(offset);

    const key = deriveKey(salt);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    let compressed: Buffer;
    try {
        compressed = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch {
        throw new Error(
            'No se pudo descifrar el backup: llave incorrecta o archivo alterado (fallo de autenticación).'
        );
    }

    return gunzipSync(compressed).toString('utf8');
}

/**
 * Lee un archivo de backup (Buffer) que puede ser `.gvm` cifrado o `.json` legado,
 * y devuelve el objeto de backup parseado. Mantiene compatibilidad con backups viejos.
 */
export function parseBackupBuffer(buf: Buffer): Record<string, unknown> {
    const json = isGvm(buf) ? decryptGvm(buf) : buf.toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
}
