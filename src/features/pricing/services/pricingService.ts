import { SupabaseClient } from '@supabase/supabase-js';

export interface PriceList {
    id: string;
    tenant_id: string;
    name: string;
    currency: string;
    valid_from: string | null;
    valid_to: string | null;
    is_default: boolean;
    created_at: string;
}

export interface PriceListItem {
    id: string;
    tenant_id: string;
    price_list_id: string;
    product_id: string;
    unit_price: number;
    min_qty: number;
    product?: { name: string; sku: string };
}

export const pricingService = {
    async getPriceLists(client: SupabaseClient): Promise<PriceList[]> {
        const { data, error } = await client
            .from('price_lists')
            .select('*')
            .order('name', { ascending: true });
        if (error) { console.error('[pricing] getPriceLists:', error.message); return []; }
        return (data ?? []) as PriceList[];
    },

    async getPriceListById(client: SupabaseClient, id: string): Promise<PriceList | null> {
        const { data, error } = await client
            .from('price_lists')
            .select('*')
            .eq('id', id)
            .single();
        if (error) return null;
        return data as PriceList;
    },

    async createPriceList(client: SupabaseClient, list: Partial<PriceList>): Promise<PriceList> {
        const { data: tenantId } = await client.rpc('get_my_tenant_id');
        const { data, error } = await client
            .from('price_lists')
            .insert({ ...list, tenant_id: tenantId })
            .select()
            .single();
        if (error) throw error;
        return data as PriceList;
    },

    async updatePriceList(client: SupabaseClient, id: string, list: Partial<PriceList>): Promise<PriceList> {
        const { data, error } = await client
            .from('price_lists')
            .update(list)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data as PriceList;
    },

    async deletePriceList(client: SupabaseClient, id: string): Promise<void> {
        const { error } = await client.from('price_lists').delete().eq('id', id);
        if (error) throw error;
    },

    async getPriceListItems(client: SupabaseClient, priceListId: string): Promise<PriceListItem[]> {
        const { data, error } = await client
            .from('price_list_items')
            .select('*, product:products(name, sku)')
            .eq('price_list_id', priceListId)
            .order('min_qty', { ascending: true });
        if (error) { console.error('[pricing] getPriceListItems:', error.message); return []; }
        return (data ?? []) as PriceListItem[];
    },

    async upsertPriceListItem(client: SupabaseClient, item: Partial<PriceListItem>): Promise<PriceListItem> {
        const { data: tenantId } = await client.rpc('get_my_tenant_id');
        const { data, error } = await client
            .from('price_list_items')
            .upsert({ ...item, tenant_id: tenantId }, { onConflict: 'price_list_id,product_id,min_qty' })
            .select()
            .single();
        if (error) throw error;
        return data as PriceListItem;
    },

    async deletePriceListItem(client: SupabaseClient, id: string): Promise<void> {
        const { error } = await client.from('price_list_items').delete().eq('id', id);
        if (error) throw error;
    },

    /** Get the best price for a customer's product at a given quantity */
    async getCustomerPrice(client: SupabaseClient, partyId: string, productId: string, qty: number = 1): Promise<number | null> {
        // 1. Get party's assigned price list
        const { data: party } = await client
            .from('parties')
            .select('price_list_id')
            .eq('id', partyId)
            .single();

        if (!party?.price_list_id) return null;

        // 2. Check if the price list is still valid
        const { data: priceList } = await client
            .from('price_lists')
            .select('id, valid_from, valid_to')
            .eq('id', party.price_list_id)
            .single();

        if (!priceList) return null;

        const today = new Date().toISOString().split('T')[0];
        if (priceList.valid_from && today < priceList.valid_from) return null;
        if (priceList.valid_to && today > priceList.valid_to) return null;

        // 3. Get the best matching price (highest min_qty that's <= requested qty)
        const { data: items } = await client
            .from('price_list_items')
            .select('unit_price, min_qty')
            .eq('price_list_id', party.price_list_id)
            .eq('product_id', productId)
            .lte('min_qty', qty)
            .order('min_qty', { ascending: false })
            .limit(1);

        if (!items || items.length === 0) return null;
        return items[0].unit_price;
    },
};
