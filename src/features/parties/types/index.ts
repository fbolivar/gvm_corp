import { z } from 'zod';
import { calculateDV } from '@/shared/utils/nit';

// Enums
export const PartyTypeEnum = z.enum(['PERSON', 'COMPANY']);
export const DocTypeEnum = z.enum([
    'CC', 'NIT', 'CE', 'TE', 'TI', 'RC', 'PP', 'DIE', 'PEP', 'PPT', 'NUIP', 'NIT_OTRO', 'SIN_ID',
]);

// Etiquetas legibles del tipo de documento.
export const DOC_TYPE_LABELS: Record<string, string> = {
    CC: 'Cédula de Ciudadanía',
    NIT: 'NIT',
    CE: 'Cédula de Extranjería',
    TE: 'Tarjeta de Extranjería',
    TI: 'Tarjeta de Identidad',
    RC: 'Registro Civil',
    PP: 'Pasaporte',
    DIE: 'Documento de Identificación Extranjero',
    PEP: 'PEP — Permiso Especial de Permanencia',
    PPT: 'PPT — Permiso por Protección Temporal',
    NUIP: 'NUIP',
    NIT_OTRO: 'NIT de otro país',
    SIN_ID: 'Sin identificación / uso DIAN',
};

// Código DIAN por tipo de documento (para Exógena / factura electrónica).
export const DOC_TYPE_DIAN_CODE: Record<string, string> = {
    RC: '11', TI: '12', CC: '13', TE: '21', CE: '22', NIT: '31',
    PP: '41', DIE: '42', SIN_ID: '43', PEP: '47', PPT: '48', NIT_OTRO: '50', NUIP: '91',
};

export const PropertyTypeEnum = z.enum([
    'CLIENTE',
    'PROVEEDOR',
    'BANCO',
    'VENDEDOR',
    'EMPLEADO',
    'FONDO_SOCIO',
    'ADMIN_IMPUESTOS_DISTRITALES',
    'ADMIN_IMPUESTOS_NACIONALES',
    'TRABAJADOR_INDEPENDIENTE',
]);

/**
 * Códigos actuales del catálogo `taxpayer_types` (los mismos que WorldOffice).
 * Se usan para pintar el selector; la validación NO se hace contra esta lista
 * porque el catálogo vive en la base y puede crecer: un enum cerrado aquí
 * bloqueaba la edición de cualquier tercero con un código nuevo.
 */
export const TAXPAYER_TYPE_CODES = [
    'PJ',
    'PJ_AUTORRET',
    'PN_NO_RESP_IVA',
    'PN_RESP_IVA',
    'PN_RESP_IVA_AGENTE',
    'PN_AUTORRET',
    'PN_LEY_1429',
    'GC_AUTORRET',
    'GC_NO_AUTORRET',
    'RST_PJ',
    'RST_PN',
    'ESAL',
    'ENTIDAD_ESTATAL',
    'EXTERIOR',
] as const;

/** Se conserva por compatibilidad con el código que aún importa el enum. */
export const TaxpayerTypeEnum = z.enum(TAXPAYER_TYPE_CODES);

export const PaymentMethodEnum = z.enum([
    'TRANSFERENCIA',
    'EFECTIVO',
    'CHEQUE',
    'TARJETA_CREDITO',
    'TARJETA_DEBITO',
    'CONSIGNACION',
    'NEQUI',
    'DAVIPLATA',
    'GIRO',
    'COMPENSACION',
    'OTRO',
]);

export type PartyType = z.infer<typeof PartyTypeEnum>;
export type DocType = z.infer<typeof DocTypeEnum>;
export type PropertyType = z.infer<typeof PropertyTypeEnum>;
export type TaxpayerType = z.infer<typeof TaxpayerTypeEnum>;
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

// Base Schema
export const partySchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),

    // Identity
    party_type: PartyTypeEnum,
    legal_name: z.string().min(3, "El nombre legal es requerido"),
    trade_name: z.string().optional().nullable(),
    // Nombres separados (persona natural) para Información Exógena.
    first_name: z.string().optional().nullable(),
    second_name: z.string().optional().nullable(),
    first_surname: z.string().optional().nullable(),
    second_surname: z.string().optional().nullable(),
    doc_type: DocTypeEnum,
    doc_number: z.string().min(5, "Número de documento inválido"),
    nit: z.string().optional().nullable(),
    dv: z.string().max(1).optional().nullable(),

    // Contact
    email: z.string().email("Email inválido").optional().nullable().or(z.literal('')),
    phone: z.string().optional().nullable(),

    // Address
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    department: z.string().optional().nullable(),
    country: z.string().default('CO').optional().nullable(),

    // Roles
    is_customer: z.boolean().default(false),
    is_vendor: z.boolean().default(false),
    property_type: PropertyTypeEnum.default('CLIENTE').optional(),
    // Propiedades/roles adicionales (multi) al estilo WorldOffice.
    properties: z.array(z.string()).optional().nullable(),

    // Commercial
    payment_term_days: z.coerce.number().int().min(0).default(0).optional(),
    credit_limit: z.coerce.number().min(0).default(0).optional(),
    salesperson_id: z.string().uuid().optional().nullable(),
    price_list_id: z.string().uuid().optional().nullable(),
    payment_method: PaymentMethodEnum.default('TRANSFERENCIA').optional(),

    // Fiscal
    economic_activity: z.string().optional().nullable(),
    // Cualquier código del catálogo taxpayer_types. NO se valida contra un enum:
    // la lista la administra la base y un enum cerrado impedía guardar la ficha.
    taxpayer_type: z.string().optional().nullable(),

    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});
// El DV NO se valida contra la fórmula: se decidió que el usuario pueda
// escribirlo a mano (hay RUT donde el calculado no corresponde). El formulario
// avisa en pantalla cuando difiere del sugerido, pero no impide guardar —
// exigir la coincidencia bloqueaba la creación de clientes.

export type Party = z.infer<typeof partySchema>;

// Filtros para listado
export const partyFilterSchema = z.object({
    search: z.string().optional(),
    type: PartyTypeEnum.optional(),
    role: z.enum(['customer', 'vendor', 'all']).default('all'),
    page: z.number().default(1),
    per_page: z.number().default(10),
});

export type PartyFilters = z.infer<typeof partyFilterSchema>;

// Labels para mostrar en UI
export const PROPERTY_TYPE_LABELS: Record<string, string> = {
    CLIENTE: 'Cliente',
    PROVEEDOR: 'Proveedor',
    BANCO: 'Banco',
    VENDEDOR: 'Vendedor',
    EMPLEADO: 'Empleado',
    FONDO_SOCIO: 'Fondo / Socio',
    ADMIN_IMPUESTOS_DISTRITALES: 'Adm. Impuestos Distritales',
    ADMIN_IMPUESTOS_NACIONALES: 'Adm. Impuestos Nacionales',
    TRABAJADOR_INDEPENDIENTE: 'Trabajador Independiente',
};

export const TAXPAYER_TYPE_LABELS: Record<string, string> = {
    // Catálogo actual (igual que WorldOffice)
    PJ: 'Persona Jurídica',
    PJ_AUTORRET: 'Persona Jurídica Autorretenedor',
    PN_NO_RESP_IVA: 'Persona Natural No Responsable de IVA',
    PN_RESP_IVA: 'Persona Natural Responsable de IVA',
    PN_RESP_IVA_AGENTE: 'Persona Natural Responsable de IVA — Agente retenedor',
    PN_AUTORRET: 'Persona Natural Autorretenedor',
    PN_LEY_1429: 'Persona Natural o Jurídica Ley 1429',
    GC_AUTORRET: 'Gran Contribuyente Autorretenedor',
    GC_NO_AUTORRET: 'Gran Contribuyente No Autorretenedor',
    RST_PJ: 'Régimen Simple — Persona Jurídica',
    RST_PN: 'Régimen Simple — Persona Natural',
    ESAL: 'Entidad Sin Ánimo de Lucro',
    ENTIDAD_ESTATAL: 'Instituciones del Estado y otros',
    EXTERIOR: 'Tercero del Exterior',
    // Códigos heredados: siguen en algunos terceros migrados y deben verse bien.
    REGIMEN_SIMPLE: 'Régimen Simple de Tributación',
    RESPONSABLE_IVA: 'Responsable de IVA',
    NO_RESPONSABLE_IVA: 'No Responsable de IVA',
    GRAN_CONTRIBUYENTE: 'Gran Contribuyente',
    AUTORETENEDOR: 'Autoretenedor',
    AGENTE_RETENCION_IVA: 'Agente de Retención IVA',
    REGIMEN_ESPECIAL: 'Régimen Tributario Especial',
    NO_CONTRIBUYENTE: 'No Contribuyente',
    PERSONA_NATURAL_NO_RESPONSABLE: 'Persona Natural No Responsable',
    PERSONA_NATURAL_RESPONSABLE: 'Persona Natural Responsable',
    ENTIDAD_SIN_ANIMO_LUCRO: 'Entidad Sin Ánimo de Lucro (ESAL)',
    ZONA_FRANCA: 'Usuario de Zona Franca',
    USUARIO_ADUANERO: 'Usuario Aduanero',
};

// Propiedades/roles adicionales (multi) — además de Cliente/Proveedor/Empleado.
export const PARTY_EXTRA_PROPERTIES: { value: string; label: string }[] = [
    { value: 'VENDEDOR', label: 'Vendedor' },
    { value: 'TRANSPORTADOR', label: 'Transportador' },
    { value: 'BANCO', label: 'Banco' },
    { value: 'ASEGURADORA', label: 'Aseguradora' },
    { value: 'FONDO_SOCIO', label: 'Fondo / Socio' },
    { value: 'ADMIN_IMPUESTOS_NACIONALES', label: 'Adm. Impuestos Nacionales' },
    { value: 'ADMIN_IMPUESTOS_DISTRITALES', label: 'Adm. Impuestos Distritales' },
    { value: 'TRABAJADOR_INDEPENDIENTE', label: 'Trabajador Independiente' },
];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
    TRANSFERENCIA: 'Transferencia Bancaria',
    EFECTIVO: 'Efectivo',
    CHEQUE: 'Cheque',
    TARJETA_CREDITO: 'Tarjeta de Crédito',
    TARJETA_DEBITO: 'Tarjeta de Débito',
    CONSIGNACION: 'Consignación',
    NEQUI: 'Nequi',
    DAVIPLATA: 'Daviplata',
    GIRO: 'Giro',
    COMPENSACION: 'Compensación',
    OTRO: 'Otro',
};
