import { SupabaseClient } from '@supabase/supabase-js';
import { ProductionRecipe, ProductionOrder, ProductionRecipeItem } from '../types';
import { inventoryService } from '../../inventory/services/inventoryService';

export const productionService = {
    async getRecipes(client: SupabaseClient) {
        const { data, error } = await client
            .from('production_recipes')
            .select(`
                *,
                products(name, sku)
            `)
            .eq('is_active', true);

        if (error) throw error;
        return data;
    },

    async getRecipeById(client: SupabaseClient, id: string) {
        const { data, error } = await client
            .from('production_recipes')
            .select(`
                *,
                items:production_recipe_items(
                    *,
                    products(name, sku)
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as ProductionRecipe & { items: any[] };
    },

    async saveRecipe(client: SupabaseClient, recipe: Partial<ProductionRecipe>, items: Partial<ProductionRecipeItem>[]) {
        const tenantId = (await client.auth.getUser()).data.user?.user_metadata.tenant_id;

        // 1. Upsert Recipe
        const { data: rec, error: recError } = await client
            .from('production_recipes')
            .upsert({ ...recipe, tenant_id: tenantId })
            .select()
            .single();

        if (recError) throw recError;

        // 2. Clear and Insert Items
        if (recipe.id) {
            await client.from('production_recipe_items').delete().eq('recipe_id', recipe.id);
        }

        const { error: itemsError } = await client
            .from('production_recipe_items')
            .insert(items.map(item => ({ ...item, recipe_id: rec.id, tenant_id: tenantId })));

        if (itemsError) throw itemsError;

        return rec;
    },

    async getOrderById(client: SupabaseClient, id: string) {
        const { data, error } = await client
            .from('production_orders')
            .select(`
                *,
                recipes:production_recipes(
                    name, description,
                    products(name, sku, uom),
                    items:production_recipe_items(
                        qty_required,
                        products(name, sku, uom)
                    )
                ),
                warehouses(name, code)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as any;
    },

    async createOrder(client: SupabaseClient, order: Partial<ProductionOrder>) {
        const tenantId = (await client.auth.getUser()).data.user?.user_metadata.tenant_id;
        const { data, error } = await client
            .from('production_orders')
            .insert({ ...order, tenant_id: tenantId, status: 'DRAFT' })
            .select()
            .single();

        if (error) throw error;
        return data as ProductionOrder;
    },

    async getOrders(client: SupabaseClient) {
        const { data, error } = await client
            .from('production_orders')
            .select(`
                *,
                recipes:production_recipes(
                    name,
                    products(name, sku)
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Finaliza una orden de producción.
     * 1. Descarga materia prima (OUT).
     * 2. Carga producto terminado (IN) con costo calculado.
     */
    async finishOrder(client: SupabaseClient, orderId: string, qtyProduced: number) {
        // 1. Get Order and Recipe
        const { data: order, error: orderError } = await client
            .from('production_orders')
            .select(`
                *,
                recipe:production_recipes(
                    *,
                    items:production_recipe_items(*)
                )
            `)
            .eq('id', orderId)
            .single();

        if (orderError) throw orderError;
        if (order.status === 'COMPLETED') throw new Error("Order already completed");

        const recipe = order.recipe;
        const items = recipe.items as ProductionRecipeItem[];
        let totalCostOfIngredients = 0;

        // 2. Consume Ingredients (OUT Movements)
        for (const item of items) {
            const qtyToConsume = (item.qty_required / (recipe.qty_base || 1)) * qtyProduced;

            // Get current average cost
            const avgCost = await inventoryService.getAvgCost(client, item.product_id, order.warehouse_id);
            const lineCostTotal = avgCost * qtyToConsume;
            totalCostOfIngredients += lineCostTotal;

            await inventoryService.createMovement(client, {
                tenant_id: order.tenant_id,
                warehouse_id: order.warehouse_id,
                product_id: item.product_id,
                type: 'OUT',
                qty: qtyToConsume,
                cost: avgCost,
                ref_doc_type: 'PRODUCTION_ORDER',
                ref_doc_id: order.id,
                occurred_at: new Date().toISOString()
            });
        }

        // 3. Produce Finished Product (IN Movement)
        const unitCostFinished = qtyProduced > 0 ? totalCostOfIngredients / qtyProduced : 0;

        await inventoryService.createMovement(client, {
            tenant_id: order.tenant_id,
            warehouse_id: order.warehouse_id,
            product_id: recipe.product_id,
            type: 'IN',
            qty: qtyProduced,
            cost: unitCostFinished,
            ref_doc_type: 'PRODUCTION_ORDER',
            ref_doc_id: order.id,
            occurred_at: new Date().toISOString()
        });

        // 4. Update Order Status
        const { error: updateError } = await client
            .from('production_orders')
            .update({
                status: 'COMPLETED',
                qty_produced: qtyProduced,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        if (updateError) throw updateError;

        return { success: true, unitCost: unitCostFinished };
    }
};
