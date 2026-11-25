import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_KPI_SETTINGS, type KpiSettings } from '../types/kpi';

export const kpiService = {
    /** Umbrales del tenant (o los valores por defecto si aún no se configuraron). */
    async getSettings(client: SupabaseClient): Promise<KpiSettings> {
        const { data } = await client
            .from('crm_kpi_settings')
            .select('visit_green_pct, visit_amber_pct, client_passive_days, client_inactive_days, growth_pct, drop_pct')
            .maybeSingle();
        return data ? { ...DEFAULT_KPI_SETTINGS, ...(data as Partial<KpiSettings>) } : { ...DEFAULT_KPI_SETTINGS };
    },

    /** Meta de visitas por comercial para un período 'YYYY-MM'. */
    async getVisitTargets(client: SupabaseClient, period: string): Promise<Map<string, number>> {
        const { data } = await client
            .from('crm_sales_targets')
            .select('salesperson_id, target_visits')
            .eq('period', period);
        const m = new Map<string, number>();
        for (const r of (data ?? []) as { salesperson_id: string; target_visits: number | null }[]) {
            if (r.target_visits != null) m.set(r.salesperson_id, Number(r.target_visits));
        }
        return m;
    },
};
