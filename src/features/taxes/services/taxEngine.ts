import { SupabaseClient } from '@supabase/supabase-js';
import { TaxConfiguration } from '../types';

export const taxEngine = {
    /**
     * Get active tax configurations for a given year
     */
    async getConfigurations(client: SupabaseClient, year: number) {
        const { data, error } = await client
            .from('tax_configurations')
            .select('*')
            .eq('year', year)
            .eq('is_active', true);

        if (error) throw error;
        return data as TaxConfiguration[];
    },

    /**
     * Calculate applicable withholdings for a transaction
     * @param client Supabase client
     * @param amount Base amount of the transaction
     * @param year Fiscal year
     * @param type Specific tax type to check (optional)
     */
    async calculateWithholdings(client: SupabaseClient, amount: number, year: number, type?: 'RETEFUENTE' | 'RETEICA' | 'RETEIVA') {
        const configs = await this.getConfigurations(client, year);

        let applicableConfigs = configs;
        if (type) {
            applicableConfigs = configs.filter(c => c.tax_type === type);
        }

        const withholdings = [];

        for (const config of applicableConfigs) {
            // Check if amount meets the base
            if (amount >= config.base_amount) {
                const taxAmount = amount * (config.rate / 100);
                withholdings.push({
                    config,
                    base_amount: amount,
                    tax_amount: taxAmount
                });
            }
        }

        return withholdings;
    }
};
