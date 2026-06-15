/**
 * Helpers puros para los carnets QR de empleados.
 *
 * Se mantienen libres de React y de Supabase a propósito: así pueden probarse
 * con unit tests y ser la ÚNICA fuente de verdad tanto para el server action
 * (kioskActions) como para el componente visual (EmployeeQRCards).
 *
 * Auto-Blindaje: esta lógica ya se rompió dos veces en producción
 *   1) empleados sin `party` salían como "Sin nombre" (no se miraba profiles)
 *   2) contract_type en español (INDEFINIDO) caía al fallback "Empleado Activo"
 * Los tests en carnetHelpers.test.ts congelan estos comportamientos.
 */

export const DEFAULT_CARGO = 'Empleado Activo'
export const NO_NAME = 'Sin nombre'

/** Etiquetas de cargo por tipo de contrato. Soporta claves en inglés (enum) y
 *  en español (valores reales sembrados en la BD de GVM). */
export const CONTRACT_LABELS: Record<string, string> = {
    // Inglés (enum)
    INDEFINITE: 'Contrato Indefinido',
    FIXED_TERM: 'Término Fijo',
    TEMPORARY: 'Contrato Temporal',
    FREELANCE: 'Prestación de Servicios',
    INTERN: 'Practicante',
    // Español (valores reales en BD)
    INDEFINIDO: 'Contrato Indefinido',
    TERMINO_FIJO: 'Término Fijo',
    FIJO: 'Término Fijo',
    TEMPORAL: 'Contrato Temporal',
    PRESTACION_SERVICIOS: 'Prestación de Servicios',
    SERVICIOS: 'Prestación de Servicios',
    PRACTICANTE: 'Practicante',
    APRENDIZ: 'Aprendiz',
}

/** Devuelve la etiqueta de cargo legible. Nunca lanza; cae a DEFAULT_CARGO. */
export function contractLabel(type: string | null | undefined): string {
    if (!type) return DEFAULT_CARGO
    return CONTRACT_LABELS[type] ?? CONTRACT_LABELS[type.toUpperCase()] ?? DEFAULT_CARGO
}

export interface PartyRow {
    legal_name?: string | null
    doc_number?: string | null
}

/**
 * PostgREST devuelve la relación embebida (`parties`) como objeto o como array
 * según la cardinalidad detectada. Esta función normaliza ambos casos a un solo
 * objeto (o null). NO cambiar sin actualizar los tests.
 */
export function resolvePartyRow(raw: PartyRow | PartyRow[] | null | undefined): PartyRow | null {
    if (!raw) return null
    const row = Array.isArray(raw) ? raw[0] : raw
    return row ?? null
}

/**
 * Resuelve el nombre del empleado con cascada de respaldos:
 *   1) nombre legal del tercero (party)
 *   2) nombre del perfil de usuario (profiles.full_name)
 *   3) "Sin nombre"
 */
export function resolveEmployeeName(
    party: PartyRow | null | undefined,
    profileName?: string | null,
): string {
    const fromParty = party?.legal_name?.trim()
    if (fromParty) return fromParty
    const fromProfile = profileName?.trim()
    if (fromProfile) return fromProfile
    return NO_NAME
}

/** Formatea el documento con separador de miles (1039293456 → 1.039.293.456). */
export function formatDocNumber(doc: string | null | undefined): string {
    const clean = (doc || '').trim()
    if (!clean) return '—'
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** Iniciales (máx. 2) a partir del nombre. */
export function getInitials(name: string): string {
    return (name || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase()
}

/** Parte el nombre en dos líneas para el carnet (2 + 2 palabras). */
export function splitName(name: string): { line1: string; line2: string } {
    const words = (name || '').split(' ').filter(Boolean)
    return {
        line1: words.slice(0, 2).join(' '),
        line2: words.slice(2, 4).join(' '),
    }
}
