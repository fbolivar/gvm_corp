import { z } from 'zod';

export const ProductTypeEnum = z.enum(['GOOD', 'SERVICE']);
export const ProductStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']);
export const TaxCategoryEnum = z.enum(['IVA_0', 'IVA_5', 'IVA_19']);

export type ProductType = z.infer<typeof ProductTypeEnum>;
export type ProductStatus = z.infer<typeof ProductStatusEnum>;
export type TaxCategory = z.infer<typeof TaxCategoryEnum>;

export const TAX_LABELS: Record<TaxCategory, string> = {
    IVA_0: '0% — Excluido / Exento',
    IVA_5: '5% — Tarifa diferencial',
    IVA_19: '19% — Tarifa general',
};

export const UOM_OPTIONS = ['UND', 'KG', 'GR', 'LT', 'ML', 'MT', 'CM', 'M2', 'CJ', 'PAR', 'DOC', 'HR'];

export const productSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),

    sku: z.string().min(1, "SKU es requerido"),
    name: z.string().min(3, "Nombre es requerido"),
    description: z.string().optional(),
    type: ProductTypeEnum,
    uom: z.string().default('UND'),
    status: ProductStatusEnum.default('ACTIVE'),

    selling_price: z.number().min(0).default(0),
    cost: z.number().min(0).optional(),
    tax_category: TaxCategoryEnum.default('IVA_19'),
    min_stock: z.number().min(0).default(0),

    is_fixed_asset: z.boolean().default(false),
    asset_category: z.enum(['LAND', 'BUILDING', 'VEHICLE', 'EQUIPMENT', 'FURNITURE', 'COMPUTER', 'OTHER']).optional().nullable(),

    created_at: z.string().optional(),

    // Virtual — from product_stock join
    stock_qty: z.number().optional(),
});

export type Product = z.infer<typeof productSchema>;

export const productFilterSchema = z.object({
    search: z.string().optional(),
    type: ProductTypeEnum.optional(),
    status: ProductStatusEnum.optional(),
    page: z.number().default(1),
    per_page: z.number().default(20),
});

export type ProductFilters = z.infer<typeof productFilterSchema>;
