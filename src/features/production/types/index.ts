import { z } from 'zod';

export const productionRecipeItemSchema = z.object({
    id: z.string().uuid().optional(),
    recipe_id: z.string().uuid().optional(),
    product_id: z.string().uuid().min(1, "Producto es requerido"),
    qty_required: z.number().min(0.0001, "Cantidad debe ser mayor a 0"),
    tenant_id: z.string().uuid().optional(),
});

export const productionRecipeSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    product_id: z.string().uuid().min(1, "Producto final es requerido"),
    name: z.string().min(3, "Nombre de receta es requerido"),
    description: z.string().optional(),
    is_active: z.boolean().default(true),
    items: z.array(productionRecipeItemSchema).min(1, "Debe agregar al menos un insumo"),
});

export type ProductionRecipe = z.infer<typeof productionRecipeSchema>;
export type ProductionRecipeItem = z.infer<typeof productionRecipeItemSchema>;

export const productionOrderStatusEnum = z.enum(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export type ProductionOrderStatus = z.infer<typeof productionOrderStatusEnum>;

export const productionOrderSchema = z.object({
    id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
    recipe_id: z.string().uuid().min(1, "Receta es requerida"),
    order_number: z.string().min(1, "Número de orden es requerido"),
    qty_target: z.number().min(1, "Cantidad objetivo debe ser al menos 1"),
    qty_produced: z.number().default(0),
    status: productionOrderStatusEnum.default('DRAFT'),
    warehouse_id: z.string().uuid().min(1, "Bodega es requerida"),
    notes: z.string().optional(),
    started_at: z.string().optional(),
    completed_at: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
});

export type ProductionOrder = z.infer<typeof productionOrderSchema>;
