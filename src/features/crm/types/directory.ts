import { z } from 'zod';

/**
 * Directorio comercial por cliente: contactos (personas) y direcciones.
 * La idea es que la información del cliente quede en la empresa aunque cambie el
 * comercial: con quién hablar (cargo, teléfonos), importancia y dónde está.
 */

/** Cargos sugeridos (el campo es texto libre; esto solo alimenta un datalist). */
export const CONTACT_ROLE_SUGGESTIONS = [
    'Responsable de compras',
    'Pagos / cartera',
    'Gerencia',
    'Administración',
    'Técnico / producción',
    'Recepción / logística',
    'Representante legal',
    'Otro',
];

/** Tipos de dirección. */
export const ADDRESS_KINDS = {
    SEDE: 'Sede principal',
    SUCURSAL: 'Sucursal',
    BODEGA: 'Bodega',
    ENTREGA: 'Punto de entrega',
    FACTURACION: 'Facturación',
    OTRO: 'Otro',
} as const;
export type AddressKind = keyof typeof ADDRESS_KINDS;

/** Email opcional: '' o ausente → null; si viene, debe ser válido. */
const optionalEmail = z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().email('Email inválido').max(160).nullable().optional(),
);
const optText = (max: number) => z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
    z.string().trim().max(max).nullable().optional(),
);

export const contactSchema = z.object({
    party_id: z.string().uuid(),
    name: z.string().trim().min(2, 'Escribe el nombre').max(120),
    role: optText(80),
    phone: optText(40),
    mobile: optText(40),
    email: optionalEmail,
    is_primary: z.coerce.boolean().default(false),
    notes: optText(1000),
});
export type ContactInput = z.input<typeof contactSchema>;

export const addressSchema = z.object({
    party_id: z.string().uuid(),
    label: optText(80),
    kind: z.enum(Object.keys(ADDRESS_KINDS) as [AddressKind, ...AddressKind[]]).nullable().optional(),
    address: z.string().trim().min(3, 'Escribe la dirección').max(300),
    city: optText(80),
    phone: optText(40),
    notes: optText(1000),
    is_primary: z.coerce.boolean().default(false),
});
export type AddressInput = z.input<typeof addressSchema>;

export interface PartyContact {
    id: string;
    party_id: string;
    name: string;
    role: string | null;
    phone: string | null;
    mobile: string | null;
    email: string | null;
    is_primary: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface PartyAddress {
    id: string;
    party_id: string;
    label: string | null;
    kind: AddressKind | null;
    address: string;
    city: string | null;
    phone: string | null;
    notes: string | null;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
}

/** Fila del directorio global (contacto + a qué cliente pertenece). */
export interface DirectoryRow extends PartyContact {
    party_name: string;
    party_nit: string | null;
    party_city: string | null;
}
