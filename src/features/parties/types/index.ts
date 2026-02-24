import { z } from 'zod';
import { calculateDV } from '@/shared/utils/nit';

// Enums
export const PartyTypeEnum = z.enum(['PERSON', 'COMPANY']);
export const DocTypeEnum = z.enum(['NIT', 'CC', 'CE', 'PP', 'TI']);

export type PartyType = z.infer<typeof PartyTypeEnum>;
export type DocType = z.infer<typeof DocTypeEnum>;

// Base Schema
export const partySchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),

    party_type: PartyTypeEnum,

    legal_name: z.string().min(3, "El nombre legal es requerido"),
    trade_name: z.string().optional().nullable(),

    doc_type: DocTypeEnum,
    doc_number: z.string().min(5, "Número de documento inválido"),

    nit: z.string().optional().nullable(),
    dv: z.string().max(1).optional().nullable(),

    email: z.string().email("Email inválido").optional().nullable().or(z.literal('')),
    phone: z.string().optional().nullable(),

    is_customer: z.boolean().default(false),
    is_vendor: z.boolean().default(false),

    created_at: z.string().optional(),
}).refine((data) => {
    // Validación de NIT y DV si el tipo de documento es NIT
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
