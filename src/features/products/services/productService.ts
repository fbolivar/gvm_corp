import { SupabaseClient } from '@supabase/supabase-js';
import { Product, ProductFilters } from '../types';

export const productService = {
    // Retorna todos los productos activos paginando internamente en lotes de 1000
    // (Supabase PostgREST limita a ~1000 filas por request por defecto).
    // Pensado para poblar comboboxes con búsqueda en formularios de facturas,
    // cotizaciones, OC, etc. Trae solo campos livianos — sin stock agregado.
    async getAllActiveProductsLight(client: SupabaseClient): Promise<Product[]> {
        const pageSize = 1000
        let offset = 0
        const all: Record<string, unknown>[] = []
        while (true) {
            const { data, error } = await client
                .from('products')
                .select('id, sku, name, selling_price, cost, tax_category, status, type, uom, min_stock')
                .eq('status', 'ACTIVE')
                .order('name')
                .range(offset, offset + pageSize - 1)

            if (error) {
                console.error('[products] getAllActiveProductsLight error:', error.message)
                break
            }
            if (!data || data.length === 0) break
            all.push(...data)
            if (data.length < pageSize) break
            offset += pageSize
        }
        return all.map((p) => ({ ...p, stock_qty: 0, total_qty: 0 })) as unknown as Product[]
    },

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

        // Run RPC + count query in parallel
        const countQuery = client.from('products').select('id', { count: 'exact', head: true });
        if (filters.search) {
            countQuery.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
        }
        if (filters.type) countQuery.eq('type', filters.type);
        if (filters.status) countQuery.eq('status', filters.status);

        const [rpcResult, countResult] = await Promise.all([
            client.rpc('get_products_with_stock', {
                p_limit: filters.per_page,
                p_offset: from,
                p_search: filters.search || ''
            }),
            countQuery,
        ]);

        const totalCount = countResult.count || 0;

        if (rpcResult.error) {
            // Fallback: query products directly
            console.error("get_products_with_stock RPC error:", rpcResult.error.message);
            const { data: fallbackData, error: fbErr } = await query
                .range(from, from + filters.per_page - 1)
                .order('name');
            if (fbErr) { console.error('[products] getProducts fallback:', fbErr.message); return { data: [] as unknown as Product[], count: totalCount }; }
            const fallbackMapped = (fallbackData ?? []).map((p) => ({ ...p, stock_qty: 0, total_qty: 0 }));
            return { data: fallbackMapped as unknown as Product[], count: totalCount };
        }

        // RPC returns total_qty, map to stock_qty for UI
        const mappedData = (rpcResult.data ?? []).map((p: Record<string, unknown>) => ({
            ...p,
            stock_qty: Number(p.total_qty)
        }));

        return { data: mappedData as unknown as Product[], count: totalCount };
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
