import { z } from 'zod';
import { calculateDV } from '@/shared/utils/nit';

// Enums
export const PartyTypeEnum = z.enum(['PERSON', 'COMPANY']);
export const DocTypeEnum = z.enum(['NIT', 'CC', 'CE', 'PP', 'TI']);

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

export const TaxpayerTypeEnum = z.enum([
    'REGIMEN_SIMPLE',
    'RESPONSABLE_IVA',
    'NO_RESPONSABLE_IVA',
    'GRAN_CONTRIBUYENTE',
    'AUTORETENEDOR',
    'AGENTE_RETENCION_IVA',
    'REGIMEN_ESPECIAL',
    'NO_CONTRIBUYENTE',
    'PERSONA_NATURAL_NO_RESPONSABLE',
    'PERSONA_NATURAL_RESPONSABLE',
    'ENTIDAD_SIN_ANIMO_LUCRO',
    'ZONA_FRANCA',
    'USUARIO_ADUANERO',
]);

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

    // Commercial
    payment_term_days: z.coerce.number().int().min(0).default(0).optional(),
    credit_limit: z.coerce.number().min(0).default(0).optional(),
    salesperson_id: z.string().uuid().optional().nullable(),
    price_list_id: z.string().uuid().optional().nullable(),
    payment_method: PaymentMethodEnum.default('TRANSFERENCIA').optional(),

    // Fiscal
    economic_activity: z.string().optional().nullable(),
    taxpayer_type: TaxpayerTypeEnum.default('REGIMEN_SIMPLE').optional(),

    created_at: z.string().optional(),
    updated_at: z.string().optional(),
}).refine((data) => {
    if (data.doc_type === 'NIT' && data.nit) {
        const calculated = calculateDV(data.nit);
        return data.dv === calculated;
    }
    return true;
}, {
    message: "El Dígito de Verificación (DV) no coincide con el NIT",
    path: ["dv"],
});

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
