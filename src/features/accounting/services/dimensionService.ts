import { SupabaseClient } from '@supabase/supabase-js';

export interface Dimension {
    id: string;
    tenant_id: string;
    code: string;
    name: string;
    is_active: boolean;
    created_at: string;
}

export interface DimensionValue {
    id: string;
    tenant_id: string;
    dimension_id: string;
    code: string;
    name: string;
    is_active: boolean;
    dimension?: Dimension;
}

export const dimensionService = {
    async getDimensions(client: SupabaseClient): Promise<Dimension[]> {
        const { data, error } = await client
            .from('dimensions')
            .select('*')
            .order('code', { ascending: true });
        if (error) { console.error('[dimension] getDimensions:', error.message); return []; }
        return (data ?? []) as Dimension[];
    },

    async createDimension(
        client: SupabaseClient,
        dim: { code: string; name: string }
    ): Promise<Dimension> {
        const { data: tenantId } = await client.rpc('get_my_tenant_id');
        const { data, error } = await client
            .from('dimensions')
            .insert({ ...dim, tenant_id: tenantId, is_active: true })
            .select()
            .single();
        if (error) throw error;
        return data as Dimension;
    },

    async updateDimension(
        client: SupabaseClient,
        id: string,
        dim: Partial<Dimension>
    ): Promise<void> {
        const { error } = await client.from('dimensions').update(dim).eq('id', id);
        if (error) throw error;
    },

    async deleteDimension(client: SupabaseClient, id: string): Promise<void> {
        const { error } = await client.from('dimensions').delete().eq('id', id);
        if (error) throw error;
    },

    async getDimensionValues(
        client: SupabaseClient,
        dimensionId?: string
    ): Promise<DimensionValue[]> {
        let query = client
            .from('dimension_values')
            .select('*, dimension:dimensions(code, name)')
            .order('code', { ascending: true });
        if (dimensionId) query = query.eq('dimension_id', dimensionId);
        const { data, error } = await query;
        if (error) { console.error('[dimension] getDimensionValues:', error.message); return []; }
        return (data ?? []) as DimensionValue[];
    },

    async createDimensionValue(
        client: SupabaseClient,
        val: { dimension_id: string; code: string; name: string }
    ): Promise<DimensionValue> {
        const { data: tenantId } = await client.rpc('get_my_tenant_id');
        const { data, error } = await client
            .from('dimension_values')
            .insert({ ...val, tenant_id: tenantId, is_active: true })
            .select()
            .single();
        if (error) throw error;
        return data as DimensionValue;
    },

    async updateDimensionValue(
        client: SupabaseClient,
        id: string,
        val: Partial<DimensionValue>
    ): Promise<void> {
        const { error } = await client.from('dimension_values').update(val).eq('id', id);
        if (error) throw error;
    },

    async deleteDimensionValue(client: SupabaseClient, id: string): Promise<void> {
        const { error } = await client.from('dimension_values').delete().eq('id', id);
        if (error) throw error;
    },

    /**
     * Get all active dimension values grouped by dimension (for selectors).
     */
    async getDimensionOptions(
        client: SupabaseClient
    ): Promise<Array<{ dimension: Dimension; values: DimensionValue[] }>> {
        const dims = await this.getDimensions(client);
        const activeDims = dims.filter(d => d.is_active);

        if (activeDims.length === 0) return [];

        const allValues = await this.getDimensionValues(client);

        return activeDims.map(dim => ({
            dimension: dim,
            values: allValues.filter(v => v.dimension_id === dim.id && v.is_active),
        }));
    },
};
