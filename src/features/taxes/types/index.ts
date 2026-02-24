import { z } from "zod";

export const TaxTypeEnum = z.enum(['RETEFUENTE', 'RETEICA', 'RETEIVA']);

export const taxConfigurationSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid(),
    tax_name: z.string().min(1, "Nombre del impuesto requerido"),
    tax_type: TaxTypeEnum,
    rate: z.number().min(0, "Porcentaje debe ser positivo"),
    base_amount: z.number().min(0, "Base mínima debe ser positiva").default(0),
    account_code: z.string().min(4, "Código contable requerido"),
    year: z.number().int().min(2020),
    is_active: z.boolean().default(true),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});

export type TaxConfiguration = z.infer<typeof taxConfigurationSchema>;
