import { z } from 'zod';

export const ProductTypeEnum = z.enum(['GOOD', 'SERVICE']);
export const ProductStatusEnum = z.enum(['active', 'inactive', 'archived']);

export type ProductType = z.infer<typeof ProductTypeEnum>;
export type ProductStatus = z.infer<typeof ProductStatusEnum>;

export const productSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),

    sku: z.string().min(1, "SKU es requerido"),
    name: z.string().min(3, "Nombre es requerido"),
    type: ProductTypeEnum,
    uom: z.string().default('UNIT'), // Unit of Measure

    status: ProductStatusEnum.default('active'),

    // Optional pricing/cost fields for quick access, though might be in price lists later
    // For V3 MVP, we keep it simple
    price: z.number().min(0).optional(),
    cost: z.number().min(0).optional(),

    // Tax config (simple for now)
    tax_rate: z.number().min(0).default(0), // % IVA

    created_at: z.string().optional(),

    // Virtual field for UI
    stock_qty: z.number().optional(),
});

export type Product = z.infer<typeof productSchema>;

export const productFilterSchema = z.object({
    search: z.string().optional(),
    type: ProductTypeEnum.optional(),
    status: ProductStatusEnum.optional(),
    page: z.number().default(1),
    per_page: z.number().default(10),
});

export type ProductFilters = z.infer<typeof productFilterSchema>;
