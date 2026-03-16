import { SupabaseClient } from '@supabase/supabase-js';

export interface Currency {
    code: string;
    name: string;
    symbol: string;
    decimal_places: number;
}

export interface ExchangeRate {
    id: string;
    tenant_id: string;
    from_currency: string;
    to_currency: string;
    rate: number;
    effective_date: string;
}

export const currencyService = {
    async getCurrencies(client: SupabaseClient): Promise<Currency[]> {
        const { data, error } = await client
            .from('currencies')
            .select('*')
            .order('code', { ascending: true });
        if (error) { console.error('[currency] getCurrencies:', error.message); return []; }
        return (data ?? []) as Currency[];
    },

    async getRates(client: SupabaseClient, filters?: { from_currency?: string; to_currency?: string }): Promise<ExchangeRate[]> {
        let query = client
            .from('exchange_rates')
            .select('*')
            .order('effective_date', { ascending: false })
            .limit(100);
        if (filters?.from_currency) query = query.eq('from_currency', filters.from_currency);
        if (filters?.to_currency) query = query.eq('to_currency', filters.to_currency);
        const { data, error } = await query;
        if (error) { console.error('[currency] getRates:', error.message); return []; }
        return (data ?? []) as ExchangeRate[];
    },

    async getRate(client: SupabaseClient, from: string, to: string, date?: string): Promise<number | null> {
        if (from === to) return 1;
        const effectiveDate = date || new Date().toISOString().split('T')[0];
        const { data, error } = await client
            .from('exchange_rates')
            .select('rate')
            .eq('from_currency', from)
            .eq('to_currency', to)
            .lte('effective_date', effectiveDate)
            .order('effective_date', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error || !data) return null;
        return data.rate;
    },

    async convert(client: SupabaseClient, amount: number, from: string, to: string, date?: string): Promise<number | null> {
        const rate = await this.getRate(client, from, to, date);
        if (rate === null) return null;
        return amount * rate;
    },

    async createRate(
        client: SupabaseClient,
        rate: { from_currency: string; to_currency: string; rate: number; effective_date: string }
    ): Promise<ExchangeRate> {
        const { data: tenantId } = await client.rpc('get_my_tenant_id');
        const { data, error } = await client
            .from('exchange_rates')
            .upsert(
                { ...rate, tenant_id: tenantId },
                { onConflict: 'tenant_id,from_currency,to_currency,effective_date' }
            )
            .select()
            .single();
        if (error) throw error;
        return data as ExchangeRate;
    },

    async deleteRate(client: SupabaseClient, id: string): Promise<void> {
        const { error } = await client.from('exchange_rates').delete().eq('id', id);
        if (error) throw error;
    },
};
