import { SupabaseClient } from '@supabase/supabase-js';
import { Product, ProductFilters } from '../types';

export const productService = {
    async getProducts(client: SupabaseClient, filters: ProductFilters) {
        let query = client.from('products').select('*', { count: 'exact' });

        if (filters.search) {
            query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
        }

        if (filters.type) {
            query = query.eq('type', filters.type);
        }

        if (filters.status) {
            query = query.eq('status', filters.status);
        }

        const from = (filters.page - 1) * filters.per_page;
        // const to = from + filters.per_page - 1; 

        // Use RPC for stock aggregation
        const { data, error, count } = await client.rpc('get_products_with_stock', {
            p_limit: filters.per_page,
            p_offset: from,
            p_search: filters.search || ''
        }, { count: 'exact' });

        if (error) throw error;
        // RPC returns total_qty, map to stock_qty for UI
        const mappedData = (data as any[]).map(p => ({
            ...p,
            stock_qty: Number(p.total_qty)
        }));

        return { data: mappedData as Product[], count: count || 0 };
    },

    async getProductById(client: SupabaseClient, id: string) {
        const { data, error } = await client
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Product;
    },

    async createProduct(client: SupabaseClient, product: Product) {
        const { stock_qty, ...dbProduct } = product;
        const { data, error } = await client
            .from('products')
            .insert(dbProduct)
            .select()
            .single();

        if (error) throw error;
        return data as Product;
    },

    async updateProduct(client: SupabaseClient, id: string, product: Partial<Product>) {
        const { stock_qty, ...dbProduct } = product;
        const { data, error } = await client
            .from('products')
            .update(dbProduct)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Product;
    },

    async deleteProduct(client: SupabaseClient, id: string) {
        // Soft delete usually, or real delete if no dependencies
        // For now, let's just set status to archived? 
        // Or actually delete if table allows it.
        const { error } = await client.from('products').delete().eq('id', id);
        if (error) throw error;
    }
};
