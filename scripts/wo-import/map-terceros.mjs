// Mapeo WorldOffice → GVM para la importación de terceros (Fase 1).
// El catálogo `taxpayer_types` de la base ya usa los MISMOS nombres que la
// columna "Propiedad Retención" de WorldOffice, así que el mapeo es 1:1 salvo
// un caso que WO tiene y nosotros no ("Instituciones del Estado").

export const TAXPAYER_MAP = {
    'Persona Natural No Responsable del IVA': 'PN_NO_RESP_IVA',
    'Persona Juridica': 'PJ',
    'Persona Natural Responsable del IVA': 'PN_RESP_IVA',
    'Grande Contribuyente Autorretenedor': 'GC_AUTORRET',
    'Tercero del Exterior': 'EXTERIOR',
    'Persona Natural Responsable del IVA Agente retenedor': 'PN_RESP_IVA_AGENTE',
    'Régimen Simple de Tributación Persona Juridica': 'RST_PJ',
    'Persona Jurídica Autorretenedor': 'PJ_AUTORRET',
    'Grande Contribuyente No Autorretenedor': 'GC_NO_AUTORRET',
    'Entidades Sin Animo De Lucro': 'ESAL',
    'Régimen Simple de Tributación Persona Natural': 'RST_PN',
    'Persona Natural o Juridica Ley 1429': 'PN_LEY_1429',
    'Persona Natural Autorretenedor': 'PN_AUTORRET',
    // Sin equivalente en el catálogo actual → se crea código propio.
    'Instituciones del Estado Publicos y Otros': 'ENTIDAD_ESTATAL',
};

/** Valores de WO que significan "sin dato": no deben sobrescribir nada. */
export const EMPTY_VALUES = new Set(['', 'Seleccione una opción', 'Seleccione una opcion']);

/** Documento normalizado para cruzar con `parties.doc_number`. */
export function normalizeDoc(v) {
    return String(v ?? '').trim().replace(/[.\-\s]/g, '').replace(/^0+/, '');
}

export function cleanText(v) {
    const s = String(v ?? '').trim();
    return EMPTY_VALUES.has(s) ? '' : s;
}

/** "True"/"False" de WO → booleano. */
export function toBool(v) {
    return String(v ?? '').trim().toLowerCase() === 'true';
}

/** Tarifa ICA de WO viene como fracción (0.00414 = 4,14 x 1000). */
export function icaRate(v) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
}
